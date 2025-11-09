import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { formatResponse } from "../utils/helpers";

const prisma = new PrismaClient();
export const getHospitals = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const {
      page = "1",
      limit = "10",
      search,
      isActive,
      sortBy = "name",
      sortOrder = "asc",
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;

    // Build where clause
    const where: any = {};

    if (isActive !== undefined) {
      where.isActive = isActive === "true";
    }

    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: "insensitive" } },
        { city: { contains: search as string, mode: "insensitive" } },
        { state: { contains: search as string, mode: "insensitive" } },
      ];
    }

    // Build order by clause
    const orderBy: any = { [sortBy as string]: sortOrder };

    const [hospitals, totalCount] = await Promise.all([
      prisma.hospital.findMany({
        where,
        include: {
          doctors: {
            include: {
              user: {
                select: {
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
          _count: {
            select: {
              doctors: true,
            },
          },
        },
        orderBy,
        skip: offset,
        take: limitNum,
      }),

      prisma.hospital.count({ where }),
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
        formatResponse("success", "Hospitals retrieved successfully", {
          hospitals,
          pagination,
        })
      );
  } catch (error) {
    console.error("Get hospitals error:", error);
    res.status(500).json(formatResponse("error", "Failed to fetch hospitals"));
  }
};
export const getHospitalById = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { hospitalId } = req.params;

    const hospital = await prisma.hospital.findUnique({
      where: { id: hospitalId },
      include: {
        doctors: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                avatar: true,
              },
            },
          },
        },
      },
    });

    if (!hospital) {
      res.status(404).json(formatResponse("error", "Hospital not found"));
      return;
    }

    res
      .status(200)
      .json(
        formatResponse("success", "Hospital details retrieved successfully", {
          hospital,
        })
      );
  } catch (error) {
    console.error("Get hospital error:", error);
    res
      .status(500)
      .json(formatResponse("error", "Failed to fetch hospital details"));
  }
};
export const createHospital = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const {
      name,
      address,
      city,
      state,
      zipCode,
      phone,
      email,
      website,
      description,
    } = req.body;

    // Validation
    if (!name || !address || !city || !state || !zipCode || !phone) {
      res
        .status(400)
        .json(
          formatResponse(
            "error",
            "Name, address, city, state, zipCode, and phone are required"
          )
        );
      return;
    }
    const existingHospital = await prisma.hospital.findFirst({
      where: {
        name: { equals: name, mode: "insensitive" },
        city: { equals: city, mode: "insensitive" },
      },
    });

    if (existingHospital) {
      res
        .status(409)
        .json(
          formatResponse(
            "error",
            "Hospital with this name already exists in the same city"
          )
        );
      return;
    }

    const hospital = await prisma.hospital.create({
      data: {
        name,
        address,
        city,
        state,
        zipCode,
        phone,
        email: email || null,
        website: website || null,
        description: description || null,
      },
    });

    res
      .status(201)
      .json(
        formatResponse("success", "Hospital created successfully", { hospital })
      );
  } catch (error) {
    console.error("Create hospital error:", error);
    res.status(500).json(formatResponse("error", "Failed to create hospital"));
  }
};
export const updateHospital = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { hospitalId } = req.params;
    const {
      name,
      address,
      city,
      state,
      zipCode,
      phone,
      email,
      website,
      description,
      isActive,
    } = req.body;
    const hospital = await prisma.hospital.findUnique({
      where: { id: hospitalId },
    });

    if (!hospital) {
      res.status(404).json(formatResponse("error", "Hospital not found"));
      return;
    }

    // Build update data
    const updateData: any = {};
    if (name) updateData.name = name;
    if (address) updateData.address = address;
    if (city) updateData.city = city;
    if (state) updateData.state = state;
    if (zipCode) updateData.zipCode = zipCode;
    if (phone) updateData.phone = phone;
    if (email !== undefined) updateData.email = email || null;
    if (website !== undefined) updateData.website = website || null;
    if (description !== undefined) updateData.description = description || null;
    if (isActive !== undefined) updateData.isActive = isActive;

    const updatedHospital = await prisma.hospital.update({
      where: { id: hospitalId },
      data: updateData,
      include: {
        _count: {
          select: {
            doctors: true,
          },
        },
      },
    });

    res
      .status(200)
      .json(
        formatResponse("success", "Hospital updated successfully", {
          hospital: updatedHospital,
        })
      );
  } catch (error) {
    console.error("Update hospital error:", error);
    res.status(500).json(formatResponse("error", "Failed to update hospital"));
  }
};

// Delete hospital (soft delete - deactivate)
export const deleteHospital = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { hospitalId } = req.params;
    const hospital = await prisma.hospital.findUnique({
      where: { id: hospitalId },
      include: {
        _count: {
          select: {
            doctors: true,
          },
        },
      },
    });

    if (!hospital) {
      res.status(404).json(formatResponse("error", "Hospital not found"));
      return;
    }
    if (hospital._count.doctors > 0) {
      res
        .status(400)
        .json(
          formatResponse(
            "error",
            "Cannot delete hospital with associated doctors. Please reassign doctors first."
          )
        );
      return;
    }

    // Soft delete - deactivate hospital
    const updatedHospital = await prisma.hospital.update({
      where: { id: hospitalId },
      data: { isActive: false },
    });

    res
      .status(200)
      .json(
        formatResponse("success", "Hospital deactivated successfully", {
          hospital: updatedHospital,
        })
      );
  } catch (error) {
    console.error("Delete hospital error:", error);
    res.status(500).json(formatResponse("error", "Failed to delete hospital"));
  }
};
export const getHospitalStats = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { hospitalId } = req.params;

    const hospital = await prisma.hospital.findUnique({
      where: { id: hospitalId },
      include: {
        doctors: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!hospital) {
      res.status(404).json(formatResponse("error", "Hospital not found"));
      return;
    }

    const stats = {
      totalDoctors: hospital.doctors.length,
      approvedDoctors: hospital.doctors.filter(
        (d: any) => d.status === "APPROVED"
      ).length,
      pendingDoctors: hospital.doctors.filter(
        (d: any) => d.status === "PENDING"
      ).length,
      totalAppointments: 0, // TODO: Calculate appointments separately
      specializations: [
        ...new Set(hospital.doctors.map((d: any) => d.specialization)),
      ],
    };

    res
      .status(200)
      .json(
        formatResponse(
          "success",
          "Hospital statistics retrieved successfully",
          { hospital, stats }
        )
      );
  } catch (error) {
    console.error("Hospital stats error:", error);
    res
      .status(500)
      .json(formatResponse("error", "Failed to fetch hospital statistics"));
  }
};
