import { PrismaClient, AppointmentStatus } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Check and update appointment statuses based on time
 * This should be called periodically (e.g., every minute via cron job)
 */
export async function updateAppointmentStatuses() {
  const now = new Date();

  try {
    // 1. Auto-start appointments that are CONFIRMED and time has arrived
    const appointmentsToStart = await prisma.appointment.findMany({
      where: {
        status: AppointmentStatus.CONFIRMED,
        scheduledAt: {
          lte: now,
        },
      },
    });

    for (const appointment of appointmentsToStart) {
      await prisma.appointment.update({
        where: { id: appointment.id },
        data: {
          status: AppointmentStatus.IN_PROGRESS,
          updatedAt: now,
        },
      });
      console.log(`Auto-started appointment ${appointment.id}`);
    }

    // 2. Auto-complete appointments that are IN_PROGRESS and time has ended
    const appointmentsToComplete = await prisma.appointment.findMany({
      where: {
        status: AppointmentStatus.IN_PROGRESS,
      },
    });

    for (const appointment of appointmentsToComplete) {
      const endTime = new Date(
        appointment.scheduledAt.getTime() + appointment.duration * 60000
      );
      // Add 5 minute buffer after scheduled end time
      const bufferEndTime = new Date(endTime.getTime() + 5 * 60000);

      if (now > bufferEndTime) {
        await prisma.appointment.update({
          where: { id: appointment.id },
          data: {
            status: AppointmentStatus.COMPLETED,
            updatedAt: now,
          },
        });
        console.log(`Auto-completed appointment ${appointment.id}`);
      }
    }

    // 3. Auto-cancel PAYMENT_PENDING appointments after 2 hours
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
    const appointmentsToCancel = await prisma.appointment.findMany({
      where: {
        status: AppointmentStatus.PAYMENT_PENDING,
        createdAt: {
          lte: twoHoursAgo,
        },
      },
    });

    for (const appointment of appointmentsToCancel) {
      await prisma.appointment.update({
        where: { id: appointment.id },
        data: {
          status: AppointmentStatus.CANCELLED,
          notes: "Auto-cancelled due to payment timeout",
          updatedAt: now,
        },
      });
      console.log(`Auto-cancelled appointment ${appointment.id} due to payment timeout`);
    }

    console.log(
      `Appointment status update completed at ${now.toISOString()}`
    );
  } catch (error) {
    console.error("Error updating appointment statuses:", error);
  }
}

/**
 * Start the appointment scheduler
 * Runs every minute
 */
export function startAppointmentScheduler() {
  console.log("Starting appointment scheduler...");

  // Run immediately on start
  updateAppointmentStatuses();

  // Then run every minute
  setInterval(updateAppointmentStatuses, 60 * 1000);
}

/**
 * Check if a user can join an appointment right now
 * @param appointment The appointment to check
 * @param userId The user trying to join
 * @returns Object with canJoin status and reason
 */
export async function canJoinAppointment(
  appointment: any,
  userId: string
): Promise<{
  canJoin: boolean;
  reason?: string;
  timeUntilStart?: number;
  timeUntilEnd?: number;
}> {
  const now = new Date();
  const scheduledTime = new Date(appointment.scheduledAt);
  const endTime = new Date(
    scheduledTime.getTime() + appointment.duration * 60000
  );

  // 5 minute buffer before appointment
  const bufferStartTime = new Date(scheduledTime.getTime() - 5 * 60000);
  // 5 minute buffer after appointment
  const bufferEndTime = new Date(endTime.getTime() + 5 * 60000);
  if (
    ![
      AppointmentStatus.CONFIRMED,
      AppointmentStatus.IN_PROGRESS,
    ].includes(appointment.status)
  ) {
    return {
      canJoin: false,
      reason: `Appointment is ${appointment.status}. Only CONFIRMED or IN_PROGRESS appointments can be joined.`,
    };
  }
  if (appointment.patientId !== userId && appointment.doctorId !== userId) {
    return {
      canJoin: false,
      reason: "You are not a participant in this appointment",
    };
  }
  if (now < bufferStartTime) {
    const timeUntilStart = Math.ceil(
      (bufferStartTime.getTime() - now.getTime()) / 60000
    );
    return {
      canJoin: false,
      reason: `Appointment can be joined ${timeUntilStart} minutes before the scheduled time`,
      timeUntilStart,
    };
  }
  if (now > bufferEndTime) {
    return {
      canJoin: false,
      reason: "This appointment has ended",
    };
  }

  // If doctor, check if they're in another meeting
  if (appointment.doctorId === userId) {
    const ongoingAppointment = await prisma.appointment.findFirst({
      where: {
        doctorId: userId,
        id: {
          not: appointment.id,
        },
        status: AppointmentStatus.IN_PROGRESS,
      },
    });

    if (ongoingAppointment) {
      return {
        canJoin: false,
        reason: "You are currently in another consultation",
      };
    }
  }

  // Calculate time until start/end for UI display
  const timeUntilStart =
    now < scheduledTime
      ? Math.ceil((scheduledTime.getTime() - now.getTime()) / 60000)
      : 0;
  const timeUntilEnd = Math.ceil((bufferEndTime.getTime() - now.getTime()) / 60000);

  return {
    canJoin: true,
    timeUntilStart,
    timeUntilEnd,
  };
}
