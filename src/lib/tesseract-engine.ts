/**
 * OCR Engine — image OCR uses Google Cloud Vision API (REST, no downloads).
 * PDF text extraction uses pdf-parse (works perfectly serverless).
 */

import type { ExtractedInvoiceData } from "./ocr";

export interface OCRTextBlock {
  text: string;
  bbox: { x0: number; y0: number; x1: number; y1: number };
  pageIndex: number;
  confidence: number;
}

export interface RawOCRResult {
  rawText: string;
  blocks: OCRTextBlock[];
  pageCount: number;
  extractedFields?: Partial<ExtractedInvoiceData>;
}

export interface OCREngine {
  recognize(buffer: Buffer, mimeType: string): Promise<RawOCRResult>;
}

export class CloudOCREngine implements OCREngine {
  async recognize(buffer: Buffer, mimeType: string): Promise<RawOCRResult> {
    if (mimeType === "application/pdf") {
      return this.recognizePdf(buffer);
    } else {
      return this.recognizeImageWithVision(buffer, mimeType);
    }
  }

  /**
   * Uses Cloud Vision / Gemini API for instant, serverless image OCR.
   * Handles JPEG, PNG, WebP, GIF, BMP, TIFF, etc.
   * No binaries, no downloads — pure REST call.
   */
  private async recognizeImageWithVision(buffer: Buffer, mimeType: string): Promise<RawOCRResult> {
    const { cloudImageOCR } = await import("./google-vision");
    return cloudImageOCR(buffer, mimeType);
  }

  /**
   * Uses pdf-parse to extract embedded text from PDFs (fast, no OCR needed).
   */
  private async recognizePdf(buffer: Buffer): Promise<RawOCRResult> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pdfModule = require("pdf-parse");
      let rawText = "";
      let pageCount = 1;

      if (typeof pdfModule === "function") {
        const data = await pdfModule(buffer);
        rawText = data.text || "";
        pageCount = data.numpages || 1;
      } else if (pdfModule?.PDFParse) {
        const parser = new pdfModule.PDFParse({ data: buffer });
        const data = await parser.getText();
        rawText = data.text || "";
        pageCount = data.total || 1;
      } else if (typeof pdfModule?.default === "function") {
        const data = await pdfModule.default(buffer);
        rawText = data.text || "";
        pageCount = data.numpages || 1;
      }

      // If text extraction yielded too little text (e.g. scanned image PDF), fallback to Vision/Gemini
      if (rawText.trim().length < 20) {
        try {
          const { cloudImageOCR } = await import("./google-vision");
          return await cloudImageOCR(buffer, "application/pdf");
        } catch {
          // Keep whatever embedded text we got
        }
      }

      const lines = rawText.split("\n").map((l: string) => l.trim()).filter(Boolean);
      const blocks: OCRTextBlock[] = lines.map((line: string, idx: number) => ({
        text: line,
        bbox: { x0: 0, y0: idx * 20, x1: line.length * 10, y1: (idx + 1) * 20 },
        pageIndex: 0,
        confidence: 90,
      }));

      // Call Gemini to parse structured fields (vendor, client, lines, amounts) from text
      let extractedFields: any = undefined;
      try {
        const { callGeminiExtractFromText } = await import("./google-vision");
        const aiFields = await callGeminiExtractFromText(rawText);
        if (aiFields) {
          extractedFields = aiFields;
        }
      } catch (aiErr) {
        console.warn("AI extraction from PDF text skipped/failed:", aiErr);
      }

      return { rawText, blocks, pageCount, extractedFields };
    } catch (err) {
      console.error("PDF parse error, attempting Gemini/Vision fallback:", err);
      try {
        const { cloudImageOCR } = await import("./google-vision");
        return await cloudImageOCR(buffer, "application/pdf");
      } catch (ocrErr) {
        console.error("Vision fallback for PDF failed:", ocrErr);
        return { rawText: "", blocks: [], pageCount: 1 };
      }
    }
  }
}
