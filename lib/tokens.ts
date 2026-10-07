// Random secrets for cookies and email links. Only the SHA-256 hash is ever
// stored, so a copy of the database cannot be used to sign in or reset a
// password.

import { createHash, randomBytes } from "node:crypto";

export function newSecret(): string {
  return randomBytes(32).toString("base64url");
}

export function hashSecret(secret: string): string {
  return createHash("sha256").update(secret).digest("hex");
}
