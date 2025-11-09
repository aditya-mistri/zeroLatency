import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { formatResponse } from "../utils/helpers";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import { Readable } from "stream";

const prisma = new PrismaClient();
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
  },
  fileFilter: (req: any, file: any, cb: any) => {
    // Allow images, PDFs, and common document formats
    const allowedMimes = [
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];

    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Only images, PDF, and DOC files are allowed"));
    }
  },
});

// Middleware for single file upload
export const uploadSingle = upload.single("file");
const uploadToCloudinary = (
  buffer: Buffer,
  fileName: string,
  mimeType: string
): Promise<any> => {
  return new Promise((resolve, reject) => {
    const isImage = mimeType.startsWith("image/");
    const resourceType = isImage ? "image" : "raw"; // 'raw' for non-image files like PDFs

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: "telehealth/chat",
        resource_type: resourceType,
        public_id: `${Date.now()}-${fileName.replace(/\.[^/.]+$/, "")}`,
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );

    const readableStream = Readable.from(buffer);
    readableStream.pipe(uploadStream);
  });
};

// Upload file for chat
export const uploadChatFile = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json(formatResponse("error", "User not authenticated"));
      return;
    }

    if (!req.file) {
      res.status(400).json(formatResponse("error", "No file uploaded"));
      return;
    }

    const { appointmentId } = req.body;

    if (!appointmentId) {
      res.status(400).json(formatResponse("error", "Appointment ID is required"));
      return;
    }
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
    });

    if (!appointment) {
      res.status(404).json(formatResponse("error", "Appointment not found"));
      return;
    }

    if (
      appointment.patientId !== req.user.id &&
      appointment.doctorId !== req.user.id
    ) {
      res.status(403).json(formatResponse("error", "Access denied to this appointment"));
      return;
    }

    // Upload to Cloudinary
    const uploadResult = await uploadToCloudinary(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype
    );

    // Return file information with Cloudinary URL
    res.status(200).json(
      formatResponse("success", "File uploaded successfully", {
        fileUrl: uploadResult.secure_url,
        fileName: req.file.originalname,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
      })
    );
  } catch (error) {
    console.error("Upload chat file error:", error);
    res.status(500).json(formatResponse("error", "Internal server error"));
  }
};
