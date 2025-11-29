import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Firebase 설정
// 환경 변수가 있으면 사용하고, 없으면 기본값 사용
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY?.replace(/^["']|["']$/g, '') || "AIzaSyBVKwSbL1woBY0cQGjcgOXVlQ1czEgpFc8",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN?.replace(/^["']|["']$/g, '') || "signal-voca-93bb9.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID?.replace(/^["']|["']$/g, '') || "signal-voca-93bb9",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET?.replace(/^["']|["']$/g, '') || "signal-voca-93bb9.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID?.replace(/^["']|["']$/g, '') || "705714352680",
  appId: import.meta.env.VITE_FIREBASE_APP_ID?.replace(/^["']|["']$/g, '') || "1:705714352680:web:5675eaa50ae951f3057b1d",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID?.replace(/^["']|["']$/g, '') || "G-Q55CVDLHLN",
};

// Firebase 앱 초기화
const app = initializeApp(firebaseConfig);

// 인증 인스턴스 초기화 및 export
export const auth = getAuth(app);

// Firestore 인스턴스 초기화 및 export
export const db = getFirestore(app);

// 기본 앱 인스턴스 export (필요한 경우)
export default app;

