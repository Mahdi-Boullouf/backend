-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "isPaid" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isPrepared" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "employerRestaurantId" TEXT;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_employerRestaurantId_fkey" FOREIGN KEY ("employerRestaurantId") REFERENCES "Restaurant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
