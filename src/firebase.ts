import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Firebase 설정
// 환경 변수가 있으면 사용하고, 없으면 기본값 사용
// Firebase 설정
// Firebase 설정
// Firebase 설정
const firebaseConfig = {
  apiKey: "AIzaSyCdulV_M0eO-hlZfwABnpxvpbgbJSgNZmY",
  authDomain: "voca2-df831.firebaseapp.com",
  projectId: "voca2-df831",
  storageBucket: "voca2-df831.firebasestorage.app",
  messagingSenderId: "109533029020",
  appId: "1:109533029020:web:58690c2c80cf098cd08359",
  measurementId: "G-6GW28EEWDC"
};

// Firebase 앱 초기화
const app = initializeApp(firebaseConfig);

// 인증 인스턴스 초기화 및 export
export const auth = getAuth(app);

// Firestore 인스턴스 초기화 및 export
export const db = getFirestore(app);

// Storage 인스턴스 초기화 및 export (이미지 업로드용)
import { getStorage } from "firebase/storage";
export const storage = getStorage(app);

// 기본 앱 인스턴스 export (필요한 경우)
export default app;

