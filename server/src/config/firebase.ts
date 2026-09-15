import fs from 'fs';
import path from 'path';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, Firestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import { logger } from '../utils/logger.js';

let dbInstance: Firestore | null = null;

export const initFirebase = (): Firestore => {
  if (getApps().length > 0 && dbInstance) {
    return dbInstance;
  }

  try {
    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;

    let app;

    if (serviceAccountKey) {
      let credentials: any;
      if (serviceAccountKey.trim().startsWith('{')) {
        credentials = JSON.parse(serviceAccountKey);
      } else {
        const filePath = path.isAbsolute(serviceAccountKey)
          ? serviceAccountKey
          : path.resolve(process.cwd(), serviceAccountKey);
        credentials = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      }
      app = initializeApp({
        credential: cert(credentials),
        projectId: credentials.project_id || projectId,
      });
      logger.info(`🔥 Firebase Admin initialized with service account key file`);
    } else if (clientEmail && privateKey) {
      const formattedPrivateKey = privateKey.replace(/\\n/g, '\n');
      app = initializeApp({
        credential: cert({
          projectId: projectId || 'recruitx-app',
          clientEmail,
          privateKey: formattedPrivateKey,
        }),
        projectId: projectId || 'recruitx-app',
      });
      logger.info(`🔥 Firebase Admin initialized with client email credentials for project: ${projectId}`);
    } else {
      // Fallback configuration for development
      app = initializeApp({
        projectId: projectId || 'recruitx-app',
      });
      logger.info(`🔥 Firebase Admin initialized with Project ID: ${projectId || 'recruitx-app'}`);
      logger.warn(
        `⚠️ No Firebase private key found in .env. To connect to your live Firebase Cloud Firestore, add FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY to server/.env`
      );
    }

    dbInstance = getFirestore(app);
    return dbInstance;
  } catch (error: any) {
    logger.error(`❌ Firebase Initialization Error: ${error.message}`);
    throw error;
  }
};

export const getDb = (): Firestore => {
  if (!dbInstance) {
    return initFirebase();
  }
  return dbInstance;
};

// Export db proxy that initializes lazily if needed
export const db = new Proxy({} as Firestore, {
  get(_target, prop) {
    const firestore = getDb();
    const val = (firestore as any)[prop];
    if (typeof val === 'function') {
      return val.bind(firestore);
    }
    return val;
  },
});

export const Collections = {
  USERS: 'users',
  JOBS: 'jobs',
  APPLICATIONS: 'applications',
  INTERVIEWS: 'interviews',
  NOTIFICATIONS: 'notifications',
  RESUMES: 'resumes',
  MESSAGES: 'messages',
} as const;

export { FieldValue, Timestamp };
