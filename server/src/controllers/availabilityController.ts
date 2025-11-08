import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { formatResponse } from "../utils/helpers";

const prisma = new PrismaClient();

// Simple function to generate time slots
const generateTimeSlots = (
  startTime: string,
  endTime: string,
  slotDuration: number = 30
) => {
  const slots = [];
  const [startHour, startMin] = startTime.split(":").map(Number);
  const [endHour, endMin] = endTime.split(":").map(Number);

  let currentMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;

  while (currentMinutes < endMinutes) {
    const hours = Math.floor(currentMinutes / 60);
    const minutes = currentMinutes % 60;
    const timeStr = `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;

    slots.push(timeStr);
    currentMinutes += slotDuration;
  }

  return slots;
};

// Set doctor availability - CLEAN & SIMPLE
export const setDoctorAvailability = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.user || req.user.role !== "DOCTOR") {
      res
        .status(403)
        .json(formatResponse("error", "Only doctors can set availability"));
      return;
    }

    const { date, startTime, endTime, slotDuration = 30 } = req.body;

    // Basic validation
    if (!date || !startTime || !endTime) {
      res
        .status(400)
        .json(
          formatResponse("error", "Date, start time, and end time are required")
        );
      return;
    }

    // Get doctor profile
    const doctorProfile = await prisma.doctorProfile.findUnique({
      where: { userId: req.user.id },
    });

    if (!doctorProfile) {
      res.status(404).json(formatResponse("error", "Doctor profile not found"));
      return;
    }

    // Simple date validation (allow today and future)
    const targetDate = new Date(date + "T00:00:00Z");
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (targetDate < today) {
      res
        .status(400)
        .json(
          formatResponse("error", "Cannot set availability for past dates")
        );
      return;
    }

    // Validate time format
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
      res
        .status(400)
        .json(formatResponse("error", "Invalid time format. Use HH:MM"));
      return;
    }

    // Validate start < end time
    const [startHour, startMin] = startTime.split(":").map(Number);
    const [endHour, endMin] = endTime.split(":").map(Number);
    if (startHour * 60 + startMin >= endHour * 60 + endMin) {
      res
        .status(400)
        .json(formatResponse("error", "Start time must be before end time"));
      return;
    }

    // Create or update availability
    const availability = await prisma.doctorAvailability.upsert({
      where: {
        doctorProfileId_date: {
          doctorProfileId: doctorProfile.id,
          date: targetDate,
        },
      },
      update: {
        startTime,
        endTime,
        slotDuration,
        isAvailable: true,
      },
      create: {
        doctorProfileId: doctorProfile.id,
        date: targetDate,
        startTime,
        endTime,
        slotDuration,
        isAvailable: true,
      },
    });

    res.json(
      formatResponse("success", "Availability set successfully", {
        availability,
      })
    );
  } catch (error) {
    console.error("Set availability error:", error);
    res.status(500).json(formatResponse("error", "Failed to set availability"));
  }
};

// Get doctor availability - SIMPLE VERSION
export const getDoctorAvailability = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { doctorId } = req.params;
    const { startDate, endDate } = req.query;

    const doctorProfile = await prisma.doctorProfile.findUnique({
      where: { id: doctorId },
      include: { user: true },
    });

    if (!doctorProfile) {
      res.status(404).json(formatResponse("error", "Doctor not found"));
      return;
    }

    // Date range (default: next 7 days) - use UTC midnight for consistency
    const start = startDate
      ? new Date((startDate as string) + "T00:00:00Z")
      : new Date(new Date().toISOString().split("T")[0] + "T00:00:00Z");
    const end = endDate
      ? new Date((endDate as string) + "T00:00:00Z")
      : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    // Get availability records
    const availabilityRecords = await prisma.doctorAvailability.findMany({
      where: {
        doctorProfileId: doctorProfile.id,
        date: { gte: start, lte: end },
        isAvailable: true,
      },
      orderBy: { date: "asc" },
    });

    const availableDays = [];

    for (const record of availabilityRecords) {
      const dateStr = record.date.toISOString().split("T")[0];

      // Get booked appointments
      const appointments = await prisma.appointment.findMany({
        where: {
          doctorId: doctorProfile.user.id,
          scheduledAt: {
            gte: new Date(dateStr + "T00:00:00Z"),
            lt: new Date(dateStr + "T23:59:59Z"),
          },
          status: {
            in: ["PAYMENT_PENDING", "SCHEDULED", "CONFIRMED", "IN_PROGRESS"],
          },
        },
      });

      // Generate all possible slots
      const allSlots = generateTimeSlots(
        record.startTime,
        record.endTime,
        record.slotDuration
      );

      // Mark slots as available/unavailable
      const slots = allSlots.map((timeSlot) => {
        // Create datetime WITHOUT timezone conversion
        // timeSlot is like "17:30", we want it to stay "17:30" in display
        const [hours, minutes] = timeSlot.split(":").map(Number);

        // Create a Date object for the date in UTC but we'll use it for time comparison only
        const slotDateTime = new Date(dateStr + "T" + timeSlot + ":00.000Z");
        const now = new Date();

        // Check if slot is in past
        const isInPast = slotDateTime < now;

        // Check if slot is booked
        const isBooked = appointments.some((apt) => {
          const aptTime = new Date(apt.scheduledAt);
          return Math.abs(aptTime.getTime() - slotDateTime.getTime()) < 60000; // Within 1 minute
        });

        // Format time for display - use the time string directly, not converted
        const hour12 = hours % 12 || 12;
        const period = hours >= 12 ? "PM" : "AM";
        const displayTime = `${hour12}:${minutes.toString().padStart(2, "0")} ${period}`;

        return {
          time: timeSlot,
          displayTime: displayTime, // Now shows correct local time!
          available: !isInPast && !isBooked,
        };
      });

      // Only include days that have at least one available slot
      const availableSlots = slots.filter((slot) => slot.available);

      if (availableSlots.length > 0) {
        availableDays.push({
          date: dateStr,
          dayOfWeek: record.date.toLocaleDateString("en-US", {
            weekday: "long",
          }),
          slots: slots, // Return all slots with availability flag
        });
      }
    }

    res.json(
      formatResponse("success", "Availability retrieved", { availableDays })
    );
  } catch (error) {
    console.error("Get availability error:", error);
    res.status(500).json(formatResponse("error", "Failed to get availability"));
  }
};

// Get doctor's own availability (for management)
export const getMyAvailability = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.user || req.user.role !== "DOCTOR") {
      res.status(403).json(formatResponse("error", "Access denied"));
      return;
    }

    const doctorProfile = await prisma.doctorProfile.findUnique({
      where: { userId: req.user.id },
    });

    if (!doctorProfile) {
      res.status(404).json(formatResponse("error", "Doctor profile not found"));
      return;
    }

    // Use UTC midnight for today and next 30 days
    const todayStr = new Date().toISOString().split("T")[0];
    const startDate = new Date(todayStr + "T00:00:00Z");
    const endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // Next 30 days

    const availability = await prisma.doctorAvailability.findMany({
      where: {
        doctorProfileId: doctorProfile.id,
        date: { gte: startDate, lte: endDate },
      },
      orderBy: { date: "asc" },
    });

    console.log(
      "📅 getMyAvailability - Raw availability records:",
      JSON.stringify(availability, null, 2)
    );

    // Group availability by date to match frontend expectations
    // CRITICAL: Frontend expects 'slotDurationMinutes' not 'slotDuration'
    const groupedAvailability = availability.reduce(
      (acc, record) => {
        const dateStr = record.date.toISOString().split("T")[0];
        const existingDay = acc.find((day) => day.date === dateStr);

        const slot = {
          startTime: record.startTime,
          endTime: record.endTime,
          slotDurationMinutes: record.slotDuration, // Map DB field to frontend field
        };

        if (existingDay) {
          existingDay.slots.push(slot);
        } else {
          acc.push({
            date: dateStr,
            slots: [slot],
          });
        }

        return acc;
      },
      [] as Array<{
        date: string;
        slots: Array<{
          startTime: string;
          endTime: string;
          slotDurationMinutes: number;
        }>;
      }>
    );

    res.json(
      formatResponse("success", "Availability retrieved", {
        availabilities: groupedAvailability,
      })
    );
  } catch (error) {
    console.error("Get my availability error:", error);
    res.status(500).json(formatResponse("error", "Failed to get availability"));
  }
};

// Delete availability
export const deleteAvailability = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.user || req.user.role !== "DOCTOR") {
      res.status(403).json(formatResponse("error", "Access denied"));
      return;
    }

    const { id } = req.params;

    const availability = await prisma.doctorAvailability.findUnique({
      where: { id },
      include: { doctorProfile: true },
    });

    if (!availability) {
      res.status(404).json(formatResponse("error", "Availability not found"));
      return;
    }

    if (availability.doctorProfile.userId !== req.user.id) {
      res.status(403).json(formatResponse("error", "Access denied"));
      return;
    }

    await prisma.doctorAvailability.delete({
      where: { id },
    });

    res.json(formatResponse("success", "Availability deleted"));
  } catch (error) {
    console.error("Delete availability error:", error);
    res
      .status(500)
      .json(formatResponse("error", "Failed to delete availability"));
  }
};

// Clear availability for a specific date
export const clearDayAvailability = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.user || req.user.role !== "DOCTOR") {
      res.status(403).json(formatResponse("error", "Access denied"));
      return;
    }

    const { date } = req.params;
    console.log("🗑️ Clear availability - Input date:", date);

    const doctorProfile = await prisma.doctorProfile.findUnique({
      where: { userId: req.user.id },
    });

    if (!doctorProfile) {
      res.status(404).json(formatResponse("error", "Doctor profile not found"));
      return;
    }

    console.log("🗑️ Clear availability - Doctor profile ID:", doctorProfile.id);

    // Parse date to UTC midnight
    const targetDate = new Date(date + "T00:00:00Z");
    const nextDay = new Date(targetDate);
    nextDay.setDate(nextDay.getDate() + 1);

    console.log(
      "🗑️ Clear availability - Target date:",
      targetDate.toISOString()
    );
    console.log("🗑️ Clear availability - Next day:", nextDay.toISOString());

    // First, check if availability exists using date range
    // This is more reliable than exact date matching
    const existingAvailability = await prisma.doctorAvailability.findMany({
      where: {
        doctorProfileId: doctorProfile.id,
        date: {
          gte: targetDate,
          lt: nextDay,
        },
      },
    });

    console.log(
      "🗑️ Clear availability - Found records:",
      existingAvailability.length
    );
    if (existingAvailability.length > 0) {
      console.log(
        "🗑️ Clear availability - Records:",
        JSON.stringify(existingAvailability, null, 2)
      );
    }

    // Delete availability for the specific date using date range
    const deleteResult = await prisma.doctorAvailability.deleteMany({
      where: {
        doctorProfileId: doctorProfile.id,
        date: {
          gte: targetDate,
          lt: nextDay,
        },
      },
    });

    console.log("🗑️ Clear availability - Deleted count:", deleteResult.count);

    if (deleteResult.count === 0) {
      console.log("⚠️ Clear availability - No records deleted");
      res.json(
        formatResponse("success", "No availability found for this date", {
          deletedCount: 0,
          message: "Date may already be cleared",
        })
      );
      return;
    }

    res.json(
      formatResponse("success", "Availability cleared for date", {
        deletedCount: deleteResult.count,
      })
    );
  } catch (error) {
    console.error("❌ Clear availability error:", error);
    res
      .status(500)
      .json(formatResponse("error", "Failed to clear availability"));
  }
};
