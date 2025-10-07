import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  // Replace with your Firebase config
  apiKey: "AIzaSyAGzi5x4RnHA0Wksl-MdAVhCMYMMZuKbiQ",
  authDomain: "covhills-261b2.firebaseapp.com",
  projectId: "covhills-261b2",
  storageBucket: "covhills-261b2.firebasestorage.app",
  messagingSenderId: "349334014837",
  appId: "1:349334014837:web:12bff2c4afef2787c3e13c"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
