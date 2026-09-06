import { prisma } from "./prisma";
import { CloudOCREngine, type OCREngine, type RawOCRResult } from "./tesseract-engine";
import { extractDataWithRules, DEFAULT_KEYWORD_RULES, type KeywordRuleInput } from "./keyword-extractor";

export interface ExtractedInvoiceData {
  invoiceNumber?: string;
  invoiceDate?: string;
  dueDate?: string;
  vendorName?: string;
  vendorAddress?: string;
  vendorVAT?: string;
  clientName?: string;
  clientAddress?: string;
  lineItems?: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  subtotal?: number;
  taxRate?: number;
  taxAmount?: number;
  totalAmount?: number;
  currency?: string;
  paymentTerms?: string;
  bankDetails?: string;
  notes?: string;
}

export interface OCRResult {
  rawOCR: RawOCRResult;
  extractedData: ExtractedInvoiceData;
}

// Pluggable active engine instance — uses Google Cloud Vision API
let activeEngine: OCREngine = new CloudOCREngine();

export function setOCREngine(engine: OCREngine) {
  activeEngine = engine;
}

/**
 * Server-side OCR recognition and keyword extraction.
 */
export async function recognizeInvoice(
  fileBuffer: Buffer,
  mimeType: string
): Promise<ExtractedInvoiceData> {
  try {
    // 1. Perform raw OCR
    const rawResult = await activeEngine.recognize(fileBuffer, mimeType);

    // 2. Fetch keyword rules from database
    let rules: KeywordRuleInput[] = DEFAULT_KEYWORD_RULES;
    try {
      const dbRules = await prisma.keywordRule.findMany({
        where: { enabled: true },
        orderBy: { priority: "desc" },
      });

      if (dbRules && dbRules.length > 0) {
        rules = dbRules.map((r) => {
          let kwArray: string[] = [];
          try {
            kwArray = JSON.parse(r.keywords);
          } catch {
            kwArray = r.keywords.split(",").map((s) => s.trim());
          }
          return {
            id: r.id,
            fieldName: r.fieldName,
            keywords: kwArray,
            matchType: r.matchType,
            regexPattern: r.regexPattern,
            enabled: r.enabled,
            priority: r.priority,
          };
        });
      }
    } catch (e) {
      console.warn("Could not query db rules, falling back to default keyword rules:", e);
    }

    // 3. Extract fields based on rules
    const extractedData = extractDataWithRules(rawResult, rules);

    // 4. Fill in missing fields with AI-extracted fields if available
    if (rawResult.extractedFields) {
      for (const [key, val] of Object.entries(rawResult.extractedFields)) {
        const k = key as keyof ExtractedInvoiceData;
        const currentVal = extractedData[k];
        if (
          val !== undefined &&
          val !== null &&
          (currentVal === undefined || currentVal === null || currentVal === "" || (Array.isArray(currentVal) && currentVal.length === 0))
        ) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (extractedData as any)[k] = val;
        }
      }
    }

    return extractedData;
  } catch (err) {
    console.error("OCR recognition error:", err);
    throw err;
  }
}
