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
    fieldName: "classifiedType",
    keywords: [
      "Factuur",
      "Factur",
      "Rekening",
      "Credit nota",
      "Nota",
      "Debit nota",
      "Creditfactuur",
      "Bon",
      "Invoice",
    ],
    matchType: "FUZZY",
    priority: 100,
  },
  {
    fieldName: "invoiceNumber",
    keywords: [
      "Factuurnummer",
      "Factuur no.",
      "Factuur Nr.",
      "Facture nummer",
      "Nummer",
      "No.",
      "Document number",
      "Document Nr.",
      "Document No.",
      "Fact.",
      "Kenmerk",
      "Bon no.",
      "Invoice No",
      "Invoice Number",
      "Factuurnr",
      "Invoice #",
      "Inv No",
      "Factuur nr",
    ],
    matchType: "FUZZY",
    regexPattern: "(?:Invoice|Factuur|Facture|Document|Bon)?(?:\\s*(?:No|Number|nr|#|nummer))?[:.]?\\s*([A-Za-z0-9-_/]+)",
    priority: 10,
  },
  {
    fieldName: "invoiceDate",
    keywords: [
      "Datum",
      "Factuur Datum",
      "Facture date",
      "Factuur date",
      "Invoice date",
      "Factuurdatum",
      "Date of Issue",
      "Date",
    ],
    matchType: "FUZZY",
    regexPattern: "(?:\\d{4}[-/.]\\d{2}[-/.]\\d{2}|\\d{2}[-/.]\\d{2}[-/.]\\d{4})",
    priority: 9,
  },
  {
    fieldName: "dueDate",
    keywords: [
      "Vervaldatum",
      "Due Date",
      "Payment Due",
      "Betaaltermijn",
      "Verval datum",
      "Betaal vóór",
    ],
    matchType: "FUZZY",
    regexPattern: "(?:\\d{4}[-/.]\\d{2}[-/.]\\d{2}|\\d{2}[-/.]\\d{2}[-/.]\\d{4})",
    priority: 8,
  },
  {
    fieldName: "vendorName",
    keywords: [
      "Leverancier",
      "Van",
      "Vendor",
      "Company Name",
      "From",
      "Verkoper",
    ],
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
    keywords: [
      "VAT Number",
      "VAT No",
      "BTW-nummer",
      "BTW nr",
      "BTW Id",
      "BTW-IdNummer",
      "Ust-IdNr",
      "Btw-nummer",
      "Btw-id",
    ],
    matchType: "FUZZY",
    regexPattern: "(NL\\d{9}B\\d{2}|[A-Z]{2}[A-Z0-9]{2,12})",
    priority: 10,
  },
  {
    fieldName: "clientName",
    keywords: [
      "Factureer aan",
      "Factuur aan",
      "Gefactureerd aan",
      "Aan",
      "Debtor",
      "Klant",
      "Bill To",
      "Client",
      "Customer",
      "Ontvanger",
    ],
    matchType: "FUZZY",
    priority: 5,
  },
  {
    fieldName: "clientAddress",
    keywords: ["Factuuradres", "Client Address", "Klantadres", "Billing Address", "Afleveradres"],
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
  {
    fieldName: "paymentTerms",
    keywords: ["Betalingstermijn", "Betalingsvoorwaarden", "Payment Terms", "Terms", "Condities", "Vervaltermijn"],
    matchType: "FUZZY",
    priority: 6,
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
  const result: ExtractedInvoiceData = {
    lineItems: [],
  };

  // Sort rules by priority descending
  const sortedRules = [...rules].sort((a, b) => (b.priority || 0) - (a.priority || 0));

  // 1. Detect classifiedType from OCR text region ABOVE the line-items table
  result.classifiedType = detectClassifiedType(lines, text, sortedRules);

  // 2. Extract standard fields
  for (const rule of sortedRules) {
    if (rule.enabled === false || rule.fieldName === "classifiedType") continue;
    const extractedValue = extractSingleField(lines, text, rule);
    if (extractedValue) {
      assignFieldToResult(result, rule.fieldName, extractedValue);
    }
  }

  // Fallbacks for critical missing fields via direct regex scanning
  if (!result.vendorVAT) {
    const vatMatch = text.match(/\b(NL\d{9}B\d{2}|[A-Z]{2}\d{6,12}[A-Z0-9]{0,4})\b/i);
    if (vatMatch && /\d/.test(vatMatch[1])) {
      result.vendorVAT = vatMatch[1].toUpperCase();
    }
  }

  if (!result.bankDetails) {
    const ibanMatch = text.match(/\b([A-Z]{2}\d{2}[A-Z0-9]{11,30})\b/);
    if (ibanMatch) result.bankDetails = `IBAN: ${ibanMatch[1]}`;
  }

  // Parse line items if not already populated
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

/**
 * Detects whether the document is "Factuur" or "Overige document"
 * by scanning the OCR text region ABOVE the line-items table
 * for keywords defined in the classifiedType rule.
 */
export function detectClassifiedType(
  lines: string[],
  fullText: string,
  rules: KeywordRuleInput[]
): "Factuur" | "Overige document" {
  const classifiedRule =
    rules.find((r) => r.fieldName === "classifiedType") || DEFAULT_KEYWORD_RULES[0];

  let keywords: string[] = [
    "Factuur",
    "Factur",
    "Rekening",
    "Credit nota",
    "Nota",
    "Debit nota",
    "Creditfactuur",
    "Bon",
    "Invoice",
  ];

  if (classifiedRule && classifiedRule.keywords) {
    if (Array.isArray(classifiedRule.keywords)) {
      keywords = classifiedRule.keywords;
    } else {
      try {
        keywords = JSON.parse(classifiedRule.keywords as unknown as string);
      } catch {
        keywords = (classifiedRule.keywords as unknown as string)
          .split(",")
          .map((s) => s.trim());
      }
    }
  }

  // Find line items table header line
  const tableKeywords = [
    "description",
    "omschrijving",
    "artikel",
    "item",
    "qty",
    "aantal",
    "unit price",
    "eenheidsprijs",
    "prijs",
    "price",
  ];

  let tableIndex = -1;
  for (let i = 0; i < lines.length; i++) {
    const lowerLine = lines[i].toLowerCase();
    let matches = 0;
    for (const tk of tableKeywords) {
      if (lowerLine.includes(tk)) matches++;
    }
    if (matches >= 2) {
      tableIndex = i;
      break;
    }
  }

  // If table header found, consider text above it; otherwise use full text
  const regionAboveTable =
    tableIndex > 0 ? lines.slice(0, tableIndex).join("\n") : fullText;

  for (const kw of keywords) {
    if (!kw || kw.trim().length === 0) continue;
    const escaped = escapeRegex(kw.trim());
    const regex = new RegExp(`(^|[^a-zA-Z0-9])${escaped}([^a-zA-Z0-9]|$)`, "i");
    if (regex.test(regionAboveTable)) {
      return "Factuur";
    }
  }

  return "Overige document";
}

function extractSingleField(
  lines: string[],
  fullText: string,
  rule: KeywordRuleInput
): string | null {
  // Sort keywords by length descending so longer phrases match first
  const sortedKeywords = [...rule.keywords]
    .map((k) => k.trim())
    .filter((k) => k.length > 0)
    .sort((a, b) => b.length - a.length);

  for (const kw of sortedKeywords) {
    const escapedKw = escapeRegex(kw);
    // Match keyword with boundary
    const kwRegex = new RegExp(`(?:^|[^a-zA-Z0-9])(${escapedKw})(?:[:\\s#.-]|$)`, "i");

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const match = kwRegex.exec(line);

      if (match) {
        const kwIndex = line.toLowerCase().indexOf(kw.toLowerCase(), match.index);
        if (kwIndex === -1) continue;

        const afterKw = line.substring(kwIndex + kw.length).replace(/^[:\s#.-]+/, "").trim();

        // 1. Value after keyword on the same line
        if (afterKw.length > 0 && !isHeaderLine(afterKw)) {
          if (rule.regexPattern) {
            try {
              const reg = new RegExp(rule.regexPattern, "i");
              const m = afterKw.match(reg);
              if (m && (m[1] || m[0])) return (m[1] || m[0]).trim();
            } catch {
              // fallback
            }
          }
          return afterKw;
        }

        // 2. Value on next line if same line was empty
        if (i + 1 < lines.length) {
          const nextLine = lines[i + 1].trim();
          if (nextLine.length > 0 && !isHeaderLine(nextLine)) {
            if (rule.regexPattern) {
              try {
                const reg = new RegExp(rule.regexPattern, "i");
                const m = nextLine.match(reg);
                if (m && (m[1] || m[0])) return (m[1] || m[0]).trim();
              } catch {
                // fallback
              }
            }
            return nextLine;
          }
        }
      }
    }
  }

  // Fallback: search full text with regex pattern if provided
  if (rule.regexPattern) {
    try {
      const regex = new RegExp(rule.regexPattern, "i");
      const match = fullText.match(regex);
      const val = match && (match[1] || match[0]) ? (match[1] || match[0]).trim() : null;
      if (val && !isHeaderLine(val)) {
        if (rule.fieldName === "vendorVAT" && (!/\d/.test(val) || val.length < 8)) {
          return null;
        }
        return val;
      }
    } catch {
      // ignore
    }
  }

  return null;
}

function assignFieldToResult(
  target: ExtractedInvoiceData,
  fieldName: string,
  val: string
) {
  const cleanVal = val.trim();
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
      if (/\d/.test(cleanVal) && cleanVal.length >= 8) {
        target.vendorVAT = target.vendorVAT || cleanVal.toUpperCase();
      }
      break;
    case "clientName":
      target.clientName = target.clientName || cleanVal;
      break;
    case "clientAddress":
      target.clientAddress = target.clientAddress || cleanVal;
      break;
    case "iban":
    case "bankDetails":
      target.bankDetails =
        target.bankDetails ||
        (cleanVal.startsWith("IBAN") ? cleanVal : `IBAN: ${cleanVal}`);
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
    case "paymentTerms":
      target.paymentTerms = target.paymentTerms || cleanVal;
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
  const clean = str.replace(/[^0-9,.-]/g, "").trim();
  if (!clean) return 0;
  const lastComma = clean.lastIndexOf(",");
  const lastDot = clean.lastIndexOf(".");
  if (lastComma > lastDot) {
    // European format: 83.885,00 -> remove dots, replace comma with dot
    const numStr = clean.replace(/\./g, "").replace(",", ".");
    const num = parseFloat(numStr);
    return isNaN(num) ? 0 : num;
  } else if (lastDot > lastComma) {
    // US format: 83,885.00 -> remove commas
    const numStr = clean.replace(/,/g, "");
    const num = parseFloat(numStr);
    return isNaN(num) ? 0 : num;
  } else if (lastComma !== -1) {
    // 123,45 -> 123.45
    const numStr = clean.replace(",", ".");
    const num = parseFloat(numStr);
    return isNaN(num) ? 0 : num;
  }
  const num = parseFloat(clean);
  return isNaN(num) ? 0 : num;
}

function isHeaderLine(line: string): boolean {
  const lower = line.toLowerCase().trim().replace(/[:#.-]+$/, "");
  return (
    lower === "invoice" ||
    lower === "factuur" ||
    lower === "total" ||
    lower === "totaal" ||
    lower === "subtotaal" ||
    lower === "description" ||
    lower === "omschrijving" ||
    lower === "factureer aan" ||
    lower === "factuur aan" ||
    lower === "aan" ||
    lower === "van" ||
    lower === "from" ||
    lower === "to" ||
    lower === "bill to" ||
    lower.startsWith("factureer aan") ||
    lower.startsWith("bill to") ||
    lower.endsWith(":")
  );
}

function findLineItemTableStartIndex(lines: string[]): number {
  const tableKeywords = [
    "description",
    "omschrijving",
    "artikel",
    "item",
    "qty",
    "aantal",
    "unit price",
    "eenheidsprijs",
    "prijs",
    "price",
  ];
  for (let i = 0; i < lines.length; i++) {
    const lower = lines[i].toLowerCase();
    let matches = 0;
    for (const tk of tableKeywords) {
      if (lower.includes(tk)) matches++;
    }
    if (matches >= 2) return i;
  }
  return -1;
}

function parseLineItemsFromLines(
  lines: string[]
): Array<{ description: string; quantity: number; unitPrice: number; total: number }> {
  const tableStart = findLineItemTableStartIndex(lines);
  const candidateLines = tableStart >= 0 ? lines.slice(tableStart + 1) : lines;
  const items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }> = [];

  const stopKeywords = ["subtotaal", "subtotal", "totaal", "total", "btw", "tax", "korting", "discount", "pagina", "page", "bank", "iban"];
  const ignorePrefixes = ["datum", "date", "factuur", "invoice", "tel:", "e-mail", "van:", "aan:"];

  for (const line of candidateLines) {
    const lower = line.toLowerCase().trim();
    if (stopKeywords.some((sk) => lower.startsWith(sk))) {
      continue;
    }
    if (ignorePrefixes.some((ip) => lower.startsWith(ip))) {
      continue;
    }

    const match = line.match(/^(.+?)\s*(\d+)\s*(?:€|\$|£)?\s*([\d.]+,\d{2}|[\d,.]+)\s*(?:€|\$|£)?\s*([\d.]+,\d{2}|[\d,.]+)$/);
    if (match) {
      const desc = match[1].trim();
      const qty = parseInt(match[2], 10);
      const price = parseAmount(match[3]);
      const tot = parseAmount(match[4]);
      if (desc && !isNaN(qty) && !isNaN(price) && desc.length > 2) {
        items.push({
          description: desc,
          quantity: qty,
          unitPrice: price,
          total: tot,
        });
      }
    }
  }

  return items;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
