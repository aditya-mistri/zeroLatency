import { Router } from "express";
import { authenticateToken, requireModerator } from "../middleware/auth";

const router = Router();

// Placeholder for hospital-related routes
router.get("/", (req, res) => {
  res.json({
    status: "success",
    message: "Hospitals endpoint - Coming soon in Phase 2",
  });
});

export default router;
