-- CreateEnum
CREATE TYPE "ChannelState" AS ENUM ('WAITING', 'CONNECTED', 'ATTENTION', 'REJECTED');

-- CreateTable
CREATE TABLE "ChannelAccount" (
    "id" TEXT NOT NULL,
    "brokerId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "state" "ChannelState",
    "waitReason" TEXT,
    "account" TEXT NOT NULL DEFAULT '',
    "settings" TEXT,
    "channexChannelId" TEXT,
    "oauthToken" TEXT,
    "oauthAt" TIMESTAMP(3),
    "priceMode" TEXT NOT NULL DEFAULT 'same',
    "pricePct" INTEGER NOT NULL DEFAULT 0,
    "connectedAt" TIMESTAMP(3),
    "checkedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChannelAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChannelConnection" (
    "id" TEXT NOT NULL,
    "brokerId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "state" "ChannelState" NOT NULL,
    "waitReason" TEXT,
    "externalId" TEXT NOT NULL DEFAULT '',
    "settings" TEXT,
    "rejectReason" TEXT,
    "currency" TEXT,
    "exchangeRate" DECIMAL(12,4),
    "channexChannelId" TEXT,
    "connectedAt" TIMESTAMP(3),
    "checkedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChannelConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChannelListing" (
    "id" TEXT NOT NULL,
    "brokerId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "propertyId" TEXT,
    "externalId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "city" TEXT NOT NULL DEFAULT '',
    "guests" INTEGER,
    "rates" JSONB NOT NULL DEFAULT '[]',
    "pricingType" TEXT,
    "gone" BOOLEAN NOT NULL DEFAULT false,
    "dismissed" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChannelListing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChannelLink" (
    "id" TEXT NOT NULL,
    "unitTypeId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "confirmed" BOOLEAN NOT NULL DEFAULT true,
    "syncOn" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'off',
    "error" JSONB,
    "ratePlans" JSONB,
    "mappingIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChannelLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChannelBooking" (
    "id" TEXT NOT NULL,
    "brokerId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "channexBookingId" TEXT NOT NULL,
    "propertyId" TEXT,
    "unitTypeId" TEXT,
    "code" TEXT NOT NULL DEFAULT '',
    "guest" TEXT NOT NULL DEFAULT '',
    "arrival" DATE NOT NULL,
    "departure" DATE NOT NULL,
    "status" TEXT NOT NULL,
    "rooms" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChannelBooking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChannelIssue" (
    "id" TEXT NOT NULL,
    "brokerId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "unitTypeId" TEXT,
    "data" JSONB NOT NULL DEFAULT '{}',
    "dismissedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChannelIssue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChannelNotice" (
    "id" TEXT NOT NULL,
    "brokerId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "params" JSONB NOT NULL DEFAULT '{}',
    "go" TEXT NOT NULL,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChannelNotice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ChannelAccount_brokerId_platform_key" ON "ChannelAccount"("brokerId", "platform");

-- CreateIndex
CREATE INDEX "ChannelConnection_brokerId_idx" ON "ChannelConnection"("brokerId");

-- CreateIndex
CREATE UNIQUE INDEX "ChannelConnection_platform_propertyId_key" ON "ChannelConnection"("platform", "propertyId");

-- CreateIndex
CREATE UNIQUE INDEX "ChannelListing_brokerId_platform_externalId_key" ON "ChannelListing"("brokerId", "platform", "externalId");

-- CreateIndex
CREATE INDEX "ChannelLink_listingId_idx" ON "ChannelLink"("listingId");

-- CreateIndex
CREATE UNIQUE INDEX "ChannelLink_unitTypeId_platform_key" ON "ChannelLink"("unitTypeId", "platform");

-- CreateIndex
CREATE UNIQUE INDEX "ChannelBooking_channexBookingId_key" ON "ChannelBooking"("channexBookingId");

-- CreateIndex
CREATE INDEX "ChannelBooking_brokerId_departure_idx" ON "ChannelBooking"("brokerId", "departure");

-- CreateIndex
CREATE INDEX "ChannelBooking_unitTypeId_departure_idx" ON "ChannelBooking"("unitTypeId", "departure");

-- CreateIndex
CREATE INDEX "ChannelIssue_brokerId_idx" ON "ChannelIssue"("brokerId");

-- CreateIndex
CREATE INDEX "ChannelNotice_brokerId_createdAt_idx" ON "ChannelNotice"("brokerId", "createdAt");

-- AddForeignKey
ALTER TABLE "ChannelAccount" ADD CONSTRAINT "ChannelAccount_brokerId_fkey" FOREIGN KEY ("brokerId") REFERENCES "Broker"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChannelConnection" ADD CONSTRAINT "ChannelConnection_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChannelLink" ADD CONSTRAINT "ChannelLink_unitTypeId_fkey" FOREIGN KEY ("unitTypeId") REFERENCES "UnitType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChannelLink" ADD CONSTRAINT "ChannelLink_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "ChannelListing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChannelBooking" ADD CONSTRAINT "ChannelBooking_brokerId_fkey" FOREIGN KEY ("brokerId") REFERENCES "Broker"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChannelIssue" ADD CONSTRAINT "ChannelIssue_brokerId_fkey" FOREIGN KEY ("brokerId") REFERENCES "Broker"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChannelNotice" ADD CONSTRAINT "ChannelNotice_brokerId_fkey" FOREIGN KEY ("brokerId") REFERENCES "Broker"("id") ON DELETE CASCADE ON UPDATE CASCADE;

