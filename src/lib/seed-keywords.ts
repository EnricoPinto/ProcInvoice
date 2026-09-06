import { prisma } from "./prisma";
import { DEFAULT_KEYWORD_RULES } from "./keyword-extractor";

export async function ensureDefaultKeywordRules() {
  try {
    const count = await prisma.keywordRule.count();
    if (count === 0) {
      for (const rule of DEFAULT_KEYWORD_RULES) {
        await prisma.keywordRule.create({
          data: {
            fieldName: rule.fieldName,
            keywords: JSON.stringify(rule.keywords),
            matchType: rule.matchType,
            regexPattern: rule.regexPattern || null,
            enabled: rule.enabled ?? true,
            priority: rule.priority ?? 0,
          },
        });
      }
      console.log("Seeded default keyword rules.");
    }
  } catch (err) {
    console.error("Failed to seed default keyword rules:", err);
  }
}
