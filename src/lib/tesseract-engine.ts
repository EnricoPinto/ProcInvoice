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
      const pdfParse = require("pdf-parse");
      const data = await pdfParse(buffer);
      const rawText: string = data.text || "";
      const lines = rawText.split("\n").map((l: string) => l.trim()).filter(Boolean);
      const blocks: OCRTextBlock[] = lines.map((line: string, idx: number) => ({
        text: line,
        bbox: { x0: 0, y0: idx * 20, x1: line.length * 10, y1: (idx + 1) * 20 },
        pageIndex: 0,
        confidence: 90,
      }));
      return { rawText, blocks, pageCount: data.numpages || 1 };
    } catch (err) {
      console.error("PDF parse error:", err);
      return { rawText: "", blocks: [], pageCount: 1 };
    }
  }
}
