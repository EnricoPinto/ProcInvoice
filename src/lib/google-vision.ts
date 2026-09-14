import type { ExtractedInvoiceData } from "./ocr";
import type { RawOCRResult, OCRTextBlock } from "./tesseract-engine";

/**
 * Cloud Image OCR using Gemini API or Google Cloud Vision API.
 * - No binaries, no downloads, zero runtime timeouts.
 * - Gemini API: 100% free tier, extracts full text + structured fields.
 * - Vision API: 1000 requests/month free tier fallback.
 */
export async function cloudImageOCR(
  buffer: Buffer,
  mimeType: string = "image/png"
): Promise<RawOCRResult> {
  const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_VISION_API_KEY;
  const visionKey = process.env.GOOGLE_VISION_API_KEY;

  if (!geminiKey && !visionKey) {
    throw new Error(
      "Neither GEMINI_API_KEY nor GOOGLE_VISION_API_KEY is set in environment variables. Please add one to process image invoices."
    );
  }

  // Normalize image mimeType
  let normalizedMime = mimeType || "image/png";
  if (!normalizedMime.startsWith("image/")) {
    normalizedMime = "image/png";
  }

  // 1. Try Gemini API first (100% free, highly accurate, extracts text + structured fields)
  if (geminiKey) {
    try {
      return await callGeminiOCR(buffer, normalizedMime, geminiKey);
    } catch (geminiErr) {
      console.warn("Gemini OCR attempt failed, trying Google Cloud Vision fallback:", geminiErr);
    }
  }

  // 2. Try Google Cloud Vision API fallback
  if (visionKey) {
    try {
      return await callGoogleVision(buffer, visionKey);
    } catch (visionErr) {
      console.error("Google Cloud Vision fallback also failed:", visionErr);
      throw visionErr;
    }
  }

  throw new Error("Failed to process invoice image with cloud OCR providers.");
}

/**
 * Calls Gemini Vision to extract plain text and structured invoice fields.
 */
async function callGeminiOCR(
  buffer: Buffer,
  mimeType: string,
  apiKey: string
): Promise<RawOCRResult> {
  const base64Image = buffer.toString("base64");

  const prompt = `You are an expert invoice OCR and data extraction system.
Analyze this invoice image and extract all readable text and data.
Output a strictly valid JSON object with the following schema (do not wrap in markdown quotes, no extra commentary):
{
  "rawText": "Complete verbatim text of the invoice, preserving layout, line breaks, tables, and sections.",
  "invoiceNumber": "string or null",
  "invoiceDate": "YYYY-MM-DD or formatted date string or null",
  "dueDate": "YYYY-MM-DD or formatted date string or null",
  "vendorName": "string or null",
  "vendorAddress": "string or null",
  "vendorVAT": "string or null",
  "clientName": "string or null",
  "clientAddress": "string or null",
  "subtotal": number or null,
  "taxRate": number or null,
  "taxAmount": number or null,
  "totalAmount": number or null,
  "currency": "USD, EUR, INR, GBP, etc. or null",
  "paymentTerms": "string or null",
  "bankDetails": "string or null",
  "notes": "string or null",
  "lineItems": [
    {
      "description": "string",
      "quantity": number,
      "unitPrice": number,
      "total": number
    }
  ]
}`;

  // Try models in order of availability
  const models = ["gemini-3.6-flash", "gemini-flash-latest", "gemini-2.5-flash-lite"];
  let lastError: Error | null = null;

  for (const model of models) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    inline_data: {
                      mime_type: mimeType,
                      data: base64Image,
                    },
                  },
                  { text: prompt },
                ],
              },
            ],
            generationConfig: {
              responseMimeType: "application/json",
            },
          }),
        }
      );

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Gemini (${model}) ${response.status}: ${errText}`);
      }

      const json = await response.json();
      const contentText = json?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!contentText) {
        throw new Error(`Empty response from Gemini (${model})`);
      }

      // Parse structured JSON response
      let parsed: any;
      try {
        parsed = JSON.parse(contentText);
      } catch {
        // In case Gemini returns markdown code fences
        const cleaned = contentText.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();
        parsed = JSON.parse(cleaned);
      }

      const rawText: string = parsed.rawText || contentText;
      const lines = rawText.split("\n").map((l: string) => l.trim()).filter(Boolean);
      const blocks: OCRTextBlock[] = lines.map((line: string, idx: number) => ({
        text: line,
        bbox: { x0: 0, y0: idx * 20, x1: line.length * 10, y1: (idx + 1) * 20 },
        pageIndex: 0,
        confidence: 98,
      }));

      const extractedFields: Partial<ExtractedInvoiceData> = {
        invoiceNumber: parsed.invoiceNumber || undefined,
        invoiceDate: parsed.invoiceDate || undefined,
        dueDate: parsed.dueDate || undefined,
        vendorName: parsed.vendorName || undefined,
        vendorAddress: parsed.vendorAddress || undefined,
        vendorVAT: parsed.vendorVAT || undefined,
        clientName: parsed.clientName || undefined,
        clientAddress: parsed.clientAddress || undefined,
        subtotal: typeof parsed.subtotal === "number" ? parsed.subtotal : undefined,
        taxRate: typeof parsed.taxRate === "number" ? parsed.taxRate : undefined,
        taxAmount: typeof parsed.taxAmount === "number" ? parsed.taxAmount : undefined,
        totalAmount: typeof parsed.totalAmount === "number" ? parsed.totalAmount : undefined,
        currency: parsed.currency || undefined,
        paymentTerms: parsed.paymentTerms || undefined,
        bankDetails: parsed.bankDetails || undefined,
        notes: parsed.notes || undefined,
        lineItems: Array.isArray(parsed.lineItems) ? parsed.lineItems : undefined,
      };

      return {
        rawText,
        blocks,
        pageCount: 1,
        extractedFields,
      };
    } catch (err: any) {
      lastError = err;
      // Continue to next model if model not found
      if (err.message?.includes("404") || err.message?.includes("not found")) {
        continue;
      }
      throw err;
    }
  }

  throw lastError || new Error("Failed to call Gemini API");
}

/**
 * Calls Google Cloud Vision DOCUMENT_TEXT_DETECTION endpoint.
 */
async function callGoogleVision(buffer: Buffer, apiKey: string): Promise<RawOCRResult> {
  const base64Image = buffer.toString("base64");

  const response = await fetch(
    `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requests: [
          {
            image: { content: base64Image },
            features: [{ type: "DOCUMENT_TEXT_DETECTION", maxResults: 1 }],
          },
        ],
      }),
    }
  );

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Google Vision API ${response.status}: ${errText}`);
  }

  const result = await response.json();
  const annotation = result?.responses?.[0]?.fullTextAnnotation;
  const rawText: string = annotation?.text ?? "";

  const blocks: OCRTextBlock[] = [];
  const pages = annotation?.pages ?? [];
  for (const page of pages) {
    for (const block of page?.blocks ?? []) {
      let blockText = "";
      for (const para of block?.paragraphs ?? []) {
        for (const word of para?.words ?? []) {
          blockText += (word.symbols ?? []).map((s: { text: string }) => s.text).join("") + " ";
        }
      }
      blockText = blockText.trim();
      if (!blockText) continue;

      const verts = block.boundingBox?.vertices ?? [];
      blocks.push({
        text: blockText,
        bbox: {
          x0: verts[0]?.x ?? 0,
          y0: verts[0]?.y ?? 0,
          x1: verts[2]?.x ?? 0,
          y1: verts[2]?.y ?? 0,
        },
        pageIndex: 0,
        confidence: (block.confidence ?? 0.9) * 100,
      });
    }
  }

  return { rawText, blocks, pageCount: 1 };
}

// Backwards-compatible export
export const googleVisionOCR = (buffer: Buffer) => cloudImageOCR(buffer, "image/png");

export type { ExtractedInvoiceData };
