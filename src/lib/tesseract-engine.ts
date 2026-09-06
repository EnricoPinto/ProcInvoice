import { createWorker } from "tesseract.js";

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
}

export interface OCREngine {
  recognize(buffer: Buffer, mimeType: string): Promise<RawOCRResult>;
}

export class TesseractOCREngine implements OCREngine {
  async recognize(buffer: Buffer, mimeType: string): Promise<RawOCRResult> {
    if (mimeType === "application/pdf") {
      return this.recognizePdf(buffer);
    } else {
      return this.recognizeImage(buffer);
    }
  }

  private async recognizeImage(buffer: Buffer, pageIndex = 0): Promise<RawOCRResult> {
    let inputBuffer = buffer;
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const sharp = require("sharp");
      inputBuffer = await sharp(buffer).png().toBuffer();
    } catch (e) {
      console.warn("Could not pre-process image with sharp, using raw buffer:", e);
    }

    const worker = await createWorker("eng");
    try {
      const ret = await worker.recognize(inputBuffer);
      const rawText = ret.data.text || "";
      const blocks: OCRTextBlock[] = [];

      const dataAny = ret.data as unknown as {
        blocks?: Array<{ text: string; bbox: { x0: number; y0: number; x1: number; y1: number }; confidence: number }>;
        lines?: Array<{ text: string; bbox: { x0: number; y0: number; x1: number; y1: number }; confidence: number }>;
      };

      if (dataAny.blocks) {
        for (const b of dataAny.blocks) {
          blocks.push({
            text: b.text.trim(),
            bbox: { x0: b.bbox.x0, y0: b.bbox.y0, x1: b.bbox.x1, y1: b.bbox.y1 },
            pageIndex,
            confidence: b.confidence,
          });
        }
      } else if (dataAny.lines) {
        for (const l of dataAny.lines) {
          blocks.push({
            text: l.text.trim(),
            bbox: { x0: l.bbox.x0, y0: l.bbox.y0, x1: l.bbox.x1, y1: l.bbox.y1 },
            pageIndex,
            confidence: l.confidence,
          });
        }
      }

      return {
        rawText,
        blocks,
        pageCount: 1,
      };
    } finally {
      await worker.terminate();
    }
  }

  private async recognizePdf(buffer: Buffer): Promise<RawOCRResult> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pdfParse = require("pdf-parse");
      const data = await pdfParse(buffer);
      const rawText = data.text || "";
      const lines = rawText.split("\n").map((l: string) => l.trim()).filter(Boolean);
      const blocks: OCRTextBlock[] = lines.map((line: string, idx: number) => ({
        text: line,
        bbox: { x0: 0, y0: idx * 20, x1: line.length * 10, y1: (idx + 1) * 20 },
        pageIndex: 0,
        confidence: 90,
      }));

      return {
        rawText,
        blocks,
        pageCount: data.numpages || 1,
      };
    } catch (err) {
      console.error("PDF parse error in TesseractOCREngine:", err);
      return { rawText: "", blocks: [], pageCount: 1 };
    }
  }
}
