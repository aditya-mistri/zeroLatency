import { Router } from "express";
import { authenticateToken } from "../middleware/auth";

const router = Router();

// Placeholder for user-related routes
router.get("/", authenticateToken, (req, res) => {
  res.json({
    status: "success",
    message: "Users endpoint - Coming soon in Phase 2",
  });
});

export default router;
