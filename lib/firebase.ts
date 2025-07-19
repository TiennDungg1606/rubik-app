// lib/firebase.ts
// Thiết lập Firebase client và xuất firebaseAuth để đăng nhập Google
// Nếu chưa cài: npm install firebase

import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";

// Thay bằng cấu hình thật của bạn
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
export const firebaseAuth = getAuth(app);
