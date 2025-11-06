import { Request, Response } from "express";
import { PrismaClient, AppointmentStatus, PaymentStatus } from "@prisma/client";
import { formatResponse } from "../utils/helpers";

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
    const appointmentTime = new Date(scheduledAt);
    const endTime = new Date(appointmentTime.getTime() + duration * 60000);

    const conflictingAppointment = await prisma.appointment.findFirst({
      where: {
        doctorId: doctorProfile.user.id,
        status: {
          in: ["SCHEDULED", "CONFIRMED"],
        },
        OR: [
          {
            scheduledAt: {
              lt: endTime,
              gte: appointmentTime,
            },
          },
          {
            AND: [
              { scheduledAt: { lte: appointmentTime } },
              {
                scheduledAt: {
                  gte: new Date(appointmentTime.getTime() - duration * 60000),
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

    // Create appointment
    const appointment = await prisma.appointment.create({
      data: {
        patientId: req.user.id,
        doctorId: doctorProfile.user.id,
        scheduledAt: appointmentTime,
        duration,
        notes,
        amount: doctorProfile.consultationFee,
        status: AppointmentStatus.SCHEDULED,
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
    } else {
      res
        .status(403)
        .json(formatResponse("error", "Invalid user role for appointments"));
      return;
    }

    // Filter by status
    if (status) {
      whereClause.status = status;
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

    const selectedDate = new Date(date as string);
    const startOfDay = new Date(selectedDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(selectedDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Get existing appointments for the day
    const existingAppointments = await prisma.appointment.findMany({
      where: {
        doctorId,
        scheduledAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
        status: {
          in: [AppointmentStatus.SCHEDULED, AppointmentStatus.CONFIRMED],
        },
      },
      select: {
        scheduledAt: true,
        duration: true,
      },
    });

    // Generate available time slots (9 AM to 5 PM, 30-minute slots)
    const availableSlots = [];
    const startHour = 9;
    const endHour = 17;
    const slotDuration = 30; // minutes

    for (let hour = startHour; hour < endHour; hour++) {
      for (let minute = 0; minute < 60; minute += slotDuration) {
        const slotTime = new Date(selectedDate);
        slotTime.setHours(hour, minute, 0, 0);

        // Skip past time slots
        if (slotTime <= new Date()) {
          continue;
        }

        // Check if slot conflicts with existing appointments
        const isConflict = existingAppointments.some((apt) => {
          const aptStart = new Date(apt.scheduledAt);
          const aptEnd = new Date(aptStart.getTime() + apt.duration * 60000);
          const slotEnd = new Date(slotTime.getTime() + slotDuration * 60000);

          return (
            (slotTime >= aptStart && slotTime < aptEnd) ||
            (slotEnd > aptStart && slotEnd <= aptEnd) ||
            (slotTime <= aptStart && slotEnd >= aptEnd)
          );
        });

        if (!isConflict) {
          availableSlots.push({
            time: slotTime.toISOString(),
            displayTime: slotTime.toLocaleTimeString("en-US", {
              hour: "numeric",
              minute: "2-digit",
              hour12: true,
            }),
          });
        }
      }
    }

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
