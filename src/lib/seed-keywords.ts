import { prisma } from "./prisma";
import { DEFAULT_KEYWORD_RULES } from "./keyword-extractor";

export async function ensureDefaultKeywordRules() {
  try {
    // 1. Seed or extend Keyword Rules
    for (const defRule of DEFAULT_KEYWORD_RULES) {
      const existing = await prisma.keywordRule.findFirst({
        where: { fieldName: defRule.fieldName },
      });

      if (!existing) {
        await prisma.keywordRule.create({
          data: {
            fieldName: defRule.fieldName,
            keywords: JSON.stringify(defRule.keywords),
            matchType: defRule.matchType,
            regexPattern: defRule.regexPattern || null,
            enabled: defRule.enabled ?? true,
            priority: defRule.priority ?? 0,
          },
        });
      } else {
        // Merge any new keywords from defRule into existing without deleting user changes
        let existingKws: string[] = [];
        try {
          existingKws = JSON.parse(existing.keywords);
        } catch {
          existingKws = existing.keywords.split(",").map((s) => s.trim());
        }

        const mergedKws = [...existingKws];
        let hasNew = false;
        for (const kw of defRule.keywords) {
          if (!mergedKws.some((k) => k.toLowerCase() === kw.toLowerCase())) {
            mergedKws.push(kw);
            hasNew = true;
          }
        }

        if (hasNew) {
          await prisma.keywordRule.update({
            where: { id: existing.id },
            data: {
              keywords: JSON.stringify(mergedKws),
              regexPattern: existing.regexPattern || defRule.regexPattern || null,
            },
          });
        }
      }
    }

    // 2. Seed Validation Rules if not present
    const vatValidation = await prisma.validationRule.findFirst({
      where: { fieldName: "vatNumber" },
    });
    if (!vatValidation) {
      await prisma.validationRule.create({
        data: {
          fieldName: "vatNumber",
          name: "NL VAT Number",
          ruleType: "REGEX",
          regexPattern: "^NL[0-9]{9}B[0-9]{2}$",
          formatHint: "NL 123.456.789 B01",
          enabled: true,
        },
      });
    }

    const ibanValidation = await prisma.validationRule.findFirst({
      where: { fieldName: "iban" },
    });
    if (!ibanValidation) {
      await prisma.validationRule.create({
        data: {
          fieldName: "iban",
          name: "NL IBAN",
          ruleType: "IBANTOOLS",
          regexPattern: null,
          formatHint: "NL91 ABNA 0417 1643 00",
          enabled: true,
        },
      });
    }

    console.log("Verified and seeded default keyword and validation rules.");
  } catch (err) {
    console.error("Failed to seed default rules:", err);
  }
}
