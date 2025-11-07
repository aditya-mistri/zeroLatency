import { Server, Socket } from "socket.io";
import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface AuthenticatedSocket extends Socket {
  userId?: string;
  userRole?: string;
}

export const setupSocketIO = (server: any) => {
  const io = new Server(server, {
    cors: {
      origin: process.env.ALLOWED_ORIGINS?.split(",") || [
        "http://localhost:3000",
      ],
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  // Authentication middleware
  io.use(async (socket: any, next) => {
    try {
      const token =
        socket.handshake.auth.token ||
        socket.handshake.headers.authorization?.split(" ")[1];

      if (!token) {
        return next(new Error("Authentication required"));
      }

      const jwtSecret = process.env.JWT_SECRET;
      if (!jwtSecret) {
        return next(new Error("Server configuration error"));
      }

      const decoded: any = jwt.verify(token, jwtSecret);

      // Verify user exists and is active
      const user = await prisma.user.findUnique({
        where: { id: decoded.id },
        select: { id: true, role: true, isActive: true },
      });

      if (!user || !user.isActive) {
        return next(new Error("Invalid user"));
      }

      socket.userId = user.id;
      socket.userRole = user.role;
      next();
    } catch (error) {
      console.error("Socket authentication error:", error);
      next(new Error("Authentication failed"));
    }
  });

  io.on("connection", (socket: AuthenticatedSocket) => {
    console.log(`User ${socket.userId} connected to socket`);

    // Join appointment room
    socket.on("join-appointment", async (appointmentId: string) => {
      try {
        // Verify user has access to this appointment
        const appointment = await prisma.appointment.findUnique({
          where: { id: appointmentId },
          select: { doctorId: true, patientId: true, status: true },
        });

        if (!appointment) {
          socket.emit("error", { message: "Appointment not found" });
          return;
        }

        if (
          socket.userId !== appointment.doctorId &&
          socket.userId !== appointment.patientId
        ) {
          socket.emit("error", { message: "Access denied" });
          return;
        }

        // Join the room
        socket.join(`appointment-${appointmentId}`);
        socket.emit("joined-appointment", {
          appointmentId,
          status: appointment.status,
        });
        console.log(
          `User ${socket.userId} joined appointment room ${appointmentId}`
        );

        // Send existing messages
        const messages = await prisma.chatMessage.findMany({
          where: { appointmentId },
          include: {
            sender: {
              select: { id: true, firstName: true, lastName: true, role: true },
            },
          },
          orderBy: { sentAt: "asc" },
        });

        socket.emit("messages-history", { messages });
      } catch (error) {
        console.error("Join appointment error:", error);
        socket.emit("error", { message: "Failed to join appointment" });
      }
    });

    // Leave appointment room
    socket.on("leave-appointment", (appointmentId: string) => {
      socket.leave(`appointment-${appointmentId}`);
      console.log(
        `User ${socket.userId} left appointment room ${appointmentId}`
      );
    });

    // Send message
    socket.on(
      "send-message",
      async (data: {
        appointmentId: string;
        message: string;
        messageType?: string;
      }) => {
        try {
          const { appointmentId, message, messageType = "text" } = data;

          if (!message?.trim()) {
            socket.emit("error", { message: "Message cannot be empty" });
            return;
          }

          // Verify appointment access and status
          const appointment = await prisma.appointment.findUnique({
            where: { id: appointmentId },
            select: { doctorId: true, patientId: true, status: true },
          });

          if (!appointment) {
            socket.emit("error", { message: "Appointment not found" });
            return;
          }

          if (
            socket.userId !== appointment.doctorId &&
            socket.userId !== appointment.patientId
          ) {
            socket.emit("error", { message: "Access denied" });
            return;
          }

          // Check if messaging is allowed
          const isDoctor = socket.userRole === "DOCTOR";
          const allowedStatuses = ["IN_PROGRESS"];
          const doctorPreShareStatuses = ["SCHEDULED", "CONFIRMED"];

          if (
            !allowedStatuses.includes(appointment.status) &&
            !(isDoctor && doctorPreShareStatuses.includes(appointment.status))
          ) {
            socket.emit("error", {
              message: "Chat is only available during the consultation",
            });
            return;
          }

          // Create message
          const chatMessage = await prisma.chatMessage.create({
            data: {
              appointmentId,
              senderId: socket.userId!,
              message: message.trim(),
              messageType,
            },
            include: {
              sender: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  role: true,
                },
              },
            },
          });

          // Emit to all users in the appointment room
          io.to(`appointment-${appointmentId}`).emit("new-message", {
            message: chatMessage,
          });
        } catch (error) {
          console.error("Send message error:", error);
          socket.emit("error", { message: "Failed to send message" });
        }
      }
    );

    // Update meeting link
    socket.on(
      "update-meeting-link",
      async (data: { appointmentId: string; meetingLink: string }) => {
        try {
          const { appointmentId, meetingLink } = data;

          // Verify appointment and doctor access
          const appointment = await prisma.appointment.findUnique({
            where: { id: appointmentId },
            select: { doctorId: true, patientId: true },
          });

          if (!appointment) {
            socket.emit("error", { message: "Appointment not found" });
            return;
          }

          if (
            socket.userRole !== "DOCTOR" ||
            socket.userId !== appointment.doctorId
          ) {
            socket.emit("error", {
              message: "Only the doctor can set meeting link",
            });
            return;
          }

          // Update meeting link
          const updated = await prisma.appointment.update({
            where: { id: appointmentId },
            data: { meetingLink, updatedAt: new Date() },
          });

          // Emit to all users in the appointment room
          io.to(`appointment-${appointmentId}`).emit("meeting-link-updated", {
            appointmentId,
            meetingLink: updated.meetingLink,
          });
        } catch (error) {
          console.error("Update meeting link error:", error);
          socket.emit("error", { message: "Failed to update meeting link" });
        }
      }
    );

    socket.on("disconnect", () => {
      console.log(`User ${socket.userId} disconnected from socket`);
    });
  });

  return io;
};
