-- First, add the new enum value
ALTER TYPE "AppointmentStatus" ADD VALUE 'PAYMENT_PENDING';

-- Commit the transaction to make the enum value available
COMMIT;

-- Start a new transaction to update the default
BEGIN;

-- Update the default value for the status column
ALTER TABLE "appointments" ALTER COLUMN "status" SET DEFAULT 'PAYMENT_PENDING';

-- Drop the video_rooms table and related constraints
DROP TABLE IF EXISTS "video_rooms" CASCADE;

-- Drop the VideoRoomStatus enum if it exists
DROP TYPE IF EXISTS "VideoRoomStatus";