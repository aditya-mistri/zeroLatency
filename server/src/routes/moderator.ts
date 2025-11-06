import { Router } from "express";
import { authenticateToken, requireModerator } from "../middleware/auth";

const router = Router();

// Placeholder for moderator-related routes
router.get("/", authenticateToken, requireModerator, (req, res) => {
  res.json({
    status: "success",
    message: "Moderator endpoint - Coming soon in Phase 2",
  });
});

export default router;
