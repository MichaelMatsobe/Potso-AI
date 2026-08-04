import admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

let firebaseReady = false;
let initAttempted = false;

const initializeFirebase = () => {
  if (initAttempted) return admin;
  initAttempted = true;

  if (admin.apps.length > 0) {
    firebaseReady = true;
    return admin;
  }

  try {
    const serviceAccountPath = path.join(process.cwd(), 'serviceAccountKey.json');
    const hasFile = fs.existsSync(serviceAccountPath);
    const hasEnv =
      Boolean(process.env.FIREBASE_PROJECT_ID) &&
      Boolean(process.env.FIREBASE_CLIENT_EMAIL) &&
      Boolean(process.env.FIREBASE_PRIVATE_KEY);

    if (!hasFile && !hasEnv) {
      console.warn(
        '[Firebase] No credentials found — running in guest mode (local AI still works via /api/ai/chat).'
      );
      return admin;
    }

    const serviceAccount = hasFile
      ? JSON.parse(fs.readFileSync(serviceAccountPath, 'utf-8'))
      : {
          type: 'service_account',
          project_id: process.env.FIREBASE_PROJECT_ID,
          private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
          client_email: process.env.FIREBASE_CLIENT_EMAIL,
        };

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
      databaseURL: process.env.FIREBASE_DATABASE_URL,
    });
    firebaseReady = true;
    console.log('[Firebase] Initialized');
  } catch (err) {
    console.warn('[Firebase] Init failed — guest mode only:', err instanceof Error ? err.message : err);
    firebaseReady = false;
  }

  return admin;
};

export const isFirebaseReady = () => {
  initializeFirebase();
  return firebaseReady;
};

export const getFirebaseAdmin = () => initializeFirebase();

export const getFirestore = () => {
  initializeFirebase();
  if (!firebaseReady) {
    throw new Error('Firebase is not configured. Use guest mode (/api/ai/chat) or set Firebase credentials.');
  }
  return admin.firestore();
};

export const getAuth = () => {
  initializeFirebase();
  if (!firebaseReady) {
    throw new Error('Firebase Auth is not configured.');
  }
  return admin.auth();
};

export default initializeFirebase;
