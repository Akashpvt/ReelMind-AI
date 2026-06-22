import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

function encryptionKey() {
  const source =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.GOOGLE_CLIENT_SECRET ??
    process.env.META_APP_SECRET ??
    process.env.TIKTOK_CLIENT_SECRET ??
    "reelmind-development-token-key";
  return createHash("sha256").update(source).digest();
}

export function encryptToken(value: string | null | undefined) {
  if (!value) return null;
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv.toString("base64url"), authTag.toString("base64url"), encrypted.toString("base64url")].join(".");
}

export function decryptToken(value: string | null | undefined) {
  if (!value) return null;
  const [ivText, authTagText, encryptedText] = value.split(".");
  if (!ivText || !authTagText || !encryptedText) return null;
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(ivText, "base64url"));
  decipher.setAuthTag(Buffer.from(authTagText, "base64url"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedText, "base64url")),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}
