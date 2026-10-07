// ---------------------------------------------------------------------------
// Creates the first user, as Super Admin, in whichever database DATABASE_URL
// points at. Run once per database:
//
//   FIRST_USER_EMAIL=... FIRST_USER_PASSWORD=... node scripts/create-first-user.mjs
//
// The password comes from the environment so it is never written into the
// repository. Running it again for the same email resets that user's password
// and makes them Super Admin again; it never creates a second copy.
// ---------------------------------------------------------------------------

import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../lib/password.ts";

const email = process.env.FIRST_USER_EMAIL?.trim().toLowerCase();
const password = process.env.FIRST_USER_PASSWORD;

if (!email || !password) {
  console.error("Set FIRST_USER_EMAIL and FIRST_USER_PASSWORD.");
  process.exit(1);
}

const prisma = new PrismaClient();

try {
  const role = await prisma.role.findUniqueOrThrow({ where: { name: "Super Admin" } });
  const passwordHash = await hashPassword(password);
  await prisma.user.upsert({
    where: { email },
    create: { email, passwordHash, roleId: role.id },
    update: { passwordHash, roleId: role.id },
  });
  console.log(`${email} is set up as ${role.name}.`);
} finally {
  await prisma.$disconnect();
}
