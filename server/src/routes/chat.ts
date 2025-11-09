import { Router } from "express";
import { authenticateToken } from "../middleware/auth";
import { uploadChatFile, uploadSingle } from "../controllers/chatController";

const router = Router();

// Upload file for chat (images, PDFs, documents)
router.post("/upload", authenticateToken, uploadSingle, uploadChatFile);

export default router;
