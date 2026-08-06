-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "customerAddress" TEXT,
ADD COLUMN     "customerName" TEXT,
ADD COLUMN     "customerPhone" TEXT,
ADD COLUMN     "isDelivery" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "tableName" DROP NOT NULL;
