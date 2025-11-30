import React, { useState, useEffect, useRef, useCallback } from "react";
import { Sidebar } from "./components/Sidebar";
import { ChatMessage } from "./components/ChatMessage";
import { ChatInput } from "./components/ChatInput";
import { StackView } from "./components/StackView";
import { Auth } from "./components/Auth";
import { OnboardingModal } from "./components/OnboardingModal";
import { MainContent } from "./components/MainContent";
import { Send, Menu, X, LogOut, User } from "lucide-react";
import {
  sendMessageToGemini,
  ChatMessage as GeminiChatMessage,
  generateStudyTips,
  generatePersonalizedTips,
  getKoreanMeaning,
} from "./services/gemini";
import { Toaster, toast } from "sonner";
import { onAuthStateChange, logout } from "./services/auth";
import { getUserVocabulary, saveUserVocabulary, getUserStacks, saveUserStacks, getUserConversations, saveUserConversations } from "./services/userData";
import type { User as FirebaseUser } from "firebase/auth";
import { auth, db } from "./firebase";
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

import type { WordData } from "./components/ChatMessage";

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
  const [currentView, setCurrentView] = useState<
    "chat" | "red" | "yellow" | "green"
  >("chat");

  // 언어 상태
  const [nativeLang, setNativeLang] = useState("ko");
  const [targetLang, setTargetLang] = useState<string | null>(null);

  // 전역 단어장 상태 (Key: 단어(소문자), Value: 상태와 한글 뜻)
  interface VocabularyEntry {
    status: "red" | "yellow" | "green";
    koreanMeaning: string;
  }

  const [userVocabulary, setUserVocabulary] = useState<
    Record<string, VocabularyEntry>
  >({});

  // Debounce를 위한 ref
  const saveVocabularyTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
    return words.length > 0 ? words[0] : cleaned.trim();
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
            // 새 형식: { word: { status: "...", koreanMeaning: "..." } }
            vocabulary[word] = {
              status: entry.status,
              koreanMeaning: entry.koreanMeaning || "",
            };
          }
        });

        setUserVocabulary(vocabulary);
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
        const userRef = doc(db, "users", userId);
        await setDoc(userRef, {
          vocabulary: vocabData,
          updatedAt: new Date(),
        }, { merge: true });
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
  };

  // 전역 단어장을 Firebase에 저장 (사용자별로, Debounce 적용)
  useEffect(() => {
    if (user && Object.keys(userVocabulary).length >= 0) {
      // 로그인 상태: Firebase에 저장 (Debounce 적용)
      saveVocabularyToDB(user.uid, userVocabulary);
    }

    // cleanup: 컴포넌트 언마운트 시 타이머 정리
    return () => {
      if (saveVocabularyTimeoutRef.current) {
        clearTimeout(saveVocabularyTimeoutRef.current);
      }
    };
  }, [userVocabulary, user]);

  // userVocabulary 변경 시 스택 재계산
  useEffect(() => {
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
  useEffect(() => {
    if (user) {
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
    newStatus: "red" | "yellow" | "green",
    koreanMeaning: string = ""
  ) => {
    // 깔끔하게 정제된 단어 텍스트 추출
    const cleanWord = extractCleanWord(word);
    const wordKey = cleanWord.toLowerCase().trim();

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
      const updatedVocabulary = {
        ...prev,
        [wordKey]: {
          status: newStatus,
          koreanMeaning: finalKoreanMeaning || prev[wordKey]?.koreanMeaning || "",
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

  return (
    <>
      <Toaster position="top-center" richColors />

      {/* 온보딩 모달 */}
      <OnboardingModal
        isOpen={!targetLang}
        onComplete={(native, target) => {
          setNativeLang(native);
          setTargetLang(target);
          saveLanguageSettings(native, target);
        }}
        onLogout={logout}
      />

      <div className="flex h-screen bg-gradient-to-br from-slate-50 to-slate-100">
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
          currentView={currentView}
          onSelectView={setCurrentView}
          onLogout={logout}
          onResetLanguage={() => {
            setTargetLang(null);
            saveLanguageSettings(nativeLang, "");
          }}
        />

        {/* 메인 컨텐츠 영역 */}
        {currentView === "chat" ? (
          <MainContent
            nativeLang={nativeLang}
            targetLang={targetLang}
            currentConversation={currentConversation}
            isTyping={isTyping}
            onSendMessage={handleSendMessage}
            isSidebarOpen={isSidebarOpen}
            onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
            user={user}
            onLogout={logout}
            userVocabulary={userVocabulary}
            onUpdateWordStatus={(word, status) => handleUpdateWordStatus(word, status)}
            onResetWordStatus={handleResetWordStatus}
            onSaveImportant={handleSaveImportant}
            onSaveSentence={handleSaveSentence}
          />
        ) : (
          <StackView
            title={
              currentView === "red" ? "Red Stack" :
                currentView === "yellow" ? "Yellow Stack" : "Green Stack"
            }
            color={
              currentView === "red" ? "#ef4444" :
                currentView === "yellow" ? "#eab308" : "#22c55e"
            }
            items={
              currentView === "red" ? redStack :
                currentView === "yellow" ? yellowStack : greenStack
            }
            onBack={() => setCurrentView("chat")}
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
          />
        )}
      </div>
    </>
  );
}
