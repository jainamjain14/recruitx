import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load the .env file from the project root BEFORE other imports
dotenv.config({
  path: path.resolve(__dirname, "../../.env"),
});

import { initFirebase } from "../config/firebase.js";
import { User } from "../models/User.js";
import { logger } from "./logger.js";

const seedAdmin = async () => {
  try {
    initFirebase();
    logger.info("Connecting to Firebase Cloud Firestore for admin seeding...");

    const adminEmail = "admin@recruitx.com";

    const existingAdmin = await User.findOne({
      email: adminEmail,
    });

    if (existingAdmin) {
      logger.info("Admin already exists in Firebase Firestore.");
      process.exit(0);
      return;
    }

    await User.create({
      name: "RecruitX Administrator",
      email: adminEmail,
      password: "Admin@123456",
      role: "admin",
      emailVerified: true,
    });

    logger.info("Default admin created successfully in Firebase Cloud Firestore.");
    process.exit(0);
  } catch (error: any) {
    console.error(error);
    logger.error("Error seeding admin user in Firebase:", error?.message || error);
    process.exit(1);
  }
};

seedAdmin();