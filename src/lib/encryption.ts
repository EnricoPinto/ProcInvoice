import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
export const CURRENT_KEY_VERSION = process.env.KEY_VERSION || "v1";

/**
 * Retrieves the encryption key buffer for a given key version.
 * Supports FIELD_ENCRYPTION_KEY or version-specific env vars e.g. FIELD_ENCRYPTION_KEY_V1
 */
function getKeyForVersion(version: string = CURRENT_KEY_VERSION): Buffer {
  const envVarName = `FIELD_ENCRYPTION_KEY_${version.toUpperCase()}`;
  const rawKey = process.env[envVarName] || process.env.FIELD_ENCRYPTION_KEY || "";
  const keyHex = rawKey.replace(/^["']|["']$/g, "").trim();

  if (!keyHex || keyHex.length !== 64) {
    if (process.env.NODE_ENV === "development" || !process.env.NODE_ENV) {
      // Deterministic dev fallback key
      return Buffer.from("0".repeat(64), "hex");
    }
    throw new Error(`Encryption key for version '${version}' must be a 32-byte (64 hex char) string (found ${keyHex.length} characters)`);
  }
  return Buffer.from(keyHex, "hex");
}

/**
 * Encrypts a string value with key versioning tag.
 * Output format: "version:iv_b64:authTag_b64:encrypted_b64"
 */
export function encrypt(value: string | null | undefined, version: string = CURRENT_KEY_VERSION): string {
  if (!value) return "";
  const key = getKeyForVersion(version);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(value, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return [
    version,
    iv.toString("base64"),
    authTag.toString("base64"),
    encrypted.toString("base64"),
  ].join(":");
}

/**
 * Decrypts a value formatted as "version:iv_b64:authTag_b64:encrypted_b64"
 * Also supports unversioned legacy format "iv_b64:authTag_b64:encrypted_b64"
 */
export function decrypt(value: unknown): string {
  if (!value || typeof value !== "string") return typeof value === "object" ? JSON.stringify(value) : "";
  try {
    const parts = value.split(":");
    let version = CURRENT_KEY_VERSION;
    let ivB64: string, authTagB64: string, encryptedB64: string;

    if (parts.length === 4) {
      [version, ivB64, authTagB64, encryptedB64] = parts;
    } else if (parts.length === 3) {
      [ivB64, authTagB64, encryptedB64] = parts;
    } else {
      return value; // plain text fallback if not encrypted
    }

    const key = getKeyForVersion(version);
    const iv = Buffer.from(ivB64, "base64");
    const authTag = Buffer.from(authTagB64, "base64");
    const encrypted = Buffer.from(encryptedB64, "base64");
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]);

    return decrypted.toString("utf8");
  } catch {
    return value; // return raw if decryption fails or unencrypted legacy data
  }
}

/**
 * Encrypts an object (e.g. extractedData) into an encrypted string JSON representation.
 */
export function encryptJson<T>(data: T, version: string = CURRENT_KEY_VERSION): string {
  if (data === null || data === undefined) return "";
  return encrypt(JSON.stringify(data), version);
}

/**
 * Decrypts an encrypted JSON string into an object of type T.
 */
export function decryptJson<T>(encryptedValue: unknown): T | null {
  if (!encryptedValue) return null;
  if (typeof encryptedValue === "object") return encryptedValue as T; // already plain JSON object
  if (typeof encryptedValue !== "string") return null;
  try {
    const decryptedStr = decrypt(encryptedValue);
    return JSON.parse(decryptedStr) as T;
  } catch {
    return null;
  }
}


/**
 * Rotates an encrypted string value to a new key version.
 */
export function rotateEncryptedValue(value: string, targetVersion: string = CURRENT_KEY_VERSION): string {
  if (!value) return value;
  const plaintext = decrypt(value);
  return encrypt(plaintext, targetVersion);
}

/** Mask a sensitive value for display (e.g. IBAN: ****1234) */
export function maskSensitive(value: string, showLast = 4): string {
  if (!value || value.length <= showLast) return "****";
  return "*".repeat(value.length - showLast) + value.slice(-showLast);
}

