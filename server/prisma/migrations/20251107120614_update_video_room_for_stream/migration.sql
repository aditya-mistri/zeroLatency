/*
  Warnings:

  - You are about to drop the column `dailyRoomName` on the `video_rooms` table. All the data in the column will be lost.
  - You are about to drop the column `dailyRoomUrl` on the `video_rooms` table. All the data in the column will be lost.
  - You are about to drop the column `dailyToken` on the `video_rooms` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[streamCallId]` on the table `video_rooms` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[streamCallCid]` on the table `video_rooms` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `streamCallCid` to the `video_rooms` table without a default value. This is not possible if the table is not empty.
  - Added the required column `streamCallId` to the `video_rooms` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "video_rooms_dailyRoomName_key";

-- AlterTable
ALTER TABLE "video_rooms" DROP COLUMN "dailyRoomName",
DROP COLUMN "dailyRoomUrl",
DROP COLUMN "dailyToken",
ADD COLUMN     "streamCallCid" TEXT NOT NULL,
ADD COLUMN     "streamCallId" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "video_rooms_streamCallId_key" ON "video_rooms"("streamCallId");

-- CreateIndex
CREATE UNIQUE INDEX "video_rooms_streamCallCid_key" ON "video_rooms"("streamCallCid");
