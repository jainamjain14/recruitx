import { initFirebase } from './firebase.js';

export const connectDB = async (): Promise<void> => {
  initFirebase();
};