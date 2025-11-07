-- CreateEnum
CREATE TYPE "VideoRoomStatus" AS ENUM ('CREATED', 'ACTIVE', 'ENDED', 'CANCELLED');

-- CreateTable
CREATE TABLE "doctor_availability" (
    "id" TEXT NOT NULL,
    "doctorProfileId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "slotDuration" INTEGER NOT NULL DEFAULT 30,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "doctor_availability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "video_rooms" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "dailyRoomName" TEXT NOT NULL,
    "dailyRoomUrl" TEXT NOT NULL,
    "dailyToken" TEXT,
    "status" "VideoRoomStatus" NOT NULL DEFAULT 'CREATED',
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "duration" INTEGER,
    "participants" JSONB,
    "recordingUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "video_rooms_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "doctor_availability_doctorProfileId_date_key" ON "doctor_availability"("doctorProfileId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "video_rooms_appointmentId_key" ON "video_rooms"("appointmentId");

-- CreateIndex
CREATE UNIQUE INDEX "video_rooms_dailyRoomName_key" ON "video_rooms"("dailyRoomName");

-- AddForeignKey
ALTER TABLE "doctor_availability" ADD CONSTRAINT "doctor_availability_doctorProfileId_fkey" FOREIGN KEY ("doctorProfileId") REFERENCES "doctor_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "video_rooms" ADD CONSTRAINT "video_rooms_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "appointments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
