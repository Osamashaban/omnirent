-- CreateTable
CREATE TABLE "ScratchNote" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScratchNote_pkey" PRIMARY KEY ("id")
);

