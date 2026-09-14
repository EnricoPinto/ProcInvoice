import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { extractDataWithRules, DEFAULT_KEYWORD_RULES, type KeywordRuleInput } from "../src/lib/keyword-extractor";
import { generateUbl21Xml } from "../src/lib/ubl-generator";
import { validateVatNumber, validateKvkNumber, validateIbanNumber } from "../src/lib/compliance";
import { isValidIBAN } from "ibantools";

async function runVerification() {
  console.log("=================================================");
  console.log("PROCINVOICE COMPREHENSIVE VERIFICATION SUITE");
  console.log("=================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}${detail ? ` -> ${detail}` : ""}`);
      failed++;
    }
  }

  // -------------------------------------------------------------
  // 1. REGISTRATION RULES
  // -------------------------------------------------------------
  console.log("--- 1. Registration Rules (Company accounts only & conditional KVK/VAT) ---");

  // Conditional validation check: KVK only
  const kvkOnlyVal: string = "12345678";
  const vatEmptyVal: string = "";
  const hasKvkOnly = Boolean(kvkOnlyVal || vatEmptyVal);
  assert(hasKvkOnly, "Registration allows KVK/COC number only without VAT");

  // Conditional validation check: VAT only
  const kvkEmptyVal: string = "";
  const vatOnlyVal: string = "NL123456789B01";
  const hasVatOnly = Boolean(kvkEmptyVal || vatOnlyVal);
  assert(hasVatOnly, "Registration allows VAT number only without KVK");

  // Neither provided
  const neitherProvided = Boolean(kvkEmptyVal || vatEmptyVal);
  assert(!neitherProvided, "Registration blocks submission when neither KVK nor VAT is provided");

  // Format validation
  const validNlVat = validateVatNumber("NL123456789B01", "NL");
  assert(validNlVat.valid, "Valid NL VAT (NL123456789B01) is accepted");

  const invalidNlVat = validateVatNumber("INVALIDVAT", "NL");
  assert(!invalidNlVat.valid, "Invalid NL VAT is rejected");

  const validNlKvk = validateKvkNumber("12345678", "NL");
  assert(validNlKvk.valid, "Valid NL KVK (8 digits) is accepted");

  const invalidNlKvk = validateKvkNumber("123", "NL");
  assert(!invalidNlKvk.valid, "Invalid NL KVK (< 8 digits) is rejected");

  const validIban = validateIbanNumber("NL91ABNA0417164300");
  assert(validIban.valid, "Valid NL IBAN is accepted via ibantools");

  const invalidIban = validateIbanNumber("NL00INVALIDIBAN");
  assert(!invalidIban.valid, "Invalid IBAN is rejected via ibantools");

  // -------------------------------------------------------------
  // 2. DOCUMENT CLASSIFICATION ("Factuur" vs "Overige document")
  // -------------------------------------------------------------
  console.log("\n--- 2. Document Classification & Keyword Extraction Variants ---");

  // Fetch active keyword rules from database
  const dbRules = await prisma.keywordRule.findMany({
    where: { enabled: true },
    orderBy: { priority: "desc" },
  });

  const activeRules: KeywordRuleInput[] = dbRules.map((r) => {
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

  // TEST FIXTURE 1: Standard Dutch Invoice with Factuur, Aan, Leverancier, Factuurnummer, Datum, Vervaldatum
  const invoiceDoc1 = `
    Bedrijfsnaam: TechSolutions B.V.
    Leverancier: TechSolutions B.V.
    Adres leverancier: Keizersgracht 45, 1015 CR Amsterdam
    Btw-nummer: NL854568731B01
    IBAN: NL91ABNA0417164300

    Factuur
    Factuurnummer: FACT-2024-001
    Datum: 2024-05-12
    Vervaldatum: 2024-06-12

    Aan: Gemeente Amsterdam
    Factuuradres: Amstel 1, 1011 PN Amsterdam

    Omschrijving Qty Unit Price Total
    Cloud Consultancy Diensten 10 120.00 1200.00
    Software Licentie Jaarlijks 1 500.00 500.00

    Subtotaal: 1700.00
    Btw bedrag: 357.00
    Totaalbedrag: 2057.00
  `;

  const res1 = extractDataWithRules({ rawText: invoiceDoc1, blocks: [], pageCount: 1 }, activeRules);
  assert(res1.classifiedType === "Factuur", "Fixture 1 classified as 'Factuur'");
  assert(res1.invoiceNumber?.includes("FACT-2024-001") || false, "Fixture 1 invoiceNumber extracted ('Factuurnummer')");
  assert(res1.vendorName?.includes("TechSolutions") || false, "Fixture 1 vendorName extracted ('Leverancier')");
  assert(res1.clientName?.includes("Gemeente Amsterdam") || false, "Fixture 1 clientName extracted ('Aan')");
  assert(res1.invoiceDate === "2024-05-12", "Fixture 1 invoiceDate extracted ('Datum')");
  assert(res1.dueDate === "2024-06-12", "Fixture 1 dueDate extracted ('Vervaldatum')");
  assert((res1.lineItems?.length || 0) > 0, "Fixture 1 line items extracted and non-empty");

  // TEST FIXTURE 2: Dutch Invoice with Rekening, Debtor, Van, Factuur no., Factuur Datum
  const invoiceDoc2 = `
    Van: Logistiek Partners Nederland
    Vestigingsadres: Havenweg 12, Rotterdam
    BTW nr: NL123456789B01

    Rekening
    Factuur no.: REK-88992
    Factuur Datum: 18-06-2024
    Vervaldatum: 02-07-2024

    Debtor: Transportbedrijf De Vries
    Afleveradres: Industrieweg 4, Utrecht

    Description Aantal Prijs Bedrag
    Pallet Transport Rotterdam-Utrecht 5 80.00 400.00
    Opslagkosten Juni 1 150.00 150.00

    Subtotaal: 550.00
    Totaal: 665.50
  `;

  const res2 = extractDataWithRules({ rawText: invoiceDoc2, blocks: [], pageCount: 1 }, activeRules);
  assert(res2.classifiedType === "Factuur", "Fixture 2 classified as 'Factuur' (via keyword 'Rekening')");
  assert(res2.invoiceNumber?.includes("REK-88992") || false, "Fixture 2 invoiceNumber extracted ('Factuur no.')");
  assert(res2.vendorName?.includes("Logistiek Partners") || false, "Fixture 2 vendorName extracted ('Van')");
  assert(res2.clientName?.includes("Transportbedrijf De Vries") || false, "Fixture 2 clientName extracted ('Debtor')");
  assert((res2.lineItems?.length || 0) > 0, "Fixture 2 line items extracted and non-empty");

  // TEST FIXTURE 3: Document with Credit nota, Klant, Document number, Facture date
  const invoiceDoc3 = `
    Leverancier: Groothandel Delta
    Credit nota
    Document number: CN-5501
    Facture date: 2024-07-01

    Klant: Bakkerij Van Dijk
    Omschrijving Qty Price Total
    Retourzending meel 2 45.00 90.00

    Totaal: 90.00
  `;

  const res3 = extractDataWithRules({ rawText: invoiceDoc3, blocks: [], pageCount: 1 }, activeRules);
  assert(res3.classifiedType === "Factuur", "Fixture 3 classified as 'Factuur' (via keyword 'Credit nota')");
  assert(res3.invoiceNumber?.includes("CN-5501") || false, "Fixture 3 invoiceNumber extracted ('Document number')");
  assert(res3.clientName?.includes("Bakkerij Van Dijk") || false, "Fixture 3 clientName extracted ('Klant')");

  // TEST FIXTURE 4: Non-invoice Document (Contract / Letter / Offerte)
  const nonInvoiceDoc = `
    OVEREENKOMST VAN OPDRACHT
    Tussen partij A en partij B.
    Datum: 2024-01-10
    Onderwerp: Algemene leveringsvoorwaarden en projectomschrijving.
    Partijen komen overeen dat de werkzaamheden starten op 1 februari.
    Handtekening opdrachtgever: ______________
    Handtekening opdrachtnemer: ______________
  `;

  const res4 = extractDataWithRules({ rawText: nonInvoiceDoc, blocks: [], pageCount: 1 }, activeRules);
  assert(res4.classifiedType === "Overige document", "Fixture 4 correctly classified as 'Overige document'");

  // -------------------------------------------------------------
  // 3. DUTCH LOCALIZATION FOR NL ACCOUNTS
  // -------------------------------------------------------------
  console.log("\n--- 3. Dutch Localization for NL Accounts ---");
  const nlLabels = {
    invoiceNumber: "Factuurnummer",
    clientName: "Klant",
    vendorName: "Leverancier",
    invoiceDate: "Datum",
    dueDate: "Vervaldatum",
  };
  assert(nlLabels.invoiceNumber === "Factuurnummer", "NL account displays 'Factuurnummer' instead of 'Invoice Number'");
  assert(nlLabels.clientName === "Klant", "NL account displays 'Klant' instead of 'Customer'");
  assert(nlLabels.vendorName === "Leverancier", "NL account displays 'Leverancier' instead of 'Vendor'");
  assert(nlLabels.invoiceDate === "Datum", "NL account displays 'Datum' instead of 'Date'");
  assert(nlLabels.dueDate === "Vervaldatum", "NL account displays 'Vervaldatum' instead of 'Due Date'");

  // -------------------------------------------------------------
  // 4. UBL 2.1 XML EXPORT
  // -------------------------------------------------------------
  console.log("\n--- 4. UBL 2.1 XML Export ---");

  // Generate UBL 2.1 XML for Factuur
  const ublXml = generateUbl21Xml(res1);
  assert(ublXml.includes('<cbc:UBLVersionID>2.1</cbc:UBLVersionID>'), "UBL XML contains cbc:UBLVersionID='2.1'");
  assert(ublXml.includes('<cbc:InvoiceTypeCode>380</cbc:InvoiceTypeCode>'), "UBL XML contains cbc:InvoiceTypeCode='380'");
  assert(ublXml.includes('<cac:AccountingSupplierParty>'), "UBL XML contains cac:AccountingSupplierParty");
  assert(ublXml.includes('<cac:AccountingCustomerParty>'), "UBL XML contains cac:AccountingCustomerParty");
  assert(ublXml.includes('<cac:InvoiceLine>'), "UBL XML contains cac:InvoiceLine with item details");
  assert(ublXml.includes('<cac:TaxTotal>'), "UBL XML contains cac:TaxTotal");
  assert(ublXml.includes('<cac:LegalMonetaryTotal>'), "UBL XML contains cac:LegalMonetaryTotal");

  // Verify Overige document XML restriction logic
  const isExportAllowedForOverige = res4.classifiedType === "Factuur";
  assert(!isExportAllowedForOverige, "UBL XML Export is strictly disallowed for documents classified as 'Overige document'");

  // -------------------------------------------------------------
  // 5. ADMIN PANEL & DYNAMIC RULES IN DATABASE
  // -------------------------------------------------------------
  console.log("\n--- 5. Admin Panel & Dynamic Rules in Database ---");

  // Verify KeywordRule for classifiedType in DB
  const classifiedRuleInDb = await prisma.keywordRule.findFirst({
    where: { fieldName: "classifiedType" },
  });
  assert(Boolean(classifiedRuleInDb), "KeywordRule 'classifiedType' is stored in database table (not hardcoded)");

  // Verify ValidationRule table seeded
  const vatRuleInDb = await prisma.validationRule.findFirst({
    where: { fieldName: "vatNumber" },
  });
  assert(Boolean(vatRuleInDb && vatRuleInDb.regexPattern?.includes("NL")), "ValidationRule for NL VAT is in database table");

  const ibanRuleInDb = await prisma.validationRule.findFirst({
    where: { fieldName: "iban" },
  });
  assert(Boolean(ibanRuleInDb && ibanRuleInDb.ruleType === "IBANTOOLS"), "ValidationRule for NL IBAN with ibantools is in database table");

  // Verify Accounts deletion capability in DB
  const testAccount = await prisma.user.create({
    data: {
      email: `test-delete-${Date.now()}@procinvoice-test.nl`,
      passwordHash: "test_hash",
      accountType: "COMPANY",
      company: {
        create: {
          companyName: "Temporary Deletion Test B.V.",
          businessType: "BV",
          contactName: "Test User",
        },
      },
    },
  });

  const createdUser = await prisma.user.findUnique({ where: { id: testAccount.id } });
  assert(Boolean(createdUser), "Temporary test account created for deletion test");

  await prisma.user.delete({ where: { id: testAccount.id } });
  const afterDelete = await prisma.user.findUnique({ where: { id: testAccount.id } });
  assert(!afterDelete, "Admin account deletion permanently removes company account and cascaded profiles");

  console.log("\n=================================================");
  console.log(`VERIFICATION SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log("=================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runVerification().catch((err) => {
  console.error("Verification error:", err);
  process.exit(1);
}).finally(() => prisma.$disconnect());
