import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  GithubAuthProvider,
} from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyAsls_XqSUp8PuvXIZTwpu51AM1kaa0Dwg",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "recruitx-a0fc7.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "recruitx-a0fc7",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "recruitx-a0fc7.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "499813379025",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:499813379025:web:57a5ac32f675784af38ef0",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-PRCSC7QRRD",
};

// Avoid re-initializing on HMR
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);

export const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('email');
googleProvider.addScope('profile');
googleProvider.setCustomParameters({ prompt: 'select_account' });

export const githubProvider = new GithubAuthProvider();
githubProvider.addScope('user:email');
githubProvider.addScope('read:user');
