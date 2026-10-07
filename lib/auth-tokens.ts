// Looks up a single-use email link (password reset or invite). Returns null
// when the link is unknown, already used, expired, or no longer fits the
// account (e.g. an invite for someone who already accepted).

import { prisma } from "./db";
import { hashSecret } from "./tokens";

export async function findUsableToken(secret: string, type: "RESET" | "INVITE") {
  if (!secret) return null;
  const token = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashSecret(secret) },
    include: { user: { include: { role: true } } },
  });
  if (!token || token.type !== type || token.usedAt || token.expiresAt.getTime() <= Date.now()) return null;
  if (type === "RESET" && token.user.status !== "ACTIVE") return null;
  if (type === "INVITE" && token.user.status !== "INVITED") return null;
  return token;
}
