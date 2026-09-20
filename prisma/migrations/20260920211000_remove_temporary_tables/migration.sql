-- Removes the two temporary tables that proved the deployment pipeline.
-- Both held test data only; nothing in the product depended on them.
--
-- DESTRUCTIVE: dropping these tables deletes every row in them.

-- DropTable
DROP TABLE "HealthCheck";

-- DropTable
DROP TABLE "ScratchNote";

