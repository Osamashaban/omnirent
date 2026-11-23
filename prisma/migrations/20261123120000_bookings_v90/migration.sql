-- Design v88 to v90 (Bookings and Calendar). Additive only.

-- AlterTable
ALTER TABLE "ChannelBooking" ADD COLUMN     "cardReportedAt" TIMESTAMP(3),
ADD COLUMN     "rate" DECIMAL(12,2),
ADD COLUMN     "splitApt" INTEGER,
ADD COLUMN     "splitAt" DATE;

-- AlterTable
ALTER TABLE "BookingRequest" ADD COLUMN     "bookingId" TEXT;

-- CreateTable
CREATE TABLE "CalendarNote" (
    "id" TEXT NOT NULL,
    "unitTypeId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CalendarNote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CalendarNote_unitTypeId_date_key" ON "CalendarNote"("unitTypeId", "date");

-- AddForeignKey
ALTER TABLE "CalendarNote" ADD CONSTRAINT "CalendarNote_unitTypeId_fkey" FOREIGN KEY ("unitTypeId") REFERENCES "UnitType"("id") ON DELETE CASCADE ON UPDATE CASCADE;
