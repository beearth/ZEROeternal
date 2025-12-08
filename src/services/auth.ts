import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User,
  GoogleAuthProvider,
  signInWithRedirect,
  signInWithPopup,
} from "firebase/auth";
import { auth } from "../firebase";

// 이메일/비밀번호 로그인
export const signInWithEmail = async (email: string, password: string) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return { user: userCredential.user, error: null };
  } catch (error: any) {
    return { user: null, error: error.message };
  }
};

// 이메일/비밀번호 회원가입
export const signUpWithEmail = async (email: string, password: string) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    return { user: userCredential.user, error: null };
  } catch (error: any) {
    return { user: null, error: error.message };
  }
};

// Google 로그인
export const signInWithGoogle = async () => {
  try {
    const provider = new GoogleAuthProvider();
    // 팝업 방식 사용 (리다이렉트 방식의 멈춤 현상 해결을 위해 변경)
    const result = await signInWithPopup(auth, provider);
    return { user: result.user, error: null };
  } catch (error: any) {
    // 팝업이 사용자에 의해 닫힌 경우
    if (error.code === 'auth/popup-closed-by-user') {
      return { user: null, error: '로그인이 취소되었습니다.' };
    }
    // configuration-not-found 에러는 Firebase Console 설정 문제
    if (error.code === 'auth/configuration-not-found') {
      return {
        user: null,
        error: 'Google 로그인이 설정되지 않았습니다. Firebase Console에서 Google 로그인을 활성화해주세요.'
      };
    }
    return { user: null, error: error.message };
  }
};

// 로그아웃
export const logout = async () => {
  try {
    await signOut(auth);
    return { error: null };
  } catch (error: any) {
    return { error: error.message };
  }
};

// 인증 상태 변경 감지
export const onAuthStateChange = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, callback);
};

