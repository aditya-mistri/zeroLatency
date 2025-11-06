import { Router } from "express";
import { authenticateToken } from "../middleware/auth";

const router = Router();

// Placeholder for doctor-related routes
router.get("/", (req, res) => {
  res.json({
    status: "success",
    message: "Doctors endpoint - Coming soon in Phase 2",
  });
});

export default router;
