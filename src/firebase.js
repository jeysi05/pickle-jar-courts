// src/firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAilChJ1pDoXe9MbPxieOpuMCnLurYJJ2M",
  authDomain: "pickle-jar-app.firebaseapp.com",
  projectId: "pickle-jar-app",
  storageBucket: "pickle-jar-app.firebasestorage.app",
  messagingSenderId: "974510901179",
  appId: "1:974510901179:web:e6ddf74d52089b92c9e69e",
  measurementId: "G-3YVYMMXLJ7"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);      // The Database
const storage = getStorage(app);   // The Image Storage

export { db, storage };