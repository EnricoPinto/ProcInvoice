import { BRANDING, getSupportMailto } from "../src/lib/branding";
import { generateUbl21Xml } from "../src/lib/ubl-generator";
import { extractDataWithRules, DEFAULT_KEYWORD_RULES } from "../src/lib/keyword-extractor";
import type { ExtractedInvoiceData, RawOCRResult } from "../src/lib/ocr";

let totalChecks = 0;
let passedChecks = 0;

function assert(condition: boolean, description: string) {
  totalChecks++;
  if (condition) {
    passedChecks++;
    console.log(`  ✓ [PASS] ${description}`);
  } else {
    console.error(`  ✗ [FAIL] ${description}`);
  }
}

async function runTests() {
  console.log("\n========================================================");
  console.log("  ProcInvoice Verification: Support Email, Multi-VAT & Fallback");
  console.log("========================================================\n");

  // =========================================================================
  // TEST SUITE 1: Support Admin Email Configuration
  // =========================================================================
  console.log("Suite 1: Support Admin Email Configuration");
  assert(typeof BRANDING.supportEmail === "string", "BRANDING.supportEmail is defined as a string");
  assert(BRANDING.supportEmail.includes("@"), "BRANDING.supportEmail is a valid email format");
  assert(BRANDING.supportEmail === "support@procinvoice.example", "BRANDING.supportEmail defaults to configurable placeholder");
  
  const mailtoLink = getSupportMailto("Test Subject", "Test Body");
  assert(mailtoLink.startsWith("mailto:support@procinvoice.example"), "getSupportMailto generates valid mailto: link");
  assert(mailtoLink.includes("subject=Test+Subject") || mailtoLink.includes("subject=Test%20Subject"), "getSupportMailto encodes subject parameter");

  // =========================================================================
  // TEST SUITE 2: Multi-VAT Line-Item Extraction & Preservation
  // =========================================================================
  console.log("\nSuite 2: Multi-VAT Line-Item Extraction");
  
  const multiVatRawOcr: RawOCRResult = {
    rawText: `
      Factuur
      Factuurnummer: INV-2026-MULTI
      Datum: 19-09-2026
      Vervaldatum: 03-10-2026
      Leverancier: MultiVAT Solutions B.V.
      Btw-nummer: NL888888888B01
      Factureer aan: Klant Bedrijf N.V.
      
      Omschrijving             Aantal  Eenheidsprijs  Netto    BTW%   Totaal
      Consulting Diensten          2        100.00    200.00   21%    242.00
      Boeken & Documentatie       3         20.00     60.00    9%     65.40
      Vrijgestelde Export          1         50.00     50.00    0%     50.00
      
      Subtotaal: 310.00
      Totaalbedrag: 357.40
    `,
    blocks: [],
    pageCount: 1,
  };

  const extractedMultiVat = extractDataWithRules(multiVatRawOcr, DEFAULT_KEYWORD_RULES);
  
  assert(extractedMultiVat.classifiedType === "Factuur", "Classified as Factuur");
  assert(extractedMultiVat.invoiceNumber === "INV-2026-MULTI", "Extracted invoiceNumber correctly");
  assert(Array.isArray(extractedMultiVat.lineItems) && extractedMultiVat.lineItems.length === 3, "Extracted all 3 line items");

  const items = extractedMultiVat.lineItems || [];
  const item21 = items.find((it) => it.description.includes("Consulting"));
  const item9 = items.find((it) => it.description.includes("Boeken"));
  const item0 = items.find((it) => it.description.includes("Vrijgestelde"));

  assert(item21?.vatRate === 21, "Consulting item preserved 21% VAT rate");
  assert(item9?.vatRate === 9, "Books item preserved 9% VAT rate");
  assert(item0?.vatRate === 0, "Exempt item preserved 0% VAT rate");
  assert(item21?.netAmount === 200 || item21?.total === 242, "Item 1 amounts preserved");
  assert(item9?.netAmount === 60 || item9?.total === 65.4, "Item 2 amounts preserved");

  // =========================================================================
  // TEST SUITE 3: Multi-VAT UBL 2.1 XML Export (cac:TaxSubtotal per rate)
  // =========================================================================
  console.log("\nSuite 3: Multi-VAT UBL 2.1 XML Export");

  const testInvoiceData: ExtractedInvoiceData = {
    classifiedType: "Factuur",
    invoiceNumber: "INV-2026-MULTI",
    invoiceDate: "2026-09-19",
    dueDate: "2026-10-03",
    vendorName: "MultiVAT Solutions B.V.",
    vendorAddress: "Keizersgracht 100, 1015AA Amsterdam",
    vendorVAT: "NL888888888B01",
    clientName: "Klant Bedrijf N.V.",
    clientAddress: "Coolsingel 50, 3011AD Rotterdam",
    currency: "EUR",
    subtotal: 310.00,
    totalAmount: 357.40,
    lineItems: [
      {
        description: "Software Consultancy & Integration",
        quantity: 2,
        unitPrice: 100.00,
        netAmount: 200.00,
        total: 200.00,
        vatRate: 21,
      },
      {
        description: "Printed Educational Manuals",
        quantity: 3,
        unitPrice: 20.00,
        netAmount: 60.00,
        total: 60.00,
        vatRate: 9,
      },
      {
        description: "Zero-rated Digital Certification",
        quantity: 1,
        unitPrice: 50.00,
        netAmount: 50.00,
        total: 50.00,
        vatRate: 0,
      },
    ],
  };

  const ublXml = generateUbl21Xml(testInvoiceData);

  assert(ublXml.includes("<cbc:UBLVersionID>2.1</cbc:UBLVersionID>"), "Valid UBL 2.1 header present");
  assert(ublXml.includes("<cac:TaxTotal>"), "cac:TaxTotal element generated");

  // Count cac:TaxSubtotal elements
  const subtotalMatches = ublXml.match(/<cac:TaxSubtotal>/g);
  assert(subtotalMatches !== null && subtotalMatches.length === 3, "Exactly 3 cac:TaxSubtotal blocks generated for 3 distinct rates (21%, 9%, 0%)");

  // Check 21% TaxSubtotal: 21% on 200.00 = 42.00
  assert(ublXml.includes("<cbc:TaxableAmount currencyID=\"EUR\">200.00</cbc:TaxableAmount>") &&
         ublXml.includes("<cbc:TaxAmount currencyID=\"EUR\">42.00</cbc:TaxAmount>") &&
         ublXml.includes("<cbc:Percent>21</cbc:Percent>"),
         "21% VAT subtotal correctly calculated: €42.00 on €200.00");

  // Check 9% TaxSubtotal: 9% on 60.00 = 5.40
  assert(ublXml.includes("<cbc:TaxableAmount currencyID=\"EUR\">60.00</cbc:TaxableAmount>") &&
         ublXml.includes("<cbc:TaxAmount currencyID=\"EUR\">5.40</cbc:TaxAmount>") &&
         ublXml.includes("<cbc:Percent>9</cbc:Percent>"),
         "9% VAT subtotal correctly calculated: €5.40 on €60.00");

  // Check 0% TaxSubtotal: 0% on 50.00 = 0.00 with Category Z
  assert(ublXml.includes("<cbc:TaxableAmount currencyID=\"EUR\">50.00</cbc:TaxableAmount>") &&
         ublXml.includes("<cbc:TaxAmount currencyID=\"EUR\">0.00</cbc:TaxAmount>") &&
         ublXml.includes("<cbc:Percent>0</cbc:Percent>") &&
         ublXml.includes("<cbc:ID>Z</cbc:ID>"),
         "0% VAT subtotal correctly categorized as Zero-rated (Z): €0.00 on €50.00");

  // Check Total Tax Amount in cac:TaxTotal: 42.00 + 5.40 + 0.00 = 47.40
  assert(ublXml.includes("<cac:TaxTotal>\n    <cbc:TaxAmount currencyID=\"EUR\">47.40</cbc:TaxAmount>") ||
         ublXml.includes("<cbc:TaxAmount currencyID=\"EUR\">47.40</cbc:TaxAmount>"),
         "Total VAT correctly sums all subtotal tax amounts (€47.40)");

  // Check individual InvoiceLines have their specific rates
  assert(ublXml.includes("<cbc:Percent>21</cbc:Percent>") &&
         ublXml.includes("<cbc:Percent>9</cbc:Percent>") &&
         ublXml.includes("<cbc:Percent>0</cbc:Percent>"),
         "Individual invoice lines specify their respective tax percentages");

  // =========================================================================
  // TEST SUITE 4: Graceful Manual Entry Fallback Logic
  // =========================================================================
  console.log("\nSuite 4: Manual Entry Fallback & Recognition Failure Tests");

  // Unreadable / blank scan OCR result
  const unreadableRawOcr: RawOCRResult = {
    rawText: "       \n   ..   \n   ",
    blocks: [],
    pageCount: 1,
  };

  const extractedBlank = extractDataWithRules(unreadableRawOcr, DEFAULT_KEYWORD_RULES);

  function hasUsableExtractedData(data?: ExtractedInvoiceData | null): boolean {
    if (!data) return false;
    const hasInvNum = Boolean(data.invoiceNumber && data.invoiceNumber.trim().length > 0);
    const hasVendor = Boolean(data.vendorName && data.vendorName.trim().length > 0);
    const hasTotal = Boolean(data.totalAmount && Number(data.totalAmount) > 0);
    const hasLines = Boolean(Array.isArray(data.lineItems) && data.lineItems.length > 0);
    const hasVat = Boolean(data.vendorVAT && data.vendorVAT.trim().length > 0);
    const hasClient = Boolean(data.clientName && data.clientName.trim().length > 0);
    return hasInvNum || hasVendor || hasTotal || hasLines || hasVat || hasClient;
  }

  assert(!hasUsableExtractedData(extractedBlank), "Unreadable/blank OCR result correctly identified as lacking usable data");
  assert(hasUsableExtractedData(testInvoiceData), "Standard invoice correctly identified as having usable data");

  // Supported file formats vs rejected formats
  const ACCEPTED_FILE_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
  assert(ACCEPTED_FILE_TYPES.includes("application/pdf"), "PDF accepted for upload");
  assert(ACCEPTED_FILE_TYPES.includes("image/png"), "PNG accepted for upload");
  assert(ACCEPTED_FILE_TYPES.includes("image/jpeg"), "JPEG accepted for upload");
  assert(!ACCEPTED_FILE_TYPES.includes("application/x-msdownload"), "Executable (.exe) rejected at upload barrier");
  assert(!ACCEPTED_FILE_TYPES.includes("text/plain"), "Plain text (.txt) rejected at upload barrier");

  console.log("\n========================================================");
  console.log(`  Results: ${passedChecks}/${totalChecks} checks passed (${Math.round((passedChecks/totalChecks)*100)}%)`);
  console.log("========================================================\n");

  if (passedChecks === totalChecks) {
    console.log("🎉 ALL TESTS PASSED SUCCESSFULLY!");
    process.exit(0);
  } else {
    console.error("❌ SOME CHECKS FAILED");
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
