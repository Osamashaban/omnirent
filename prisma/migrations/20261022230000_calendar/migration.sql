-- Adds the broker Calendar (design App_Calendar): per-night overrides of
-- price, units open, stay rules, sale and blocks for each unit type, and a log
-- of calendar saves sent to the channels (for the Sending / Live / Retry pill
-- and Undo).
--
-- Additive only: new tables and one new type. Nothing existing is changed.
-- Runs after 20261022213000_channex_publish; it uses none of its columns.

-- CreateEnum
CREATE TYPE "CalendarChangeStatus" AS ENUM ('SENDING', 'LIVE', 'FAILED');

-- CreateTable
CREATE TABLE "CalendarDay" (
    "id" TEXT NOT NULL,
    "unitTypeId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "price" DECIMAL(12,2),
    "unitsOpen" INTEGER,
    "minStay" INTEGER,
    "maxStay" INTEGER,
    "closedToArrival" BOOLEAN,
    "closedToDeparture" BOOLEAN,
    "stopSell" BOOLEAN,
    "blockReason" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CalendarDay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CalendarChange" (
    "id" TEXT NOT NULL,
    "brokerId" TEXT NOT NULL,
    "status" "CalendarChangeStatus" NOT NULL DEFAULT 'SENDING',
    "values" JSONB NOT NULL,
    "before" JSONB NOT NULL,
    "error" JSONB,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "nights" INTEGER NOT NULL DEFAULT 0,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),
    "undoneAt" TIMESTAMP(3),

    CONSTRAINT "CalendarChange_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CalendarDay_unitTypeId_date_key" ON "CalendarDay"("unitTypeId", "date");

-- CreateIndex
CREATE INDEX "CalendarChange_brokerId_status_idx" ON "CalendarChange"("brokerId", "status");


-- AddForeignKey
ALTER TABLE "CalendarDay" ADD CONSTRAINT "CalendarDay_unitTypeId_fkey" FOREIGN KEY ("unitTypeId") REFERENCES "UnitType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarDay" ADD CONSTRAINT "CalendarDay_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "BrokerUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarChange" ADD CONSTRAINT "CalendarChange_brokerId_fkey" FOREIGN KEY ("brokerId") REFERENCES "Broker"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarChange" ADD CONSTRAINT "CalendarChange_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "BrokerUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
