import React, { useState, useEffect, useRef, useCallback } from "react";
import { Sidebar } from "./components/Sidebar";
import { ChatMessage } from "./components/ChatMessage";
import { ChatInput } from "./components/ChatInput";
import { StackView } from "./components/StackView";
import { Auth } from "./components/Auth";
import { WordOptionMenu, type WordOptionType } from "./components/WordOptionMenu";
import { QuizModal } from "./components/QuizModal";
import { WordDetailModal } from "./components/WordDetailModal";
import { SettingsMenu } from "./components/SettingsMenu";
import { OnboardingModal } from "./components/OnboardingModal";
import { MainContent } from "./components/MainContent";
import { ToeicWordList } from "./components/ToeicWordList";
import { InstructionPage } from "./pages/InstructionPage";
import { useVoice } from "./hooks/useVoice";


import { Send, Menu, X, LogOut, User } from "lucide-react";
import {
  sendMessageToGemini,
  ChatMessage as GeminiChatMessage,
  generateStudyTips,
  generatePersonalizedTips,
  getKoreanMeaning,
  generateText,
} from "./services/gemini";
import { Toaster } from "sonner";
import { toast } from "./services/toast";
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
import { eternalSystemDefaults } from "./constants/system";
import type { User as FirebaseUser } from "firebase/auth";
import { auth, db } from "./firebase";
import { doc, getDoc, setDoc, updateDoc, onSnapshot, deleteField } from "firebase/firestore";

import type { WordData, VocabularyEntry, PersonaInstruction, Message, Conversation } from "./types";


import { Routes, Route, Navigate, useNavigate, useLocation, useParams } from "react-router-dom";

import { CommunityFeed } from "./features/community/CommunityFeed";
import { CreatePostPage } from "./features/community/CreatePostPage";
import { EditPostPage } from "./features/community/EditPostPage";
import { UserProfilePage } from "./features/community/UserProfilePage";
import { GlobalChatRoom } from "./features/community/GlobalChatRoom";
import { DirectChat } from "./features/community/DirectChat";


export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState(() => localStorage.getItem("signal_last_conversation_id") || "1");
  // Initialize sidebar open state based on screen width (Open on Desktop by default)
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    const saved = localStorage.getItem("signal_sidebar_open");
    if (saved !== null) return saved === "true";
    return window.innerWidth >= 1024;
  });
  const [isTyping, setIsTyping] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  // URL 파라미터에서 conversationId 추출 및 동기화
  useEffect(() => {
    const match = location.pathname.match(/\/chat\/([^/]+)/);
    if (match && match[1]) {
      const urlId = match[1];
      if (urlId !== currentConversationId) {
        setCurrentConversationId(urlId);
      }
    }
  }, [location.pathname, currentConversationId]);



  // Gemini-style: Auto-toggle sidebar based on screen width
  // Uses debounce to prevent rapid firing during resize
  useEffect(() => {
    let resizeTimeout: ReturnType<typeof setTimeout> | null = null;
    let lastWidth = window.innerWidth;

    const handleResize = () => {
      if (resizeTimeout) clearTimeout(resizeTimeout);
      
      resizeTimeout = setTimeout(() => {
        const currentWidth = window.innerWidth;
        const wasDesktop = lastWidth >= 1024;
        const isDesktop = currentWidth >= 1024;
        
        // Only auto-toggle when crossing the breakpoint
        if (wasDesktop !== isDesktop) {
          setIsSidebarOpen(isDesktop);
        }
        lastWidth = currentWidth;
      }, 100); // 100ms debounce
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      if (resizeTimeout) clearTimeout(resizeTimeout);
    };
  }, []);

  // Persist sidebar state
  useEffect(() => {
    localStorage.setItem("signal_sidebar_open", String(isSidebarOpen));
  }, [isSidebarOpen]);

  // Persist last conversation ID
  useEffect(() => {
    if (currentConversationId && currentConversationId !== "1") {
      localStorage.setItem("signal_last_conversation_id", currentConversationId);
    }
  }, [currentConversationId]);


  // 언어 상태
  // 언어 상태 (LocalStorage에서 초기화하여 새로고침 시 리셋 방지)
  const [nativeLang, setNativeLang] = useState(() => localStorage.getItem("signal_native_lang") || "ko");
  const [targetLang, setTargetLang] = useState<string | null>(() => localStorage.getItem("signal_target_lang"));
  const [personaInstructions, setPersonaInstructions] = useState<PersonaInstruction[]>(() => {
    const saved = localStorage.getItem("signal_persona_instructions");
    return saved ? JSON.parse(saved) : [];
  });

  // Persist language settings
  useEffect(() => {
    if (nativeLang) localStorage.setItem("signal_native_lang", nativeLang);
  }, [nativeLang]);

  useEffect(() => {
     if (targetLang) localStorage.setItem("signal_target_lang", targetLang);
     else localStorage.removeItem("signal_target_lang");
  }, [targetLang]);


  const [isToeicLoading, setIsToeicLoading] = useState(false);
  const [isDataLoaded, setIsDataLoaded] = useState(false); // 데이터 로딩 완료 여부
  const [showResetConfirm, setShowResetConfirm] = useState(false); // 학습 모드 리셋 확인 모달 상태

  // 학습 모드 상태 ('knowledge' | 'language') - 기본값은 'knowledge'
  const [learningMode, setLearningMode] = useState<'knowledge' | 'language'>(() => 
    (localStorage.getItem("signal_learning_mode") as 'knowledge' | 'language') || "knowledge"
  );

  const saveLearningMode = (mode: 'knowledge' | 'language') => {
    localStorage.setItem("signal_learning_mode", mode);
    setLearningMode(mode);
  };

  const [isAutoTTS, setIsAutoTTS] = useState(() => 
    localStorage.getItem("signal_auto_tts") === "true"
  );
  const [isQuizOpen, setIsQuizOpen] = useState(false);
  const [toeicWordList, setToeicWordList] = useState<string[]>([]);

  const { speak } = useVoice();

  const toggleAutoTTS = () => {
    const newState = !isAutoTTS;
    setIsAutoTTS(newState);
    localStorage.setItem("signal_auto_tts", String(newState));
    if (newState) {
        toast.success("음성 출력 모드가 켜졌습니다.");
    } else {
        toast.error("음성 출력 모드가 꺼졌습니다.");
        window.speechSynthesis.cancel();
    }
  };


  // ... (existing code)



  const [userVocabulary, setUserVocabulary] = useState<
    Record<string, VocabularyEntry>
  >({});

  // Loop Prevention Refs
  const lastLoadedVocab = useRef<Record<string, VocabularyEntry> | null>(null);
  const lastLoadedConvs = useRef<Conversation[] | null>(null);
  const lastLoadedRed = useRef<string[] | null>(null);
  const lastLoadedYellow = useRef<string[] | null>(null); // Restored
  const lastLoadedGreen = useRef<string[] | null>(null); // Restored
  const lastLoadedSentence = useRef<string[] | null>(null);

  // Debounce를 위한 ref
  const saveVocabularyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // [SAFETY] deliberateResetRef - Intentional resets only
  const deliberateResetRef = useRef(false);




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

    // 1. 공백이나 문장부호로 분리하여 첫 번째 단어만 추출
    const words = cleaned.split(/[\s\n.,?!;:()\[\]{}"'`]+/).filter(w => w.length > 0);

    if (words.length > 0) {
      const candidate = words[0];
      
      // 2. [SAFETY] 기술적 ID 필터링 (숫자와 하이픈이 섞인 패턴)
      // 예: "1764821232073-58-english"
      if (/^\d{10,}/.test(candidate) || /^\d+-[a-zA-Z0-9]+-/.test(candidate) || /^[0-9a-f]{8,}-[0-9a-f]{4,}/.test(candidate)) {
        return "";
      }

      // 3. 문장 필터링: 띄어쓰기가 일정 횟수 이상이면 문장으로 간주
      if (cleaned.split(' ').filter(Boolean).length > 4 || cleaned.length > 40) {
        return ""; // Too long/complex to be a "word"
      }

      return candidate;
    }

    return cleaned.trim();
  };

  // 5개의 데이터 저장소 (useEffect보다 먼저 선언)
  // Red, Yellow, Green Stack은 깔끔하게 정제된 단어 텍스트만 저장
  const [redStack, setRedStack] = useState<string[]>([]);
  const [yellowStack, setYellowStack] = useState<string[]>([]); // Learning words (Restored)
  const [greenStack, setGreenStack] = useState<string[]>([]); // Completed words
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
        if (data.personaInstructions) {
          setPersonaInstructions(data.personaInstructions);
          localStorage.setItem("signal_persona_instructions", JSON.stringify(data.personaInstructions));
        } else if (data.customPersona) {
          // Legacy migration
          const legacyInstruction: PersonaInstruction = {
            id: "legacy-" + Date.now(),
            content: data.customPersona,
            isActive: true
          };
          setPersonaInstructions([legacyInstruction]);
          localStorage.setItem("signal_persona_instructions", JSON.stringify([legacyInstruction]));
        }

        // [SAFETY] 빈 데이터가 내려왔을 때 로컬 백업 확인
        if (Object.keys(vocabData).length === 0) {
            const backupKey = `backup_vocab_${userId}`;
            const localBackup = localStorage.getItem(backupKey);
            if (localBackup) {
                const parsed = JSON.parse(localBackup);
                if (Object.keys(parsed).length > 0) {
                    console.log("DB returned empty, but found local backup. Restoring.");
                    setUserVocabulary(parsed);
                    toast.info("데이터베이스가 비어 있어 로컬 백업에서 복구했습니다.");
                    return;
                }
            }
        }

        const vocabulary: Record<string, VocabularyEntry> = {};
        // 기존 형식 (단순 status)을 새 형식으로 변환
        Object.keys(vocabData).forEach((word) => {
          const entry = vocabData[word];
          if (typeof entry === "string") {
            // 기존 형식: { word: "red" | "yellow" | "green" }
            vocabulary[word] = {
              status: entry as any,
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

        // Data Cleanup
        const cleaned: Record<string, VocabularyEntry> = {};
        Object.entries(vocabulary).forEach(([word, entry]) => {
          if (!/^\d{10,}-/.test(word) && word.length <= 50) {
            cleaned[word] = entry;
          }
        });

        setUserVocabulary(cleaned);
      } else {
        // [SAFETY] 문서가 없으면 로컬 백업 확인
        const backupKey = `backup_vocab_${userId}`;
        const localBackup = localStorage.getItem(backupKey);
        if (localBackup) {
            const parsed = JSON.parse(localBackup);
            setUserVocabulary(parsed);
            toast.info("이전 사용 기록을 로컬에서 복구했습니다.");
        } else {
            setUserVocabulary({});
        }
      }
    } catch (error: any) {
      console.error("단어장 불러오기 실패:", error);
      // [SAFETY] 실패 시 로컬 백업 확인
      const backupKey = `backup_vocab_${userId}`;
      const localBackup = localStorage.getItem(backupKey);
      if (localBackup) {
          const parsed = JSON.parse(localBackup);
          setUserVocabulary(parsed);
          toast.error("데이터베이스 연결 실패로 로컬 데이터를 불러왔습니다.");
      } else {
          setUserVocabulary({});
      }
    }
  };


  // Firestore에 단어장 저장 (즉시 저장 - Debounce 제거)
  // Debounce가 있으면 로컬 상태가 변경된 후(Red), 아직 저장되지 않은 시점에
  // onSnapshot이 서버의 이전 상태(White)를 가져와서 덮어쓰는 "Red -> White" 현상 발생
  const saveVocabularyToDB = async (userId: string, vocabData: Record<string, VocabularyEntry>) => {
    // [SAFETY] Block empty saves unless deliberateResetRef is true
    const isEmpty = Object.keys(vocabData).length === 0;
    if (isEmpty && !deliberateResetRef.current) {
        console.warn("Attempted to save empty vocabulary to DB - BLOCKED for safety.");
        return;
    }

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

      await updateDoc(userRef, {
        vocabulary: cleanedVocabData,
        updatedAt: new Date(),
      });
      
      // Reset the flag after successful deliberate save
      if (deliberateResetRef.current) {
          deliberateResetRef.current = false;
      }
    } catch (error: any) {
      console.error("단어장 저장 계획 수정:", error);
      toast.error("단어장 저장에 재시도했습니다.");
    }
  };


  // Onboarding
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isOnboardingEditing, setIsOnboardingEditing] = useState(false); // Track if we are editing or doing initial setup


  // Check if onboarding is needed on load
  useEffect(() => {
    if (!loading && user && (!nativeLang || !targetLang)) {
       setShowOnboarding(true);
       setIsOnboardingEditing(false); // Initial setup
    }
  }, [loading, user]);

  // New handler for onboarding completion
  const handleOnboardingComplete = async (native: string, target: string, contentType: string) => {
    setNativeLang(native);
    setTargetLang(target);
    await saveLanguageSettings(native, target); // Use the existing saveLanguageSettings

    // 모드 설정 저장
    const mode = contentType === 'toeic' ? 'language' : 'knowledge';
    saveLearningMode(mode);

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
    setShowOnboarding(false); // Close onboarding after completion
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

  // Firestore에 단어 하나만 업데이트 (Atomic)
  const saveWordToDB = async (userId: string, wordKey: string, entry: VocabularyEntry) => {
    try {
      const userRef = doc(db, "users", userId);
      // undefined 값 필터링
      const cleanedEntry: any = {};
      Object.entries(entry).forEach(([key, value]) => {
        if (value !== undefined) cleanedEntry[key] = value;
      });

      // Atomic Update: Update ONLY the specific word field within vocabulary
      await updateDoc(userRef, {
        [`vocabulary.${wordKey}`]: cleanedEntry,
        updatedAt: new Date(),
      });
    } catch (error) {
      console.error("Atomic save failed:", error);
    }
  };

  // Firestore에서 단어 삭제 (Atomic)
  const deleteWordFromDB = async (userId: string, wordKey: string) => {
    try {
      const userRef = doc(db, "users", userId);
      await updateDoc(userRef, {
        [`vocabulary.${wordKey}`]: deleteField(),
        updatedAt: new Date(),
      });
    } catch (error) {
      console.error("Atomic delete failed:", error);
    }
  };




  // 스택을 Firebase에 저장 (개별 필드 저장으로 변경하여 Race Condition 방지)



  // Red Stack 저장
  useEffect(() => {
    if (!isDataLoaded || !user) return;
    if (JSON.stringify(redStack) === JSON.stringify(lastLoadedRed.current)) return;
    saveUserStackField(user.uid, "red", redStack);
  }, [redStack, user, isDataLoaded]);

  // Yellow Stack 저장 (Restored)
  useEffect(() => {
    if (!isDataLoaded || !user) return;
    if (JSON.stringify(yellowStack) === JSON.stringify(lastLoadedYellow.current)) return;
    saveUserStackField(user.uid, "yellow", yellowStack);
  }, [yellowStack, user, isDataLoaded]);

  // Green Stack 저장 (Restored explicit save if needed, or rely on derived)
  // For now, restoring explicit save to match pattern, although derived is better.
  // Re-enabling explicit save for consistency with other stacks for now.
  useEffect(() => {
    if (!isDataLoaded || !user) return;
    if (JSON.stringify(greenStack) === JSON.stringify(lastLoadedGreen.current)) return;
    saveUserStackField(user.uid, "green", greenStack);
  }, [greenStack, user, isDataLoaded]);

  // Important Stack save removed

  // Sentence Stack 저장
  useEffect(() => {
    if (!isDataLoaded || !user) return;
    if (JSON.stringify(sentenceStack) === JSON.stringify(lastLoadedSentence.current)) return;
    console.log('💾 문장 보관소 저장:', sentenceStack.length);
    saveUserStackField(user.uid, "sentences", sentenceStack);
  }, [sentenceStack, user, isDataLoaded]);

  // Ref to track if the update came from Firebase (to prevent basic infinite loops)
  const isRemoteUpdate = useRef(false);

  // 대화를 Firebase에 저장
  useEffect(() => {
    if (!isDataLoaded || !user) {
      console.log("[ConvSave] Skip: not loaded or no user");
      return;
    }

    // Firebase에서 온 업데이트라면 저장하지 않음 (루프 방지)
    if (isRemoteUpdate.current) {
      console.log("[ConvSave] Skip: isRemoteUpdate");
      isRemoteUpdate.current = false;
      return;
    }

    // Prevent Echo Save (Loop) - Ref check fallback
    if (JSON.stringify(conversations) === JSON.stringify(lastLoadedConvs.current)) {
      console.log("[ConvSave] Skip: no change");
      return;
    }

    console.log("[ConvSave] Saving conversations:", conversations.length, "items");

    if (conversations.length > 0) {
      // Small delay to allow multiple state updates to settle if needed
      const timeout = setTimeout(() => {
          console.log("[ConvSave] Executing save...");
          saveUserConversations(user.uid, conversations)
            .then(result => console.log("[ConvSave] Save result:", result))
            .catch(err => console.error("[ConvSave] Save error:", err));
      }, 500);
      return () => clearTimeout(timeout);
    }
  }, [conversations, user, isDataLoaded]); 

  // Local Storage Backup Effect
  useEffect(() => {
    if (!user || Object.keys(userVocabulary).length === 0) return;
    const key = `backup_vocab_${user.uid}`;
    try {
        localStorage.setItem(key, JSON.stringify(userVocabulary));
    } catch (e) {
        console.error("Local backup failed", e);
    }
  }, [userVocabulary, user]);

  // Restore Helper
  const restoreFromLocal = () => {
      if (!user) return;
      try {
          const key = `backup_vocab_${user.uid}`;
          const saved = localStorage.getItem(key);
          if (saved) {
              const parsed = JSON.parse(saved);
              setUserVocabulary(parsed);
              
              // Re-derive stacks from local data
              const derive = (status: string) => Object.entries(parsed)
                  .filter(([_, entry]: any) => entry.status === status)
                  .map(([word, _]) => word);
              
              setRedStack(derive('red'));
              setYellowStack(derive('yellow')); // Restored
              setGreenStack(derive('green')); // Restored
              // setImportantStack via filter if needed, but red is most critical
              
              toast.success("서버 연결 실패로 로컬 데이터를 복구했습니다.");
          }
      } catch (e) {
          console.error("Restore failed", e);
      }
  };



  // Real-time Firestore Sync
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const userRef = doc(db, "users", user.uid);

    const unsubscribe = onSnapshot(userRef, (snapshot) => {
      // 로컬 변경사항이 반영되는 동안은 스냅샷 무시 (UI 반응성 유지)
      if (snapshot.metadata.hasPendingWrites) return;

      if (!snapshot.exists()) {
        // [SAFETY] 문서가 삭제되거나 없는 경우: 로컬 데이터가 있으면 즉시 지우지 않고 경고
        if (Object.keys(lastLoadedVocab.current || {}).length > 0 && !deliberateResetRef.current) {
            console.warn("Snapshot: Document disappeared, but local data exists. Blocking reset.");
            return;
        }
        setUserVocabulary({});
        
        // Ensure at least one room exists locally if server is empty
        setConversations(prev => {
            if (prev.length > 0) return prev;
            return [{
                id: "1",
                title: "새로운 대화",
                messages: [],
                timestamp: new Date(),
            }];
        });
        if (!currentConversationId) setCurrentConversationId("1");

        setIsDataLoaded(true);
        setLoading(false);
        return;
      }

      const data = snapshot.data();
      const dbVocab = data.vocabulary || {};
      const stacks = data.stacks || {};

      // Profile settings synchronization
      if (data.nativeLang) setNativeLang(data.nativeLang);
      if (data.targetLang) setTargetLang(data.targetLang);
      if (data.personaInstructions) {
        setPersonaInstructions(data.personaInstructions);
        localStorage.setItem("signal_persona_instructions", JSON.stringify(data.personaInstructions));
      }

      // [SAFETY] DB 데이터가 비어있는 경우: 로컬에 데이터가 있다면 함부로 덮어쓰지 않음
      if (Object.keys(dbVocab).length === 0 && Object.keys(lastLoadedVocab.current || {}).length > 0 && !deliberateResetRef.current) {
          console.warn("Snapshot: DB vocabulary is empty, but local has data. Blocking overwrite.");
          return;
      }

      const mergedVocab: Record<string, VocabularyEntry> = {};

      // 1. Load DB Vocab
      Object.entries(dbVocab).forEach(([key, value]: [string, any]) => {
        const wordKey = key.toLowerCase();
        const meaning = typeof value === 'string' ? "" : (value.koreanMeaning || "");
        const category = typeof value === 'string' ? undefined : value.category;
        const status = (['red', 'yellow', 'green', 'orange'].includes(value.status)) ? value.status : 'white';
        mergedVocab[wordKey] = { status, koreanMeaning: meaning, category };
      });

      // 2. Merge Stacks Logic
      const process = (list: any[], status: any) => {
        (list || []).forEach(item => {
          const wordText = typeof item === 'string' ? item : item.word;
          if (!wordText || typeof wordText !== 'string') return;
          if (/^\d{10,}/.test(wordText) || wordText.length > 50) return;

          let clean = "";
          if (wordText && wordText.includes(' ')) {
            clean = cleanMarkdown(wordText).trim();
            if (clean.split(' ').length > 4) return;
          } else {
            clean = extractCleanWord(wordText);
          }
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

      setUserVocabulary(mergedVocab);
      lastLoadedVocab.current = mergedVocab;

      // 3. Derived Stacks
      const deriveStack = (status: string) => {
        return Object.entries(mergedVocab)
          .filter(([_, entry]) => entry.status === status)
          .map(([word, _]) => word);
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

      if (Array.isArray(stacks.sentences)) {
        setSentenceStack(stacks.sentences);
        lastLoadedSentence.current = stacks.sentences;
      }

      // 4. Conversations Sync
      const rawConvs = data.conversations || [];
      const loadedConvs = rawConvs.map((conv: any) => ({
        ...conv,
        timestamp: conv.timestamp?.toDate ? conv.timestamp.toDate() : new Date(conv.timestamp),
        messages: (conv.messages || []).map((msg: any) => ({
          ...msg,
          timestamp: msg.timestamp?.toDate ? msg.timestamp.toDate() : new Date(msg.timestamp),
        }))
      }));

      setConversations(prev => {
        const serverMap = new Map(loadedConvs.map((c: any) => [c.id, c]));
        const localIds = new Set(prev.map(c => c.id));

        const merged = prev.map((localConv: Conversation) => {
            const serverConv = serverMap.get(localConv.id) as any;
            if (!serverConv) return localConv;
            if (localConv.messages.length > (serverConv.messages?.length || 0)) return localConv;
            return serverConv;
        });

        const newFromServer = loadedConvs.filter((c: any) => !localIds.has(c.id));
        // Only mark as remote update if there's actual data from server
        if (loadedConvs.length > 0) {
          isRemoteUpdate.current = true;
        }
        return [...merged, ...newFromServer].sort((a: any, b: any) => b.timestamp.getTime() - a.timestamp.getTime());
      });
      lastLoadedConvs.current = loadedConvs;

      if (loadedConvs.length > 0) {
        if (!currentConversationId || currentConversationId === "1") {
            setCurrentConversationId(loadedConvs[0].id);
        }
      } else {
        setConversations(prev => {
           if (prev.length > 0) return prev;
           return [{
              id: "1",
              title: "새로운 대화",
              messages: [],
              timestamp: new Date(),
           }];
        });
        if (!currentConversationId) setCurrentConversationId("1");
      }

      setIsDataLoaded(true);
      setLoading(false);
    }, (error) => {
      console.error("Firestore Snapshot Error:", error);
      restoreFromLocal();
      setLoading(false);
      setIsDataLoaded(true);
    });

    return () => unsubscribe();
  }, [user?.uid]);

  // [CLEANUP] Single-source truth purification & dirty data removal
  useEffect(() => {
    if (!isDataLoaded || !user) return;
    
    // 이펙트는 세션당 한 번만 수행하도록 체크 (또는 데이터 변경 시 정밀 수행)
    const runCleanup = async () => {
        let hasChanges = false;
        const newVocab = { ...userVocabulary };
        const newSentences = [...sentenceStack];

        Object.entries(newVocab).forEach(([key, entry]) => {
            // 1. 기술적 ID 거르기
            const isTechnicalId = /^\d{10,}/.test(key) || /^[0-9a-f]{8,}-[0-9a-f]{4,}/.test(key);
            
            // 2. 너무 긴 문장이 단어장에 들어있는 경우
            const isSentence = key.split(' ').length > 5 || key.length > 60;

            if (isTechnicalId || isSentence) {
                console.log(`[Purify] Removing dirty entry: ${key}`);
                
                // 만약 문장이라면 문장 보관소로 이동 (중복 체크)
                if (isSentence && !isTechnicalId && !newSentences.includes(key)) {
                    newSentences.push(key);
                }
                
                delete newVocab[key];
                hasChanges = true;
                
                // Firestore에서도 즉시 삭제 (Atomic)
                deleteWordFromDB(user.uid, key);
            }
        });

        if (hasChanges) {
            setUserVocabulary(newVocab);
            setSentenceStack(newSentences);
            saveUserStackField(user.uid, "sentences", newSentences);
            toast.info("단어장이 정제되었습니다. (기술 데이터 제거)");
        }
    };

    // 로딩 완료 후 2초 뒤에 백그라운드에서 한 번 수행
    const timer = setTimeout(runCleanup, 2000);
    return () => clearTimeout(timer);
  }, [isDataLoaded, user?.uid]);

  // Firebase 인증 상태 감지 및 단어장 동기화
  useEffect(() => {
    const unsubscribe = onAuthStateChange((currentUser) => {
      setUser(currentUser);

      // Loading is handled differently: 
      // If user exists, keep loading until onSnapshot fires
      // If no user, stop loading immediately

      if (currentUser) {
        // 로그인 시: 사용자 변경만 처리, 데이터 로딩은 useEffect가 담당
      } else {
        // 로그아웃 시: 모든 데이터 초기화
        setLoading(false); // Stop loading immediately if no user
        setIsDataLoaded(false); // 로딩 상태 초기화
        setUserVocabulary({});
        setRedStack([]);
        setYellowStack([]); // Restored
        setGreenStack([]); // Restored
        setSentenceStack([]);
        setConversations([]);
        setCurrentConversationId("");
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



  const handleSendMessage = async (content: string, images?: string[]): Promise<string | void> => {
    if (!content.trim() && (!images || images.length === 0)) return;

    let targetConversationId = currentConversationId;
    let isNewConversation = false;

    // 만약 현재 선택된 대화가 없거나(초기 상태), 대화 목록에 없다면 새 ID 생성
    if (!currentConversation) {
      targetConversationId = Date.now().toString();
      isNewConversation = true;
      setCurrentConversationId(targetConversationId);
    }

    // Check for predefined system answers (Bypass API)
    const systemRecommendation = eternalSystemDefaults.recommendations.find(
      r => r.question.trim() === content.trim()
    );

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content,
      timestamp: new Date(),
      images
    };

    if (systemRecommendation) {
      const systemMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: systemRecommendation.answer,
        timestamp: new Date(),
      };

      setConversations((prev) => {
        const existing = prev.find(c => c.id === targetConversationId);
        if (existing) {
          return prev.map((conv) =>
            conv.id === targetConversationId
              ? {
                  ...conv,
                  messages: [...conv.messages, userMessage, systemMessage],
                  title: conv.messages.length === 0
                      ? content.slice(0, 30) + (content.length > 30 ? "..." : "")
                      : conv.title,
                }
              : conv
          );
        } else {
          // 새 대화 생성
          const newConv: Conversation = {
            id: targetConversationId,
            title: content.slice(0, 30) + (content.length > 30 ? "..." : ""),
            messages: [userMessage, systemMessage],
            timestamp: new Date(),
          };
          // 새 대화는 보통 목록의 맨 앞에 추가
          return [newConv, ...prev];
        }
      });
      
      return systemRecommendation.answer;
    }

    // 사용자 메시지 추가 (API 호출 전)
    setConversations((prev) => {
      const existing = prev.find(c => c.id === targetConversationId);
      if (existing) {
        return prev.map((conv) =>
          conv.id === targetConversationId
            ? {
              ...conv,
              messages: [...conv.messages, userMessage],
              title: conv.messages.length === 0
                  ? content.slice(0, 30) + (content.length > 30 ? "..." : "")
                  : conv.title,
            }
            : conv
        );
      } else {
        const newConv: Conversation = {
          id: targetConversationId,
          title: content.slice(0, 30) + (content.length > 30 ? "..." : ""),
          messages: [userMessage],
          timestamp: new Date(),
        };
        return [newConv, ...prev];
      }
    });

    // AI 응답 받기
    setIsTyping(true);

    try {
      // 현재 대화의 모든 메시지를 Gemini 형식으로 변환
      // 주의: currentConversation 변수는 stale 할 수 있으므로, conversations state에서 찾거나
      // isNewConversation 플래그를 이용해 판단.
      let historyMessages: Message[] = [];
      if (isNewConversation) {
        historyMessages = [];
      } else if (currentConversation) {
        historyMessages = currentConversation.messages;
      }
      
      const allMessages = [...historyMessages, userMessage];

      // 에러 메시지("죄송합니다. 응답을 생성하는 중 오류가 발생했습니다...")는 AI 문맥에 포함시키지 않음
      const geminiMessages: GeminiChatMessage[] = allMessages
        .filter(msg => !msg.content.startsWith("죄송합니다. 응답을 생성하는 중 오류가 발생했습니다"))
        .map((msg) => ({
          role: msg.role,
          content: msg.content,
          images: msg.images // 이미지 전달
        }));

      const activePersonaPrompt = personaInstructions
        .filter(p => p.isActive)
        .map(p => p.content)
        .join("\n");

      const aiResponse = await sendMessageToGemini(
        geminiMessages,
        nativeLang,
        targetLang || "en", // Default to English if null
        activePersonaPrompt
      );



      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: aiResponse,
        timestamp: new Date(),
      };

      setConversations((prev) => {
        const updated = prev.map((conv) =>
          conv.id === targetConversationId
            ? { ...conv, messages: [...conv.messages, aiMessage] }
            : conv
        );
        // [MOD] If it's a new conversation, save immediately for better persistence
        if (isNewConversation && user) {
            saveUserConversations(user.uid, updated).catch(console.error);
        }
        return updated;
      });
      
      // Auto TTS if enabled
      if (isAutoTTS) {
          speak(aiResponse, nativeLang === 'ko' ? 'ko-KR' : 'en-US');
      }
      
      return aiResponse; // AI 응답 반환


    } catch (error) {
      console.error("AI 응답 오류:", error);
      const errorMessageText = "죄송합니다. 응답을 생성하는 중 오류가 발생했습니다. API 키가 올바르게 설정되어 있는지 확인해주세요.";
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: errorMessageText,
        timestamp: new Date(),
      };

      setConversations((prev) =>
        prev.map((conv) =>
          conv.id === targetConversationId
            ? { ...conv, messages: [...conv.messages, errorMessage] }
            : conv
        )
      );
      
      return errorMessageText; // 에러 메시지 반환
    } finally {
      setIsTyping(false);
    }
  };

  const handleNewConversation = () => {
    // Prevent duplicate empty conversations
    if (conversations.length > 0 && conversations[0].messages.length === 0) {
      setCurrentConversationId(conversations[0].id);
      navigate(`/chat/${conversations[0].id}`);
      return;
    }

    const newConversation: Conversation = {
      id: Date.now().toString(),
      title: "새로운 대화",
      messages: [],
      timestamp: new Date(),
    };
    setConversations((prev) => [newConversation, ...prev]);
    setCurrentConversationId(newConversation.id);
    navigate(`/chat/${newConversation.id}`);
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

  const handleRenameConversation = (id: string, newTitle: string) => {
    setConversations((prev) =>
      prev.map((conv) => (conv.id === id ? { ...conv, title: newTitle } : conv))
    );
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
    // 1. Validate Input
    const word = wordParam || wordOrId;
    if (!word) return;

    // 2. Limit Removed as requested
    // if (newStatus === 'red' && !isReturningToRed) {
    //   if (redStack.length >= 15) { ... }
    // }

    try {
      let cleanWord = word.trim();
      let wordKey = cleanWord.toLowerCase();

      // ID Parsing Logic
      if (/^\d{10,}-\d+-.+/.test(word)) {
        const match = word.match(/^\d{10,}-\d+-(.+)$/);
        if (match && match[1]) {
          cleanWord = match[1].trim();
          wordKey = cleanWord.toLowerCase();
        }
      } else {

        // Fix: If wordParam is provided (explicitly passed phrase), use it directly without extraction
        // This prevents "Complex System" from being parsed as "Complex" if extractCleanWord is called by mistake
        const isPhrase = cleanWord.includes(' ');
        
        // wordParam이 있거나 구문인 경우 extractCleanWord 스킵
        if (wordParam || isPhrase) {
           // Keep cleanWord as is (just trimmed)
        } else if (!userVocabulary[wordKey]) {
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

      // Capture previous state
      const prevEntry = userVocabulary[wordKey] as any;
      const prevMeaning = prevEntry?.koreanMeaning || koreanMeaningParam || "";
      const prevStatus = prevEntry?.status;

      // Optimistic Entry
      // Use 'as any' to avoid rigid type checks during quick fix
      const optimisticEntry: any = {
        status: newStatus,
        koreanMeaning: prevMeaning,
        category: prevEntry?.category || "general",
        timestamp: Date.now(),
        count: (prevEntry?.count || 0) + 1,
        originalWord: cleanWord,
        context: {
          sentence: sentence || prevEntry?.context?.sentence || "",
          messageId: messageId || prevEntry?.context?.messageId || "",
        },
        meaning: prevMeaning
      };

      // 3. Update State & DB (Atomic)
      setUserVocabulary((prev) => {
        const updated = { ...prev, [wordKey]: optimisticEntry };
        
        if (user) {
          saveWordToDB(user.uid, wordKey, optimisticEntry);
        }
        return updated;
      });


      // 4. Update Derived Stacks
      if (newStatus !== prevStatus) {
        // Red Stack
        setRedStack(prev => {
             const filtered = prev.filter(w => w !== wordKey);
             return newStatus === "red" ? [...filtered, wordKey] : filtered;
        });

        // Yellow Stack (Processing words)
        setYellowStack(prev => {
             const filtered = prev.filter(w => w !== wordKey);
             return newStatus === "yellow" ? [...filtered, wordKey] : filtered;
        });
        
        // Green Stack (Completed words)
        setGreenStack(prev => {
             const filtered = prev.filter(w => w !== wordKey);
             return newStatus === "green" ? [...filtered, wordKey] : filtered;
        });
      }

      // 5. Generate Translation/Meaning if missing (Async)
      if (!prevMeaning && (newStatus === 'red' || newStatus === 'orange')) {
        getKoreanMeaning(cleanWord)
          .then((meaning) => {
            if (meaning) {
              setUserVocabulary((prev) => {
                const currentEntry = prev[wordKey];
                if (!currentEntry) return prev;

                const updatedEntry = {
                  ...currentEntry,
                  koreanMeaning: meaning,
                  meaning: meaning
                };

                const newVocab = { ...prev, [wordKey]: updatedEntry };
                if (user) {
                  saveWordToDB(user.uid, wordKey, updatedEntry);
                }
                return newVocab;
              });
            }
          })
          .catch((err) => console.error("Meaning fetch error:", err));
      }

    } catch (error) {
      console.error("Critical Error in handleUpdateWordStatus:", error);
      toast.error("단어 저장 중 오류가 발생했습니다.");
    }
  }, [user, userVocabulary, redStack]);

  // 단어 상태 초기화 핸들러 (White/Default로 복원)
  const handleResetWordStatus = (word: string) => {
    const wordKey = word.toLowerCase().trim();
    if (!wordKey || wordKey.length < 2) return;

    setUserVocabulary((prev) => {
      const updated = { ...prev };
      delete updated[wordKey];
      if (user) deleteWordFromDB(user.uid, wordKey);
      return updated;
    });


    setRedStack(prev => prev.filter(w => w !== wordKey));
    setYellowStack(prev => prev.filter(w => w !== wordKey));
    setGreenStack(prev => prev.filter(w => w !== wordKey));
  };

  // Track words that failed to fetch meaning in current session to avoid infinite retries
  const failedMeaningFetches = useRef<Set<string>>(new Set());

  // Missing Meanings Sync (Background)
  useEffect(() => {
    if (!isDataLoaded || !user) return;

    // Find all red/orange words with no meaning, excluding those that already failed
    const missingMeaningWords = Object.entries(userVocabulary)
      .filter(([wordKey, entry]) => 
        (entry.status === 'red' || entry.status === 'orange') && 
        !entry.koreanMeaning && 
        !failedMeaningFetches.current.has(wordKey)
      )
      .map(([wordKey, _]) => wordKey);

    if (missingMeaningWords.length === 0) return;

    const fetchNextMissing = async () => {
       const wordKey = missingMeaningWords[0];
       try {
          const meaning = await getKoreanMeaning(wordKey);
          if (meaning) {
             setUserVocabulary(prev => {
                const entry = prev[wordKey];
                if (!entry) return prev;
                const updated = { ...entry, koreanMeaning: meaning, meaning: meaning };
                if (user) saveWordToDB(user.uid, wordKey, updated);
                return { ...prev, [wordKey]: updated };
             });

          } else {
             // If meaning is empty, mark as failed for this session
             failedMeaningFetches.current.add(wordKey);
          }
       } catch (e) {
          console.error(`Background sync failed for ${wordKey}`, e);
          // Mark as failed for this session to avoid hammering the API
          failedMeaningFetches.current.add(wordKey);
       }
    };

    const timer = setTimeout(fetchNextMissing, 3000); // Process one every 3 seconds while missing exist
    return () => clearTimeout(timer);
  }, [isDataLoaded, user?.uid, userVocabulary]); 

  // Crystallized Entity: 단어 합치기 핸들러
  const handleMergeWords = useCallback((words: string[]) => {
    if (!words || words.length < 2) return;
    
    // 합쳐진 단어 생성 (띄어쓰기로 연결)
    const mergedWord = words.join(' ');
    const mergedWordKey = mergedWord.toLowerCase();
    
    // 기존 단어들을 vocabulary에서 의미 가져오기
    const meanings = words.map(w => {
      const entry = userVocabulary[w.toLowerCase()];
      return entry?.koreanMeaning || '';
    }).filter(Boolean);
    const mergedMeaning = meanings.join(' ');
    
    // 새로운 합쳐진 단어를 vocabulary에 추가
    // 4. Update State & DB (Atomic)
    setUserVocabulary(prev => {
      const entry: VocabularyEntry = {
        word: mergedWord,
        status: 'red',
        koreanMeaning: mergedMeaning,
        linkedConcept: true,
        linkedFrom: words,
        lastUpdated: new Date().toISOString()
      };
      
      const updated = { ...prev, [mergedWordKey]: entry };
      
      if (user) {
        // Save the new merged phrase
        saveWordToDB(user.uid, mergedWordKey, entry);
        
        // Update linked words (Atomic one by one)
        words.forEach(w => {
           const key = w.toLowerCase();
           if (prev[key]) {
              saveWordToDB(user.uid, key, { ...prev[key], linkedTo: mergedWordKey });
           }
        });
      }
      return updated;
    });

    
    // 합쳐진 단어를 Red Stack에 추가하고 기존 단어들은 제거
    setRedStack(prev => {
      // 기존 단어들 제거
      const filtered = prev.filter(w => !words.map(x => x.toLowerCase()).includes(w.toLowerCase()));
      // 합쳐진 단어 추가
      if (filtered.includes(mergedWordKey)) return filtered;
      return [...filtered, mergedWordKey];
    });
    
    toast.success(`✨ "${mergedWord}" 결정체 생성 완료!`);
  }, [user, userVocabulary]);

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

  // handleSaveImportant removed

  // Message Translation Persistence Handler
  const handleUpdateTranslation = useCallback((messageId: string, translation: string) => {
      setConversations(prev => {
          const newConversations = prev.map(conv => {
              const msgIndex = conv.messages.findIndex(m => m.id === messageId);
              if (msgIndex !== -1) {
                  const newMessages = [...conv.messages];
                  newMessages[msgIndex] = { ...newMessages[msgIndex], translation };
                  return { ...conv, messages: newMessages };
              }
              return conv;
          });

          // Save to Firestore if found
          if (user && newConversations !== prev) {
             const userRef = doc(db, "users", user.uid);
             
             // Sanitize messages: Firestore doesn't accept 'undefined', must be 'null'
             const sanitizedConversations = newConversations.map(conv => ({
                ...conv,
                messages: conv.messages.map(msg => ({
                   ...msg,
                   images: msg.images ?? null,
                   translation: msg.translation ?? null
                }))
             }));

             updateDoc(userRef, { 
                conversations: sanitizedConversations,
                updatedAt: new Date()
             }).catch(err => 
                console.error("Translation persistence failed:", err)
             );
          }
          
          return newConversations;
      });
  }, [user]);

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
        // [SAFETY] Set deliberate flag before saving empty state
        deliberateResetRef.current = true;

        const userRef = doc(db, "users", user.uid);
        // DB에서 vocabulary를 통째로 {}로 미는 것은 '초기화'의 예외적 상황으로 유지
        // (필수적인 기능이므로 deliberateResetRef로 보호)
        await updateDoc(userRef, {
          vocabulary: {},
          stacks: {
            red: [],
            sentences: []
          },
          updatedAt: new Date()
        });
      }

      // 로컬 상태 초기화
      setUserVocabulary({});
      setRedStack([]);
      setSentenceStack([]);

      toast.success("모든 단어 데이터가 초기화되었습니다.");
    } catch (error) {
      console.error("데이터 초기화 실패:", error);
      toast.error("데이터 초기화에 실패했습니다.");
      deliberateResetRef.current = false;
    }
  };

  // 언어 설정 초기화 핸들러
  const handleResetLanguage = () => {
    setShowResetConfirm(true);
  };

  // 페르소나 지침 업데이트 핸들러
  const handleUpdatePersonaInstructions = async (newInstructions: PersonaInstruction[]) => {
    setPersonaInstructions(newInstructions);
    localStorage.setItem("signal_persona_instructions", JSON.stringify(newInstructions));
    if (user) {
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        personaInstructions: newInstructions,
        updatedAt: new Date()
      });
    }
    toast.success("AI 페르소나 지침이 업데이트되었습니다.");
  };


  const handleLogout = async () => {
    await logout();
    setUser(null);
    setUserVocabulary({});
    setRedStack([]);
    // yellow/green removed
    setSentenceStack([]);
    setConversations([]);
    setCurrentConversationId("");
    // setShowOnboarding(true); // 필요 시 주석 해제
  };

  return (
    <>
      <Toaster position="top-center" richColors />


      {/* Onboarding Modal - Show if needed OR if editing */}
      <OnboardingModal 
          isOpen={showOnboarding}
          onComplete={handleOnboardingComplete}
          onLogout={!isOnboardingEditing ? handleLogout : undefined} // Only show logout if initial setup
          onClose={isOnboardingEditing ? () => {
              setShowOnboarding(false);
              setIsOnboardingEditing(false);
          } : undefined} // Only show close if editing
      />

      {/* TutorialModal removed as component is missing */}

      {/* Custom Reset Confirm Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-[400px] bg-[#1e1f20] border border-[#27272a] rounded-2xl shadow-2xl p-6 animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-semibold text-white mb-3">학습 모드 재설정</h3>
            <p className="text-sm text-zinc-400 mb-6 leading-relaxed">
              학습 모드를 다시 설정하시겠습니까?<br />
              설정 화면으로 이동하기 위해 앱이 새로고침됩니다.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors rounded-lg"
              >
                취소
              </button>
              <button
                onClick={() => {
                  localStorage.removeItem("signal_native_lang");
                  localStorage.removeItem("signal_target_lang");
                  localStorage.removeItem("signal_learning_mode");
                  window.location.reload();
                }}
                className="px-4 py-2 text-sm font-medium text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 transition-colors rounded-lg"
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex h-[100dvh] bg-[#1e1f20] text-[#E3E3E3] font-sans overflow-hidden relative">

        {/* Sidebar - participates in flex layout on desktop */}
        <Sidebar
          conversations={conversations}
          currentConversationId={currentConversationId}
          onSelectConversation={handleSelectConversation}
          onNewConversation={handleNewConversation}
          onDeleteConversation={handleDeleteConversation}
          onRenameConversation={handleRenameConversation}
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          onToggle={() => setIsSidebarOpen((prev) => !prev)}
          counts={{
            red: redStack.length,
            yellow: yellowStack.length,
            green: greenStack.length,
            sentence: sentenceStack.length,
          }}
          onLogout={handleLogout}
          onResetLanguage={handleResetLanguage}
          onResetVocabulary={handleResetVocabulary}
          vocabCount={Object.keys(userVocabulary).length}
          personaInstructions={personaInstructions}
          onUpdatePersonaInstructions={handleUpdatePersonaInstructions}
          onOpenLanguageSettings={() => {
            setShowOnboarding(true);
            setIsOnboardingEditing(true);
          }}
          learningMode={learningMode}
          isAutoTTS={isAutoTTS}
          onToggleAutoTTS={toggleAutoTTS}
          onOpenQuiz={() => setIsQuizOpen(true)}
          user={user}
        />

        <div className="flex-1 flex flex-col min-w-0 bg-[#1e1f20] relative transition-all duration-300 ease-in-out">
          <QuizModal 
            open={isQuizOpen} 
            onOpenChange={setIsQuizOpen} 
            userVocabulary={userVocabulary}
            toeicWordList={toeicWordList}
          />
          <Routes>
            <Route
              path="/"
              element={<Navigate to={`/chat/${currentConversationId}`} replace />}
            />
            <Route
              path="/chat/:id"
              element={
                <MainContent
                  nativeLang={nativeLang}
                  targetLang={targetLang}
 
                  currentConversation={currentConversation}
                  isTyping={isTyping}
                  onSendMessage={handleSendMessage}
                  isSidebarOpen={isSidebarOpen}
                  onToggleSidebar={() => setIsSidebarOpen(prev => !prev)}
                  user={user}
                  onLogout={handleLogout}
                  userVocabulary={userVocabulary}
                  onUpdateWordStatus={handleUpdateWordStatus}
                  onResetWordStatus={handleResetWordStatus}
                  onSaveSentence={handleSaveSentence}
                  learningMode={learningMode}
                  onUpdateTranslation={handleUpdateTranslation}
                  onNewConversation={handleNewConversation}
                />
              }
            />

            
            {/* Community Routes */}
            <Route 
              path="/community" 
              element={
                <CommunityFeed 
                  user={user} 
                  nativeLang={nativeLang}
                  targetLang={targetLang}
                  onToggleSidebar={() => setIsSidebarOpen(prev => !prev)}
                />
              } 
            />
            <Route 
              path="/community/post" 
              element={
                <CreatePostPage 
                  user={user} 
                  onSubmit={() => { /* Navigation handled by component or manually */ }}
                />
              } 
            />
            <Route 
              path="/community/edit/:postId" 
              element={<EditPostPage />} 
            />
            <Route 
              path="/profile/:userId" 
              element={<UserProfilePage user={user} />} 
            />
            
            <Route 
              path="/settings/instructions" 
              element={
                <InstructionPage 
                  personaInstructions={personaInstructions}
                  onUpdatePersonaInstructions={async (newInstructions) => {
                    setPersonaInstructions(newInstructions);
                    localStorage.setItem("signal_persona_instructions", JSON.stringify(newInstructions));
                    if (user) {
                      const userRef = doc(db, "users", user.uid);
                      await updateDoc(userRef, {
                        personaInstructions: newInstructions,
                        updatedAt: new Date()
                      });
                    }
                  }}
                />
              } 
            />

            
            <Route 
              path="/chat/global" 
              element={
                <GlobalChatRoom 
                  user={user}
                  userVocabulary={userVocabulary}
                  onUpdateWordStatus={handleUpdateWordStatus}
                  onResetWordStatus={handleResetWordStatus}
                  nativeLang={nativeLang}
                  setNativeLang={setNativeLang} 
                  targetLang={targetLang || "en"}
                  onSaveSentence={handleSaveSentence}
                />
              } 
            />
            
            <Route path="/dm/:userId" element={<DirectChat user={user} />} />
            
            <Route 
              path="/toeic-4000" 
              element={
                <ToeicWordList
                  userVocabulary={userVocabulary}
                  onUpdateWordStatus={handleUpdateWordStatus}
                  onGenerateStudyTips={handleGenerateStudyTips}
                  onLoadMore={handleLoadMoreToeicWords}
                  isLoading={isToeicLoading}
                  onToggleSidebar={() => setIsSidebarOpen(prev => !prev)}
                  onDeleteWord={handleResetWordStatus}
                />
              } 
            />

            {/* Stack Views */}
            <Route 
              path="/stack/red" 
              element={
                <StackView
                  title={learningMode === 'language' ? 'Word Room' : 'Red Room'}
                  color="#ef4444" 
                  items={redStack}
                  userVocabulary={userVocabulary}
                  onUpdateWordStatus={handleUpdateWordStatus}
                  onGenerateStudyTips={handleGenerateStudyTips}
                  onDeleteWord={handleResetWordStatus}
                  onToggleSidebar={() => setIsSidebarOpen(prev => !prev)}
                  learningMode={learningMode}
                  onMergeWords={handleMergeWords}
                />
              } 
            />
            <Route 
              path="/stack/yellow" 
              element={
                <StackView
                  title="Yellow Room"
                  color="#eab308" 
                  items={yellowStack}
                  userVocabulary={userVocabulary}
                  onUpdateWordStatus={handleUpdateWordStatus}
                  onGenerateStudyTips={handleGenerateStudyTips}
                  onDeleteWord={handleResetWordStatus}
                  onToggleSidebar={() => setIsSidebarOpen(prev => !prev)}
                  learningMode={learningMode}
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
                  userVocabulary={userVocabulary}
                  onUpdateWordStatus={handleUpdateWordStatus}
                  onGenerateStudyTips={handleGenerateStudyTips}
                  onDeleteWord={(sentence) => setSentenceStack(prev => prev.filter(s => s !== sentence))}
                  onToggleSidebar={() => setIsSidebarOpen(prev => !prev)}
                  learningMode={learningMode}
                />
              }
            />
            <Route
              path="/stack/green"
              element={
                <StackView
                  title="Green Room"
                  color="#22c55e"
                  items={greenStack}
                  userVocabulary={userVocabulary}
                  onUpdateWordStatus={handleUpdateWordStatus}
                  onGenerateStudyTips={handleGenerateStudyTips}
                  onDeleteWord={(word) => setGreenStack(prev => prev.filter(w => w !== word))}
                  onToggleSidebar={() => setIsSidebarOpen(prev => !prev)}
                  learningMode={learningMode}
                />
              }
            />
            {/* /stack/important deleted */}

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </div>
    </>
  );
}

