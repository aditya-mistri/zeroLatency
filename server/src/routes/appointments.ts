import { Router } from "express";
import { authenticateToken } from "../middleware/auth";
import {
  createAppointment,
  getAppointments,
  getAppointmentById,
  updateAppointmentStatus,
  cancelAppointment,
  getDoctorAvailability,
  processPayment,
  getPaymentDetails,
  setMeetingLink,
  getMeetingLink,
  postChatMessage,
  getChatMessages,
} from "../controllers/appointmentController";

const router = Router();

// Get all appointments for current user
router.get("/", authenticateToken, getAppointments);

// Create new appointment (patients only)
router.post("/", authenticateToken, createAppointment);

// Get specific appointment by ID
router.get("/:appointmentId", authenticateToken, getAppointmentById);

// Update appointment status
router.put(
  "/:appointmentId/status",
  authenticateToken,
  updateAppointmentStatus
);

// Cancel appointment
router.put("/:appointmentId/cancel", authenticateToken, cancelAppointment);

// Get doctor availability (public route for booking)
router.get("/availability/:doctorId", getDoctorAvailability);

// Payment routes
router.post("/:appointmentId/payment", authenticateToken, processPayment);
router.get("/:appointmentId/payment", authenticateToken, getPaymentDetails);

// Meeting link and chat routes
router.post("/:appointmentId/meeting", authenticateToken, setMeetingLink);
router.get("/:appointmentId/meeting", authenticateToken, getMeetingLink);
router.get("/:appointmentId/messages", authenticateToken, getChatMessages);
router.post("/:appointmentId/messages", authenticateToken, postChatMessage);

export default router;
