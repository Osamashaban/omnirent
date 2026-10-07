-- Adds sign-in accounts, roles, and the list of system features each role can
-- be given access to. Also creates the Super Admin role, the starting list of
-- features, and gives Super Admin access to all of them.
--
-- Additive only: four new tables, nothing existing is changed or removed.
--
-- The first user (the owner's account) is NOT created here, because creating
-- it needs the password, and no password belongs in the repository. It is
-- created once per database from a secret; see scripts/create-first-user.mjs.

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Role" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Feature" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Feature_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoleFeature" (
    "roleId" TEXT NOT NULL,
    "featureId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RoleFeature_pkey" PRIMARY KEY ("roleId","featureId")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Role_name_key" ON "Role"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Feature_key_key" ON "Feature"("key");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoleFeature" ADD CONSTRAINT "RoleFeature_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoleFeature" ADD CONSTRAINT "RoleFeature_featureId_fkey" FOREIGN KEY ("featureId") REFERENCES "Feature"("id") ON DELETE CASCADE ON UPDATE CASCADE;


INSERT INTO "Role" ("id", "name", "updatedAt")
VALUES ('role_super_admin', 'Super Admin', CURRENT_TIMESTAMP);

-- The starting list of features. Must match FEATURES in lib/features.ts (a
-- test checks this).
INSERT INTO "Feature" ("id", "key", "name", "description") VALUES
  ('feature_vendor_dashboard', 'vendor_dashboard', 'Vendor dashboard', 'The dashboard property owners, managers and brokers use.'),
  ('feature_ops_dashboard', 'ops_dashboard', 'Operations dashboard', 'The Omnirent team''s internal operations dashboard.'),
  ('feature_users_roles', 'users_roles', 'Users and roles', 'Add users, create roles, and choose which features each role can use.');

-- Super Admin gets every feature. Any later migration that adds a feature must
-- end with this same statement, so Super Admin keeps access to everything.
INSERT INTO "RoleFeature" ("roleId", "featureId")
SELECT 'role_super_admin', "id" FROM "Feature"
ON CONFLICT DO NOTHING;
