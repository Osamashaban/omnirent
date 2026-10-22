-- Adds broker properties (design "Iteration 1 · ready for development",
-- App_Properties_Units): the property a broker builds in the "Add property"
-- wizard, its unit types (or rooms), rates, and taxes and fees. Properties are
-- saved as drafts; publishing to channels comes in a later release.
--
-- Additive only: new tables and types. Nothing existing is changed or
-- removed. Countries, cities and property types now can't be deleted while a
-- property uses them (the app already blocks that).

-- CreateEnum
CREATE TYPE "PropertyStatus" AS ENUM ('DRAFT', 'SYNCING', 'SYNCED', 'SYNC_FAILED');

-- CreateEnum
CREATE TYPE "UnitKind" AS ENUM ('UNIT', 'ROOM', 'WHOLE');

-- CreateTable
CREATE TABLE "Property" (
    "id" TEXT NOT NULL,
    "brokerId" TEXT NOT NULL,
    "propertyTypeId" TEXT,
    "nickname" TEXT NOT NULL,
    "titleEn" TEXT NOT NULL DEFAULT '',
    "titleAr" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL DEFAULT '',
    "phone" TEXT NOT NULL DEFAULT '',
    "currency" TEXT NOT NULL DEFAULT 'EGP',
    "countryId" TEXT,
    "cityId" TEXT,
    "compound" TEXT NOT NULL DEFAULT '',
    "address" TEXT NOT NULL DEFAULT '',
    "postalCode" TEXT NOT NULL DEFAULT '',
    "latitude" DECIMAL(9,6),
    "longitude" DECIMAL(9,6),
    "timezone" TEXT NOT NULL DEFAULT '',
    "rentMode" "RentMode" NOT NULL DEFAULT 'WHOLE',
    "cancellationPolicy" TEXT NOT NULL DEFAULT 'flexible',
    "checkInTime" TEXT NOT NULL DEFAULT '15:00',
    "checkOutTime" TEXT NOT NULL DEFAULT '12:00',
    "maxGuests" INTEGER,
    "adultsOnly" BOOLEAN NOT NULL DEFAULT false,
    "internetType" TEXT NOT NULL DEFAULT 'wifi',
    "internetCoverage" TEXT NOT NULL DEFAULT 'all_rooms',
    "internetCost" DECIMAL(12,2),
    "parkingType" TEXT NOT NULL DEFAULT 'on_site',
    "parkingReservation" TEXT NOT NULL DEFAULT 'not_needed',
    "parkingPrivate" BOOLEAN NOT NULL DEFAULT true,
    "petsPolicy" TEXT NOT NULL DEFAULT 'not_allowed',
    "petFee" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "petDeposit" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "smokingPolicy" TEXT NOT NULL DEFAULT 'no_smoking',
    "descriptionEn" TEXT NOT NULL DEFAULT '',
    "descriptionAr" TEXT NOT NULL DEFAULT '',
    "importantInfo" TEXT NOT NULL DEFAULT '',
    "website" TEXT NOT NULL DEFAULT '',
    "facilities" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "stepsDone" INTEGER NOT NULL DEFAULT 0,
    "status" "PropertyStatus" NOT NULL DEFAULT 'DRAFT',
    "archivedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Property_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UnitType" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "kind" "UnitKind" NOT NULL DEFAULT 'UNIT',
    "name" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,
    "adults" INTEGER NOT NULL DEFAULT 2,
    "children" INTEGER NOT NULL DEFAULT 0,
    "infants" INTEGER NOT NULL DEFAULT 0,
    "bedrooms" INTEGER,
    "beds" INTEGER NOT NULL DEFAULT 1,
    "bathrooms" INTEGER,
    "bathroom" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UnitType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RatePlan" (
    "id" TEXT NOT NULL,
    "unitTypeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sellMode" TEXT NOT NULL DEFAULT 'per_unit',
    "price" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "guests" INTEGER NOT NULL DEFAULT 1,
    "childFee" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "infantFee" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "meals" TEXT NOT NULL DEFAULT 'none',
    "minStay" INTEGER NOT NULL DEFAULT 1,
    "maxStay" INTEGER NOT NULL DEFAULT 0,
    "cancellationPolicy" TEXT NOT NULL DEFAULT '',
    "closedToArrival" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "parentId" TEXT,
    "adjustment" TEXT,
    "adjustValue" DECIMAL(12,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RatePlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PropertyTax" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "logic" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "inclusive" BOOLEAN NOT NULL DEFAULT false,
    "startsOn" DATE,
    "endsOn" DATE,
    "skipNights" INTEGER,
    "maxNights" INTEGER,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PropertyTax_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Property_brokerId_idx" ON "Property"("brokerId");

-- CreateIndex
CREATE INDEX "Property_cityId_idx" ON "Property"("cityId");

-- CreateIndex
CREATE INDEX "Property_propertyTypeId_idx" ON "Property"("propertyTypeId");

-- CreateIndex
CREATE INDEX "UnitType_propertyId_idx" ON "UnitType"("propertyId");

-- CreateIndex
CREATE INDEX "RatePlan_unitTypeId_idx" ON "RatePlan"("unitTypeId");

-- CreateIndex
CREATE INDEX "PropertyTax_propertyId_idx" ON "PropertyTax"("propertyId");

-- AddForeignKey
ALTER TABLE "Property" ADD CONSTRAINT "Property_brokerId_fkey" FOREIGN KEY ("brokerId") REFERENCES "Broker"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Property" ADD CONSTRAINT "Property_propertyTypeId_fkey" FOREIGN KEY ("propertyTypeId") REFERENCES "PropertyType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Property" ADD CONSTRAINT "Property_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Property" ADD CONSTRAINT "Property_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Property" ADD CONSTRAINT "Property_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "BrokerUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnitType" ADD CONSTRAINT "UnitType_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RatePlan" ADD CONSTRAINT "RatePlan_unitTypeId_fkey" FOREIGN KEY ("unitTypeId") REFERENCES "UnitType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RatePlan" ADD CONSTRAINT "RatePlan_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "RatePlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyTax" ADD CONSTRAINT "PropertyTax_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;
