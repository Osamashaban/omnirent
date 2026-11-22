-- AlterTable
ALTER TABLE "ChannelBooking" ADD COLUMN     "adults" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "apt" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "arrivalTime" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "bookedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "cancelFee" DECIMAL(12,2),
ADD COLUMN     "cancelledAt" TIMESTAMP(3),
ADD COLUMN     "cancelledBy" TEXT,
ADD COLUMN     "changedAt" TIMESTAMP(3),
ADD COLUMN     "children" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "cleaning" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "collect" TEXT NOT NULL DEFAULT 'ota',
ADD COLUMN     "commission" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'EGP',
ADD COLUMN     "guestId" TEXT,
ADD COLUMN     "guestRequest" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "nightly" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "pending" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "prevArrival" DATE,
ADD COLUMN     "prevDeparture" DATE,
ADD COLUMN     "source" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "tax" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "teamNote" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "total" DECIMAL(12,2) NOT NULL DEFAULT 0,
ALTER COLUMN "channexBookingId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "BookingPayment" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'payment',
    "amount" DECIMAL(12,2) NOT NULL,
    "method" TEXT NOT NULL,
    "paidOn" DATE NOT NULL,
    "byName" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BookingPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookingEvent" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "params" JSONB NOT NULL DEFAULT '{}',
    "byName" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BookingEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Guest" (
    "id" TEXT NOT NULL,
    "brokerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL DEFAULT '',
    "phoneKey" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL DEFAULT '',
    "emailKind" TEXT NOT NULL DEFAULT '',
    "country" TEXT NOT NULL DEFAULT '',
    "vip" BOOLEAN NOT NULL DEFAULT false,
    "blocked" BOOLEAN NOT NULL DEFAULT false,
    "blockReason" TEXT NOT NULL DEFAULT '',
    "docType" TEXT NOT NULL DEFAULT '',
    "docNumber" TEXT NOT NULL DEFAULT '',
    "note" TEXT NOT NULL DEFAULT '',
    "mergedIntoId" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Guest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookingRequest" (
    "id" TEXT NOT NULL,
    "brokerId" TEXT NOT NULL,
    "channexId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "platform" TEXT NOT NULL DEFAULT 'abb',
    "propertyId" TEXT,
    "unitTypeId" TEXT,
    "guestName" TEXT NOT NULL DEFAULT '',
    "country" TEXT NOT NULL DEFAULT '',
    "arrival" DATE NOT NULL,
    "departure" DATE NOT NULL,
    "adults" INTEGER NOT NULL DEFAULT 1,
    "children" INTEGER NOT NULL DEFAULT 0,
    "total" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "payout" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'EGP',
    "message" TEXT NOT NULL DEFAULT '',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "answeredBy" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BookingRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BookingPayment_bookingId_idx" ON "BookingPayment"("bookingId");

-- CreateIndex
CREATE INDEX "BookingEvent_bookingId_idx" ON "BookingEvent"("bookingId");

-- CreateIndex
CREATE INDEX "Guest_brokerId_phoneKey_idx" ON "Guest"("brokerId", "phoneKey");

-- CreateIndex
CREATE INDEX "Guest_brokerId_email_idx" ON "Guest"("brokerId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "BookingRequest_channexId_key" ON "BookingRequest"("channexId");

-- CreateIndex
CREATE INDEX "BookingRequest_brokerId_status_idx" ON "BookingRequest"("brokerId", "status");

-- CreateIndex
CREATE INDEX "ChannelBooking_guestId_idx" ON "ChannelBooking"("guestId");

-- AddForeignKey
ALTER TABLE "ChannelBooking" ADD CONSTRAINT "ChannelBooking_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "Guest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingPayment" ADD CONSTRAINT "BookingPayment_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "ChannelBooking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingEvent" ADD CONSTRAINT "BookingEvent_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "ChannelBooking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Guest" ADD CONSTRAINT "Guest_brokerId_fkey" FOREIGN KEY ("brokerId") REFERENCES "Broker"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingRequest" ADD CONSTRAINT "BookingRequest_brokerId_fkey" FOREIGN KEY ("brokerId") REFERENCES "Broker"("id") ON DELETE CASCADE ON UPDATE CASCADE;

