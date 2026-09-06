import { createWorker } from "tesseract.js";
import path from "path";
import os from "os";
import fs from "fs";

// Timeout wrapper: rejects if OCR takes longer than ms
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
    promise.then(
      (v) => { clearTimeout(timer); resolve(v); },
      (e) => { clearTimeout(timer); reject(e); }
    );
  });
}

/**
 * Ensures the bundled eng.traineddata is available in /tmp/tesseract-cache.
 * Uses a STATICALLY-SCOPED path (process.cwd() + "tessdata") so Turbopack
 * does NOT trace and bundle the entire project directory.
 */
async function ensureLangData(): Promise<string> {
  const cacheDir = path.join(os.tmpdir(), "tesseract-cache");
  const cachedFile = path.join(cacheDir, "eng.traineddata");

  // Already in /tmp from a previous warm Lambda invocation — skip copy
  if (fs.existsSync(/*turbopackIgnore: true*/ cachedFile)) {
    return cacheDir;
  }

  // Create the cache dir in /tmp (the only writable dir on Vercel)
  await fs.promises.mkdir(cacheDir, { recursive: true });

  // Statically-scoped source path — Turbopack can safely trace this
  const sourcePath = path.join(process.cwd(), "tessdata", "eng.traineddata");

  if (fs.existsSync(/*turbopackIgnore: true*/ sourcePath)) {
    // Copy the bundled file into /tmp (no network, same machine — fast)
    await fs.promises.copyFile(sourcePath, cachedFile);
    console.log("[Tesseract] Copied bundled traineddata to /tmp");
    return cacheDir;
  }

  // Last resort fallback: let Tesseract download from CDN
  // (only happens if tessdata/ folder wasn't deployed correctly)
  console.warn("[Tesseract] Bundled traineddata not found at", sourcePath, "— will download from CDN");
  return cacheDir;
}

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
      // Normalise to PNG — handles AVIF / WebP / JPEG for Tesseract
      inputBuffer = await sharp(buffer).png().toBuffer();
    } catch (e) {
      console.warn("sharp pre-processing failed, using raw buffer:", e);
    }

    // Ensure the bundled traineddata is available in /tmp before starting worker
    const cachePath = await ensureLangData();

    const worker = await createWorker("eng", 1, { cachePath });
    try {
      // Hard 50-second timeout — prevents stuck PROCESSING status on Vercel
      const ret = await withTimeout(
        worker.recognize(inputBuffer),
        50_000,
        "Tesseract.recognize"
      );
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

      return { rawText, blocks, pageCount: 1 };
    } finally {
      await worker.terminate().catch(() => {});
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

      return { rawText, blocks, pageCount: data.numpages || 1 };
    } catch (err) {
      console.error("PDF parse error in TesseractOCREngine:", err);
      return { rawText: "", blocks: [], pageCount: 1 };
    }
  }
}
