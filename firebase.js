import { initializeApp } from
"https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
  getDoc,
  query,
  orderBy,
  limit
} from
"https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL
} from
"https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

// CONFIG FIREBASE
const firebaseConfig = {

  apiKey:
    "AIzaSyB_V1HvrcIysa-jA8AH01BLSzOhUixGALA",

  authDomain:
    "edugame-c9a9d.firebaseapp.com",

  projectId:
    "edugame-c9a9d",

  storageBucket:
    "edugame-c9a9d.firebasestorage.app",

  messagingSenderId:
    "349691152447",

  appId:
    "1:349691152447:web:941296ba0ea645f603d08a"

};

// INIT
const app = initializeApp(firebaseConfig);

const db = getFirestore(app);

const storage = getStorage(app);

// EXPORTS
export {

  db,
  storage,

  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
  getDoc,
  query,
  orderBy,
  limit,

  ref,
  uploadBytes,
  getDownloadURL

};