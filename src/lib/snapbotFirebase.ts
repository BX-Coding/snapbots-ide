import { initializeApp } from 'firebase/app';
import { getStorage } from 'firebase/storage';

const initializeFirebaseApp = () => {
  type FirebaseConfig = {
    apiKey: string | undefined,
    authDomain: string | undefined,
    projectId: string | undefined,
    storageBucket: string | undefined,
    messagingSenderId: string | undefined,
    appId: string | undefined,
    measurementId?: string | undefined,
  }

  // Hardcoded fallback configuration for production
  const firebaseConfig: FirebaseConfig = {
      apiKey: process.env.SNAPBOT_FIREBASE_API_KEY,
      authDomain: process.env.SNAPBOT_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.SNAPBOT_FIREBASE_PROJECT_ID,
      storageBucket: process.env.SNAPBOT_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.SNAPBOT_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.SNAPBOT_FIREBASE_APP_ID,
  };
  return initializeApp(firebaseConfig, "snapbot");
}

const snapbotApp = initializeFirebaseApp();

export const snapbotStorage = getStorage(snapbotApp);
