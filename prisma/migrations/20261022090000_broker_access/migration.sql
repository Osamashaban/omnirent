-- Adds brokers (design "Broker signup · ready for development", version 62):
-- Ops › Brokers, where the team adds a broker after the intro call, and the
-- broker side of app.getomnirent.com (invite link, set password, sign in,
-- forgot password). Also adds the "Brokers" role module and grants it to
-- Super Admin.
--
-- Additive only: new tables, types and rows. Nothing existing is changed or
-- removed.

-- CreateEnum
CREATE TYPE "BrokerStatus" AS ENUM ('ACTIVE', 'DEACTIVATED');

-- CreateEnum
CREATE TYPE "BrokerUserStatus" AS ENUM ('INVITED', 'ACTIVE', 'DEACTIVATED');

-- CreateEnum
CREATE TYPE "BrokerAuthKind" AS ENUM ('SIGN_IN_FAILED', 'SIGN_IN_OK', 'RESET_REQUEST');

-- CreateTable
CREATE TABLE "Broker" (
    "id" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "mainCityId" TEXT NOT NULL,
    "approxUnits" INTEGER,
    "notes" TEXT,
    "status" "BrokerStatus" NOT NULL DEFAULT 'ACTIVE',
    "invitedById" TEXT,
    "deactivatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Broker_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BrokerUser" (
    "id" TEXT NOT NULL,
    "brokerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "mobile" TEXT NOT NULL,
    "passwordHash" TEXT,
    "status" "BrokerUserStatus" NOT NULL DEFAULT 'INVITED',
    "invitedAt" TIMESTAMP(3),
    "activatedAt" TIMESTAMP(3),
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BrokerUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BrokerSession" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "brokerUserId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BrokerSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BrokerToken" (
    "id" TEXT NOT NULL,
    "type" "TokenType" NOT NULL,
    "brokerUserId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "requestIp" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BrokerToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BrokerAuthAttempt" (
    "id" TEXT NOT NULL,
    "kind" "BrokerAuthKind" NOT NULL,
    "email" TEXT NOT NULL,
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BrokerAuthAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BrokerUser_email_key" ON "BrokerUser"("email");

-- CreateIndex
CREATE INDEX "BrokerUser_brokerId_idx" ON "BrokerUser"("brokerId");

-- CreateIndex
CREATE UNIQUE INDEX "BrokerSession_tokenHash_key" ON "BrokerSession"("tokenHash");

-- CreateIndex
CREATE INDEX "BrokerSession_brokerUserId_idx" ON "BrokerSession"("brokerUserId");

-- CreateIndex
CREATE UNIQUE INDEX "BrokerToken_tokenHash_key" ON "BrokerToken"("tokenHash");

-- CreateIndex
CREATE INDEX "BrokerToken_brokerUserId_type_idx" ON "BrokerToken"("brokerUserId", "type");

-- CreateIndex
CREATE INDEX "BrokerAuthAttempt_email_createdAt_idx" ON "BrokerAuthAttempt"("email", "createdAt");

-- CreateIndex
CREATE INDEX "BrokerAuthAttempt_ip_createdAt_idx" ON "BrokerAuthAttempt"("ip", "createdAt");

-- AddForeignKey
ALTER TABLE "Broker" ADD CONSTRAINT "Broker_mainCityId_fkey" FOREIGN KEY ("mainCityId") REFERENCES "City"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Broker" ADD CONSTRAINT "Broker_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrokerUser" ADD CONSTRAINT "BrokerUser_brokerId_fkey" FOREIGN KEY ("brokerId") REFERENCES "Broker"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrokerSession" ADD CONSTRAINT "BrokerSession_brokerUserId_fkey" FOREIGN KEY ("brokerUserId") REFERENCES "BrokerUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrokerToken" ADD CONSTRAINT "BrokerToken_brokerUserId_fkey" FOREIGN KEY ("brokerUserId") REFERENCES "BrokerUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- The new module. Must match MODULES in lib/modules.ts (a test checks this).
INSERT INTO "Module" ("id", "key", "name", "description", "sortOrder") VALUES
  ('module_brokers', 'brokers', 'Brokers', 'Add broker accounts and send invites', 50);

-- Super Admin gets every module.
INSERT INTO "RoleModule" ("roleId", "moduleId")
SELECT 'role_super_admin', "id" FROM "Module"
ON CONFLICT DO NOTHING;
