import { Router } from "express";
import { authenticateToken } from "../middleware/auth";
import {
  createPrescription,
  getPrescription,
  updatePrescription,
  getPatientMedicalHistory,
  getDoctorPatientRecords,
} from "../controllers/prescriptionController";

const router = Router();

// Prescription routes
router.post("/appointments/:appointmentId/prescription", authenticateToken, createPrescription);
router.get("/appointments/:appointmentId/prescription", authenticateToken, getPrescription);
router.put("/prescriptions/:prescriptionId", authenticateToken, updatePrescription);

// Medical history and patient records
router.get("/medical-history", authenticateToken, getPatientMedicalHistory);
router.get("/patient-records", authenticateToken, getDoctorPatientRecords);

export default router;
