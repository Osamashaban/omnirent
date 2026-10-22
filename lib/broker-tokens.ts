// Looks up a single-use broker email link (invite or password reset). Returns
// null when the link is unknown, already used, expired, or no longer fits the
// account: an invite for someone who already set a password, or any link for
// a deactivated broker.

import { prisma } from "./db";
import { hashSecret } from "./tokens";

export async function findUsableBrokerToken(secret: string, type: "RESET" | "INVITE") {
  if (!secret || secret.length > 100) return null;
  const token = await prisma.brokerToken.findUnique({
    where: { tokenHash: hashSecret(secret) },
    include: { brokerUser: { include: { broker: true } } },
  });
  if (!token || token.type !== type || token.usedAt || token.expiresAt.getTime() <= Date.now()) return null;
  const { brokerUser } = token;
  if (brokerUser.broker.status !== "ACTIVE") return null;
  if (type === "RESET" && brokerUser.status !== "ACTIVE") return null;
  if (type === "INVITE" && brokerUser.status !== "INVITED") return null;
  return token;
}
