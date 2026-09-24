import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";

// Create a .env file in this folder and copy the values from your
// Firebase project (Project settings > Your apps > Web app).
// See .env.example for all keys used by this app.
const rawConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

const hasConfig = Boolean(rawConfig.apiKey && rawConfig.projectId);

if (!hasConfig) {
  console.error(
    "[DevCollab] Firebase is not configured. Copy .env.example to .env and add your " +
      "Firebase web app keys, then restart the dev server."
  );
}

const app = initializeApp(
  hasConfig
    ? rawConfig
    : {
        apiKey: "demo",
        authDomain: "demo.firebaseapp.com",
        projectId: "demo",
        appId: "demo",
      }
);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const analytics =
  import.meta.env.PROD && rawConfig.measurementId && typeof window !== "undefined"
    ? getAnalytics(app)
    : null;

export default app;