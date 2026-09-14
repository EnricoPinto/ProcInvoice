import type { ExtractedInvoiceData } from "./ocr";

/**
 * Escapes special XML characters.
 */
function escapeXml(str: string | number | undefined | null): string {
  if (str === undefined || str === null) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Normalizes date string to YYYY-MM-DD.
 */
function normalizeDate(dateStr?: string): string {
  if (!dateStr) return new Date().toISOString().split("T")[0];
  // Match YYYY-MM-DD
  const isoMatch = dateStr.match(/\b\d{4}-\d{2}-\d{2}\b/);
  if (isoMatch) return isoMatch[0];

  // Match DD-MM-YYYY or DD.MM.YYYY or DD/MM/YYYY
  const euMatch = dateStr.match(/\b(\d{2})[-/.](\d{2})[-/.](\d{4})\b/);
  if (euMatch) return `${euMatch[3]}-${euMatch[2]}-${euMatch[1]}`;

  // Try Date.parse
  const parsed = new Date(dateStr);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split("T")[0];
  }

  return new Date().toISOString().split("T")[0];
}

/**
 * Formats monetary amounts to 2 decimal places.
 */
function fmt(num: number | undefined | null, fallback: number = 0): string {
  const val = typeof num === "number" && !isNaN(num) ? num : fallback;
  return val.toFixed(2);
}

/**
 * Generates a valid UBL 2.1 Invoice XML string from ExtractedInvoiceData.
 */
export function generateUbl21Xml(data: ExtractedInvoiceData): string {
  const currency = data.currency || "EUR";
  const issueDate = normalizeDate(data.invoiceDate);
  const invoiceNumber = data.invoiceNumber || "INV-001";
  const dueDate = data.dueDate ? normalizeDate(data.dueDate) : null;

  const vendorName = data.vendorName || "Supplier";
  const vendorAddress = data.vendorAddress || "Business Address";
  const vendorVAT = data.vendorVAT || "NL999999999B01";

  const clientName = data.clientName || "Customer";
  const clientAddress = data.clientAddress || "Customer Address";

  const subtotal = data.subtotal ?? (data.totalAmount ? data.totalAmount * 0.79 : 0);
  const taxRate = data.taxRate ?? 21;
  const taxAmount = data.taxAmount ?? (data.totalAmount ? data.totalAmount - subtotal : subtotal * 0.21);
  const totalAmount = data.totalAmount ?? subtotal + taxAmount;

  // Extract IBAN from bank details or vendor fields if present
  let iban = "";
  if (data.bankDetails) {
    const ibanMatch = data.bankDetails.match(/[A-Z]{2}\d{2}[A-Z0-9]{11,30}/);
    if (ibanMatch) iban = ibanMatch[0];
  }

  const lineItems = (data.lineItems && data.lineItems.length > 0)
    ? data.lineItems
    : [
        {
          description: "Invoice Item / Services Rendered",
          quantity: 1,
          unitPrice: subtotal,
          total: subtotal,
        },
      ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
  <cbc:UBLVersionID>2.1</cbc:UBLVersionID>
  <cbc:CustomizationID>urn:cen.eu:en16931:2017#compliant#urn:fdc:peppol.eu:2017:poacc:billing:3.0</cbc:CustomizationID>
  <cbc:ProfileID>urn:fdc:peppol.eu:2017:poacc:billing:01:1.0</cbc:ProfileID>
  <cbc:ID>${escapeXml(invoiceNumber)}</cbc:ID>
  <cbc:IssueDate>${escapeXml(issueDate)}</cbc:IssueDate>
  ${dueDate ? `<cbc:PaymentDueDate>${escapeXml(dueDate)}</cbc:PaymentDueDate>` : ""}
  <cbc:InvoiceTypeCode>380</cbc:InvoiceTypeCode>
  <cbc:DocumentCurrencyCode>${escapeXml(currency)}</cbc:DocumentCurrencyCode>

  <!-- Accounting Supplier (Vendor) -->
  <cac:AccountingSupplierParty>
    <cac:Party>
      <cac:PartyName>
        <cbc:Name>${escapeXml(vendorName)}</cbc:Name>
      </cac:PartyName>
      <cac:PostalAddress>
        <cbc:StreetName>${escapeXml(vendorAddress)}</cbc:StreetName>
        <cac:Country>
          <cbc:IdentificationCode>NL</cbc:IdentificationCode>
        </cac:Country>
      </cac:PostalAddress>
      <cac:PartyTaxScheme>
        <cbc:CompanyID>${escapeXml(vendorVAT)}</cbc:CompanyID>
        <cac:TaxScheme>
          <cbc:ID>VAT</cbc:ID>
        </cac:TaxScheme>
      </cac:PartyTaxScheme>
      <cac:PartyLegalEntity>
        <cbc:RegistrationName>${escapeXml(vendorName)}</cbc:RegistrationName>
      </cac:PartyLegalEntity>
    </cac:Party>
  </cac:AccountingSupplierParty>

  <!-- Accounting Customer (Client) -->
  <cac:AccountingCustomerParty>
    <cac:Party>
      <cac:PartyName>
        <cbc:Name>${escapeXml(clientName)}</cbc:Name>
      </cac:PartyName>
      <cac:PostalAddress>
        <cbc:StreetName>${escapeXml(clientAddress)}</cbc:StreetName>
        <cac:Country>
          <cbc:IdentificationCode>NL</cbc:IdentificationCode>
        </cac:Country>
      </cac:PostalAddress>
      <cac:PartyLegalEntity>
        <cbc:RegistrationName>${escapeXml(clientName)}</cbc:RegistrationName>
      </cac:PartyLegalEntity>
    </cac:Party>
  </cac:AccountingCustomerParty>

  ${
    iban
      ? `<!-- Payment Means -->
  <cac:PaymentMeans>
    <cbc:PaymentMeansCode>30</cbc:PaymentMeansCode>
    <cac:PayeeFinancialAccount>
      <cbc:ID>${escapeXml(iban)}</cbc:ID>
    </cac:PayeeFinancialAccount>
  </cac:PaymentMeans>`
      : ""
  }

  <!-- Tax Total -->
  <cac:TaxTotal>
    <cbc:TaxAmount currencyID="${escapeXml(currency)}">${fmt(taxAmount)}</cbc:TaxAmount>
    <cac:TaxSubtotal>
      <cbc:TaxableAmount currencyID="${escapeXml(currency)}">${fmt(subtotal)}</cbc:TaxableAmount>
      <cbc:TaxAmount currencyID="${escapeXml(currency)}">${fmt(taxAmount)}</cbc:TaxAmount>
      <cac:TaxCategory>
        <cbc:ID>S</cbc:ID>
        <cbc:Percent>${taxRate}</cbc:Percent>
        <cac:TaxScheme>
          <cbc:ID>VAT</cbc:ID>
        </cac:TaxScheme>
      </cac:TaxCategory>
    </cac:TaxSubtotal>
  </cac:TaxTotal>

  <!-- Legal Monetary Total -->
  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="${escapeXml(currency)}">${fmt(subtotal)}</cbc:LineExtensionAmount>
    <cbc:TaxExclusiveAmount currencyID="${escapeXml(currency)}">${fmt(subtotal)}</cbc:TaxExclusiveAmount>
    <cbc:TaxInclusiveAmount currencyID="${escapeXml(currency)}">${fmt(totalAmount)}</cbc:TaxInclusiveAmount>
    <cbc:PayableAmount currencyID="${escapeXml(currency)}">${fmt(totalAmount)}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>

  <!-- Invoice Lines -->
  ${lineItems
    .map(
      (item, idx) => `
  <cac:InvoiceLine>
    <cbc:ID>${idx + 1}</cbc:ID>
    <cbc:InvoicedQuantity unitCode="C62">${item.quantity || 1}</cbc:InvoicedQuantity>
    <cbc:LineExtensionAmount currencyID="${escapeXml(currency)}">${fmt(
        item.total || (item.quantity || 1) * (item.unitPrice || 0)
      )}</cbc:LineExtensionAmount>
    <cac:Item>
      <cbc:Description>${escapeXml(item.description)}</cbc:Description>
      <cbc:Name>${escapeXml(item.description)}</cbc:Name>
      <cac:ClassifiedTaxCategory>
        <cbc:ID>S</cbc:ID>
        <cbc:Percent>${taxRate}</cbc:Percent>
        <cac:TaxScheme>
          <cbc:ID>VAT</cbc:ID>
        </cac:TaxScheme>
      </cac:ClassifiedTaxCategory>
    </cac:Item>
    <cac:Price>
      <cbc:PriceAmount currencyID="${escapeXml(currency)}">${fmt(item.unitPrice)}</cbc:PriceAmount>
    </cac:Price>
  </cac:InvoiceLine>`
    )
    .join("\n")}
</Invoice>`;

  return xml.trim();
}
