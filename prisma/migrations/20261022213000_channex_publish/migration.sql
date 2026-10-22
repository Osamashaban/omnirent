-- Publishing properties to Channex: the ids Channex gives back, and the state
-- of the last publish. Additive only: every new column is nullable.

-- AlterTable
ALTER TABLE "Broker" ADD COLUMN     "channexGroupId" TEXT;

-- AlterTable
ALTER TABLE "Property" ADD COLUMN     "channexId" TEXT,
ADD COLUMN     "channexPolicyId" TEXT,
ADD COLUMN     "syncError" JSONB,
ADD COLUMN     "syncStage" TEXT,
ADD COLUMN     "syncStartedAt" TIMESTAMP(3),
ADD COLUMN     "syncedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "RatePlan" ADD COLUMN     "channexId" TEXT;

-- AlterTable
ALTER TABLE "UnitType" ADD COLUMN     "channexId" TEXT;
