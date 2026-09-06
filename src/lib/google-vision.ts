import type { ExtractedInvoiceData } from "./ocr";
import type { RawOCRResult, OCRTextBlock } from "./tesseract-engine";

/**
 * Calls Google Cloud Vision API (DOCUMENT_TEXT_DETECTION) for image OCR.
 * No downloads, no binaries — just a REST API call. 1000 images/month free.
 */
export async function googleVisionOCR(buffer: Buffer): Promise<RawOCRResult> {
  const apiKey = process.env.GOOGLE_VISION_API_KEY;
  if (!apiKey) {
    throw new Error("GOOGLE_VISION_API_KEY is not set in environment variables");
  }

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
    throw new Error(`Google Vision API error ${response.status}: ${errText}`);
  }

  const result = await response.json();
  const annotation = result?.responses?.[0]?.fullTextAnnotation;
  const rawText: string = annotation?.text ?? "";

  // Build blocks from Vision's page/block/paragraph/word structure
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

export type { ExtractedInvoiceData };
