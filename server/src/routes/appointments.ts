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
  checkCanJoinAppointment,
  startAppointmentConsultation,
  endAppointmentConsultation,
} from "../controllers/appointmentController";

const router = Router();
router.get("/", authenticateToken, getAppointments);
router.post("/", authenticateToken, createAppointment);
router.get("/:appointmentId", authenticateToken, getAppointmentById);
router.put(
  "/:appointmentId/status",
  authenticateToken,
  updateAppointmentStatus
);

// Cancel appointment
router.put("/:appointmentId/cancel", authenticateToken, cancelAppointment);
router.get("/availability/:doctorId", getDoctorAvailability);

// Payment routes
router.post("/:appointmentId/payment", authenticateToken, processPayment);
router.get("/:appointmentId/payment", authenticateToken, getPaymentDetails);

// Meeting link and chat routes
router.post("/:appointmentId/meeting", authenticateToken, setMeetingLink);
router.get("/:appointmentId/meeting", authenticateToken, getMeetingLink);
router.get("/:appointmentId/messages", authenticateToken, getChatMessages);
router.post("/:appointmentId/messages", authenticateToken, postChatMessage);

// Appointment lifecycle routes
router.get("/:appointmentId/can-join", authenticateToken, checkCanJoinAppointment);
router.post("/:appointmentId/start", authenticateToken, startAppointmentConsultation);
router.post("/:appointmentId/end", authenticateToken, endAppointmentConsultation);

export default router;
