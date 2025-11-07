import { Router } from "express";
import { authenticateToken } from "../middleware/auth";
import { getVideoToken } from "../controllers/videoController";

const router = Router();

// Issue Stream Video token for a participant of an appointment (time-gated)
router.post("/token", authenticateToken, getVideoToken);

export default router;
