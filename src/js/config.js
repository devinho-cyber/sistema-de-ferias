// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import {
  getFirestore,
  doc,
  setDoc,
  updateDoc,
  collection,
  serverTimestamp,
  getDocs,
  getDoc,
  query,
  where,
  deleteField,
  orderBy
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
import { getFunctions } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-functions.js";

// Configuração do Firebase
const firebaseConfig = {
  apiKey: import.meta.env.VITE_API_KEY,
  authDomain: import.meta.env.VITE_AUHT_DOMAIN,
  databaseURL: import.meta.env.VITE_DATABASE_URL,
  projectId: import.meta.env.VITE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_STORAGE_SENDER_ID,
  messagingSenderId: import.meta.env.VITE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_APP_ID,
  measurementId: import.meta.env.VITE_MEASUREMENT_ID,
};

// Inicialização do Firebase
const firebase = initializeApp(firebaseConfig);
const auth = getAuth(firebase);
const db = getFirestore(firebase);
const functions = getFunctions(firebase); // Inicializa o Firebase Functions

// Exporta as constantes necessárias
export {
  auth,
  db,
  functions,
  doc,
  setDoc,
  collection,
  serverTimestamp,
  updateDoc,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  getFirestore,
  getAuth,
  getDocs,
  getDoc,
  query,
  where,
  deleteField,
  orderBy
};
