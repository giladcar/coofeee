import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCiSZP7LGtAq9S63IZt2KOhCK6HizHUbTQ",
  authDomain: "coofee-337f0.firebaseapp.com",
  projectId: "coofee-337f0",
  storageBucket: "coofee-337f0.firebasestorage.app",
  messagingSenderId: "381039786300",
  appId: "1:381039786300:web:716f1b0f607635b08c0639",
  measurementId: "G-2CT6HYFWC8"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const db = getFirestore(app);