import { Router } from "express";
import { authenticateToken } from "../middleware/auth";

const router = Router();

// Placeholder for appointment-related routes
router.get("/", authenticateToken, (req, res) => {
  res.json({
    status: "success",
    message: "Appointments endpoint - Coming soon in Phase 3",
  });
});

export default router;
