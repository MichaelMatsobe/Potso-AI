import admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

// Initialize Firebase Admin SDK (graceful when credentials are missing)
const initializeFirebase = () => {
  if (admin.apps.length === 0) {
    try {
      const serviceAccountPath = path.join(process.cwd(), 'serviceAccountKey.json');
      let credential: admin.ServiceAccount | admin.credential.Credential | null = null;

      if (fs.existsSync(serviceAccountPath)) {
        const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf-8'));
        credential = admin.credential.cert(serviceAccount as admin.ServiceAccount);
      } else if (
        process.env.FIREBASE_PROJECT_ID &&
        process.env.FIREBASE_CLIENT_EMAIL &&
        process.env.FIREBASE_PRIVATE_KEY
      ) {
        credential = admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        } as admin.ServiceAccount);
      }

      if (credential) {
        admin.initializeApp({
          credential,
          databaseURL: process.env.FIREBASE_DATABASE_URL,
        });
        console.log('✅ Firebase Admin initialized');
      } else {
        console.warn(
          '⚠️  Firebase credentials not found. Auth and Firestore routes will fail until configured.'
        );
      }
    } catch (err) {
      console.error('Firebase initialization error:', err);
    }
  }

  return admin;
};

export const getFirebaseAdmin = () => initializeFirebase();
export const getFirestore = () => {
  if (!admin.apps.length) {
    throw new Error("Firebase is not configured. Add serviceAccountKey.json or FIREBASE_* env vars.");
  }
  return admin.firestore();
};
export const getAuth = () => {
  if (!admin.apps.length) {
    throw new Error("Firebase is not configured. Add serviceAccountKey.json or FIREBASE_* env vars.");
  }
  return admin.auth();
};

export default initializeFirebase;
