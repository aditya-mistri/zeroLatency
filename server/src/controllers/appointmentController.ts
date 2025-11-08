import { Request, Response } from "express";
import { PrismaClient, AppointmentStatus, PaymentStatus } from "@prisma/client";
import { formatResponse } from "../utils/helpers";

// Socket.IO instance - will be injected
let socketIO: any = null;

export const setSocketIO = (io: any) => {
  socketIO = io;
};

const prisma = new PrismaClient();

// Create a new appointment
export const createAppointment = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json(formatResponse("error", "User not authenticated"));
      return;
    }

    const { doctorId, scheduledAt, notes, duration = 30 } = req.body;

    // Validation
    if (!doctorId || !scheduledAt) {
      res
        .status(400)
        .json(
          formatResponse("error", "Doctor ID and scheduled time are required")
        );
      return;
    }

    // Validate appointment time is not in the past
    const appointmentTime = new Date(scheduledAt);
    const now = new Date();

    if (appointmentTime < now) {
      res
        .status(400)
        .json(
          formatResponse(
            "error",
            "Appointments cannot be scheduled in the past"
          )
        );
      return;
    }

    // Limit appointments to next 7 days only
    const maxFutureTime = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days from now
    if (appointmentTime > maxFutureTime) {
      res
        .status(400)
        .json(
          formatResponse(
            "error",
            "Appointments can only be booked within the next 7 days"
          )
        );
      return;
    }

    // Ensure user is a patient
    if (req.user.role !== "PATIENT") {
      res
        .status(403)
        .json(formatResponse("error", "Only patients can book appointments"));
      return;
    }

    // Check if doctor exists and is approved
    const doctorProfile = await prisma.doctorProfile.findUnique({
      where: { id: doctorId },
      include: {
        user: true,
      },
    });

    if (!doctorProfile || doctorProfile.user.role !== "DOCTOR") {
      res.status(404).json(formatResponse("error", "Doctor not found"));
      return;
    }

    if (doctorProfile.status !== "APPROVED") {
      res
        .status(400)
        .json(
          formatResponse("error", "Doctor is not approved for consultations")
        );
      return;
    }

    // Check for time slot conflicts
    const appointmentDateTime = new Date(scheduledAt);
    const endTime = new Date(appointmentDateTime.getTime() + duration * 60000);

    const conflictingAppointment = await prisma.appointment.findFirst({
      where: {
        doctorId: doctorProfile.user.id,
        status: {
          in: ["PAYMENT_PENDING", "SCHEDULED", "CONFIRMED"],
        },
        OR: [
          {
            scheduledAt: {
              lt: endTime,
              gte: appointmentDateTime,
            },
          },
          {
            AND: [
              { scheduledAt: { lte: appointmentDateTime } },
              {
                scheduledAt: {
                  gte: new Date(
                    appointmentDateTime.getTime() - duration * 60000
                  ),
                },
              },
            ],
          },
        ],
      },
    });

    if (conflictingAppointment) {
      res
        .status(400)
        .json(formatResponse("error", "Time slot is not available"));
      return;
    }

    // Create appointment with payment pending status
    const appointment = await prisma.appointment.create({
      data: {
        patientId: req.user.id,
        doctorId: doctorProfile.user.id,
        scheduledAt: appointmentDateTime,
        duration,
        notes,
        amount: doctorProfile.consultationFee,
        status: AppointmentStatus.PAYMENT_PENDING,
        paymentStatus: PaymentStatus.PENDING,
      },
      include: {
        doctor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            doctorProfile: {
              select: {
                specialization: true,
                consultationFee: true,
                hospital: {
                  select: {
                    name: true,
                    address: true,
                  },
                },
              },
            },
          },
        },
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    res.status(201).json(
      formatResponse("success", "Appointment booked successfully", {
        appointment,
      })
    );
  } catch (error) {
    console.error("Create appointment error:", error);
    res.status(500).json(formatResponse("error", "Internal server error"));
  }
};

// Get appointments for current user
export const getAppointments = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json(formatResponse("error", "User not authenticated"));
      return;
    }

    const { status, page = 1, limit = 10, upcoming } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let whereClause: any = {};

    // Filter by user role
    if (req.user.role === "PATIENT") {
      whereClause.patientId = req.user.id;
    } else if (req.user.role === "DOCTOR") {
      whereClause.doctorId = req.user.id;
      // Doctors should only see appointments that have been paid for
      // Exclude PAYMENT_PENDING appointments from doctor's view
      whereClause.status = {
        not: AppointmentStatus.PAYMENT_PENDING,
      };
    } else {
      res
        .status(403)
        .json(formatResponse("error", "Invalid user role for appointments"));
      return;
    }

    // Filter by status
    if (status) {
      if (req.user.role === "DOCTOR") {
        // For doctors, apply status filter but still exclude PAYMENT_PENDING
        if (status !== AppointmentStatus.PAYMENT_PENDING) {
          whereClause.status = status;
        }
        // If requesting PAYMENT_PENDING specifically, return empty result for doctors
        else {
          whereClause.status = "IMPOSSIBLE_STATUS"; // This will return no results
        }
      } else {
        whereClause.status = status;
      }
    }

    // Filter upcoming appointments
    if (upcoming === "true") {
      whereClause.scheduledAt = {
        gte: new Date(),
      };
    }

    const [appointments, totalCount] = await Promise.all([
      prisma.appointment.findMany({
        where: whereClause,
        include: {
          doctor: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              doctorProfile: {
                select: {
                  specialization: true,
                  consultationFee: true,
                  hospital: {
                    select: {
                      name: true,
                      address: true,
                    },
                  },
                },
              },
            },
          },
          patient: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
              dateOfBirth: true,
              gender: true,
            },
          },
        },
        orderBy: {
          scheduledAt: "asc",
        },
        skip: offset,
        take: Number(limit),
      }),
      prisma.appointment.count({ where: whereClause }),
    ]);

    res.status(200).json(
      formatResponse("success", "Appointments retrieved successfully", {
        appointments,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: totalCount,
          totalPages: Math.ceil(totalCount / Number(limit)),
        },
      })
    );
  } catch (error) {
    console.error("Get appointments error:", error);
    res.status(500).json(formatResponse("error", "Internal server error"));
  }
};

// Get appointment by ID
export const getAppointmentById = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json(formatResponse("error", "User not authenticated"));
      return;
    }

    const { appointmentId } = req.params;

    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        doctor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            doctorProfile: {
              select: {
                specialization: true,
                qualification: true,
                experience: true,
                consultationFee: true,
                hospital: {
                  select: {
                    name: true,
                    address: true,
                    phone: true,
                  },
                },
              },
            },
          },
        },
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            dateOfBirth: true,
            gender: true,
            address: true,
          },
        },
      },
    });

    if (!appointment) {
      res.status(404).json(formatResponse("error", "Appointment not found"));
      return;
    }

    // Check if user has access to this appointment
    if (
      appointment.patientId !== req.user.id &&
      appointment.doctorId !== req.user.id
    ) {
      res.status(403).json(formatResponse("error", "Access denied"));
      return;
    }

    res.status(200).json(
      formatResponse("success", "Appointment retrieved successfully", {
        appointment,
      })
    );
  } catch (error) {
    console.error("Get appointment error:", error);
    res.status(500).json(formatResponse("error", "Internal server error"));
  }
};

// Update appointment status
export const updateAppointmentStatus = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json(formatResponse("error", "User not authenticated"));
      return;
    }

    const { appointmentId } = req.params;
    const { status, notes } = req.body;

    if (!status) {
      res.status(400).json(formatResponse("error", "Status is required"));
      return;
    }

    // Validate status
    if (!Object.values(AppointmentStatus).includes(status)) {
      res
        .status(400)
        .json(formatResponse("error", "Invalid appointment status"));
      return;
    }

    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
    });

    if (!appointment) {
      res.status(404).json(formatResponse("error", "Appointment not found"));
      return;
    }

    // Check permissions
    if (req.user.role === "PATIENT" && appointment.patientId !== req.user.id) {
      res.status(403).json(formatResponse("error", "Access denied"));
      return;
    }

    if (req.user.role === "DOCTOR" && appointment.doctorId !== req.user.id) {
      res.status(403).json(formatResponse("error", "Access denied"));
      return;
    }

    // Business logic for status changes
    if (status === AppointmentStatus.CANCELLED) {
      // Allow cancellation up to 2 hours before appointment
      const twoHoursBeforeAppointment = new Date(
        appointment.scheduledAt.getTime() - 2 * 60 * 60 * 1000
      );
      if (new Date() > twoHoursBeforeAppointment) {
        res
          .status(400)
          .json(
            formatResponse(
              "error",
              "Cannot cancel appointment less than 2 hours before scheduled time"
            )
          );
        return;
      }
    }

    const updatedAppointment = await prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        status,
        notes: notes || appointment.notes,
        updatedAt: new Date(),
      },
      include: {
        doctor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    res
      .status(200)
      .json(
        formatResponse(
          "success",
          `Appointment ${status.toLowerCase()} successfully`,
          { appointment: updatedAppointment }
        )
      );
  } catch (error) {
    console.error("Update appointment error:", error);
    res.status(500).json(formatResponse("error", "Internal server error"));
  }
};

// Cancel appointment
export const cancelAppointment = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json(formatResponse("error", "User not authenticated"));
      return;
    }

    const { appointmentId } = req.params;
    const { reason } = req.body;

    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
    });

    if (!appointment) {
      res.status(404).json(formatResponse("error", "Appointment not found"));
      return;
    }

    // Check if user has permission to cancel
    if (
      appointment.patientId !== req.user.id &&
      appointment.doctorId !== req.user.id
    ) {
      res.status(403).json(formatResponse("error", "Access denied"));
      return;
    }

    // Check if appointment can be cancelled
    if (appointment.status === AppointmentStatus.COMPLETED) {
      res
        .status(400)
        .json(formatResponse("error", "Cannot cancel completed appointment"));
      return;
    }

    if (appointment.status === AppointmentStatus.CANCELLED) {
      res
        .status(400)
        .json(formatResponse("error", "Appointment is already cancelled"));
      return;
    }

    // Check cancellation time limit (2 hours before)
    const twoHoursBeforeAppointment = new Date(
      appointment.scheduledAt.getTime() - 2 * 60 * 60 * 1000
    );
    if (new Date() > twoHoursBeforeAppointment) {
      res
        .status(400)
        .json(
          formatResponse(
            "error",
            "Cannot cancel appointment less than 2 hours before scheduled time"
          )
        );
      return;
    }

    const updatedAppointment = await prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        status: AppointmentStatus.CANCELLED,
        notes: reason ? `Cancelled: ${reason}` : "Cancelled by user",
        updatedAt: new Date(),
      },
      include: {
        doctor: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        patient: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    res.status(200).json(
      formatResponse("success", "Appointment cancelled successfully", {
        appointment: updatedAppointment,
      })
    );
  } catch (error) {
    console.error("Cancel appointment error:", error);
    res.status(500).json(formatResponse("error", "Internal server error"));
  }
};

// Get available time slots for a doctor
export const getDoctorAvailability = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { doctorId } = req.params;
    const { date } = req.query;

    if (!date) {
      res.status(400).json(formatResponse("error", "Date is required"));
      return;
    }

    // Check if doctor exists and is approved
    const doctorProfile = await prisma.doctorProfile.findUnique({
      where: { id: doctorId },
      include: {
        user: true,
      },
    });

    if (!doctorProfile || doctorProfile.user.role !== "DOCTOR") {
      res.status(404).json(formatResponse("error", "Doctor not found"));
      return;
    }

    if (doctorProfile.status !== "APPROVED") {
      res.status(400).json(formatResponse("error", "Doctor is not approved"));
      return;
    }

    // Parse date consistently - always use UTC midnight
    const selectedDate = new Date(date as string + "T00:00:00Z");

    // Debug logging
    console.log("getDoctorAvailability - Input date:", date);
    console.log("getDoctorAvailability - Parsed date:", selectedDate);
    console.log("getDoctorAvailability - Doctor ID:", doctorId);

    // Check if doctor has set availability for this date
    const availability = await prisma.doctorAvailability.findUnique({
      where: {
        doctorProfileId_date: {
          doctorProfileId: doctorProfile.id,
          date: selectedDate,
        },
      },
    });

    console.log("getDoctorAvailability - Availability found:", availability);

    if (!availability || !availability.isAvailable) {
      console.log("getDoctorAvailability - No availability or not available");
      res.status(200).json(
        formatResponse("success", "No availability set for this date", {
          date: selectedDate.toISOString().split("T")[0],
          doctorName: `Dr. ${doctorProfile.user.firstName} ${doctorProfile.user.lastName}`,
          availableSlots: [],
          message: "Doctor has not set availability for this date",
        })
      );
      return;
    }

    // Get existing appointments for the day
    const existingAppointments = await prisma.appointment.findMany({
      where: {
        doctorId: doctorProfile.user.id,
        scheduledAt: {
          gte: new Date(
            selectedDate.toISOString().split("T")[0] + "T00:00:00Z"
          ),
          lt: new Date(selectedDate.toISOString().split("T")[0] + "T23:59:59Z"),
        },
        status: {
          in: [
            AppointmentStatus.PAYMENT_PENDING,
            AppointmentStatus.SCHEDULED,
            AppointmentStatus.CONFIRMED,
          ],
        },
      },
      select: {
        scheduledAt: true,
        duration: true,
      },
    });

    // Generate time slots based on doctor's availability
    console.log("getDoctorAvailability - Availability details:", {
      startTime: availability.startTime,
      endTime: availability.endTime,
      slotDuration: availability.slotDuration,
      existingAppointmentsCount: existingAppointments.length,
    });

    const availableSlots = generateAvailableSlots(
      availability.startTime,
      availability.endTime,
      availability.slotDuration,
      existingAppointments,
      selectedDate
    );

    console.log(
      "getDoctorAvailability - Generated slots:",
      availableSlots.length
    );

    res.status(200).json(
      formatResponse("success", "Available slots retrieved successfully", {
        date: selectedDate.toISOString().split("T")[0],
        availableSlots,
        doctor: {
          name: `Dr. ${doctorProfile.user.firstName} ${doctorProfile.user.lastName}`,
          specialization: doctorProfile.specialization,
          consultationFee: doctorProfile.consultationFee,
        },
      })
    );
  } catch (error) {
    console.error("Get availability error:", error);
    res.status(500).json(formatResponse("error", "Internal server error"));
  }
};

// Helper function to generate available slots
function generateAvailableSlots(
  startTime: string,
  endTime: string,
  slotDuration: number,
  existingAppointments: any[],
  date: Date
): { time: string; displayTime: string }[] {
  const slots = [];
  const [startHour, startMin] = startTime.split(":").map(Number);
  const [endHour, endMin] = endTime.split(":").map(Number);

  let currentMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;

  while (currentMinutes < endMinutes) {
    const hours = Math.floor(currentMinutes / 60);
    const minutes = currentMinutes % 60;

    // Create full datetime for this slot in UTC
    const slotDateTime = new Date(date);
    slotDateTime.setUTCHours(hours, minutes, 0, 0);

    // Check if slot is in the past
    const now = new Date();
    const isInPast = slotDateTime < now; // Allow current time, block past times

    // Check if slot conflicts with existing appointments
    const hasConflict = existingAppointments.some((appointment) => {
      const appointmentTime = new Date(appointment.scheduledAt);
      const appointmentEnd = new Date(
        appointmentTime.getTime() + (appointment.duration || 30) * 60000
      );
      const slotEnd = new Date(slotDateTime.getTime() + slotDuration * 60000);

      return (
        (slotDateTime >= appointmentTime && slotDateTime < appointmentEnd) ||
        (slotEnd > appointmentTime && slotEnd <= appointmentEnd) ||
        (slotDateTime <= appointmentTime && slotEnd >= appointmentEnd)
      );
    });

    if (!isInPast && !hasConflict) {
      // Format time for display - use the time values directly, not converted
      const hour12 = hours % 12 || 12;
      const period = hours >= 12 ? "PM" : "AM";
      const displayTime = `${hour12}:${minutes.toString().padStart(2, "0")} ${period}`;
      
      slots.push({
        time: slotDateTime.toISOString(),
        displayTime: displayTime, // Shows correct local time
      });
    }

    currentMinutes += slotDuration;
  }

  return slots;
}

// Process payment for appointment
export const processPayment = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json(formatResponse("error", "User not authenticated"));
      return;
    }

    const { appointmentId } = req.params;
    const { paymentMethod, cardNumber, expiryDate, cvv, cardholderName } =
      req.body;

    // Validation
    if (
      !paymentMethod ||
      !cardNumber ||
      !expiryDate ||
      !cvv ||
      !cardholderName
    ) {
      res
        .status(400)
        .json(formatResponse("error", "All payment details are required"));
      return;
    }

    // Find appointment
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        doctor: {
          select: {
            firstName: true,
            lastName: true,
            doctorProfile: {
              select: {
                specialization: true,
              },
            },
          },
        },
      },
    });

    if (!appointment) {
      res.status(404).json(formatResponse("error", "Appointment not found"));
      return;
    }

    // Check if user is the patient who booked the appointment
    if (appointment.patientId !== req.user.id) {
      res
        .status(403)
        .json(
          formatResponse("error", "You can only pay for your own appointments")
        );
      return;
    }

    // Check if appointment is in correct status for payment
    if (appointment.status !== AppointmentStatus.PAYMENT_PENDING) {
      res
        .status(400)
        .json(formatResponse("error", "This appointment cannot be paid for"));
      return;
    }

    // Mock payment processing - simulate different outcomes
    const mockPaymentResult = await simulatePayment(
      cardNumber,
      appointment.amount
    );

    if (mockPaymentResult.success) {
      // Update appointment status to SCHEDULED and payment to COMPLETED
      const updatedAppointment = await prisma.appointment.update({
        where: { id: appointmentId },
        data: {
          status: AppointmentStatus.SCHEDULED,
          paymentStatus: PaymentStatus.COMPLETED,
          paymentId: mockPaymentResult.paymentId,
        },
        include: {
          doctor: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              doctorProfile: {
                select: {
                  specialization: true,
                  consultationFee: true,
                  hospital: {
                    select: {
                      name: true,
                      address: true,
                    },
                  },
                },
              },
            },
          },
          patient: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      });

      res.json(
        formatResponse("success", "Payment processed successfully", {
          appointment: updatedAppointment,
          paymentId: mockPaymentResult.paymentId,
        })
      );
    } else {
      // Update payment status to FAILED
      await prisma.appointment.update({
        where: { id: appointmentId },
        data: {
          paymentStatus: PaymentStatus.FAILED,
        },
      });

      res
        .status(400)
        .json(
          formatResponse(
            "error",
            mockPaymentResult.errorMessage || "Payment processing failed"
          )
        );
    }
  } catch (error) {
    console.error("Payment processing error:", error);
    res.status(500).json(formatResponse("error", "Internal server error"));
  }
};

// Set meeting link for an appointment (doctor only)
export const setMeetingLink = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json(formatResponse("error", "User not authenticated"));
      return;
    }

    const { appointmentId } = req.params;
    const { meetingLink } = req.body;

    if (!meetingLink) {
      res.status(400).json(formatResponse("error", "Meeting link is required"));
      return;
    }

    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
    });

    if (!appointment) {
      res.status(404).json(formatResponse("error", "Appointment not found"));
      return;
    }

    // Only the doctor for this appointment can set the meeting link
    if (req.user.role !== "DOCTOR" || appointment.doctorId !== req.user.id) {
      res.status(403).json(formatResponse("error", "Access denied"));
      return;
    }

    const updated = await prisma.appointment.update({
      where: { id: appointmentId },
      data: { meetingLink, updatedAt: new Date() },
      include: {
        doctor: { select: { id: true, firstName: true, lastName: true } },
        patient: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    // Emit socket event if Socket.IO is available
    if (socketIO) {
      socketIO.to(`appointment-${appointmentId}`).emit("meeting-link-updated", {
        appointmentId,
        meetingLink: updated.meetingLink,
      });
    }

    res.json(
      formatResponse("success", "Meeting link set successfully", {
        appointment: updated,
      })
    );
  } catch (error) {
    console.error("Set meeting link error:", error);
    res.status(500).json(formatResponse("error", "Internal server error"));
  }
};

// Get meeting link (doctor or patient)
export const getMeetingLink = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json(formatResponse("error", "User not authenticated"));
      return;
    }

    const { appointmentId } = req.params;

    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      select: {
        id: true,
        meetingLink: true,
        doctorId: true,
        patientId: true,
        scheduledAt: true,
        duration: true,
        status: true,
      },
    });

    if (!appointment) {
      res.status(404).json(formatResponse("error", "Appointment not found"));
      return;
    }

    // Only patient or doctor can access
    if (
      req.user.id !== appointment.patientId &&
      req.user.id !== appointment.doctorId
    ) {
      res.status(403).json(formatResponse("error", "Access denied"));
      return;
    }

    res.json(
      formatResponse("success", "Meeting link retrieved", {
        meetingLink: appointment.meetingLink,
        appointment,
      })
    );
  } catch (error) {
    console.error("Get meeting link error:", error);
    res.status(500).json(formatResponse("error", "Internal server error"));
  }
};

// Post a chat message for an appointment
export const postChatMessage = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json(formatResponse("error", "User not authenticated"));
      return;
    }

    const { appointmentId } = req.params;
    const { message, messageType = "text", metadata } = req.body;

    if (!message) {
      res.status(400).json(formatResponse("error", "Message text is required"));
      return;
    }

    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
    });
    if (!appointment) {
      res.status(404).json(formatResponse("error", "Appointment not found"));
      return;
    }

    // Only participants may post messages
    if (
      req.user.id !== appointment.patientId &&
      req.user.id !== appointment.doctorId
    ) {
      res.status(403).json(formatResponse("error", "Access denied"));
      return;
    }

    // Allow messaging only when appointment is IN_PROGRESS or doctor posting meeting link while SCHEDULED/CONFIRMED
    if (
      appointment.status !== AppointmentStatus.IN_PROGRESS &&
      !(
        req.user.role === "DOCTOR" &&
        (appointment.status === AppointmentStatus.SCHEDULED ||
          appointment.status === AppointmentStatus.CONFIRMED)
      )
    ) {
      res
        .status(400)
        .json(
          formatResponse(
            "error",
            "Chat is available only during the consultation"
          )
        );
      return;
    }

    const chat = await prisma.chatMessage.create({
      data: {
        appointmentId,
        senderId: req.user.id,
        message,
        messageType,
        metadata: metadata || {},
      },
      include: {
        sender: {
          select: { id: true, firstName: true, lastName: true, role: true },
        },
      },
    });

    // Emit socket event if Socket.IO is available
    if (socketIO) {
      socketIO
        .to(`appointment-${appointmentId}`)
        .emit("new-message", { message: chat });
    }

    res.json(formatResponse("success", "Message sent", { message: chat }));
  } catch (error) {
    console.error("Post chat message error:", error);
    res.status(500).json(formatResponse("error", "Internal server error"));
  }
};

// Get chat messages for an appointment
export const getChatMessages = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json(formatResponse("error", "User not authenticated"));
      return;
    }

    const { appointmentId } = req.params;

    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
    });
    if (!appointment) {
      res.status(404).json(formatResponse("error", "Appointment not found"));
      return;
    }

    // Only participants may read messages
    if (
      req.user.id !== appointment.patientId &&
      req.user.id !== appointment.doctorId
    ) {
      res.status(403).json(formatResponse("error", "Access denied"));
      return;
    }

    const messages = await prisma.chatMessage.findMany({
      where: { appointmentId },
      include: {
        sender: {
          select: { id: true, firstName: true, lastName: true, role: true },
        },
      },
      orderBy: { sentAt: "asc" },
    });

    res.json(formatResponse("success", "Messages retrieved", { messages }));
  } catch (error) {
    console.error("Get chat messages error:", error);
    res.status(500).json(formatResponse("error", "Internal server error"));
  }
};

// Get appointment payment details
export const getPaymentDetails = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json(formatResponse("error", "User not authenticated"));
      return;
    }

    const { appointmentId } = req.params;

    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        doctor: {
          select: {
            firstName: true,
            lastName: true,
            doctorProfile: {
              select: {
                specialization: true,
                consultationFee: true,
                hospital: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!appointment) {
      res.status(404).json(formatResponse("error", "Appointment not found"));
      return;
    }

    // Check if user has access to this appointment
    if (
      appointment.patientId !== req.user.id &&
      appointment.doctorId !== req.user.id
    ) {
      res.status(403).json(formatResponse("error", "Access denied"));
      return;
    }

    res.json(
      formatResponse("success", "Payment details retrieved", {
        appointmentId: appointment.id,
        amount: appointment.amount,
        paymentStatus: appointment.paymentStatus,
        paymentId: appointment.paymentId,
        doctorName: `${appointment.doctor.firstName} ${appointment.doctor.lastName}`,
        specialization: appointment.doctor.doctorProfile?.specialization,
        hospitalName: appointment.doctor.doctorProfile?.hospital?.name,
        scheduledAt: appointment.scheduledAt,
      })
    );
  } catch (error) {
    console.error("Get payment details error:", error);
    res.status(500).json(formatResponse("error", "Internal server error"));
  }
};

// Types for payment simulation
interface PaymentResult {
  success: boolean;
  paymentId?: string;
  transactionId?: string;
  amount?: number;
  errorMessage?: string;
}

// Mock payment simulation function
async function simulatePayment(
  cardNumber: string,
  amount: number
): Promise<PaymentResult> {
  // Simulate processing delay
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // Mock different card numbers for testing different scenarios
  if (cardNumber.endsWith("0000")) {
    return {
      success: false,
      errorMessage: "Payment declined - Insufficient funds",
    };
  }

  if (cardNumber.endsWith("1111")) {
    return {
      success: false,
      errorMessage: "Payment declined - Invalid card number",
    };
  }

  if (cardNumber.endsWith("2222")) {
    return {
      success: false,
      errorMessage: "Payment declined - Card expired",
    };
  }

  // Default success case
  return {
    success: true,
    paymentId: `pay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    transactionId: `txn_${Date.now()}`,
    amount: amount,
  };
}
