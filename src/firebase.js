// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";
import { getMessaging } from "firebase/messaging";
import { getAnalytics } from "firebase/analytics";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBT4j073Owuy0bk0eMBRHnNeUZ1I8aCVEU",
  authDomain: "bilbakalim-28281.firebaseapp.com",
  databaseURL: "https://bilbakalim-28281-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "bilbakalim-28281",
  storageBucket: "bilbakalim-28281.firebasestorage.app",
  messagingSenderId: "926606297242",
  appId: "1:926606297242:web:74a8f3d5e924e0c8a6b723",
  measurementId: "G-PWH36GB2RM"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const database = getDatabase(app);
const messaging = getMessaging(app);

export { auth, database, messaging };
