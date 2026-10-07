// ---------------------------------------------------------------------------
// Creates the first user, as an active Super Admin, in whichever database
// DATABASE_URL points at. Run once per database:
//
//   FIRST_USER_NAME=... FIRST_USER_EMAIL=... FIRST_USER_PASSWORD=... node scripts/create-first-user.mjs
//
// The password comes from the environment so it is never written into the
// repository. Running it again for the same email resets that user's password
// and makes them an active Super Admin again; it never creates a second copy.
// ---------------------------------------------------------------------------

import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../lib/password.ts";

const SUPER_ADMIN_ROLE_ID = "role_super_admin";

const name = process.env.FIRST_USER_NAME?.trim() || "Super Admin";
const email = process.env.FIRST_USER_EMAIL?.trim().toLowerCase();
const password = process.env.FIRST_USER_PASSWORD;

if (!email || !password) {
  console.error("Set FIRST_USER_EMAIL and FIRST_USER_PASSWORD.");
  process.exit(1);
}

const prisma = new PrismaClient();

try {
  const passwordHash = await hashPassword(password);
  const data = { name, passwordHash, roleId: SUPER_ADMIN_ROLE_ID, status: "ACTIVE" };
  await prisma.user.upsert({ where: { email }, create: { email, ...data }, update: data });
  console.log(`${email} is set up as an active Super Admin.`);
} finally {
  await prisma.$disconnect();
}
