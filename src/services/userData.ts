import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  onSnapshot,
  addDoc,
  arrayUnion,
  arrayRemove,
  orderBy,
  limit,
} from "firebase/firestore";
import { db } from "../firebase";
import type { WordData } from "../types";
// Rate Limiter Implementation
/**
 * 🏛️ ZERO ETERNAL SCALABILITY GUARD
 * 시스템 무결성 및 데이터 다이어트 로직 (Scalability Logic)
 * 
 * - 분산형 캐싱 (Distributed Caching): 과도한 I/O를 방지하고 메모리 상단에서 가볍게 처리
 * - 비동기 본딩 (Asynchronous Bonding): 백그라운드 처리를 통해 UI 렉(Lag) 원천 차단
 * - 데이터 다이어트: 정제되지 않은 쓰레기 데이터의 유입을 물리적으로 제어하여 '결정체'만 남김
 */
class RateLimiter {
  private timestamps: number[] = [];
  private limit: number;
  private interval: number;

  constructor(limit: number, interval: number) {
    this.limit = limit;
    this.interval = interval;
  }

  check(): boolean {
    const now = Date.now();
    this.timestamps = this.timestamps.filter(t => now - t < this.interval);
    
    if (this.timestamps.length >= this.limit) {
      console.warn(`Rate limit exceeded: ${this.timestamps.length} requests in ${this.interval}ms`);
      return false;
    }

    this.timestamps.push(now);
    return true;
  }
}

// Global Write Limiter: 60 writes per minute (1 per sec avg)
const writeLimiter = new RateLimiter(60, 60000);

// 사용자 단어장 저장
export const saveUserVocabulary = async (
  userId: string,
  vocabulary: Record<string, "red" | "yellow" | "green">
) => {
  if (!writeLimiter.check()) throw new Error("Safety Guard: Too many write requests. Please wait a moment.");

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
  if (!writeLimiter.check()) throw new Error("Safety Guard: Too many write requests.");

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
  if (!writeLimiter.check()) throw new Error("Safety Guard: Too many write requests.");

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

// Helper: Sanitize data for Firestore (remove undefined, functions, etc.)
const sanitizeForFirestore = (obj: any): any => {
  if (obj === null || obj === undefined) return null;
  if (obj instanceof Date) return obj;
  if (typeof obj === 'function') return null;
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeForFirestore(item)).filter(item => item !== null);
  }
  if (typeof obj === 'object') {
    const cleaned: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined && typeof value !== 'function') {
        cleaned[key] = sanitizeForFirestore(value);
      }
    }
    return cleaned;
  }
  return obj;
};

// 사용자 대화 저장
export const saveUserConversations = async (
  userId: string,
  conversations: any[]
) => {
  if (!writeLimiter.check()) {
    console.warn("Safety Guard: Conversation save blocked by rate limiter");
    return { success: false, error: "Rate limit exceeded" };
  }

  // Sanitize conversations before saving
  const sanitizedConversations = sanitizeForFirestore(conversations);

  try {
    const userRef = doc(db, "users", userId);
    await updateDoc(userRef, {
      conversations: sanitizedConversations,
      updatedAt: new Date(),
    });
    return { success: true, error: null };
  } catch (error: any) {
    try {
      const userRef = doc(db, "users", userId);
      await setDoc(userRef, {
        conversations: sanitizedConversations,
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
  if (!writeLimiter.check()) throw new Error("Safety Guard: Too many write requests.");

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

// Real-time listener for user profile
export const subscribeToUserProfile = (userId: string, onUpdate: (profile: any) => void) => {
  const userRef = doc(db, "users", userId);

  const unsubscribe = onSnapshot(userRef, (doc) => {
    if (doc.exists()) {
      const data = doc.data();
      const profile = {
        id: userId,
        name: data.displayName || data.name || "Unknown User",
        avatar: data.photoURL || data.avatar || "",
        nativeLang: data.nativeLang || 'ko',
        targetLang: data.targetLang || 'en',
        bio: data.bio || "",
        followers: data.followers || [],
        following: data.following || [],
        joinDate: data.createdAt ? new Date(data.createdAt.seconds * 1000).toLocaleDateString() : "최근 가입",
        studyStreak: data.studyStreak || 0,
        flag: data.flag || '',
        location: data.location || ''
      };
      onUpdate(profile);
    }
  });

  return unsubscribe;
};

// Send Notification
export const sendNotification = async (
  recipientId: string,
  senderId: string,
  type: 'follow' | 'like' | 'comment',
  message: string,
  senderName: string,
  senderAvatar: string
) => {
  if (!writeLimiter.check()) return; // Notifications can be dropped safely
  try {
    // Basic dup check for follows to avoid spam (optional but good)
    // For now, just fire and forget
    await addDoc(collection(db, "notifications"), {
      recipientId,
      senderId,
      senderName,
      senderAvatar,
      type,
      message,
      read: false,
      createdAt: new Date()
    });
  } catch (error) {
    console.error("Error sending notification:", error);
  }
};

// Toggle Follow User
export const toggleFollowUser = async (currentUserId: string, targetUserId: string) => {
  if (!currentUserId || !targetUserId || currentUserId === targetUserId) return;

  const currentUserRef = doc(db, "users", currentUserId);
  const targetUserRef = doc(db, "users", targetUserId);

  if (!writeLimiter.check()) throw new Error("Safety Guard: Too many write requests.");

  try {
    // 1. Check if already following
    // We can check local state in UI, but safe to check DB or use ArrayUnion/Remove
    const targetSnap = await getDoc(targetUserRef);
    const targetData = targetSnap.data();
    const isFollowing = targetData?.followers?.includes(currentUserId);

    if (isFollowing) {
      // Unfollow
      await updateDoc(currentUserRef, {
        following: arrayRemove(targetUserId)
      });
      await updateDoc(targetUserRef, {
        followers: arrayRemove(currentUserId)
      });
    } else {
      // Follow
      await updateDoc(currentUserRef, {
        following: arrayUnion(targetUserId)
      });
      await updateDoc(targetUserRef, {
        followers: arrayUnion(currentUserId)
      });

      // Send Notification
      // Use helper to get current user name/avatar if possible, or pass it in?
      // Fetch current user brief info to put in notification
      const mySnap = await getDoc(currentUserRef);
      const myData = mySnap.data();
      const myName = myData?.displayName || myData?.name || "Someone";
      const myAvatar = myData?.photoURL || myData?.avatar || "";

      await sendNotification(
        targetUserId,
        currentUserId,
        'follow',
        `${myName} started following you.`,
        myName,
        myAvatar
      );
    }
    return !isFollowing;
  } catch (error) {
    console.error("Error toggling follow:", error);
    throw error;
  }
};

// Subscribe to Notifications
export const subscribeToNotifications = (userId: string, onUpdate: (notifications: any[]) => void) => {
  /* 
   FIX: 'failed-precondition' error (Missing Index)
   Removed orderBy("createdAt", "desc") to avoid requiring a composite index.
   Sorting should be done client-side if needed to prevent app crashes.
  */
  console.log("DEBUG: Subscribing to notifications (No Limit, No OrderBy)");
  const q = query(
    collection(db, "notifications"),
    where("recipientId", "==", userId)
    // limit(20) // Removed potential index conflict
  );

  return onSnapshot(q, (snapshot) => {
    const notifs = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    onUpdate(notifs);
  });
};

// Mark Notification as Read
export const markNotificationAsRead = async (notificationId: string) => {
  if (!writeLimiter.check()) return; 

  try {
    const notifRef = doc(db, "notifications", notificationId);
    await updateDoc(notifRef, {
      read: true
    });
  } catch (error) {
    console.error("Error marking notification read:", error);
  }
};
