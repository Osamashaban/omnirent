// ---------------------------------------------------------------------------
// Turning a password into something safe to store, and checking it later.
//
// Passwords are never stored. What is stored is a one-way scrambled form
// (a "hash") made with scrypt, which is built into Node, so no extra library is
// needed. Each password gets its own random salt, so two people with the same
// password still get different stored values, and scrypt is deliberately slow
// and memory-hungry so a stolen copy of the table is expensive to guess at.
//
// Stored format: scrypt$N$r$p$<salt, base64>$<hash, base64>
// The settings travel with the hash, so they can be raised later without
// breaking passwords saved under the old ones.
// ---------------------------------------------------------------------------

import { randomBytes, scrypt as scryptCallback, timingSafeEqual, type ScryptOptions } from "node:crypto";

const N = 16384;
const R = 8;
const P = 1;
const KEY_LENGTH = 64;
const SALT_BYTES = 16;

function scrypt(password: string, salt: Buffer, keyLength: number, options: ScryptOptions): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCallback(password, salt, keyLength, options, (error, key) => (error ? reject(error) : resolve(key)));
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_BYTES);
  const hash = await scrypt(password, salt, KEY_LENGTH, { N, r: R, p: P });
  return ["scrypt", N, R, P, salt.toString("base64"), hash.toString("base64")].join("$");
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;

  const [n, r, p] = parts.slice(1, 4).map(Number);
  if (![n, r, p].every((value) => Number.isInteger(value) && value > 0)) return false;

  const salt = Buffer.from(parts[4], "base64");
  const expected = Buffer.from(parts[5], "base64");
  if (salt.length === 0 || expected.length === 0) return false;

  const actual = await scrypt(password, salt, expected.length, { N: n, r, p, maxmem: 256 * n * r });
  return timingSafeEqual(actual, expected);
}
