import express from "express";

import fs from "fs";
import path from "path";

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

import messageRoutes from "./routes/messageRoutes.js";

import courseRoutes from "./routes/courseRoutes.js";

import assessmentRoutes from "./routes/assessmentRoutes.js";
import webhookRoutes from "./routes/webhookRoutes.js";
import candidateEmailRoutes from "./routes/candidateEmailRoutes.js";

import { apiLimiter } from "./middleware/rateLimiter.js";

import { errorHandler } from "./middleware/errorHandler.js";

import { sendSuccess } from "./utils/apiResponse.js";



const app = express();



// Trust Render's reverse proxy so rate-limiter and client IP detection work accurately

app.set("trust proxy", 1);



/* ======================================================

   SECURITY & HEADERS

====================================================== */



app.use(

  helmet({

    contentSecurityPolicy: {

      directives: {

        defaultSrc: ["'self'"],

        scriptSrc: ["'self'", "'unsafe-inline'"],

        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],

        fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],

        imgSrc: ["'self'", "data:", "https:", "blob:"],

        connectSrc: ["'self'", "ws:", "wss:", "http://localhost:*", "https:"],

      },

    },

    crossOriginEmbedderPolicy: false,

    crossOriginResourcePolicy: { policy: "cross-origin" },

  })

);



/* ======================================================

   CORS

====================================================== */



const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";



const allowedOrigins = [

  clientUrl,

  "http://localhost:5173",

  "http://127.0.0.1:5173",

  "https://recruitx-eosin.vercel.app",

];



app.use(

  cors({

    origin: (origin, callback) => {

      // Allow requests with no origin (like mobile apps, curl, or server-to-server)

      if (!origin) return callback(null, true);

      if (

        allowedOrigins.includes(origin) ||

        origin.endsWith('.vercel.app') ||

        origin === clientUrl

      ) {

        return callback(null, true);

      }

      if (process.env.NODE_ENV === 'production') {
        return callback(new Error('Cross-Origin Request Blocked by RecruitX Security Policy'));
      }
      return callback(null, true);

    },

    credentials: true,

  })

);



/* ======================================================

   MIDDLEWARE

====================================================== */



app.use(morgan("dev"));



app.use(express.json({ limit: "15mb" }));



app.use(express.urlencoded({ limit: "15mb", extended: true }));



app.use(cookieParser());



// Static file serving for user uploads (resumes, avatars)

app.use("/uploads", express.static(path.resolve(process.cwd(), "uploads")));



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



app.get(["/health", "/api/health"], (req, res) => {

  sendSuccess(res, "RecruitX Authentication API is online", {

    status: "UP",

    timestamp: new Date().toISOString(),

  });

});



/* ======================================================

   ROUTES & RATE LIMITING

====================================================== */



app.use("/api", apiLimiter);



app.use("/api/auth", authRoutes);

app.use("/api/protected", protectedRoutes);

app.use("/api/jobs", jobRoutes);

app.use("/api/applications", applicationRoutes);

app.use("/api/resume", resumeRoutes);

app.use("/api/notifications", notificationRoutes);

app.use("/api/interviews", interviewRoutes);

app.use("/api/admin", adminRoutes);

app.use("/api/messages", messageRoutes);

app.use("/api/courses", courseRoutes);

app.use("/api/assessments", assessmentRoutes);
app.use("/api/webhooks", webhookRoutes);
app.use("/api/candidate-email", candidateEmailRoutes);



/* ======================================================

   STATIC FRONTEND (Production / Docker only)

   Serves the built React app so Login/Register UI is

   accessible at http://localhost:5000

====================================================== */



if (process.env.NODE_ENV === "production") {

  const clientDistPath = path.resolve(process.cwd(), "..", "client", "dist");

  const indexPath = path.join(clientDistPath, "index.html");



  if (fs.existsSync(indexPath)) {

    app.use(express.static(clientDistPath));

    app.get("*", (req, res) => {

      res.sendFile(indexPath);

    });

  } else {

    // Cloud standalone API service (e.g. Render Web Service)

    app.use((req, res) => {

      res.status(404).json({

        success: false,

        message: `Endpoint not found: [${req.method}] ${req.originalUrl}`,

        data: null,

        errors: null,

      });

    });

  }

}



/* ======================================================

   404 HANDLER (development only)

====================================================== */



if (process.env.NODE_ENV !== "production") {

  app.use((req, res) => {

    res.status(404).json({

      success: false,

      message: `Route not found: [${req.method}] ${req.originalUrl}`,

      data: null,

      errors: null,

    });

  });

}



/* ======================================================

   GLOBAL ERROR HANDLER

====================================================== */



app.use(errorHandler);



export default app;