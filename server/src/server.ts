import express, { Application, Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import dotenv from "dotenv";
import { createServer } from "http";
import { setupSocketIO } from "./socket/socketHandler";

// Import routes
import authRoutes from "./routes/auth";
import userRoutes from "./routes/users";
import doctorRoutes from "./routes/doctors";
import hospitalRoutes from "./routes/hospitals";
import appointmentRoutes from "./routes/appointments";
import availabilityRoutes from "./routes/availability";
import moderatorRoutes from "./routes/moderator";
import videoRoutes from "./routes/video";
import prescriptionRoutes from "./routes/prescriptions";
import chatRoutes from "./routes/chat";

// Load environment variables
dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(helmet()); // Security headers
app.use(morgan("combined")); // Logging

// CORS configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(",") || [
  "http://localhost:3000",
];
app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Body parsing
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Health check endpoint
app.get("/health", (req: Request, res: Response) => {
  res.status(200).json({
    status: "success",
    message: "ZeroLatency Connect API is running",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
  });
});

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/doctors", doctorRoutes);
app.use("/api/hospitals", hospitalRoutes);
app.use("/api/appointments", appointmentRoutes);
app.use("/api/availability", availabilityRoutes);
app.use("/api/moderator", moderatorRoutes);
app.use("/api/video", videoRoutes);
app.use("/api", prescriptionRoutes);
app.use("/api/chat", chatRoutes);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    status: "error",
    message: `Route ${req.originalUrl} not found`,
  });
});

// Global error handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error("Error:", err);

  res.status(err.status || 500).json({
    status: "error",
    message: err.message || "Internal server error",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
});

// Create HTTP server and setup Socket.IO
const server = createServer(app);
const io = setupSocketIO(server);

// Inject Socket.IO into controllers that need it
import { setSocketIO } from "./controllers/appointmentController";
import { setSocketIO as setPrescriptionSocketIO } from "./controllers/prescriptionController";
setSocketIO(io);
setPrescriptionSocketIO(io);

// Start appointment scheduler for auto-status updates
import { startAppointmentScheduler } from "./utils/appointmentScheduler";
startAppointmentScheduler();
console.log("✓ Appointment scheduler started (runs every minute)");

// Start server
server.listen(PORT, () => {
  console.log(` ZeroLatency Connect API running on port ${PORT}`);
  console.log(` Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(` Health check: http://localhost:${PORT}/health`);
  console.log(` Socket.IO enabled for real-time chat`);
});

export default app;
