import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { db } from "../firebase";
import type { WordData } from "../types";

// 사용자 단어장 저장
export const saveUserVocabulary = async (
  userId: string,
  vocabulary: Record<string, "red" | "yellow" | "green">
) => {
  try {
    const userRef = doc(db, "users", userId);
    await updateDoc(userRef, {
      vocabulary,
      updatedAt: new Date(),
    });
    return { success: true, error: null };
  } catch (error: any) {
    // 문서가 없으면 생성
    try {
      const userRef = doc(db, "users", userId);
      await setDoc(userRef, {
        vocabulary,
        createdAt: new Date(),
        updatedAt: new Date(),
      }, { merge: true });
      return { success: true, error: null };
    } catch (createError: any) {
      return { success: false, error: createError.message };
    }
  }
};

// 사용자 단어장 불러오기
export const getUserVocabulary = async (userId: string) => {
  try {
    const userRef = doc(db, "users", userId);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      const data = userSnap.data();
      return {
        vocabulary: (data.vocabulary as Record<string, "red" | "yellow" | "green">) || {},
        error: null,
      };
    } else {
      return { vocabulary: {}, error: null };
    }
  } catch (error: any) {
    return { vocabulary: {}, error: error.message };
  }
};

// 사용자 스택 저장 (전체 덮어쓰기 - 레거시 호환용)
export const saveUserStacks = async (
  userId: string,
  stacks: {
    red: string[];
    yellow: string[];
    green: string[];
    important: WordData[];
    sentences: string[];
  }
) => {
  try {
    const userRef = doc(db, "users", userId);
    await updateDoc(userRef, {
      stacks,
      updatedAt: new Date(),
    });
    return { success: true, error: null };
  } catch (error: any) {
    try {
      const userRef = doc(db, "users", userId);
      await setDoc(userRef, {
        stacks,
        createdAt: new Date(),
        updatedAt: new Date(),
      }, { merge: true });
      return { success: true, error: null };
    } catch (createError: any) {
      return { success: false, error: createError.message };
    }
  }
};

// 개별 스택 필드 저장 (Race Condition 방지)
export const saveUserStackField = async (
  userId: string,
  field: "red" | "yellow" | "green" | "important" | "sentences",
  value: any[]
) => {
  try {
    const userRef = doc(db, "users", userId);
    await updateDoc(userRef, {
      [`stacks.${field}`]: value,
      updatedAt: new Date(),
    });
    return { success: true, error: null };
  } catch (error: any) {
    // 문서가 없거나 stacks 필드가 없는 경우 처리
    try {
      const userRef = doc(db, "users", userId);
      // setDoc with merge to ensure structure exists
      // Note: dot notation in setDoc key creates nested object
      await setDoc(userRef, {
        stacks: {
          [field]: value
        },
        updatedAt: new Date(),
      }, { merge: true });
      return { success: true, error: null };
    } catch (createError: any) {
      console.error(`Error saving stack field ${field}:`, createError);
      return { success: false, error: createError.message };
    }
  }
};

// 사용자 스택 불러오기
export const getUserStacks = async (userId: string) => {
  try {
    const userRef = doc(db, "users", userId);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      const data = userSnap.data();
      const stacks = data.stacks || {
        red: [],
        yellow: [],
        green: [],
        important: [],
        sentences: [],
      };

      // 기존 데이터가 WordData[] 형태일 수 있으므로 변환
      return {
        stacks: {
          red: Array.isArray(stacks.red) && stacks.red.length > 0 && typeof stacks.red[0] === 'object'
            ? stacks.red.map((w: any) => typeof w === 'string' ? w : (w.word || w.text || ''))
            : (stacks.red || []),
          yellow: Array.isArray(stacks.yellow) && stacks.yellow.length > 0 && typeof stacks.yellow[0] === 'object'
            ? stacks.yellow.map((w: any) => typeof w === 'string' ? w : (w.word || w.text || ''))
            : (stacks.yellow || []),
          green: Array.isArray(stacks.green) && stacks.green.length > 0 && typeof stacks.green[0] === 'object'
            ? stacks.green.map((w: any) => typeof w === 'string' ? w : (w.word || w.text || ''))
            : (stacks.green || []),
          important: stacks.important || [],
          sentences: stacks.sentences || [],
        },
        error: null,
      };
    } else {
      return {
        stacks: {
          red: [],
          yellow: [],
          green: [],
          important: [],
          sentences: [],
        },
        error: null,
      };
    }
  } catch (error: any) {
    return {
      stacks: {
        red: [],
        yellow: [],
        green: [],
        important: [],
        sentences: [],
      },
      error: error.message,
    };
  }
};

// 사용자 대화 저장
export const saveUserConversations = async (
  userId: string,
  conversations: any[]
) => {
  try {
    const userRef = doc(db, "users", userId);
    await updateDoc(userRef, {
      conversations,
      updatedAt: new Date(),
    });
    return { success: true, error: null };
  } catch (error: any) {
    try {
      const userRef = doc(db, "users", userId);
      await setDoc(userRef, {
        conversations,
        createdAt: new Date(),
        updatedAt: new Date(),
      }, { merge: true });
      return { success: true, error: null };
    } catch (createError: any) {
      return { success: false, error: createError.message };
    }
  }
};

// 사용자 대화 불러오기
export const getUserConversations = async (userId: string) => {
  try {
    const userRef = doc(db, "users", userId);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      const data = userSnap.data();
      return {
        conversations: data.conversations || [],
        error: null,
      };
    } else {
      return { conversations: [], error: null };
    }
  } catch (error: any) {
    return { conversations: [], error: error.message };
  }
};


// 사용자 프로필 불러오기 (이름, 아바타 등 전체 정보)
export const getUserProfile = async (userId: string) => {
  try {
    const userRef = doc(db, "users", userId);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      const data = userSnap.data();
      const profile = {
        id: userId,
        name: data.displayName || data.name || "Unknown User",
        avatar: data.photoURL || data.avatar || "",
        nativeLang: data.nativeLang || 'ko', // Keep as string or array based on DB, consumer handles it
        targetLang: data.targetLang || 'en',
        bio: data.bio || "",
        followers: data.followers || [],
        following: data.following || [],
        joinDate: data.createdAt ? new Date(data.createdAt.seconds * 1000).toLocaleDateString() : "최근 가입",
        studyStreak: data.studyStreak || 0,
        flag: data.flag || '',
        location: data.location || ''
      };
      return { profile, error: null };
    } else {
      // Mock fallback if not found in DB but ID exists
      return {
        profile: {
          id: userId,
          name: 'Unknown User',
          avatar: '',
          nativeLang: 'ko',
          targetLang: 'en',
          bio: '',
          followers: [],
          following: [],
          joinDate: '최근 가입',
          studyStreak: 0,
          flag: '',
          location: ''
        },
        error: null
      };
    }
  } catch (error: any) {
    console.error("Error fetching profile:", error);
    return { profile: null, error: error.message };
  }
};

// 사용자 프로필 업데이트 (DB 동기화)
export const updateUserProfileData = async (
  userId: string,
  data: {
    name?: string;
    avatar?: string;
    bio?: string;
    location?: string;
    flag?: string;
    nativeLang?: string[];
    targetLang?: string[];
  }
) => {
  try {
    const userRef = doc(db, "users", userId);

    // 필드 매핑 (Firestore 필드명과 일치)
    const updates: any = {
      updatedAt: new Date(),
    };

    if (data.name !== undefined) updates.name = data.name;
    if (data.name !== undefined) updates.displayName = data.name; // 호환성
    if (data.avatar !== undefined) updates.avatar = data.avatar;
    if (data.avatar !== undefined) updates.photoURL = data.avatar; // 호환성
    if (data.bio !== undefined) updates.bio = data.bio;
    if (data.location !== undefined) updates.location = data.location;
    if (data.flag !== undefined) updates.flag = data.flag;
    if (data.nativeLang !== undefined) updates.nativeLang = data.nativeLang;
    if (data.targetLang !== undefined) updates.targetLang = data.targetLang;

    await setDoc(userRef, updates, { merge: true });
    return { success: true, error: null };
  } catch (error: any) {
    console.error("Error updating profile:", error);
    return { success: false, error: error.message };
  }
};
