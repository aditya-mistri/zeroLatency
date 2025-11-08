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

// IMPORTANT: Specific routes must come BEFORE generic routes
// /clear/:date must come BEFORE /:date to match correctly
router.delete("/clear/:date", authenticateToken, clearDayAvailability);
router.delete("/:id", authenticateToken, deleteAvailability); // Changed param name to 'id' for clarity

// Public routes for patients to view doctor availability
router.get("/doctor/:doctorId", getDoctorAvailability);

export default router;
