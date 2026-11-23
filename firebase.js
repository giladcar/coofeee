import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  where,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

export const firebaseConfig = {
  apiKey: "AIzaSyCiSZP7LGtAq9S63IZt2KOhCK6HizHUbTQ",
  authDomain: "coofee-337f0.firebaseapp.com",
  projectId: "coofee-337f0",
  storageBucket: "coofee-337f0.firebasestorage.app",
  messagingSenderId: "381039786300",
  appId: "1:381039786300:web:716f1b0f607635b08c0639",
  measurementId: "G-2CT6HYFWC8"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

export {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  where,
  serverTimestamp,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut
};