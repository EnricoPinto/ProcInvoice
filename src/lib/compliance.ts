import { isValidIBAN } from "ibantools";

export const EU_COUNTRIES = [
  { code: "NL", name: "Netherlands" },
  { code: "BE", name: "Belgium" },
  { code: "DE", name: "Germany" },
  { code: "FR", name: "France" },
  { code: "ES", name: "Spain" },
  { code: "IT", name: "Italy" },
  { code: "AT", name: "Austria" },
  { code: "LU", name: "Luxembourg" },
  { code: "IE", name: "Ireland" },
  { code: "SE", name: "Sweden" },
  { code: "FI", name: "Finland" },
  { code: "DK", name: "Denmark" },
  { code: "PL", name: "Poland" },
  { code: "PT", name: "Portugal" },
  { code: "GB", name: "United Kingdom" },
] as const;

/**
 * Validates a VAT number according to country rules.
 * For NL: NL999999999B99 (NL + 9 digits + B + 2 digits)
 */
export function validateVatNumber(vat: string, country: string = "NL"): { valid: boolean; error?: string } {
  if (!vat) return { valid: false, error: "VAT number is required" };
  const cleanVat = vat.replace(/[\s.-]/g, "").toUpperCase();

  if (country === "NL") {
    const nlRegex = /^NL\d{9}B\d{2}$/;
    if (!nlRegex.test(cleanVat)) {
      return { valid: false, error: "Invalid Netherlands VAT format. Must match NL999999999B99." };
    }
  } else {
    // General EU VAT pattern check (Country code prefix followed by 2-12 alphanumeric characters)
    const euRegex = /^[A-Z]{2}[A-Z0-9]{2,12}$/;
    if (!euRegex.test(cleanVat)) {
      return { valid: false, error: "Invalid EU VAT number format." };
    }
  }

  return { valid: true };
}

/**
 * Validates a Chamber of Commerce (KVK/COC) number.
 * For NL: exactly 8 digits.
 */
export function validateKvkNumber(coc: string, country: string = "NL"): { valid: boolean; error?: string } {
  if (!coc) return { valid: false, error: "KVK/COC number is required" };
  const cleanCoc = coc.replace(/\s/g, "");

  if (country === "NL") {
    if (!/^\d{8}$/.test(cleanCoc)) {
      return { valid: false, error: "Invalid NL KVK number. Must be exactly 8 digits." };
    }
  } else {
    if (cleanCoc.length < 3 || cleanCoc.length > 15) {
      return { valid: false, error: "Invalid business registration number length." };
    }
  }

  return { valid: true };
}

/**
 * Validates IBAN format using ibantools library.
 */
export function validateIbanNumber(iban: string): { valid: boolean; error?: string } {
  if (!iban) return { valid: true }; // optional if empty
  const cleanIban = iban.replace(/\s/g, "").toUpperCase();

  if (!isValidIBAN(cleanIban)) {
    return { valid: false, error: "Invalid IBAN number format." };
  }

  return { valid: true };
}
