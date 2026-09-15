import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/authRoutes.js";
import protectedRoutes from "./routes/protectedRoutes.js";
import jobRoutes from "./routes/jobRoutes.js";
import applicationRoutes from "./routes/applicationRoutes.js";
import resumeRoutes from "./routes/resumeRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import interviewRoutes from "./routes/interviewRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { sendSuccess } from "./utils/apiResponse.js";

const app = express();

/* ======================================================
   SECURITY
====================================================== */

app.use(helmet());

/* ======================================================
   CORS
====================================================== */

const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";

app.use(
  cors({
    origin: [
      clientUrl,
      "http://localhost:5173",
      "http://127.0.0.1:5173",
    ],
    credentials: true,
  })
);

/* ======================================================
   MIDDLEWARE
====================================================== */

app.use(morgan("dev"));

app.use(express.json({ limit: "50mb" }));

app.use(express.urlencoded({ limit: "50mb", extended: true }));

app.use(cookieParser());

/* ======================================================
   ROOT ROUTE
====================================================== */

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "RecruitX Backend Running 🚀",
    version: "1.0.0",
  });
});

/* ======================================================
   API ROOT
====================================================== */

app.get("/api", (req, res) => {
  res.json({
    success: true,
    message: "RecruitX API Running 🚀",
    version: "1.0.0",
  });
});

/* ======================================================
   HEALTH CHECK
====================================================== */

app.get("/api/health", (req, res) => {
  sendSuccess(res, "RecruitX Authentication API is online", {
    status: "UP",
    timestamp: new Date().toISOString(),
  });
});

/* ======================================================
   ROUTES
====================================================== */

app.use("/api/auth", authRoutes);
app.use("/api/protected", protectedRoutes);
app.use("/api/jobs", jobRoutes);
app.use("/api/applications", applicationRoutes);
app.use("/api/resume", resumeRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/interviews", interviewRoutes);
app.use("/api/admin", adminRoutes);

/* ======================================================
   404 HANDLER
====================================================== */

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: [${req.method}] ${req.originalUrl}`,
    data: null,
    errors: null,
  });
});

/* ======================================================
   GLOBAL ERROR HANDLER
====================================================== */

app.use(errorHandler);

export default app;