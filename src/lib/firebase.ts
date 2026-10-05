import {
  initializeApp,
  getApps,
  getApp,
  type FirebaseApp,
} from 'firebase/app';

import {
  getAuth,
  type Auth,
} from 'firebase/auth';

import {
  getFirestore,
  type Firestore,
} from 'firebase/firestore';

import {
  getStorage,
  type FirebaseStorage,
} from 'firebase/storage';


export interface FirebaseConfigStatus {
  isConfigured: boolean;
  missingKeys: string[];
}


// IMPORTANT:
// Lock the correct Firebase Storage bucket for SOULMATE.
// This prevents a typo in VITE_FIREBASE_STORAGE_BUCKET
// from sending uploads to the wrong bucket.
const SOULMATE_STORAGE_BUCKET =
  'soulmate-web-bd695.firebasestorage.app';


export const firebaseConfig = {
  apiKey: import.meta.env?.VITE_FIREBASE_API_KEY || '',

  authDomain: import.meta.env?.VITE_FIREBASE_AUTH_DOMAIN || '',

  projectId: import.meta.env?.VITE_FIREBASE_PROJECT_ID || '',

  storageBucket: SOULMATE_STORAGE_BUCKET,

  messagingSenderId:
    import.meta.env?.VITE_FIREBASE_MESSAGING_SENDER_ID || '',

  appId: import.meta.env?.VITE_FIREBASE_APP_ID || '',
};


export function checkFirebaseConfig(): FirebaseConfigStatus {
  const missingKeys: string[] = [];

  if (!firebaseConfig.apiKey) {
    missingKeys.push('VITE_FIREBASE_API_KEY');
  }

  if (!firebaseConfig.authDomain) {
    missingKeys.push('VITE_FIREBASE_AUTH_DOMAIN');
  }

  if (!firebaseConfig.projectId) {
    missingKeys.push('VITE_FIREBASE_PROJECT_ID');
  }

  if (!firebaseConfig.storageBucket) {
    missingKeys.push('VITE_FIREBASE_STORAGE_BUCKET');
  }

  if (!firebaseConfig.appId) {
    missingKeys.push('VITE_FIREBASE_APP_ID');
  }

  return {
    isConfigured: missingKeys.length === 0,
    missingKeys,
  };
}


export const isFirebaseConfigured =
  checkFirebaseConfig().isConfigured;


let appInstance: FirebaseApp | null = null;
let authInstance: Auth | null = null;
let dbInstance: Firestore | null = null;
let storageInstance: FirebaseStorage | null = null;


if (isFirebaseConfigured) {
  try {
    appInstance =
      getApps().length > 0
        ? getApp()
        : initializeApp(firebaseConfig);

    authInstance = getAuth(appInstance);

    dbInstance = getFirestore(appInstance);

    // Force Firebase Storage to use the correct SOULMATE bucket.
    storageInstance = getStorage(
      appInstance,
      `gs://${SOULMATE_STORAGE_BUCKET}`
    );

    console.log(
      '[SOULMATE Firebase] Storage bucket:',
      SOULMATE_STORAGE_BUCKET
    );
  } catch (error) {
    console.error(
      '[SOULMATE Firebase] Initialization error:',
      error
    );
  }
} else {
  console.warn(
    '[SOULMATE Firebase] Environment variables not yet configured. Missing:',
    checkFirebaseConfig().missingKeys.join(', ')
  );
}


export const app = appInstance;
export const auth = authInstance;
export const db = dbInstance;
export const storage = storageInstance;