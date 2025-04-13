// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getDatabase } from "firebase/database";
import { getStorage } from "firebase/storage";
import { getMessaging } from "firebase/messaging";
import { getAnalytics } from "firebase/analytics";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBT4j073Owuy0bk0eMBRHnNeUZ1I8aCVEU",
  authDomain: "bilbakalim-28281.firebaseapp.com",
  projectId: "bilbakalim-28281",
  storageBucket: "bilbakalim-28281.firebasestorage.app",
  messagingSenderId: "926606297242",
  appId: "1:926606297242:web:74a8f3d5e924e0c8a6b723",
  measurementId: "G-PWH36GB2RM",
  databaseURL: "https://bilbakalim-28281-default-rtdb.europe-west1.firebasedatabase.app"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const database = getDatabase(app);
const storage = getStorage(app);
const messaging = getMessaging(app);
const analytics = getAnalytics(app);

export { auth, db, database, storage, messaging, analytics };
