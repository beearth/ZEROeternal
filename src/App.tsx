import React, { useState, useEffect, useRef, useCallback } from "react";
import { Sidebar } from "./components/Sidebar";
import { StackView } from "./components/StackView";
import { Auth } from "./components/Auth";
import { OnboardingModal } from "./components/OnboardingModal";
import { MainContent } from "./components/MainContent";
import { ToeicWordList } from "./components/ToeicWordList";
import { Send, Menu } from "lucide-react";
import { CommunityFeed } from "./features/community/CommunityFeed";
import { CreatePostPage } from "./features/community/CreatePostPage";
import { EditPostPage } from "./features/community/EditPostPage";
import { DirectChat } from "./features/community/DirectChat";
import { GlobalChatRoom } from "./features/community/GlobalChatRoom";
import {
  sendMessageToGemini,
  ChatMessage as GeminiChatMessage,
  generateStudyTips,
  getKoreanMeaning,
  generateText,
} from "./services/gemini";
import { Toaster, toast } from "sonner";
import { onAuthStateChange, logout } from "./services/auth";
import { getUserStacks, saveUserStacks, getUserConversations, saveUserConversations } from "./services/userData";
import type { User as FirebaseUser } from "firebase/auth";
import { db } from "./firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

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



// ... (imports remain the same, remove unused ones if any)

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
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isTyping, setIsTyping] = useState(false);

  // 언어 상태
  const [nativeLang, setNativeLang] = useState("ko");
  const [targetLang, setTargetLang] = useState<string | null>(null);
  const [isToeicLoading, setIsToeicLoading] = useState(false);
  const [isDataLoaded, setIsDataLoaded] = useState(false); // 데이터 로딩 완료 여부

  // ... (existing code)



  const [userVocabulary, setUserVocabulary] = useState<
    Record<string, VocabularyEntry>
  >({});

  // Debounce를 위한 ref
  const saveVocabularyTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 초기 로드 플래그 (스택 재계산 방지)
  const isInitialLoad = useRef(true);

  // 마크다운 제거 함수 (단어 정제용)
  const cleanMarkdown = (text: string): string => {
    return text
      .replace(/\*\*/g, "") // ** 제거
      .replace(/\*/g, "") // * 제거
      .replace(/`/g, "") // 백틱 제거
      .replace(/#{1,6}\s/g, "") // 헤더 마크다운 제거
      .replace(/^-/g, "") // 리스트 마크다운 제거
      .replace(/^\d+\./g, "") // 번호 리스트 제거 (예: "1." 제거)
      .trim();
  };

  // 단어 텍스트만 추출 (마크다운 제거 + 공백/문장부호 제거)
  const extractCleanWord = (text: string): string => {
    const cleaned = cleanMarkdown(text);
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
            word.includes('/');

          const isTooLong = word.length > 40;

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

  // Firestore에 단어장 저장 (Debounce 적용)
  const saveVocabularyToDB = (userId: string, vocabData: Record<string, VocabularyEntry>) => {
    // 기존 타이머 취소
    if (saveVocabularyTimeoutRef.current) {
      clearTimeout(saveVocabularyTimeoutRef.current);
    }

    // 500ms 후 저장 (Debounce)
    saveVocabularyTimeoutRef.current = setTimeout(async () => {
      try {
        // undefined 값 제거 (Firestore는 undefined를 허용하지 않음)
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
        await setDoc(userRef, {
          vocabulary: cleanedVocabData,
          updatedAt: new Date(),
        }, { merge: true });

        console.log('✅ 단어장이 Firestore에 저장되었습니다.');
      } catch (error: any) {
        console.error("단어장 저장 실패:", error);
        toast.error("단어장 저장에 실패했습니다.");
      }
    }, 500);
  };

  // 언어 설정 저장
  const saveLanguageSettings = async (native: string, target: string) => {
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

  // 사용자 데이터 불러오기
  const loadUserData = async (userId: string) => {
    try {
      // 먼저 모든 데이터 초기화 (이전 사용자 데이터 제거)
      setUserVocabulary({});
      setRedStack([]);
      setYellowStack([]);
      setGreenStack([]);
      setImportantStack([]);
      setSentenceStack([]);

      // 단어장 불러오기 (새로운 함수 사용)
      await loadVocabularyFromDB(userId);

      // 스택 불러오기
      const stacksResult = await getUserStacks(userId);
      if (!stacksResult.error && stacksResult.stacks) {
        // Red, Yellow, Green Stack은 string[] 타입이므로 그대로 사용
        // 만약 기존 데이터가 WordData[] 형태라면 변환 필요
        const redData = stacksResult.stacks.red || [];
        const yellowData = stacksResult.stacks.yellow || [];
        const greenData = stacksResult.stacks.green || [];

        // WordData[] 형태인 경우 string[]로 변환
        setRedStack(Array.isArray(redData) && redData.length > 0 && typeof redData[0] === 'object'
          ? redData.map((w: any) => typeof w === 'string' ? w : extractCleanWord(w.word || w.text || ''))
          : redData);
        setYellowStack(Array.isArray(yellowData) && yellowData.length > 0 && typeof yellowData[0] === 'object'
          ? yellowData.map((w: any) => typeof w === 'string' ? w : extractCleanWord(w.word || w.text || ''))
          : yellowData);
        setGreenStack(Array.isArray(greenData) && greenData.length > 0 && typeof greenData[0] === 'object'
          ? greenData.map((w: any) => typeof w === 'string' ? w : extractCleanWord(w.word || w.text || ''))
          : greenData);

        setImportantStack(stacksResult.stacks.important || []);
        setSentenceStack(stacksResult.stacks.sentences || []);
      }

      // 대화 불러오기
      const convResult = await getUserConversations(userId);
      if (!convResult.error && convResult.conversations.length > 0) {
        // Firestore에서 불러온 데이터를 Conversation 형식으로 변환
        const loadedConversations = convResult.conversations.map((conv: any) => ({
          ...conv,
          timestamp: conv.timestamp?.toDate ? conv.timestamp.toDate() : new Date(conv.timestamp),
          messages: conv.messages.map((msg: any) => ({
            ...msg,
            timestamp: msg.timestamp?.toDate ? msg.timestamp.toDate() : new Date(msg.timestamp),
          })),
        }));
        setConversations(loadedConversations);
        if (loadedConversations.length > 0) {
          setCurrentConversationId(loadedConversations[0].id);
        }
      }
    } catch (error) {
      console.error("사용자 데이터 로딩 실패:", error);
      toast.error("데이터를 불러오는 중 오류가 발생했습니다.");
    } finally {
      // 모든 데이터 로딩 완료 (성공하든 실패하든)
      setIsDataLoaded(true);
      console.log("✅ 모든 사용자 데이터 로딩 완료");
    }
  };

  // 전역 단어장을 Firebase에 저장 (사용자별로, Debounce 적용)
  const hasLoadedInitialData = useRef(false);

  useEffect(() => {
    // 데이터 로딩이 완료되지 않았으면 저장하지 않음
    if (!isDataLoaded) return;

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

  // userVocabulary 변경 시 스택 재계산 (단, 초기 로드 시에는 제외)
  useEffect(() => {
    // 초기 로드 시에는 스택을 재계산하지 않음 (Firestore에서 불러온 값 유지)
    if (isInitialLoad.current) {
      isInitialLoad.current = false;
      return;
    }

    const redWords: string[] = [];
    const yellowWords: string[] = [];
    const greenWords: string[] = [];

    Object.keys(userVocabulary).forEach((wordKey) => {
      const entry = userVocabulary[wordKey];
      switch (entry.status) {
        case "red":
          redWords.push(wordKey);
          break;
        case "yellow":
          yellowWords.push(wordKey);
          break;
        case "green":
          greenWords.push(wordKey);
          break;
      }
    });

    setRedStack(redWords);
    setYellowStack(yellowWords);
    setGreenStack(greenWords);
  }, [userVocabulary]);

  // 스택을 Firebase에 저장
  const hasLoadedStacks = useRef(false);

  useEffect(() => {
    // 데이터 로딩이 완료되지 않았으면 저장하지 않음
    if (!isDataLoaded) return;

    if (user) {
      console.log('💾 스택 저장 중...', {
        red: redStack.length,
        yellow: yellowStack.length,
        green: greenStack.length,
        important: importantStack.length,
        sentences: sentenceStack.length
      });

      saveUserStacks(user.uid, {
        red: redStack,
        yellow: yellowStack,
        green: greenStack,
        important: importantStack,
        sentences: sentenceStack,
      });
    }
  }, [redStack, yellowStack, greenStack, importantStack, sentenceStack, user]);

  // 대화를 Firebase에 저장
  useEffect(() => {
    if (!isDataLoaded) return;

    if (user && conversations.length > 0) {
      saveUserConversations(user.uid, conversations);
    }
  }, [conversations, user]);

  // Firebase 인증 상태 감지 및 단어장 동기화
  useEffect(() => {
    const unsubscribe = onAuthStateChange((currentUser) => {
      setUser(currentUser);
      setLoading(false);

      if (currentUser) {
        // 로그인 시: 사용자 데이터 불러오기 (단어장 포함)
        loadUserData(currentUser.uid);
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

  // 단어 상태 업데이트 핸들러 (전역 동기화 + Firestore 저장)
  const handleUpdateWordStatus = useCallback(async (
    word: string,
    newStatus: "red" | "yellow" | "green" | "white",
    koreanMeaning: string = ""
  ) => {
    console.log("Updating status for:", word, "to", newStatus);

    // 1. 먼저 입력된 단어를 그대로 키로 변환해 시도 (TOEIC 리스트 등에서 정확한 키를 보낼 때)
    let wordKey = word.toLowerCase().trim();
    let cleanWord = word.trim();

    // 2. 만약 키가 존재하지 않으면, 마크다운/특수문자 제거 후 다시 시도 (채팅에서 드래그로 선택했을 때)
    if (!userVocabulary[wordKey]) {
      cleanWord = extractCleanWord(word);
      wordKey = cleanWord.toLowerCase().trim();
    }

    if (!cleanWord || cleanWord.length < 2) {
      console.warn("유효하지 않은 단어:", word);
      return;
    }

    // 이전 단어 상태 확인
    const prevEntry = userVocabulary[wordKey];
    const isExistingWord = !!prevEntry;

    // 한글 뜻 처리 로직
    let finalKoreanMeaning = koreanMeaning;

    // 1. 처음 단어장에 추가될 때 (Red, Yellow, Green 모두) 번역 가져오기
    if (!prevEntry && !finalKoreanMeaning) {
      try {
        finalKoreanMeaning = await getKoreanMeaning(cleanWord);
      } catch (error: any) {
        console.error(`❌ 단어 "${cleanWord}"의 한글 뜻 가져오기 실패:`, error);
        finalKoreanMeaning = "";
      }
    }
    // 2. 기존 단어인 경우 기존 한글 뜻 유지
    else if (isExistingWord) {
      finalKoreanMeaning = finalKoreanMeaning || prevEntry.koreanMeaning || "";
    }

    // 1. 전역 단어장 업데이트
    setUserVocabulary((prev) => {
      const existingEntry = prev[wordKey];
      console.log("Existing entry for", wordKey, ":", existingEntry);

      const updatedVocabulary = {
        ...prev,
        [wordKey]: {
          ...existingEntry, // 기존 속성(category 등) 유지
          status: newStatus,
          koreanMeaning: finalKoreanMeaning || existingEntry?.koreanMeaning || "",
        },
      };

      // 2. 로그인 상태라면 Firestore에 즉시 저장
      if (user) {
        saveVocabularyToDB(user.uid, updatedVocabulary);
      }

      return updatedVocabulary;
    });
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
  };

  // 학습 팁 생성 핸들러
  const handleGenerateStudyTips = useCallback(async (word: string, status: "red" | "yellow" | "green" | "white") => {
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

  // 중요 단어 저장 핸들러
  const handleSaveImportant = (word: WordData) => {
    setImportantStack((prev) => {
      if (prev.find((w) => w.id === word.id)) return prev;
      return [...prev, word];
    });
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

      <div className="flex h-screen bg-[#1e1f20] text-[#E3E3E3] font-sans overflow-hidden">
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
                onUpdateWordStatus={(word, status) => handleUpdateWordStatus(word, status)}
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
                onDeleteWord={(word) => {
                  setImportantStack((prev) => prev.filter((item) => item.word !== word));
                }}
                onSaveImportant={handleSaveImportant}
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
                onSaveImportant={handleSaveImportant}
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
              />
            }
          />
          <Route path="/community" element={
            <div className="flex-1 flex flex-col h-full bg-[#f2f0ea] relative">
              {/* 모바일 헤더 */}
              <div className="lg:hidden flex items-center justify-between p-4 bg-white border-b border-slate-200 sticky top-0 z-30">
                <button
                  onClick={() => setIsSidebarOpen(true)}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <Menu className="w-6 h-6 text-slate-600" />
                </button>
                <span className="font-semibold text-slate-800">커뮤니티</span>
                <div className="w-10" /> {/* Spacer */}
              </div>
              <CommunityFeed />
            </div>
          } />
          <Route
            path="/community/global-chat"
            element={
              <div className="flex-1 flex flex-col h-full bg-white relative">
                {/* 모바일 헤더는 GlobalChatRoom 컴포넌트 내부에 있을 수 있습니다. */}
                <GlobalChatRoom />
              </div>
            }
          />
          <Route path="/create-post" element={
            <div className="flex-1 flex flex-col h-full bg-white relative">
              <CreatePostPage onSubmit={(data) => {
                // This will be handled by navigating back to community
                console.log('New post created:', data);
              }} />
            </div>
          } />
          <Route path="/edit-post/:postId" element={
            <div className="flex-1 flex flex-col h-full bg-white relative">
              <EditPostPage />
            </div>
          } />
          <Route path="/chat/:userId" element={
            <div className="flex-1 flex flex-col h-full bg-white relative">
              {/* 모바일 헤더는 DirectChat 컴포넌트 내부에 있음 */}
              <DirectChat />
            </div>
          } />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

