import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User,
  GoogleAuthProvider,
  signInWithRedirect,
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
    // 팝업 대신 리다이렉트 사용 (모바일 웹뷰/Custom Tabs 호환성 위해)
    await signInWithRedirect(auth, provider);
    // 리다이렉트가 시작되면 이 줄 이후는 실행되지 않거나 페이지가 언로드됨
    return { user: null, error: null };
  } catch (error: any) {
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

