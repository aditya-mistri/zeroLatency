import { Router } from "express";
import { PrismaClient, DoctorStatus } from "@prisma/client";
import { formatResponse } from "../utils/helpers";

const router = Router();
const prisma = new PrismaClient();
router.get("/", async (req, res) => {
  try {
    const {
      page = "1",
      limit = "12",
      search,
      specialization,
      city,
      minFee,
      maxFee,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;

    // Build where clause - only approved doctors
    const where: any = {
      status: DoctorStatus.APPROVED,
      user: {
        isActive: true,
      },
    };

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
        { specialization: { contains: search as string, mode: "insensitive" } },
      ];
    }

    if (specialization) {
      where.specialization = {
        contains: specialization as string,
        mode: "insensitive",
      };
    }

    if (city) {
      where.hospital = {
        city: { contains: city as string, mode: "insensitive" },
      };
    }

    if (minFee || maxFee) {
      where.consultationFee = {};
      if (minFee) where.consultationFee.gte = parseFloat(minFee as string);
      if (maxFee) where.consultationFee.lte = parseFloat(maxFee as string);
    }

    // Build order by clause
    const orderBy: any = {};
    if (sortBy === "name") {
      orderBy.user = { firstName: sortOrder };
    } else if (sortBy === "fee") {
      orderBy.consultationFee = sortOrder;
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
              avatar: true,
            },
          },
          hospital: {
            select: {
              id: true,
              name: true,
              city: true,
              state: true,
            },
          },
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
        formatResponse("success", "Approved doctors retrieved successfully", {
          doctors,
          pagination,
        })
      );
  } catch (error) {
    console.error("Get doctors error:", error);
    res.status(500).json(formatResponse("error", "Failed to fetch doctors"));
  }
});
router.get("/:doctorId", async (req, res) => {
  try {
    const { doctorId } = req.params;

    const doctor = await prisma.doctorProfile.findFirst({
      where: {
        id: doctorId,
        status: DoctorStatus.APPROVED,
        user: { isActive: true },
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
        hospital: {
          select: {
            id: true,
            name: true,
            address: true,
            city: true,
            state: true,
            phone: true,
            website: true,
          },
        },
      },
    });

    if (!doctor) {
      res
        .status(404)
        .json(formatResponse("error", "Doctor not found or not approved"));
      return;
    }

    res
      .status(200)
      .json(
        formatResponse("success", "Doctor profile retrieved successfully", {
          doctor,
        })
      );
  } catch (error) {
    console.error("Get doctor profile error:", error);
    res
      .status(500)
      .json(formatResponse("error", "Failed to fetch doctor profile"));
  }
});
router.get("/meta/specializations", async (req, res) => {
  try {
    const specializations = await prisma.doctorProfile.findMany({
      where: {
        status: DoctorStatus.APPROVED,
        user: { isActive: true },
      },
      select: { specialization: true },
      distinct: ["specialization"],
    });

    const specializationList = specializations
      .map((s) => s.specialization)
      .sort();

    res
      .status(200)
      .json(
        formatResponse("success", "Specializations retrieved successfully", {
          specializations: specializationList,
        })
      );
  } catch (error) {
    console.error("Get specializations error:", error);
    res
      .status(500)
      .json(formatResponse("error", "Failed to fetch specializations"));
  }
});

export default router;
