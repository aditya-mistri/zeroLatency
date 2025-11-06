import { Router } from "express";
import {
  authenticateToken,
  requireModerator,
  validateRequestBody,
} from "../middleware/auth";
import {
  getDashboardStats,
  getDoctors,
  getDoctorById,
  approveDoctor,
  rejectDoctor,
  updateDoctorProfile,
} from "../controllers/moderatorController";
import {
  getHospitals,
  getHospitalById,
  createHospital,
  updateHospital,
  deleteHospital,
  getHospitalStats,
} from "../controllers/hospitalController";

const router = Router();

// All routes require authentication and moderator role
router.use(authenticateToken, requireModerator);

// Dashboard routes
router.get("/dashboard/stats", getDashboardStats);

// Doctor management routes
router.get("/doctors", getDoctors);
router.get("/doctors/:doctorId", getDoctorById);
router.put("/doctors/:doctorId/approve", approveDoctor);
router.put(
  "/doctors/:doctorId/reject",
  validateRequestBody(["reason"]),
  rejectDoctor
);
router.put("/doctors/:doctorId", updateDoctorProfile);

// Hospital management routes
router.get("/hospitals", getHospitals);
router.get("/hospitals/:hospitalId", getHospitalById);
router.post(
  "/hospitals",
  validateRequestBody(["name", "address", "city", "state", "zipCode", "phone"]),
  createHospital
);
router.put("/hospitals/:hospitalId", updateHospital);
router.delete("/hospitals/:hospitalId", deleteHospital);
router.get("/hospitals/:hospitalId/stats", getHospitalStats);

export default router;
