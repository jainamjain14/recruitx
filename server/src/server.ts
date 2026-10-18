import dotenv from "dotenv";

// Load environment variables BEFORE anything else
dotenv.config();

import app from "./app.js";
import { initFirebase } from "./config/firebase.js";
import { logger } from "./utils/logger.js";
import http from "http";
import { initSocket } from "./socket.js";
import { startReminderService } from "./services/reminderService.js";
import { EmailService } from "./services/emailService.js";

const PORT = Number(process.env.PORT) || 5000;

const startServer = async () => {
  try {
    initFirebase();

    const httpServer = http.createServer(app);
    // Initialise Socket.io (with JWT auth)
    const { io } = initSocket(httpServer);

    httpServer.listen(PORT, () => {
      logger.info(
        `RecruitX Server running in ${process.env.NODE_ENV || "development"} mode on port ${PORT}`
      );
      logger.info(`API Base URL: http://localhost:${PORT}/api`);

      // Start the interview reminder cron (fires every minute)
      startReminderService();

      // Diagnostic SMTP verification
      EmailService.verifySMTPConnection().catch((err) => {
        logger.error("SMTP verify error:", err);
      });
    });
  } catch (error) {
    logger.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();