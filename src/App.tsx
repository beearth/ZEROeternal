import React, { useState, useEffect, useRef, useCallback } from "react";
import { Sidebar } from "./components/Sidebar";
import { ChatMessage } from "./components/ChatMessage";
import { ChatInput } from "./components/ChatInput";
import { StackView } from "./components/StackView";
import { Auth } from "./components/Auth";
import { OnboardingModal } from "./components/OnboardingModal";
import { MainContent } from "./components/MainContent";
import { ToeicWordList } from "./components/ToeicWordList";
import { Send, Menu, X, LogOut, User } from "lucide-react";
import {
  sendMessageToGemini,
  ChatMessage as GeminiChatMessage,
  generateStudyTips,
  generatePersonalizedTips,
  getKoreanMeaning,
  generateText,
} from "./services/gemini";
import { Toaster, toast } from "sonner";
import { onAuthStateChange, logout } from "./services/auth";
import {
  getUserVocabulary,
  saveUserVocabulary,
  getUserStacks,
  saveUserStacks,
  saveUserStackField,
  getUserConversations,
  saveUserConversations
} from "./services/userData";
import type { User as FirebaseUser } from "firebase/auth";
import { auth, db } from "./firebase";
import { doc, getDoc, setDoc, updateDoc, onSnapshot } from "firebase/firestore";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  timestamp: Date;
}

import type { WordData, VocabularyEntry } from "./types";

import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import { CommunityFeed } from "./features/community/CommunityFeed";
import { CreatePostPage } from "./features/community/CreatePostPage";
import { EditPostPage } from "./features/community/EditPostPage";
import { UserProfilePage } from "./features/community/UserProfilePage";
import { GlobalChatRoom } from "./features/community/GlobalChatRoom";
import { DirectChat } from "./features/community/DirectChat";



export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [conversations, setConversations] = useState<Conversation[]>([
    {
      id: "1",
      title: "새로운 대화",
      messages: [],
      timestamp: new Date(),
    },
  ]);
  const [currentConversationId, setCurrentConversationId] = useState("1");
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth >= 1024);
  const [isTyping, setIsTyping] = useState(false);

  // 언어 상태
  // 언어 상태 (LocalStorage에서 초기화하여 새로고침 시 리셋 방지)
  const [nativeLang, setNativeLang] = useState(() => localStorage.getItem("signal_native_lang") || "ko");
  const [targetLang, setTargetLang] = useState<string | null>(() => localStorage.getItem("signal_target_lang"));
  const [isToeicLoading, setIsToeicLoading] = useState(false);
  const [isDataLoaded, setIsDataLoaded] = useState(false); // 데이터 로딩 완료 여부

  // ... (existing code)



  const [userVocabulary, setUserVocabulary] = useState<
    Record<string, VocabularyEntry>
  >({});

  // Loop Prevention Refs
  const lastLoadedVocab = useRef<Record<string, VocabularyEntry> | null>(null);
  const lastLoadedConvs = useRef<Conversation[] | null>(null);
  const lastLoadedRed = useRef<string[] | null>(null);
  const lastLoadedYellow = useRef<string[] | null>(null);
  const lastLoadedGreen = useRef<string[] | null>(null);
  const lastLoadedImportant = useRef<WordData[] | null>(null);
  const lastLoadedSentence = useRef<string[] | null>(null);

  // Debounce를 위한 ref
  const saveVocabularyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);



  // 마크다운 제거 함수
  const cleanMarkdown = (text: string | undefined | null): string => {
    if (!text) return ""; // Null/Undefined 보호
    return text
      .replace(/\*\*(.*?)\*\*/g, "$1") // 볼드 제거
      .replace(/\*(.*?)\*/g, "$1") // 이탤릭 제거
      .replace(/\[(.*?)\]\(.*?\)/g, "$1") // 링크 텍스트만 추출
      .replace(/`(.*?)`/g, "$1") // 인라인 코드 제거
      .replace(/```[\s\S]*?```/g, "") // 코드 블록 제거
      .replace(/`/g, "") // 백틱 제거
      .replace(/#{1,6}\s/g, "") // 헤더 마크다운 제거
      .replace(/^-/g, "") // 리스트 마크다운 제거
      .replace(/^\d+\./g, "") // 번호 리스트 제거 (예: "1." 제거)
      .replace(/&nbsp;/g, " ") // &nbsp; 제거
      .trim();
  };

  // 단어 텍스트만 추출 (마크다운 제거 + 공백/문장부호 제거)
  const extractCleanWord = (text: string | undefined | null): string => {
    const cleaned = cleanMarkdown(text);
    if (!cleaned) return "";

    // 공백이나 문장부호로 분리하여 첫 번째 단어만 추출
    const words = cleaned.split(/[\s\n.,?!;:()\[\]{}"'`]+/).filter(w => w.length > 0);

    // 유효한 단어인지 확인 (숫자로 시작하고 하이픈이 포함된 토큰 제외)
    if (words.length > 0) {
      const candidate = words[0];
      // "17645250569 2-start" 같은 패턴 필터링 (숫자+하이픈+문자)
      if (/^\d+-[a-zA-Z]+/.test(candidate) || /^\d+\s+\d+-[a-zA-Z]+/.test(candidate)) {
        return "";
      }
      return candidate;
    }

    return cleaned.trim();
  };

  // 5개의 데이터 저장소 (useEffect보다 먼저 선언)
  // Red, Yellow, Green Stack은 깔끔하게 정제된 단어 텍스트만 저장
  const [redStack, setRedStack] = useState<string[]>([]);
  const [yellowStack, setYellowStack] = useState<string[]>([]);
  const [greenStack, setGreenStack] = useState<string[]>([]);
  const [importantStack, setImportantStack] = useState<WordData[]>([]);
  const [sentenceStack, setSentenceStack] = useState<string[]>([]);

  // Firestore에서 단어장 불러오기
  const loadVocabularyFromDB = async (userId: string) => {
    try {
      const userRef = doc(db, "users", userId);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const data = userSnap.data();
        const vocabData = data.vocabulary || {};

        // 언어 설정 불러오기
        if (data.nativeLang) setNativeLang(data.nativeLang);
        if (data.targetLang) setTargetLang(data.targetLang);

        // 기존 형식 (단순 status)을 새 형식으로 변환
        const vocabulary: Record<string, VocabularyEntry> = {};
        Object.keys(vocabData).forEach((word) => {
          const entry = vocabData[word];
          if (typeof entry === "string") {
            // 기존 형식: { word: "red" | "yellow" | "green" }
            vocabulary[word] = {
              status: entry as "red" | "yellow" | "green",
              koreanMeaning: "",
            };
          } else if (entry && typeof entry === "object" && "status" in entry) {
            // 새 형식: { word: { status: "...", koreanMeaning: "...", category: "..." } }
            vocabulary[word] = {
              status: entry.status,
              koreanMeaning: entry.koreanMeaning || "",
              category: entry.category,
            };
          }
        });

        // Data Cleanup: Remove corrupted words (too long or containing newlines)
        const cleaned: Record<string, VocabularyEntry> = {};
        let hasChanges = false;

        Object.entries(vocabulary).forEach(([word, entry]) => {
          // Only filter out clearly invalid patterns:
          // 1. Contains timestamp-like long numbers at start (e.g., "1764528737126-8-intensively")
          const hasTimestamp = /^\d{10,}-/.test(word);

          // 2. Standard invalid patterns from before
          const hasInvalidChars =
            word.includes('\n') ||
            word.includes('**') ||
            word.includes('.') ||
            word.includes('/') ||
            word.length > 50; // Filter out sentences/long text

          const isTooLong = word.length > 50;

          // Keep the word unless it matches the problematic patterns
          if (!hasTimestamp && !hasInvalidChars && !isTooLong) {
            cleaned[word] = entry as VocabularyEntry;
          } else {
            hasChanges = true;
            console.log(`Filtered out invalid word: ${word}`);
          }
        });

        setUserVocabulary(cleaned);

        if (hasChanges) {
          console.log("Cleaned up corrupted vocabulary data");
          // Optionally save back to DB immediately, but state update will trigger save in useEffect if we have one for that.
          // Current app saves on change, so we might need to trigger a save.
          // But let's just let the user continue, next save will overwrite.
        }
      } else {
        // 문서가 없으면 빈 객체로 초기화
        setUserVocabulary({});
      }
    } catch (error: any) {
      console.error("단어장 불러오기 실패:", error);
      setUserVocabulary({});
    }
  };

  // Firestore에 단어장 저장 (즉시 저장 - Debounce 제거)
  // Debounce가 있으면 로컬 상태가 변경된 후(Red), 아직 저장되지 않은 시점에
  // onSnapshot이 서버의 이전 상태(White)를 가져와서 덮어쓰는 "Red -> White" 현상 발생
  const saveVocabularyToDB = async (userId: string, vocabData: Record<string, VocabularyEntry>) => {
    try {
      // undefined 값 제거
      const cleanedVocabData: Record<string, any> = {};
      Object.entries(vocabData).forEach(([word, entry]) => {
        const cleanedEntry: any = {};
        Object.entries(entry).forEach(([key, value]) => {
          if (value !== undefined) {
            cleanedEntry[key] = value;
          }
        });
        cleanedVocabData[word] = cleanedEntry;
      });

      const userRef = doc(db, "users", userId);

      // 즉시 저장 (비동기로 실행되지만, SDK가 로컬 캐시에 즉시 반영함)
      // [CRITICAL FIX] Use updateDoc to REPLACE the vocabulary field.
      // setDoc with merge: true preserves deleted keys (Ghost Words).
      // updateDoc ensures that if a key is missing in cleanedVocabData, it is removed from DB.
      await updateDoc(userRef, {
        vocabulary: cleanedVocabData,
        updatedAt: new Date(),
      });

      // console.log('✅ 단어장이 Firestore에 저장되었습니다.');
    } catch (error: any) {
      console.error("단어장 저장 실패:", error);
      toast.error("단어장 저장에 실패했습니다.");
    }
  };

  // 언어 설정 저장
  const saveLanguageSettings = async (native: string, target: string) => {
    // 1. LocalStorage 저장 (즉시 반영)
    localStorage.setItem("signal_native_lang", native);
    localStorage.setItem("signal_target_lang", target);

    // 2. Firestore 저장
    if (user) {
      try {
        const userRef = doc(db, "users", user.uid);
        await setDoc(userRef, {
          nativeLang: native,
          targetLang: target,
        }, { merge: true });
      } catch (error) {
        console.error("언어 설정 저장 실패:", error);
      }
    }
  };



  // 전역 단어장을 Firebase에 저장 (사용자별로, Debounce 적용)
  const hasLoadedInitialData = useRef(false);

  useEffect(() => {
    // 데이터 로딩이 완료되지 않았으면 저장하지 않음
    if (!isDataLoaded) return;

    // Prevent Echo Save (Loop)
    if (userVocabulary === lastLoadedVocab.current) return;

    if (user) {
      // 로그인 상태이고 데이터가 있을 때만: Firebase에 저장 (Debounce 적용)
      console.log('💾 단어장 저장 예약됨 (500ms 후)');
      saveVocabularyToDB(user.uid, userVocabulary);
    }

    // cleanup: 컴포넌트 언마운트 시 타이머 정리
    return () => {
      if (saveVocabularyTimeoutRef.current) {
        clearTimeout(saveVocabularyTimeoutRef.current);
      }
    };
  }, [userVocabulary, user]);



  // 스택을 Firebase에 저장 (개별 필드 저장으로 변경하여 Race Condition 방지)



  // Red Stack 저장
  useEffect(() => {
    if (!isDataLoaded || !user) return;
    if (JSON.stringify(redStack) === JSON.stringify(lastLoadedRed.current)) return;
    saveUserStackField(user.uid, "red", redStack);
  }, [redStack, user, isDataLoaded]);

  // Yellow Stack 저장
  useEffect(() => {
    if (!isDataLoaded || !user) return;
    if (JSON.stringify(yellowStack) === JSON.stringify(lastLoadedYellow.current)) return;
    saveUserStackField(user.uid, "yellow", yellowStack);
  }, [yellowStack, user, isDataLoaded]);

  // Green Stack 저장
  useEffect(() => {
    if (!isDataLoaded || !user) return;
    if (JSON.stringify(greenStack) === JSON.stringify(lastLoadedGreen.current)) return;
    saveUserStackField(user.uid, "green", greenStack);
  }, [greenStack, user, isDataLoaded]);

  // Important Stack 저장
  useEffect(() => {
    if (!isDataLoaded || !user) return;
    if (importantStack === lastLoadedImportant.current) return;
    saveUserStackField(user.uid, "important", importantStack);
  }, [importantStack, user, isDataLoaded]);

  // Sentence Stack 저장
  useEffect(() => {
    if (!isDataLoaded || !user) return;
    if (JSON.stringify(sentenceStack) === JSON.stringify(lastLoadedSentence.current)) return;
    console.log('💾 문장 보관소 저장:', sentenceStack.length);
    saveUserStackField(user.uid, "sentences", sentenceStack);
  }, [sentenceStack, user, isDataLoaded]);

  // 대화를 Firebase에 저장
  useEffect(() => {
    if (!isDataLoaded) return;

    // Prevent Echo Save (Loop)
    if (conversations === lastLoadedConvs.current) return;

    if (user && conversations.length > 0) {
      saveUserConversations(user.uid, conversations);
    }
  }, [conversations, user]);

  // Real-time Firestore Sync
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const userRef = doc(db, "users", user.uid);

    const unsubscribe = onSnapshot(userRef, (snapshot) => {
      if (!snapshot.exists()) {
        setUserVocabulary({});
        setIsDataLoaded(true);
        setLoading(false);
        return;
      }

      const data = snapshot.data();
      const dbVocab = data.vocabulary || {};
      const stacks = data.stacks || {};

      if (data.nativeLang) setNativeLang(data.nativeLang);
      if (data.targetLang) setTargetLang(data.targetLang);

      const mergedVocab: Record<string, VocabularyEntry> = {};

      // 1. Load DB Vocab
      Object.entries(dbVocab).forEach(([key, value]: [string, any]) => {
        const wordKey = key.toLowerCase();
        const meaning = typeof value === 'string' ? "" : (value.koreanMeaning || "");
        const category = typeof value === 'string' ? undefined : value.category;
        const status = (['red', 'yellow', 'green', 'orange'].includes(value.status)) ? value.status : 'white';
        mergedVocab[wordKey] = { status, koreanMeaning: meaning, category };
      });

      // 2. Merge Stacks
      const process = (list: any[], status: any) => {
        (list || []).forEach(item => {
          const wordText = typeof item === 'string' ? item : item.word;
          const clean = extractCleanWord(wordText);
          if (!clean) return;
          const key = clean.toLowerCase();
          mergedVocab[key] = {
            status: status,
            koreanMeaning: mergedVocab[key]?.koreanMeaning || (typeof item === 'object' ? item.koreanMeaning : "") || "",
            category: mergedVocab[key]?.category
          };
        });
      };

      process(stacks.red, 'red');
      process(stacks.yellow, 'yellow');
      process(stacks.green, 'green');
      process(stacks.important, 'orange');

      setUserVocabulary(mergedVocab);
      lastLoadedVocab.current = mergedVocab;

      // 3. Stacks are DERIVED from Vocabulary (Single Source of Truth)
      // DB의 stacks 필드는 참고용이거나 마이그레이션용으로만 사용하고,
      // 실제 앱 내 스택 상태는 항상 loadedVocab을 기준으로 재구축하여 동기화 불일치 방지
      const deriveStack = (status: string) => {
        return Object.entries(mergedVocab)
          .filter(([_, entry]) => entry.status === status)
          .map(([word, _]) => word); // 키만 반환
      };

      const newRedStack = deriveStack('red');
      const newYellowStack = deriveStack('yellow');
      const newGreenStack = deriveStack('green');

      setRedStack(newRedStack);
      lastLoadedRed.current = newRedStack;

      setYellowStack(newYellowStack);
      lastLoadedYellow.current = newYellowStack;

      setGreenStack(newGreenStack);
      lastLoadedGreen.current = newGreenStack;

      if (Array.isArray(stacks.important)) {
        setImportantStack(stacks.important);
        lastLoadedImportant.current = stacks.important;
      }

      if (Array.isArray(stacks.sentences)) {
        setSentenceStack(stacks.sentences);
        lastLoadedSentence.current = stacks.sentences;
      }

      // Conversations
      const rawConvs = data.conversations || [];
      const loadedConvs = rawConvs.map((conv: any) => ({
        ...conv,
        timestamp: conv.timestamp?.toDate ? conv.timestamp.toDate() : new Date(conv.timestamp),
        messages: (conv.messages || []).map((msg: any) => ({
          ...msg,
          timestamp: msg.timestamp?.toDate ? msg.timestamp.toDate() : new Date(msg.timestamp),
        }))
      }));

      setConversations(loadedConvs);
      lastLoadedConvs.current = loadedConvs;

      if (loadedConvs.length > 0 && !currentConversationId) {
        setCurrentConversationId("1");
      }

      setIsDataLoaded(true);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  // Firebase 인증 상태 감지 및 단어장 동기화
  useEffect(() => {
    const unsubscribe = onAuthStateChange((currentUser) => {
      setUser(currentUser);
      setLoading(false);

      if (currentUser) {
        // 로그인 시: 사용자 변경만 처리, 데이터 로딩은 useEffect가 담당
      } else {
        // 로그아웃 시: 모든 데이터 초기화
        setIsDataLoaded(false); // 로딩 상태 초기화
        setUserVocabulary({});
        setRedStack([]);
        setYellowStack([]);
        setGreenStack([]);
        setImportantStack([]);
        setSentenceStack([]);
        setConversations([
          {
            id: "1",
            title: "새로운 대화",
            messages: [],
            timestamp: new Date(),
          },
        ]);
        setCurrentConversationId("1");
        setTargetLang(null); // 로그아웃 시 언어 설정 초기화

        // Debounce 타이머 정리
        if (saveVocabularyTimeoutRef.current) {
          clearTimeout(saveVocabularyTimeoutRef.current);
        }
      }
    });

    return () => {
      unsubscribe();
      // cleanup: 타이머 정리
      if (saveVocabularyTimeoutRef.current) {
        clearTimeout(saveVocabularyTimeoutRef.current);
      }
    };
  }, []);

  const currentConversation = conversations.find(
    (conv) => conv.id === currentConversationId
  );

  const handleSendMessage = async (content: string) => {
    if (!content.trim() || !currentConversation) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content,
      timestamp: new Date(),
    };

    // 사용자 메시지 추가
    setConversations((prev) =>
      prev.map((conv) =>
        conv.id === currentConversationId
          ? {
            ...conv,
            messages: [...conv.messages, userMessage],
            title:
              conv.messages.length === 0
                ? content.slice(0, 30) + (content.length > 30 ? "..." : "")
                : conv.title,
          }
          : conv
      )
    );

    // AI 응답 받기
    setIsTyping(true);

    try {
      // 현재 대화의 모든 메시지를 Gemini 형식으로 변환
      const allMessages = [...currentConversation.messages, userMessage];

      const geminiMessages: GeminiChatMessage[] = allMessages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

      const aiResponse = await sendMessageToGemini(
        geminiMessages,
        nativeLang,
        targetLang || "en" // Default to English if null
      );

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: aiResponse,
        timestamp: new Date(),
      };

      setConversations((prev) =>
        prev.map((conv) =>
          conv.id === currentConversationId
            ? { ...conv, messages: [...conv.messages, aiMessage] }
            : conv
        )
      );
    } catch (error) {
      console.error("AI 응답 오류:", error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content:
          "죄송합니다. 응답을 생성하는 중 오류가 발생했습니다. API 키가 올바르게 설정되어 있는지 확인해주세요.",
        timestamp: new Date(),
      };

      setConversations((prev) =>
        prev.map((conv) =>
          conv.id === currentConversationId
            ? { ...conv, messages: [...conv.messages, errorMessage] }
            : conv
        )
      );
    } finally {
      setIsTyping(false);
    }
  };

  const handleNewConversation = () => {
    const newConversation: Conversation = {
      id: Date.now().toString(),
      title: "새로운 대화",
      messages: [],
      timestamp: new Date(),
    };
    setConversations((prev) => [newConversation, ...prev]);
    setCurrentConversationId(newConversation.id);
  };

  const handleSelectConversation = (id: string) => {
    setCurrentConversationId(id);
    if (window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
  };

  const handleDeleteConversation = (id: string) => {
    setConversations((prev) => {
      const filtered = prev.filter((conv) => conv.id !== id);
      if (filtered.length === 0) {
        const newConv: Conversation = {
          id: Date.now().toString(),
          title: "새로운 대화",
          messages: [],
          timestamp: new Date(),
        };
        setCurrentConversationId(newConv.id);
        return [newConv];
      }
      if (id === currentConversationId) {
        setCurrentConversationId(filtered[0].id);
      }
      return filtered;
    });
  };

  // 실시간 사용자 프로필 동기화
  useEffect(() => {
    if (!user?.uid) return;

    const unsubscribe = onSnapshot(doc(db, "users", user.uid), (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        setUser((prev) => {
          if (!prev) return null;
          // Firestore 데이터가 변경되면 로컬 user 상태 업데이트 (프로필 사진, 이름 등)
          const newPhoto = data.photoURL || data.avatar;
          const newName = data.displayName || data.name;

          // 불필요한 리렌더링 방지
          if (prev.photoURL !== newPhoto || prev.displayName !== newName) {
            return {
              ...prev,
              photoURL: newPhoto,
              displayName: newName,
            };
          }
          return prev;
        });

        // 언어 설정 동기화
        if (data.nativeLang && data.nativeLang !== nativeLang) {
          setNativeLang(data.nativeLang);
          localStorage.setItem("signal_native_lang", data.nativeLang);
        }
        if (data.targetLang && data.targetLang !== targetLang) {
          setTargetLang(data.targetLang);
          localStorage.setItem("signal_target_lang", data.targetLang);
        }
      }
    });

    return () => unsubscribe();
  }, [user?.uid]);

  // 단어 상태 업데이트 핸들러 (Red/Yellow/Green/White/Orange)
  const handleUpdateWordStatus = useCallback(async (
    wordOrId: string,
    newStatus: "red" | "yellow" | "green" | "white" | "orange",
    wordParam?: string,
    messageId?: string,
    sentence?: string,
    koreanMeaningParam?: string,
    isReturningToRed: boolean = false
  ) => {
    const word = wordParam || wordOrId;
    let cleanWord = word.trim();
    let wordKey = cleanWord.toLowerCase();

    // ID Parsing & Cleaning Logic matches existing pattern
    if (/^\d{10,}-\d+-.+/.test(word)) {
      const match = word.match(/^\d{10,}-\d+-(.+)$/);
      if (match && match[1]) {
        cleanWord = match[1].trim();
        wordKey = cleanWord.toLowerCase();
      }
    } else {
      if (!userVocabulary[wordKey]) {
        try {
          const extracted = extractCleanWord(cleanWord);
          if (extracted) {
            cleanWord = extracted;
            wordKey = cleanWord.toLowerCase();
          }
        } catch (e) {
          console.log("extractCleanWord skipped");
        }
      }
    }

    if (!cleanWord || cleanWord.length < 2 || cleanWord.length > 50) {
      toast.error(`단어가 유효하지 않습니다: ${cleanWord}`);
      return;
    }

    // Capture previous state values for optimistic update
    const prevEntry = userVocabulary[wordKey];
    const prevMeaning = prevEntry?.koreanMeaning || koreanMeaningParam || "";
    const prevStatus = prevEntry?.status;

    // 1. [Optimistic Update] Update State & DB IMMEDIATELY with available data
    // Do NOT wait for translation here.
    const optimisticEntry: VocabularyEntry = {
      status: newStatus,
      koreanMeaning: prevMeaning, // Might be empty initially
      category: prevEntry?.category || "general"
    };

    // Update Local State
    setUserVocabulary((prev) => {
      const updated = { ...prev, [wordKey]: optimisticEntry };

      // Update DB Immediately (Fire and Forget)
      if (user) {
        saveVocabularyToDB(user.uid, updated);
      }
      return updated;
    });

    // Update derived stacks immediately
    if (newStatus !== prevStatus) {
      setRedStack(prev => prev.filter(w => w !== wordKey));
      setYellowStack(prev => prev.filter(w => w !== wordKey));
      setGreenStack(prev => prev.filter(w => w !== wordKey));

      if (newStatus === "red") setRedStack(prev => [...prev, wordKey]);
      else if (newStatus === "yellow") setYellowStack(prev => [...prev, wordKey]);
      else if (newStatus === "green") setGreenStack(prev => [...prev, wordKey]);
    }

    // 2. [Background Process] Fetch Translation if missing
    // User can continue working while this happens.
    if (!prevMeaning && newStatus !== 'white') {
      // Don't await this inside the main flow
      getKoreanMeaning(cleanWord).then(fetchedMeaning => {
        if (fetchedMeaning) {
          // Translation arrived! Update State & DB again.
          console.log(`[Background] Translated ${cleanWord}: ${fetchedMeaning}`);

          setUserVocabulary(currentVocab => {
            // Check if the word still exists and hasn't been deleted/changed by user since
            const currentEntry = currentVocab[wordKey];
            if (!currentEntry || currentEntry.status === 'white') return currentVocab;

            const updatedEntry = { ...currentEntry, koreanMeaning: fetchedMeaning };
            const updatedVocab = { ...currentVocab, [wordKey]: updatedEntry };

            // Save updated meaning to DB
            if (user) {
              saveVocabularyToDB(user.uid, updatedVocab);
              toast.success(`"${cleanWord}" 뜻 자동완성: ${fetchedMeaning}`);
            }
            return updatedVocab;
          });
        }
      }).catch(err => {
        console.error(`[Background] Translation failed for ${cleanWord}`, err);
      });

      // Notify user that it's saved but translating
      toast.info(`저장 완료! (뜻 검색 중...)`);
    } else {
      if (newStatus !== 'white') {
        // toast.success(`저장 완료`); // Optional: Reduce noise
      }
    }

  }, [user, userVocabulary]);

  // 단어 상태 초기화 핸들러 (White/Default로 복원)
  const handleResetWordStatus = (word: string) => {
    const wordKey = word.toLowerCase().trim();
    if (!wordKey || wordKey.length < 2) return;

    setUserVocabulary((prev) => {
      const updated = { ...prev };
      delete updated[wordKey];
      if (user) saveVocabularyToDB(user.uid, updated);
      return updated;
    });

    setRedStack(prev => prev.filter(w => w !== wordKey));
    setYellowStack(prev => prev.filter(w => w !== wordKey));
    setGreenStack(prev => prev.filter(w => w !== wordKey));
    setImportantStack(prev => prev.filter(w => w.word.toLowerCase() !== wordKey));
  };

  // 학습 팁 생성 핸들러
  const handleGenerateStudyTips = useCallback(async (word: string, status: "red" | "yellow" | "green" | "white" | "orange") => {
    return await generateStudyTips(word, status);
  }, []);

  // 토익 필수 단어 가져오기
  const getToeicVocabulary = async (count: number = 10, seed: number = 0): Promise<string[]> => {
    try {
      // 프롬프트에 랜덤성을 부여하기 위해 seed 사용 (실제로는 프롬프트 텍스트에 반영)
      const topics = ["비즈니스", "경제", "일상", "여행", "쇼핑", "계약", "마케팅", "기술", "금융", "인사"];
      const topic = topics[seed % topics.length];

      const prompt = `토익(TOEIC) ${topic} 관련 필수 영단어(명사/동사) ${count}개를 쉼표로 구분하여 나열하세요. 번호나 설명 없이 오직 단어만 작성하세요. (예: negotiation, contract, schedule)`;
      const text = await generateText(prompt);

      const words = text.split(',').map(word => word.trim()).filter(word => word.length > 0);
      console.log(`Fetched ${words.length} words for topic ${topic}`);
      return words;
    } catch (error) {
      console.error("토익 단어 가져오기 실패:", error);
      return [];
    }
  };

  // 중요 단어 저장 핸들러 (Refactored for Speed)
  const handleSaveImportant = async (word: WordData) => {
    const wordKey = word.word.toLowerCase().trim();
    let initialMeaning = word.koreanMeaning;

    // 0. 길이 체크
    if (word.word.length > 50) {
      toast.error("문장은 중요 단어장에 저장할 수 없습니다.");
      return;
    }

    // 0.1 중복 체크 (Removed early return to allow status update)
    // Check against current importantStack state handled in setter
    const isDuplicate = importantStack.some(
      w => w.word.toLowerCase().trim() === wordKey
    );
    if (isDuplicate) {
      // toast.info("이미 중요 단어장에 있는 단어입니다."); 
      // Do not return, proceed to update status to 'orange'
    }

    // 1. [Optimistic] Check Global Vocab for meaning needed?
    if (!initialMeaning) {
      const globalEntry = userVocabulary[wordKey];
      if (globalEntry?.koreanMeaning) {
        initialMeaning = globalEntry.koreanMeaning;
      }
    }

    const optimisticWordData = { ...word, koreanMeaning: initialMeaning || "" };

    // 2. [Optimistic Update] Add to Important Stack & Global List IMMEDIATELY
    // Important Stack Update
    setImportantStack((prev) => {
      if (prev.find((w) => w.word.toLowerCase() === wordKey)) return prev;
      return [...prev, optimisticWordData];
    });

    // Global Vocab Update (Sync status to 'orange')
    setUserVocabulary((prev) => {
      const existingEntry = prev[wordKey];
      const updatedVocabulary = {
        ...prev,
        [wordKey]: {
          ...existingEntry,
          status: "orange" as "red" | "yellow" | "green" | "white" | "orange",
          koreanMeaning: initialMeaning || existingEntry?.koreanMeaning || "",
          category: existingEntry?.category || "important"
        },
      };

      // Save Global Vocab DB
      if (user) {
        saveVocabularyToDB(user.uid, updatedVocabulary);
      }
      return updatedVocabulary;
    });

    toast.success("중요 단어장에 추가되었습니다.");

    // 3. [Background] Fetch Meaning if missing
    if (!initialMeaning) {
      getKoreanMeaning(word.word).then(fetchedMeaning => {
        if (fetchedMeaning) {
          console.log(`[Important Check] Fetched: ${fetchedMeaning}`);

          // Update Important Stack with meaning
          setImportantStack(prevStack =>
            prevStack.map(item =>
              item.word.toLowerCase() === wordKey
                ? { ...item, koreanMeaning: fetchedMeaning }
                : item
            )
          );

          // Update Global Vocab with meaning
          setUserVocabulary(prevVocab => {
            const currentEntry = prevVocab[wordKey];
            if (!currentEntry) return prevVocab;

            const updatedVocab = {
              ...prevVocab,
              [wordKey]: { ...currentEntry, koreanMeaning: fetchedMeaning }
            };

            if (user) saveVocabularyToDB(user.uid, updatedVocab);
            return updatedVocab;
          });

          toast.info(`"${word.word}" 중요 단어 뜻 업데이트 완료`);
        }
      }).catch(err => {
        console.error("중요 단어 뜻 가져오기 실패:", err);
      });
    }
  };

  // 문장 저장 핸들러
  const handleSaveSentence = (sentence: string) => {
    setSentenceStack((prev) => {
      if (prev.includes(sentence)) return prev;
      return [...prev, sentence];
    });
  };

  // 로딩 중이면 로딩 화면 표시
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl mx-auto mb-4 flex items-center justify-center animate-pulse">
            <Send className="w-8 h-8 text-white" />
          </div>
          <p className="text-slate-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  // 로그인하지 않았으면 인증 화면 표시
  if (!user) {
    return (
      <>
        <Toaster position="top-center" richColors />
        <Auth onAuthSuccess={() => { }} />
      </>
    );
  }
  // 토익 단어 추가 로드 핸들러 (로컬 데이터 사용)
  const handleLoadMoreToeicWords = async () => {
    if (isToeicLoading) return;

    setIsToeicLoading(true);
    toast.info("토익 필수 단어를 불러오는 중입니다...");

    try {
      // 로컬 데이터에서 가져오기
      const { toeicWordList } = await import("./data/toeic4000");

      // 1초 정도 로딩 효과 (너무 빠르면 사용자가 인지 못함)
      await new Promise(resolve => setTimeout(resolve, 800));

      setUserVocabulary((prev) => {
        const newVocab = { ...prev };
        let addedCount = 0;
        const targetCount = 50; // 한 번에 추가할 목표 개수 (50개로 변경)

        // 이미 있는 단어 제외하고 순서대로 추가
        // (랜덤하게 섞고 싶다면 여기서 toeicWordList를 셔플하면 됨)
        const shuffledList = [...toeicWordList].sort(() => Math.random() - 0.5);

        for (const word of shuffledList) {
          if (addedCount >= targetCount) break;

          const wordKey = word.toLowerCase().trim();
          if (!newVocab[wordKey]) {
            newVocab[wordKey] = {
              status: 'white',
              koreanMeaning: '',
              category: 'toeic'
            };
            addedCount++;
          }
        }

        if (user) {
          saveVocabularyToDB(user.uid, newVocab);
        }

        if (addedCount > 0) {
          toast.success(`${addedCount}개의 새로운 단어가 추가되었습니다!`);
        } else {
          toast.info("더 이상 추가할 새로운 단어가 없습니다.");
        }

        return newVocab;
      });

    } catch (error) {
      console.error("단어 로드 중 오류:", error);
      toast.error("단어 로드 중 오류가 발생했습니다.");
    } finally {
      setIsToeicLoading(false);
    }
  };


  // 단어장 전체 초기화 핸들러 (사용자 요청 시 모든 단어 데이터 삭제)
  const handleResetVocabulary = async () => {
    try {
      if (user) {
        const userRef = doc(db, "users", user.uid);
        // DB에서 vocabulary 필드를 빈 객체로 업데이트 (덮어쓰기)
        await updateDoc(userRef, {
          vocabulary: {},
          updatedAt: new Date()
        });
      }

      // 로컬 상태 초기화
      setUserVocabulary({});
      setRedStack([]);
      setYellowStack([]);
      setGreenStack([]);
      setImportantStack([]);

      toast.success("모든 단어 데이터가 초기화되었습니다.");
    } catch (error) {
      console.error("데이터 초기화 실패:", error);
      toast.error("데이터 초기화에 실패했습니다.");
    }
  };

  const handleLogout = async () => {
    await logout();
    setUser(null);
    setUserVocabulary({});
    setRedStack([]);
    setYellowStack([]);
    setGreenStack([]);
    setImportantStack([]);
    setSentenceStack([]);
    setConversations([]);
    setCurrentConversationId("");
    // setShowOnboarding(true); // 필요 시 주석 해제
  };

  return (
    <BrowserRouter>
      <Toaster position="top-center" richColors />

      {/* 온보딩 모달 */}
      {/* 온보딩 모달 */}
      <OnboardingModal
        isOpen={!targetLang}
        onComplete={async (native, target, contentType) => {
          setNativeLang(native);
          setTargetLang(target);
          saveLanguageSettings(native, target);

          if (contentType === 'toeic') {
            toast.info("토익 필수 단어를 불러오는 중입니다...");
            const toeicWords = await getToeicVocabulary(50); // 처음엔 50개

            if (toeicWords.length > 0) {
              setUserVocabulary((prev) => {
                const newVocab = { ...prev };
                toeicWords.forEach(word => {
                  const wordKey = word.toLowerCase().trim();
                  if (!newVocab[wordKey]) {
                    newVocab[wordKey] = {
                      status: 'white',
                      koreanMeaning: '', // 나중에 필요할 때 가져오거나 지금 가져올 수도 있음
                      category: 'toeic'
                    };
                  }
                });

                if (user) {
                  saveVocabularyToDB(user.uid, newVocab);
                }
                return newVocab;
              });
              toast.success(`${toeicWords.length}개의 토익 단어가 추가되었습니다!`);
            } else {
              toast.error("단어를 불러오지 못했습니다.");
            }
          }
        }}
        onLogout={logout}
      />

      <div className="flex h-[100dvh] bg-[#1e1f20] text-[#E3E3E3] font-sans overflow-hidden">
        {/* 사이드바 */}
        <Sidebar
          conversations={conversations}
          currentConversationId={currentConversationId}
          onSelectConversation={handleSelectConversation}
          onNewConversation={handleNewConversation}
          onDeleteConversation={handleDeleteConversation}
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          counts={{
            red: redStack.length,
            yellow: yellowStack.length,
            green: greenStack.length,
            important: importantStack.length,
            sentence: sentenceStack.length,
          }}
          onLogout={handleLogout}
          onResetLanguage={() => {
            setTargetLang(null);
            saveLanguageSettings(nativeLang, "");
          }}
          onResetVocabulary={handleResetVocabulary}
        />


        {/* 메인 컨텐츠 영역 */}
        <Routes>
          <Route
            path="/"
            element={
              <MainContent
                nativeLang={nativeLang}
                targetLang={targetLang}
                currentConversation={currentConversation}
                isTyping={isTyping}
                onSendMessage={handleSendMessage}
                isSidebarOpen={isSidebarOpen}
                onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
                user={user}
                onLogout={handleLogout}
                userVocabulary={userVocabulary}
                onUpdateWordStatus={handleUpdateWordStatus}
                onResetWordStatus={handleResetWordStatus}
                onSaveImportant={handleSaveImportant}
                onSaveSentence={handleSaveSentence}
              />
            }
          />
          <Route
            path="/stack/red"
            element={
              <StackView
                title="Red Signal"
                color="#ef4444"
                items={redStack}
                userVocabulary={userVocabulary}
                onUpdateVocabulary={(wordKey, meaning) => {
                  setUserVocabulary((prev) => {
                    const entry = prev[wordKey];
                    if (entry) {
                      return {
                        ...prev,
                        [wordKey]: { ...entry, koreanMeaning: meaning },
                      };
                    }
                    return prev;
                  });
                }}
                onGenerateStudyTips={handleGenerateStudyTips}
                onUpdateWordStatus={(word, status) => handleUpdateWordStatus(word, status)}
                onDeleteWord={(word) => handleResetWordStatus(word)}
                onSaveImportant={handleSaveImportant}
                onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
              />
            }
          />
          <Route
            path="/stack/yellow"
            element={
              <StackView
                title="Yellow Signal"
                color="#eab308"
                items={yellowStack}
                userVocabulary={userVocabulary}
                onUpdateVocabulary={(wordKey, meaning) => {
                  setUserVocabulary((prev) => {
                    const entry = prev[wordKey];
                    if (entry) {
                      return {
                        ...prev,
                        [wordKey]: { ...entry, koreanMeaning: meaning },
                      };
                    }
                    return prev;
                  });
                }}
                onGenerateStudyTips={handleGenerateStudyTips}
                onUpdateWordStatus={(word, status) => handleUpdateWordStatus(word, status)}
                onDeleteWord={(word) => handleResetWordStatus(word)}
                onSaveImportant={handleSaveImportant}
                onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
              />
            }
          />
          <Route
            path="/stack/green"
            element={
              <StackView
                title="Green Signal"
                color="#22c55e"
                items={greenStack}
                userVocabulary={userVocabulary}
                onUpdateVocabulary={(wordKey, meaning) => {
                  setUserVocabulary((prev) => {
                    const entry = prev[wordKey];
                    if (entry) {
                      return {
                        ...prev,
                        [wordKey]: { ...entry, koreanMeaning: meaning },
                      };
                    }
                    return prev;
                  });
                }}
                onGenerateStudyTips={handleGenerateStudyTips}
                onUpdateWordStatus={(word, status) => handleUpdateWordStatus(word, status)}
                onDeleteWord={(word) => handleResetWordStatus(word)}
                onSaveImportant={handleSaveImportant}
                onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
              />
            }
          />
          <Route
            path="/stack/important"
            element={
              <StackView
                title="Important Stack"
                color="#f97316"
                items={importantStack}
                userVocabulary={userVocabulary}
                onUpdateVocabulary={(wordKey, meaning) => {
                  setUserVocabulary((prev) => {
                    const entry = prev[wordKey];
                    if (entry) {
                      return {
                        ...prev,
                        [wordKey]: { ...entry, koreanMeaning: meaning },
                      };
                    }
                    return prev;
                  });
                }}
                onGenerateStudyTips={handleGenerateStudyTips}
                onUpdateWordStatus={(word, status) => handleUpdateWordStatus(word, status)}
                onDeleteWord={handleResetWordStatus}
                onSaveImportant={handleSaveImportant}
                onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
              />
            }
          />
          <Route
            path="/stack/sentence"
            element={
              <StackView
                title="Sentences"
                color="#3b82f6"
                items={sentenceStack}
                onDeleteWord={(sentence) => {
                  setSentenceStack((prev) => prev.filter((item) => item !== sentence));
                }}
                onGenerateStudyTips={handleGenerateStudyTips}
                onSaveImportant={handleSaveImportant}
                onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
              />
            }
          />
          <Route
            path="/toeic-4000"
            element={
              <ToeicWordList
                userVocabulary={userVocabulary}
                onUpdateWordStatus={(word, status) => handleUpdateWordStatus(word, status)}
                onGenerateStudyTips={handleGenerateStudyTips}
                onLoadMore={handleLoadMoreToeicWords}
                onDeleteWord={handleResetWordStatus}
                onSaveImportant={handleSaveImportant}
                isLoading={isToeicLoading}
                onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
              />
            }
          />

          {/* Community Routes */}
          {/* Community Routes */}
          <Route path="/community" element={<CommunityFeed user={user} nativeLang={nativeLang} targetLang={targetLang} onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />} />
          <Route path="/create-post" element={<CreatePostPage user={user} onSubmit={() => { }} />} />
          <Route path="/edit-post/:postId" element={<EditPostPage />} />
          <Route path="/profile/:userId" element={<UserProfilePage user={user} />} />
          <Route
            path="/community/global-chat"
            element={
              <GlobalChatRoom
                user={user}
                userVocabulary={userVocabulary}
                onUpdateWordStatus={(_id, status, word, messageId, sentence) => handleUpdateWordStatus(word, status, word, messageId, sentence)}
                onResetWordStatus={handleResetWordStatus}
                nativeLang={nativeLang}
                onSaveSentence={handleSaveSentence}
                onSaveImportant={handleSaveImportant}
                importantStack={importantStack}
              />
            }
          />
          <Route path="/chat/:userId" element={<DirectChat user={user} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>


      </div>
    </BrowserRouter>
  );
}
