import { Request, Response } from "express";
import { PrismaClient, DoctorStatus } from "@prisma/client";
import { formatResponse } from "../utils/helpers";

const prisma = new PrismaClient();
export const getDashboardStats = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const [
      totalDoctors,
      pendingDoctors,
      approvedDoctors,
      rejectedDoctors,
      totalHospitals,
      totalPatients,
      recentApplications,
    ] = await Promise.all([
      // Total doctors count
      prisma.doctorProfile.count(),

      // Pending doctors count
      prisma.doctorProfile.count({
        where: { status: DoctorStatus.PENDING },
      }),

      // Approved doctors count
      prisma.doctorProfile.count({
        where: { status: DoctorStatus.APPROVED },
      }),

      // Rejected doctors count
      prisma.doctorProfile.count({
        where: { status: DoctorStatus.REJECTED },
      }),

      // Total hospitals count
      prisma.hospital.count(),

      // Total patients count
      prisma.user.count({
        where: { role: "PATIENT" },
      }),

      // Recent doctor applications (last 7 days)
      prisma.doctorProfile.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
          },
        },
      }),
    ]);

    const stats = {
      doctors: {
        total: totalDoctors,
        pending: pendingDoctors,
        approved: approvedDoctors,
        rejected: rejectedDoctors,
        approvalRate:
          totalDoctors > 0
            ? ((approvedDoctors / totalDoctors) * 100).toFixed(1)
            : "0",
      },
      hospitals: {
        total: totalHospitals,
      },
      patients: {
        total: totalPatients,
      },
      recent: {
        applications: recentApplications,
      },
    };

    res
      .status(200)
      .json(
        formatResponse(
          "success",
          "Dashboard statistics retrieved successfully",
          { stats }
        )
      );
  } catch (error) {
    console.error("Dashboard stats error:", error);
    res
      .status(500)
      .json(formatResponse("error", "Failed to fetch dashboard statistics"));
  }
};
export const getDoctors = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const {
      status,
      page = "1",
      limit = "10",
      search,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;

    // Build where clause
    const where: any = {};

    if (status && status !== "all") {
      where.status = status;
    }

    if (search) {
      where.OR = [
        {
          user: {
            firstName: { contains: search as string, mode: "insensitive" },
          },
        },
        {
          user: {
            lastName: { contains: search as string, mode: "insensitive" },
          },
        },
        {
          user: { email: { contains: search as string, mode: "insensitive" } },
        },
        { specialization: { contains: search as string, mode: "insensitive" } },
      ];
    }

    // Build order by clause
    const orderBy: any = {};
    if (sortBy === "name") {
      orderBy.user = { firstName: sortOrder };
    } else if (sortBy === "email") {
      orderBy.user = { email: sortOrder };
    } else {
      orderBy[sortBy as string] = sortOrder;
    }

    const [doctors, totalCount] = await Promise.all([
      prisma.doctorProfile.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
              avatar: true,
              createdAt: true,
              verificationDocs: true,
            },
          },
          hospital: true,
        },
        orderBy,
        skip: offset,
        take: limitNum,
      }),

      prisma.doctorProfile.count({ where }),
    ]);

    const pagination = {
      page: pageNum,
      limit: limitNum,
      total: totalCount,
      pages: Math.ceil(totalCount / limitNum),
      hasNext: pageNum < Math.ceil(totalCount / limitNum),
      hasPrev: pageNum > 1,
    };

    res
      .status(200)
      .json(
        formatResponse("success", "Doctors retrieved successfully", {
          doctors,
          pagination,
        })
      );
  } catch (error) {
    console.error("Get doctors error:", error);
    res.status(500).json(formatResponse("error", "Failed to fetch doctors"));
  }
};
export const getDoctorById = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { doctorId } = req.params;

    const doctor = await prisma.doctorProfile.findUnique({
      where: { id: doctorId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            avatar: true,
            createdAt: true,
            dateOfBirth: true,
            gender: true,
            address: true,
            verificationDocs: true,
          },
        },
        hospital: true,
      },
    });

    if (!doctor) {
      res.status(404).json(formatResponse("error", "Doctor not found"));
      return;
    }

    res
      .status(200)
      .json(
        formatResponse("success", "Doctor details retrieved successfully", {
          doctor,
        })
      );
  } catch (error) {
    console.error("Get doctor error:", error);
    res
      .status(500)
      .json(formatResponse("error", "Failed to fetch doctor details"));
  }
};

// Approve doctor
export const approveDoctor = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { doctorId } = req.params;
    const { hospitalId, notes } = req.body;
    const doctor = await prisma.doctorProfile.findUnique({
      where: { id: doctorId },
      include: { user: true },
    });

    if (!doctor) {
      res.status(404).json(formatResponse("error", "Doctor not found"));
      return;
    }

    if (doctor.status !== DoctorStatus.PENDING) {
      res
        .status(400)
        .json(
          formatResponse(
            "error",
            `Doctor is already ${doctor.status.toLowerCase()}`
          )
        );
      return;
    }

    // If hospital is assigned, verify it exists
    if (hospitalId) {
      const hospital = await prisma.hospital.findUnique({
        where: { id: hospitalId },
      });

      if (!hospital) {
        res.status(400).json(formatResponse("error", "Invalid hospital ID"));
        return;
      }
    }
    const updatedDoctor = await prisma.doctorProfile.update({
      where: { id: doctorId },
      data: {
        status: DoctorStatus.APPROVED,
        hospitalId: hospitalId || null,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        hospital: true,
      },
    });

    // TODO: Send approval email notification (Phase 7)

    res
      .status(200)
      .json(
        formatResponse("success", "Doctor approved successfully", {
          doctor: updatedDoctor,
        })
      );
  } catch (error) {
    console.error("Approve doctor error:", error);
    res.status(500).json(formatResponse("error", "Failed to approve doctor"));
  }
};

// Reject doctor
export const rejectDoctor = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { doctorId } = req.params;
    const { reason } = req.body;

    if (!reason || reason.trim().length === 0) {
      res
        .status(400)
        .json(formatResponse("error", "Rejection reason is required"));
      return;
    }
    const doctor = await prisma.doctorProfile.findUnique({
      where: { id: doctorId },
      include: { user: true },
    });

    if (!doctor) {
      res.status(404).json(formatResponse("error", "Doctor not found"));
      return;
    }

    if (doctor.status !== DoctorStatus.PENDING) {
      res
        .status(400)
        .json(
          formatResponse(
            "error",
            `Doctor is already ${doctor.status.toLowerCase()}`
          )
        );
      return;
    }
    const updatedDoctor = await prisma.doctorProfile.update({
      where: { id: doctorId },
      data: {
        status: DoctorStatus.REJECTED,
        // Store rejection reason in bio field for now (could be separate field)
        bio: `REJECTED: ${reason}`,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    // TODO: Send rejection email notification (Phase 7)

    res
      .status(200)
      .json(
        formatResponse("success", "Doctor rejected successfully", {
          doctor: updatedDoctor,
        })
      );
  } catch (error) {
    console.error("Reject doctor error:", error);
    res.status(500).json(formatResponse("error", "Failed to reject doctor"));
  }
};
export const updateDoctorProfile = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { doctorId } = req.params;
    const {
      specialization,
      experience,
      qualification,
      consultationFee,
      bio,
      hospitalId,
    } = req.body;
    const doctor = await prisma.doctorProfile.findUnique({
      where: { id: doctorId },
    });

    if (!doctor) {
      res.status(404).json(formatResponse("error", "Doctor not found"));
      return;
    }

    // If hospital is assigned, verify it exists
    if (hospitalId) {
      const hospital = await prisma.hospital.findUnique({
        where: { id: hospitalId },
      });

      if (!hospital) {
        res.status(400).json(formatResponse("error", "Invalid hospital ID"));
        return;
      }
    }
    const updateData: any = {};
    if (specialization) updateData.specialization = specialization;
    if (experience !== undefined) updateData.experience = parseInt(experience);
    if (qualification) updateData.qualification = qualification;
    if (consultationFee !== undefined)
      updateData.consultationFee = parseFloat(consultationFee);
    if (bio !== undefined) updateData.bio = bio;
    if (hospitalId !== undefined) updateData.hospitalId = hospitalId;

    const updatedDoctor = await prisma.doctorProfile.update({
      where: { id: doctorId },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        hospital: true,
      },
    });

    res
      .status(200)
      .json(
        formatResponse("success", "Doctor profile updated successfully", {
          doctor: updatedDoctor,
        })
      );
  } catch (error) {
    console.error("Update doctor error:", error);
    res
      .status(500)
      .json(formatResponse("error", "Failed to update doctor profile"));
  }
};
