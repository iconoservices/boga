import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
    apiKey: "AIzaSyClnKVrMn0Kv4AJvLGKeXOPi_0DZF5rfcI",
    authDomain: "delva-cb9d5.firebaseapp.com",
    projectId: "delva-cb9d5",
    storageBucket: "delva-cb9d5.firebasestorage.app",
    messagingSenderId: "60299677417",
    appId: "1:60299677417:web:aad42de21902906fe6ea78",
    measurementId: "G-JBVH2P76EF"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();
