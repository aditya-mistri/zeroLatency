import { Request, Response } from "express";
import { PrismaClient, AppointmentStatus } from "@prisma/client";
import { StreamClient } from "@stream-io/node-sdk";

const prisma = new PrismaClient();

// Lazy-initialized Stream client
let streamClient: StreamClient | null = null;

function getStreamClient(): StreamClient {
  const apiKey = process.env.STREAM_API_KEY;
  const apiSecret = process.env.STREAM_API_SECRET;
  if (!apiKey || !apiSecret) {
    throw new Error(
      "Stream credentials missing. Please set STREAM_API_KEY and STREAM_API_SECRET in the environment."
    );
  }
  if (!streamClient) {
    // The constructor accepts (apiKey, apiSecret)
    streamClient = new StreamClient(apiKey, apiSecret);
  }
  return streamClient;
}

function withinWindow(scheduledAt: Date, durationMins: number): boolean {
  // In development, allow much wider window for testing
  const isDev = process.env.NODE_ENV === "development";
  const earlySeconds = isDev ? 2 * 60 * 60 : 5 * 60; // 2 hours in dev, 5 min in prod
  const lateSeconds = isDev ? 2 * 60 * 60 : 2 * 60; // 2 hours in dev, 2 min in prod

  const start = new Date(scheduledAt);
  const end = new Date(start.getTime() + durationMins * 60000);
  const now = new Date();

  return (
    now.getTime() >= start.getTime() - earlySeconds * 1000 &&
    now.getTime() <= end.getTime() + lateSeconds * 1000
  );
}

// Combined endpoint for both chat and video Stream tokens
export const getStreamToken = async (req: Request, res: Response) => {
  try {
    const { appointmentId } = req.body as { appointmentId?: string };
    if (!appointmentId) {
      return res
        .status(400)
        .json({ status: "error", message: "appointmentId is required" });
    }
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      select: {
        id: true,
        scheduledAt: true,
        duration: true,
        status: true,
        doctorId: true,
        patientId: true,
      },
    });

    if (!appointment) {
      return res
        .status(404)
        .json({ status: "error", message: "Appointment not found" });
    }

    const user = (req as any).user as
      | {
          id: string;
          role: string;
          firstName?: string;
          lastName?: string;
          avatar?: string;
        }
      | undefined;
    if (!user) {
      return res.status(401).json({ status: "error", message: "Unauthorized" });
    }

    const isParticipant =
      user.id === appointment.doctorId || user.id === appointment.patientId;
    if (!isParticipant) {
      return res
        .status(403)
        .json({ status: "error", message: "Access denied" });
    }

    // Only allow for active appointment states
    if (
      appointment.status === AppointmentStatus.CANCELLED ||
      appointment.status === AppointmentStatus.COMPLETED ||
      appointment.status === AppointmentStatus.PAYMENT_PENDING
    ) {
      return res.status(400).json({
        status: "error",
        message: `Chat and video not available for status ${appointment.status}`,
      });
    }

    // Time-window gate DISABLED for development testing
    // if (!withinWindow(appointment.scheduledAt, appointment.duration)) {
    //   const isDev = process.env.NODE_ENV === "development";
    //   return res.status(403).json({
    //     status: "error",
    //     message: isDev
    //       ? "Appointment is outside the allowed window (2 hours before/after in dev mode)"
    //       : "You can only join around the scheduled time window (5 min early, until 2 min after end)",
    //   });
    // }

    const client = getStreamClient();

    // Create a user token valid for 2 hours
    const expiresInSeconds = 2 * 60 * 60;
    const token = client.createToken(
      user.id,
      Math.floor(Date.now() / 1000) + expiresInSeconds
    );

    const apiKey = process.env.STREAM_API_KEY as string;
    const channelId = `appointment-${appointment.id}`;
    const callId = `appointment_${appointment.id}`;

    return res.status(200).json({
      status: "success",
      message: "Stream tokens issued",
      data: {
        apiKey,
        token,
        user: {
          id: user.id,
          name: `${(user as any).firstName || ""} ${(user as any).lastName || ""}`.trim(),
          image: (user as any).avatar || undefined,
        },
        chat: {
          channelType: "messaging",
          channelId: channelId,
          members: [appointment.doctorId, appointment.patientId], // Send member list to frontend
        },
        call: {
          type: "default",
          id: callId,
        },
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("getStreamToken error:", error);
    return res.status(500).json({
      status: "error",
      message: error?.message || "Failed to issue Stream tokens",
    });
  }
};

// Keep old name for backward compatibility
export const getVideoToken = getStreamToken;

export default { getStreamToken, getVideoToken };
