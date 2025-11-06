import { Router } from "express";
import {
  register,
  login,
  getProfile,
  updateProfile,
} from "../controllers/authController";
import { authenticateToken, validateRequestBody } from "../middleware/auth";

const router = Router();

// Public routes
router.post(
  "/register",
  validateRequestBody(["email", "password", "firstName", "lastName"]),
  register
);

router.post("/login", validateRequestBody(["email", "password"]), login);

// Protected routes
router.get("/profile", authenticateToken, getProfile);
router.put("/profile", authenticateToken, updateProfile);

export default router;
