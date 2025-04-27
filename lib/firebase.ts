import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import { getAuth, Auth, signInAnonymously } from "firebase/auth";
import { getDatabase, Database, ref, set, update, remove, get, onValue, DataSnapshot, DatabaseReference, onDisconnect } from "firebase/database";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyARTIv6SCS8PwHn8bctfUNBZp1tiBcJRKc", // Fallback static value
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "practice-4f8dc.firebaseapp.com", // Fallback static value
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "practice-4f8dc", // Fallback static value
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "practice-4f8dc.appspot.com", // Fallback static value
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "895753753707", // Fallback static value
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:895753753707:web:415bb05b6eb78ad02fcd2e", // Fallback static value
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL || "https://practice-4f8dc-default-rtdb.asia-southeast1.firebasedatabase.app", // Fallback static value
};

let app: FirebaseApp;
let auth: Auth;
let database: Database;
let firebaseInitialized = false;

// Initialize Firebase
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  database = getDatabase(app);
  firebaseInitialized = true;
} else {
  app = getApps()[0];
  auth = getAuth(app);
  database = getDatabase(app);
  firebaseInitialized = true;
}

// Helper function to get database reference
const getRef = (path: string): DatabaseReference => {
  if (firebaseInitialized) {
    return ref(database, path);
  }
  throw new Error("Firebase not initialized");
};

// Read data from Firebase (get once using get() method)
const getData = async (path: string): Promise<any> => {
  try {
    const reference = getRef(path);
    const snapshot = await get(reference); // Use get() to fetch data
    return snapshot.exists() ? snapshot.val() : null;
  } catch (error) {
    console.error("Error reading data:", error);
    throw error;
  }
};

// Write data to Firebase (set or update data)
const setData = async (path: string, data: any): Promise<void> => {
  try {
    const reference = getRef(path);
    await set(reference, data);
  } catch (error) {
    console.error("Error setting data:", error);
    throw error;
  }
};

// Update data in Firebase (update specific fields)
const updateData = async (path: string, data: any): Promise<void> => {
  try {
    const reference = getRef(path);
    await update(reference, data);
  } catch (error) {
    console.error("Error updating data:", error);
    throw error;
  }
};

// Remove data from Firebase
const removeData = async (path: string): Promise<void> => {
  try {
    const reference = getRef(path);
    await remove(reference);
  } catch (error) {
    console.error("Error removing data:", error);
    throw error;
  }
};

// Firebase exports
export { firebaseInitialized,database, ref, onDisconnect, onValue,auth, setData, updateData, getData, removeData, getRef };
