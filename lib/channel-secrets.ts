// Connection settings (platform IDs, logins, tokens) are stored encrypted,
// so a database copy alone doesn't reveal a broker's platform password.
// AES-256-GCM with a key derived from CHANNEX_API_KEY: the settings are only
// ever used with that key, so no extra secret is needed. Server only.

import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

function key(): Buffer {
  const base = process.env.CHANNEX_API_KEY;
  if (!base) throw new Error("CHANNEX_API_KEY is not set");
  return createHash("sha256").update(`omnirent.channel-settings.v1:${base}`).digest();
}

// "v1.<iv>.<tag>.<data>", all base64url.
export function sealSettings(value: Record<string, unknown>): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const data = Buffer.concat([cipher.update(JSON.stringify(value), "utf8"), cipher.final()]);
  return ["v1", iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), data.toString("base64url")].join(".");
}

export function openSettings(sealed: string | null | undefined): Record<string, unknown> | null {
  if (!sealed) return null;
  const [v, iv, tag, data] = sealed.split(".");
  if (v !== "v1" || !iv || !tag || !data) return null;
  try {
    const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64url"));
    decipher.setAuthTag(Buffer.from(tag, "base64url"));
    const text = Buffer.concat([decipher.update(Buffer.from(data, "base64url")), decipher.final()]).toString("utf8");
    const parsed = JSON.parse(text);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}
