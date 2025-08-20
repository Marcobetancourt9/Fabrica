// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBclsiIBgYF4yXLuRvAk0O-jitu1uQ3Fm4",
  authDomain: "fabrica-1c481.firebaseapp.com",
  projectId: "fabrica-1c481",
  storageBucket: "fabrica-1c481.firebasestorage.app",
  messagingSenderId: "431696671702",
  appId: "1:431696671702:web:df2f4e78327a3abf882a77",
  measurementId: "G-PQM14S00KM"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);
const auth = getAuth(app);

export { app, analytics, db, auth };