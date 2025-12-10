// Firebase 初始化配置
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

// Firebase 配置
const firebaseConfig = {
  apiKey: "AIzaSyDTBbHyPpk_aDNWsaHi9JsAIc0KMG-RdUQ",
  authDomain: "bowly-41ddd.firebaseapp.com",
  projectId: "bowly-41ddd",
  storageBucket: "bowly-41ddd.firebasestorage.app",
  messagingSenderId: "155831952330",
  appId: "1:155831952330:web:781e68996f68c874262533",
  measurementId: "G-S2GBHTHVQM"
};

// 初始化 Firebase
const app = initializeApp(firebaseConfig);

// 取得 Auth 和 Firestore
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db, app };
