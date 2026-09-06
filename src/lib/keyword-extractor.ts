import type { ExtractedInvoiceData } from "./ocr";
import type { RawOCRResult } from "./tesseract-engine";

export interface KeywordRuleInput {
  id?: string;
  fieldName: string;
  keywords: string[];
  matchType: string; // "EXACT" | "FUZZY" | "REGEX"
  regexPattern?: string | null;
  enabled?: boolean;
  priority?: number;
}

export const DEFAULT_KEYWORD_RULES: KeywordRuleInput[] = [
  {
    fieldName: "invoiceNumber",
    keywords: ["Invoice No", "Invoice Number", "Factuurnummer", "Factuurnr", "Invoice #", "Inv No", "Factuur nr"],
    matchType: "FUZZY",
    regexPattern: "(?:Invoice|Factuur)?(?:\\s*(?:No|Number|nr|#))?[:.]?\\s*([A-Za-z0-9-_/]+)",
    priority: 10,
  },
  {
    fieldName: "invoiceDate",
    keywords: ["Invoice Date", "Factuurdatum", "Date of Issue", "Factuur datum", "Date"],
    matchType: "FUZZY",
    regexPattern: "(?:\\d{4}[-/.]\\d{2}[-/.]\\d{2}|\\d{2}[-/.]\\d{2}[-/.]\\d{4})",
    priority: 9,
  },
  {
    fieldName: "dueDate",
    keywords: ["Due Date", "Vervaldatum", "Payment Due", "Betaaltermijn", "Verval datum"],
    matchType: "FUZZY",
    regexPattern: "(?:\\d{4}[-/.]\\d{2}[-/.]\\d{2}|\\d{2}[-/.]\\d{2}[-/.]\\d{4})",
    priority: 8,
  },
  {
    fieldName: "vendorName",
    keywords: ["Vendor", "Leverancier", "Company Name", "From", "Van", "Verkoper"],
    matchType: "FUZZY",
    priority: 7,
  },
  {
    fieldName: "vendorAddress",
    keywords: ["Vendor Address", "Adres leverancier", "Vestigingsadres", "Adres"],
    matchType: "FUZZY",
    priority: 6,
  },
  {
    fieldName: "vendorVAT",
    keywords: ["VAT Number", "VAT No", "BTW-nummer", "BTW nr", "BTW Id", "BTW-IdNummer", "Ust-IdNr"],
    matchType: "FUZZY",
    regexPattern: "(NL\\d{9}B\\d{2}|[A-Z]{2}[A-Z0-9]{2,12})",
    priority: 10,
  },
  {
    fieldName: "clientName",
    keywords: ["Bill To", "Client", "Klant", "Aan", "Factuuradres", "Customer"],
    matchType: "FUZZY",
    priority: 5,
  },
  {
    fieldName: "clientAddress",
    keywords: ["Client Address", "Klantadres", "Billing Address", "Afleveradres"],
    matchType: "FUZZY",
    priority: 4,
  },
  {
    fieldName: "iban",
    keywords: ["IBAN", "Bank Account", "Rekeningnummer", "IBAN-nummer", "BIC / IBAN"],
    matchType: "FUZZY",
    regexPattern: "([A-Z]{2}\\d{2}[A-Z0-9]{11,30})",
    priority: 10,
  },
  {
    fieldName: "subtotal",
    keywords: ["Subtotal", "Subtotaal", "Total excl. VAT", "Excl. BTW", "Net Amount"],
    matchType: "FUZZY",
    priority: 8,
  },
  {
    fieldName: "taxAmount",
    keywords: ["Tax Amount", "VAT Amount", "BTW 21%", "BTW bedrag", "BTW", "Tax"],
    matchType: "FUZZY",
    priority: 8,
  },
  {
    fieldName: "totalAmount",
    keywords: ["Total Amount", "Totaal", "Totaalbedrag", "Total EUR", "Grand Total", "Te betalen"],
    matchType: "FUZZY",
    priority: 10,
  },
];

/**
 * Extracts structured invoice data from raw OCR result using configured keyword rules.
 */
export function extractDataWithRules(
  ocrResult: RawOCRResult,
  rules: KeywordRuleInput[] = DEFAULT_KEYWORD_RULES
): ExtractedInvoiceData {
  const text = ocrResult.rawText || "";
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const result: ExtractedInvoiceData = {};

  // Sort rules by priority descending
  const sortedRules = [...rules].sort((a, b) => (b.priority || 0) - (a.priority || 0));

  for (const rule of sortedRules) {
    if (rule.enabled === false) continue;
    const extractedValue = extractSingleField(lines, text, rule);
    if (extractedValue) {
      assignFieldToResult(result, rule.fieldName, extractedValue);
    }
  }

  // Fallbacks for critical missing fields via direct regex scanning
  if (!result.vendorVAT) {
    const vatMatch = text.match(/\b(NL\d{9}B\d{2}|[A-Z]{2}[0-9A-Z]{8,12})\b/i);
    if (vatMatch) result.vendorVAT = vatMatch[1].toUpperCase();
  }

  if (!result.bankDetails) {
    const ibanMatch = text.match(/\b([A-Z]{2}\d{2}[A-Z0-9]{11,30})\b/);
    if (ibanMatch) result.bankDetails = `IBAN: ${ibanMatch[1]}`;
  }

  // Parse line items if present
  if (!result.lineItems || result.lineItems.length === 0) {
    result.lineItems = parseLineItemsFromLines(lines);
  }

  if (!result.currency) {
    if (text.includes("EUR") || text.includes("€")) result.currency = "EUR";
    else if (text.includes("USD") || text.includes("$")) result.currency = "USD";
    else if (text.includes("GBP") || text.includes("£")) result.currency = "GBP";
  }

  return result;
}

function extractSingleField(lines: string[], fullText: string, rule: KeywordRuleInput): string | null {
  for (const kw of rule.keywords) {
    if (!kw) continue;
    const lowerKw = kw.toLowerCase();

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lowerLine = line.toLowerCase();

      if (lowerLine.includes(lowerKw)) {
        // Try extracting value after keyword on same line
        const idx = lowerLine.indexOf(lowerKw);
        const afterKw = line.substring(idx + kw.length).replace(/^[:\s-]+/, "").trim();

        if (afterKw && afterKw.length > 0) {
          if (rule.regexPattern) {
            const re = new RegExp(rule.regexPattern, "i");
            const match = afterKw.match(re) || fullText.match(re);
            if (match) return match[1] || match[0];
          }
          return afterKw;
        }

        // Check next line for value if same line was just the label
        if (i + 1 < lines.length) {
          const nextLine = lines[i + 1].trim();
          if (nextLine && !isHeaderLine(nextLine)) {
            return nextLine;
          }
        }
      }
    }

    // Direct regex pattern match on full text if rule provides a pattern
    if (rule.regexPattern) {
      try {
        const re = new RegExp(rule.regexPattern, "i");
        const m = fullText.match(re);
        if (m) return m[1] || m[0];
      } catch {
        // invalid regex pattern ignored
      }
    }
  }

  return null;
}

function assignFieldToResult(target: ExtractedInvoiceData, fieldName: string, value: string) {
  const cleanVal = value.trim();
  if (!cleanVal) return;

  switch (fieldName) {
    case "invoiceNumber":
      target.invoiceNumber = target.invoiceNumber || cleanVal;
      break;
    case "invoiceDate":
      target.invoiceDate = target.invoiceDate || parseDateString(cleanVal);
      break;
    case "dueDate":
      target.dueDate = target.dueDate || parseDateString(cleanVal);
      break;
    case "vendorName":
      target.vendorName = target.vendorName || cleanVal;
      break;
    case "vendorAddress":
      target.vendorAddress = target.vendorAddress || cleanVal;
      break;
    case "vendorVAT":
      target.vendorVAT = target.vendorVAT || cleanVal.toUpperCase();
      break;
    case "clientName":
      target.clientName = target.clientName || cleanVal;
      break;
    case "clientAddress":
      target.clientAddress = target.clientAddress || cleanVal;
      break;
    case "iban":
    case "bankDetails":
      target.bankDetails = target.bankDetails || (cleanVal.startsWith("IBAN") ? cleanVal : `IBAN: ${cleanVal}`);
      break;
    case "subtotal":
      target.subtotal = target.subtotal || parseAmount(cleanVal);
      break;
    case "taxAmount":
      target.taxAmount = target.taxAmount || parseAmount(cleanVal);
      break;
    case "totalAmount":
      target.totalAmount = target.totalAmount || parseAmount(cleanVal);
      break;
    case "notes":
      target.notes = target.notes || cleanVal;
      break;
  }
}

function parseDateString(str: string): string {
  const match = str.match(/(\d{4}[-/.]\d{2}[-/.]\d{2}|\d{2}[-/.]\d{2}[-/.]\d{4})/);
  if (match) return match[1];
  return str;
}

function parseAmount(str: string): number {
  const clean = str.replace(/[^0-9,.-]/g, "").replace(",", ".");
  const num = parseFloat(clean);
  return isNaN(num) ? 0 : num;
}

function isHeaderLine(line: string): boolean {
  const lower = line.toLowerCase();
  return (
    lower.includes("invoice") ||
    lower.includes("factuur") ||
    lower.includes("total") ||
    lower.includes("totaal")
  );
}

function parseLineItemsFromLines(lines: string[]): Array<{ description: string; quantity: number; unitPrice: number; total: number }> {
  const items: Array<{ description: string; quantity: number; unitPrice: number; total: number }> = [];

  for (const line of lines) {
    // Look for pattern: Description ... Quantity ... UnitPrice ... Total
    const match = line.match(/^(.+?)\s+(\d+)\s+([\d,.]+)\s+([\d,.]+)$/);
    if (match) {
      const desc = match[1].trim();
      const qty = parseInt(match[2], 10);
      const price = parseAmount(match[3]);
      const tot = parseAmount(match[4]);
      if (desc && !isNaN(qty) && !isNaN(price)) {
        items.push({ description: desc, quantity: qty, unitPrice: price, total: tot });
      }
    }
  }

  return items;
}
