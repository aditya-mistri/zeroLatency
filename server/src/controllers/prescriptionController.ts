import { Request, Response } from "express";
import { PrismaClient, AppointmentStatus } from "@prisma/client";
import { formatResponse } from "../utils/helpers";

const prisma = new PrismaClient();

// Create or update prescription (can be draft during consultation)
export const createPrescription = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json(formatResponse("error", "User not authenticated"));
      return;
    }

    const { appointmentId } = req.params;
    const { diagnosis, medications, labTests, advice, followUpDate, status } = req.body;

    // Validation
    if (!diagnosis || !medications || medications.length === 0) {
      res
        .status(400)
        .json(
          formatResponse("error", "Diagnosis and at least one medication are required")
        );
      return;
    }
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        sessionRecord: {
          include: {
            prescription: true,
          },
        },
      },
    });

    if (!appointment) {
      res.status(404).json(formatResponse("error", "Appointment not found"));
      return;
    }

    // Only doctor can create prescription
    if (req.user.role !== "DOCTOR" || appointment.doctorId !== req.user.id) {
      res.status(403).json(formatResponse("error", "Only the consulting doctor can create prescription"));
      return;
    }

    // Prescription can be created during IN_PROGRESS or COMPLETED consultations
    if (appointment.status !== AppointmentStatus.IN_PROGRESS && 
        appointment.status !== AppointmentStatus.COMPLETED) {
      res
        .status(400)
        .json(
          formatResponse(
            "error",
            "Prescription can only be created during or after consultations"
          )
        );
      return;
    }
    let sessionRecord = await prisma.sessionRecord.findFirst({
      where: { appointmentId },
      include: { prescription: true },
    });

    if (!sessionRecord) {
      sessionRecord = await prisma.sessionRecord.create({
        data: {
          appointmentId,
          userId: req.user.id,
        },
        include: { prescription: true },
      });
    }

    // Determine prescription status (default to DRAFT during IN_PROGRESS, SENT when COMPLETED)
    const prescriptionStatus = status || 
      (appointment.status === AppointmentStatus.IN_PROGRESS ? "DRAFT" : "SENT");

    let prescription;

    // If prescription already exists, update it
    if (sessionRecord.prescription) {
      prescription = await prisma.prescription.update({
        where: { id: sessionRecord.prescription.id },
        data: {
          diagnosis,
          medications,
          labTests,
          advice,
          followUpDate: followUpDate ? new Date(followUpDate) : null,
          status: prescriptionStatus,
        },
      });
    } else {
      prescription = await prisma.prescription.create({
        data: {
          sessionRecordId: sessionRecord.id,
          appointmentId,
          patientId: appointment.patientId,
          doctorId: appointment.doctorId,
          diagnosis,
          medications,
          labTests,
          advice,
          followUpDate: followUpDate ? new Date(followUpDate) : null,
          status: prescriptionStatus,
        },
      });
    }

    res.status(prescription ? 200 : 201).json(
      formatResponse("success", 
        sessionRecord.prescription ? "Prescription updated successfully" : "Prescription created successfully", 
        { prescription }
      )
    );
  } catch (error) {
    console.error("Create prescription error:", error);
    res.status(500).json(formatResponse("error", "Internal server error"));
  }
};
export const getPrescription = async (
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
        sessionRecord: {
          include: {
            prescription: true,
          },
        },
        doctor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            doctorProfile: {
              select: {
                specialization: true,
                qualification: true,
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
            dateOfBirth: true,
            gender: true,
          },
        },
      },
    });

    if (!appointment) {
      res.status(404).json(formatResponse("error", "Appointment not found"));
      return;
    }

    // Only patient or doctor can view prescription
    if (
      appointment.patientId !== req.user.id &&
      appointment.doctorId !== req.user.id
    ) {
      res.status(403).json(formatResponse("error", "Access denied"));
      return;
    }

    if (!appointment.sessionRecord?.prescription) {
      res
        .status(404)
        .json(formatResponse("error", "No prescription found for this consultation"));
      return;
    }

    res.json(
      formatResponse("success", "Prescription retrieved successfully", {
        prescription: appointment.sessionRecord.prescription,
        appointment: {
          id: appointment.id,
          scheduledAt: appointment.scheduledAt,
          doctor: appointment.doctor,
          patient: appointment.patient,
        },
      })
    );
  } catch (error) {
    console.error("Get prescription error:", error);
    res.status(500).json(formatResponse("error", "Internal server error"));
  }
};
export const getPatientMedicalHistory = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json(formatResponse("error", "User not authenticated"));
      return;
    }

    // Only patients can view their own medical history
    if (req.user.role !== "PATIENT") {
      res.status(403).json(formatResponse("error", "Only patients can view medical history"));
      return;
    }

    const appointments = await prisma.appointment.findMany({
      where: {
        patientId: req.user.id,
        status: AppointmentStatus.COMPLETED,
      },
      include: {
        doctor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            doctorProfile: {
              select: {
                specialization: true,
                qualification: true,
                hospital: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
        },
        sessionRecord: {
          select: {
            id: true,
            duration: true,
            startedAt: true,
            endedAt: true,
            transcript: true,
            summary: true,
            prescription: true,
          },
        },
      },
      orderBy: {
        scheduledAt: "desc",
      },
    });

    res.json(
      formatResponse("success", "Medical history retrieved successfully", {
        consultations: appointments,
        total: appointments.length,
      })
    );
  } catch (error) {
    console.error("Get medical history error:", error);
    res.status(500).json(formatResponse("error", "Internal server error"));
  }
};
export const getDoctorPatientRecords = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json(formatResponse("error", "User not authenticated"));
      return;
    }

    // Only doctors can view patient records
    if (req.user.role !== "DOCTOR") {
      res.status(403).json(formatResponse("error", "Only doctors can view patient records"));
      return;
    }

    const appointments = await prisma.appointment.findMany({
      where: {
        doctorId: req.user.id,
        status: AppointmentStatus.COMPLETED,
      },
      include: {
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
        sessionRecord: {
          select: {
            id: true,
            duration: true,
            startedAt: true,
            endedAt: true,
            transcript: true,
            summary: true,
            prescription: true,
          },
        },
      },
      orderBy: {
        scheduledAt: "desc",
      },
    });

    // Group by patient
    const patientMap = new Map();
    appointments.forEach((appointment) => {
      const patientId = appointment.patient.id;
      if (!patientMap.has(patientId)) {
        patientMap.set(patientId, {
          patient: appointment.patient,
          consultations: [],
          totalConsultations: 0,
          lastConsultation: appointment.scheduledAt,
        });
      }
      const record = patientMap.get(patientId);
      record.consultations.push({
        id: appointment.id,
        scheduledAt: appointment.scheduledAt,
        duration: appointment.duration,
        notes: appointment.notes,
        sessionRecord: appointment.sessionRecord,
      });
      record.totalConsultations++;
    });

    const patientRecords = Array.from(patientMap.values());

    res.json(
      formatResponse("success", "Patient records retrieved successfully", {
        patients: patientRecords,
        totalPatients: patientRecords.length,
      })
    );
  } catch (error) {
    console.error("Get patient records error:", error);
    res.status(500).json(formatResponse("error", "Internal server error"));
  }
};
export const updatePrescription = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json(formatResponse("error", "User not authenticated"));
      return;
    }

    const { prescriptionId } = req.params;
    const { diagnosis, medications, labTests, advice, followUpDate } = req.body;

    const prescription = await prisma.prescription.findUnique({
      where: { id: prescriptionId },
    });

    if (!prescription) {
      res.status(404).json(formatResponse("error", "Prescription not found"));
      return;
    }

    // Only the doctor who created it can update
    if (prescription.doctorId !== req.user.id) {
      res.status(403).json(formatResponse("error", "Access denied"));
      return;
    }

    const updatedPrescription = await prisma.prescription.update({
      where: { id: prescriptionId },
      data: {
        ...(diagnosis && { diagnosis }),
        ...(medications && { medications }),
        ...(labTests !== undefined && { labTests }),
        ...(advice !== undefined && { advice }),
        ...(followUpDate !== undefined && {
          followUpDate: followUpDate ? new Date(followUpDate) : null,
        }),
        updatedAt: new Date(),
      },
    });

    res.json(
      formatResponse("success", "Prescription updated successfully", {
        prescription: updatedPrescription,
      })
    );
  } catch (error) {
    console.error("Update prescription error:", error);
    res.status(500).json(formatResponse("error", "Internal server error"));
  }
};
