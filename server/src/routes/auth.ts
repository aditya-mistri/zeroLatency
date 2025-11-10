import { Router } from "express";
import multer from "multer";
import {
  register,
  login,
  getProfile,
  updateProfile,
} from "../controllers/authController";
import { authenticateToken, validateRequestBody } from "../middleware/auth";

const router = Router();

// Configure multer for file uploads (memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept images and PDFs
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, and PDF files are allowed.'));
    }
  },
});

// Public routes
router.post(
  "/register",
  upload.single('license'), // Handle license file upload
  validateRequestBody(["email", "password", "firstName", "lastName"]),
  register
);

router.post("/login", validateRequestBody(["email", "password"]), login);

// Protected routes
router.get("/profile", authenticateToken, getProfile);
router.put("/profile", authenticateToken, updateProfile);

export default router;
