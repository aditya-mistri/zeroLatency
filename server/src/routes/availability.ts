import { Router } from "express";
import { authenticateToken } from "../middleware/auth";
import {
  setDoctorAvailability,
  getDoctorAvailability,
  getMyAvailability,
  deleteAvailability,
  clearDayAvailability,
} from "../controllers/availabilityController";

const router = Router();

// Doctor routes (protected)
router.post("/set", authenticateToken, setDoctorAvailability);
router.get("/doctor", authenticateToken, getMyAvailability);
router.delete("/clear/:date", authenticateToken, clearDayAvailability);
router.delete("/:date", authenticateToken, deleteAvailability);

// Public routes for patients to view doctor availability
router.get("/doctor/:doctorId", getDoctorAvailability);

export default router;
