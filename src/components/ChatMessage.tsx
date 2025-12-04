import React, { useState, useRef, useEffect, useCallback } from "react";
import { Bot, User, ArrowLeft, ArrowRight, ArrowDown, ArrowUp, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { useLongPress } from "../hooks/useLongPress";
import { RadialMenu, RadialDirection } from "./RadialMenuNew";
import { WordDetailModal } from "./WordDetailModal";
import { generateStudyTips } from "../services/gemini";

import type { WordData } from "../types";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface ChatMessageProps {
  message: Message;
  isTyping?: boolean;
  onUpdateWordStatus?: (
    wordId: string,
    newStatus: "red" | "yellow" | "green" | "white" | "orange",
    word: string,
    messageId: string,
    sentence: string,
    koreanMeaning?: string,
    isReturningToRed?: boolean
  ) => Promise<void>;
  onResetWordStatus?: (word: string) => void;
  onSaveImportant?: (word: WordData) => void;
  onSaveSentence?: (sentence: string) => void;
  userVocabulary?: Record<string, { status: "red" | "yellow" | "green" | "white" | "orange"; koreanMeaning: string }>;
}

// 래디얼 메뉴 상태
interface RadialMenuState {
  showRadialMenu: boolean;
  menuCenter: { x: number; y: number } | null;
  selectedWordData: {
    index: number;
    word: string;
    wordId: string;
  } | null;
}

// Helper function for styles (moved outside)
const getWordStyle = (state: number) => {
  switch (state) {
    case 1:
      return {
        className: "bg-red-200 text-red-900",
        style: { backgroundColor: "#fecaca", color: "#7f1d1d" },
      };
    case 2:
      return {
        className: "bg-yellow-200 text-yellow-900",
        style: { backgroundColor: "#fef08a", color: "#713f12" },
      };
    case 3:
      return {
        className: "bg-green-200 text-green-900",
        style: { backgroundColor: "#bbf7d0", color: "#14532d" },
      };
    default:
      return { className: "", style: {} };
  }
};

// 단어 컴포넌트 (롱프레스 훅 사용) - Top Level로 이동하여 불필요한 재생성 방지
const WordSpan = React.memo(({
  part,
  partIndex,
  wordIndex,
  finalWord,
  wordState,
  isSelected,
  isCurrentlyHolding,
  isHighlighted,
  onLongPress,
  onClick,
  setIsHolding,
}: {
  part: string;
  partIndex: number;
  wordIndex: number;
  finalWord: string;
  wordState: number;
  isSelected: boolean;
  isCurrentlyHolding: boolean;
  isHighlighted: boolean;
  onLongPress: (e: React.PointerEvent, wordIndex: number, word: string) => void;
  onClick: (index: number, word: string) => void;
  setIsHolding: React.Dispatch<React.SetStateAction<Record<number, boolean>>>;
}) => {
  const longPressHandlers = useLongPress({
    onLongPress: (e) => {
      setIsHolding((prev) => ({ ...prev, [wordIndex]: true }));
      onLongPress(e, wordIndex, finalWord);
    },
    onClick: (e) => {
      e.stopPropagation();
      onClick(wordIndex, finalWord);
    },
    delay: 500,
    threshold: 10,
  });

  // Compute styles internally to avoid passing new objects as props
  const styleInfo = getWordStyle(wordState);

  // Compute holding background color internally
  const getHoldingBackgroundColor = (): string => {
    if (!isCurrentlyHolding) return styleInfo.style.backgroundColor || "transparent";
    // 기존 배경색을 더 어둡게 (약 20% 어둡게)
    if (wordState === 1) return "#fca5a5"; // red-300
    if (wordState === 2) return "#fde047"; // yellow-300
    if (wordState === 3) return "#86efac"; // green-300
    if (wordState === 4) return "#fdba74"; // orange-300
    return "#d1d5db"; // gray-300
  };

  return (
    <span
      key={partIndex}
      {...longPressHandlers}
      onPointerLeave={(e) => {
        // 포인터가 떠났을 때는 롱프레스만 취소 (클릭 실행 안 함)
        longPressHandlers.onPointerLeave?.(e);
        // 홀딩 상태만 해제
        setIsHolding((prev) => {
          const updated = { ...prev };
          delete updated[wordIndex];
          return updated;
        });
      }}
      className={`inline-block rounded px-1 cursor-pointer transition-all duration-[150ms] relative ${wordState > 0 ? styleInfo.className : "hover:bg-slate-100"
        } ${isCurrentlyHolding
          ? "scale-[0.98] shadow-inner"
          : ""
        } ${isHighlighted
          ? "ring-2 ring-blue-500 shadow-lg shadow-blue-500/40 animate-pulse"
          : ""
        }`}
      style={{
        userSelect: "none",
        ...styleInfo.style,
        backgroundColor: getHoldingBackgroundColor(),
        transform: isCurrentlyHolding ? 'scale(0.98)' : 'scale(1)',
      }}
    >
      {part}
    </span>
  );
});

// 마크다운 제거 함수
const cleanMarkdown = (text: string): string => {
  return text
    .replace(/\*\*/g, "") // ** 제거
    .replace(/\*/g, "") // * 제거
    .replace(/`/g, "") // 백틱 제거
    .replace(/#{1,6}\s/g, "") // 헤더 마크다운 제거
    .trim();
};

// 의미 있는 단어인지 확인 (모든 언어 지원)
const isMeaningfulWord = (text: string): boolean => {
  const cleaned = cleanMarkdown(text);
  // 유니코드 속성 이스케이프를 사용하여 모든 언어의 문자(\p{L})와 숫자(\p{N}) 허용
  return /[\p{L}\p{N}]/u.test(cleaned);
};

// 텍스트 세그먼트 분리 함수 (일관된 토큰화 보장)
const getSegments = (text: string) => {
  let parts: string[] = [];
  // Use Intl.Segmenter for intelligent word segmentation (supports CJK, etc.)
  if (typeof Intl !== 'undefined' && 'Segmenter' in Intl) {
    const segmenter = new (Intl as any).Segmenter(undefined, { granularity: 'word' });
    const segments = segmenter.segment(text);
    for (const { segment } of segments) {
      parts.push(segment);
    }
  } else {
    // Fallback for older browsers
    parts = text.split(/([\s\n.,?!;:()\[\]{}"'`，。？！、：；“”‘’（）《》【】]+)/);
  }
  return parts;
};

// 단어 처리 헬퍼 함수 (renderWords와 useEffect 간의 로직 일치 보장)
const processPart = (part: string) => {
  // 1. 공백/문장부호 체크
  if (/^[\s\n.,?!;:()\[\]{}"'`，。？！、：；“”‘’（）《》【】]+$/.test(part)) {
    return { isValid: false, finalWord: '', wordKey: '' };
  }

  // 2. 마크다운 제거
  const cleanedPart = cleanMarkdown(part);

  // 3. 의미 있는 단어인지 체크
  if (!isMeaningfulWord(part)) {
    return { isValid: false, finalWord: '', wordKey: '' };
  }

  // 4. 최종 단어 추출
  const finalWord = cleanedPart.trim().split(/[\s\n.,?!;:()\[\]{}"'`]+/)[0];

  // 5. 길이 체크 (2글자 미만 제외)
  if (!finalWord || finalWord.length < 2) {
    return { isValid: false, finalWord: '', wordKey: '' };
  }

  return { isValid: true, finalWord, wordKey: finalWord.toLowerCase() };
};

export function ChatMessage({
  message,
  isTyping = false,
  onUpdateWordStatus,
  onResetWordStatus,
  onSaveImportant,
  onSaveSentence,
  userVocabulary = {},
}: ChatMessageProps) {
  // ... (existing state definitions)
  const isAssistant = message.role === "assistant";
  const [wordStates, setWordStates] = useState<Record<number, number>>({});

  const [isHolding, setIsHolding] = useState<Record<number, boolean>>({});
  const [highlightWord, setHighlightWord] = useState<number | null>(null);

  // 래디얼 메뉴 상태
  const [radialMenu, setRadialMenu] = useState<RadialMenuState>({
    showRadialMenu: false,
    menuCenter: null,
    selectedWordData: null,
  });

  // Word Detail Modal State
  const [selectedDetailWord, setSelectedDetailWord] = useState<{
    word: string;
    koreanMeaning: string;
    status: "red" | "yellow" | "green" | "white" | "orange";
    messageId: string;
    fullSentence: string;
  } | null>(null);

  const startPosRef = useRef<{ x: number; y: number } | null>(null);
  const radialMenuRef = useRef<HTMLDivElement | null>(null);

  // ... (handleClickOutside useEffect)

  // userVocabulary 변경 시 단어 상태 동기화
  useEffect(() => {
    if (!isAssistant || isTyping) return;

    // 메시지 텍스트를 토큰화해서 전역 단어장과 동기화
    // 중요: renderWords와 동일한 getSegments 함수를 사용하여 인덱스 불일치 방지
    const parts = getSegments(message.content);
    let wordIndex = 0;
    const newWordStates: Record<number, number> = {};

    parts.forEach((part) => {
      // [CRITICAL FIX] processPart 헬퍼를 사용하여 renderWords와 완벽하게 동일한 로직 적용
      const { isValid, wordKey } = processPart(part);

      if (!isValid) return;

      const globalEntry = userVocabulary?.[wordKey];

      // [긴급 수정] 사용자가 방금 클릭해서 업데이트 대기 중인 경우 -> 로컬 상태 최우선 (반응성 보장)
      const isPendingUpdate = !!updateTimeouts.current[wordIndex];
      const localState = wordStates[wordIndex] || 0;
      let state = 0;

      if (isPendingUpdate) {
        state = localState;
      } else if (globalEntry) {
        switch (globalEntry.status) {
          case "red": state = 1; break;
          case "yellow": state = 2; break;
          case "green": state = 3; break;
          case "orange": state = 4; break;
          default: state = 0; break;
        }
      } else {
        state = localState;
      }

      newWordStates[wordIndex] = state;
      wordIndex++;
    });

    // 기존 상태와 병합 (전역 상태를 우선시하여 덮어쓰기)
    setWordStates((prev) => {
      const merged = { ...prev };
      // 모든 인덱스에 대해 업데이트 (누락된 인덱스가 없도록)
      Object.keys(newWordStates).forEach((key) => {
        const numKey = parseInt(key);
        merged[numKey] = newWordStates[numKey];
      });

      // 더 이상 유효하지 않은 인덱스 제거
      const maxIndex = wordIndex;
      Object.keys(merged).forEach((key) => {
        const numKey = parseInt(key);
        if (numKey >= maxIndex) {
          delete merged[numKey];
        }
      });

      return merged;
    });
  }, [userVocabulary, message.content, isAssistant, isTyping]);

  // Ref to keep track of wordStates without triggering re-renders in callbacks
  const wordStatesRef = useRef(wordStates);
  useEffect(() => {
    wordStatesRef.current = wordStates;
  }, [wordStates]);

  // Debounce refs for word updates
  const updateTimeouts = useRef<Record<number, ReturnType<typeof setTimeout>>>({});
  // Optimistic updates tracking (wordKey -> status)
  const pendingUpdates = useRef<Record<string, number>>({});

  // 단어 클릭 (짧은 탭) - 색상 순환 및 상태 업데이트
  const handleWordClick = useCallback(async (index: number, word: string) => {
    if (
      !isAssistant ||
      isTyping
    )
      return;

    // 순수 텍스트만 사용 (마크다운 제거)
    const cleanWord = cleanMarkdown(word);
    if (!isMeaningfulWord(word)) return;

    // 단어만 추출 (공백이나 문장부호 제거)
    const finalWord = cleanWord.trim().split(/[\s\n.,?!;:()\[\]{}"'`]+/)[0];
    if (!finalWord || finalWord.length < 2) return;

    // Use ref to get current state without adding dependency
    const currentState = wordStatesRef.current[index] || 0;
    let nextState: number;

    // 순환 로직: 0(White) -> 1(Red) -> 2(Yellow) -> 3(Green) -> 0(White)
    // 4(Orange) -> 1(Red) (중요 단어 클릭 시 학습 시작)
    if (currentState === 0) {
      nextState = 1; // White -> Red
    } else if (currentState === 3) {
      nextState = 0; // Green -> White
    } else if (currentState === 4) {
      nextState = 1; // Orange -> Red
    } else {
      nextState = currentState + 1; // Red -> Yellow -> Green
    }

    // 1. 즉시 로컬 상태 업데이트 (UI 반응성 향상)
    setWordStates((prev) => {
      const newStates = { ...prev };
      newStates[index] = nextState;
      return newStates;
    });

    // [CRITICAL FIX] Set pending update immediately to prevent revert
    pendingUpdates.current[finalWord.toLowerCase()] = nextState;

    // 2. API 호출 및 토스트 메시지 Debounce 처리
    // 기존 타이머가 있다면 취소 (이전 클릭 무시)
    if (updateTimeouts.current[index]) {
      clearTimeout(updateTimeouts.current[index]);
    }

    // 새로운 타이머 설정 (500ms 동안 추가 클릭이 없으면 실행)
    updateTimeouts.current[index] = setTimeout(async () => {
      // Green -> White로 변경되는 경우 onResetWordStatus 호출
      if (nextState === 0) {
        if (onResetWordStatus) {
          try {
            await Promise.resolve(onResetWordStatus(finalWord));
            toast.success(`단어 "${finalWord}"이(가) 초기 상태(White)로 복원되었습니다`, {
              duration: 2000,
            });
          } catch (error) {
            console.error("단어 상태 초기화 중 오류:", error);
            toast.error("단어 상태 초기화에 실패했습니다.", {
              duration: 2000,
            });
          }
        }
      }
      // Red, Yellow, Green, Orange 상태 업데이트
      else if (onUpdateWordStatus && nextState > 0) {
        const statusMap: Record<number, "red" | "yellow" | "green" | "orange"> = {
          1: "red",
          2: "yellow",
          3: "green",
          4: "orange",
        };
        const statusNames = {
          1: "Red",
          2: "Yellow",
          3: "Green",
          4: "Important",
        };
        const wordId = `${message.id}-${index}-${finalWord.toLowerCase()}`;
        const newStatus = statusMap[nextState];

        try {
          await onUpdateWordStatus(
            wordId,
            newStatus,
            finalWord,
            message.id,
            message.content,
            "", // koreanMeaning: AI로 자동 가져옴
            false
          );

          // 피드백 메시지
          toast.success(
            `단어 "${finalWord}"이(가) ${statusNames[nextState as keyof typeof statusNames]} Stack에 저장되었습니다`,
            {
              duration: 2000,
            }
          );
        } catch (error) {
          console.error("단어 상태 업데이트 실패:", error);
        }
      }

      // 타이머 참조 제거
      delete updateTimeouts.current[index];
    }, 600); // 600ms 딜레이 (사용자가 색상을 고를 시간 여유)
  }, [isAssistant, isTyping, message.id, message.content, onResetWordStatus, onUpdateWordStatus]);

  // ... (Long Press & Pointer Move handlers - omitted for brevity, assume unchanged)

  // ... (Radial Select & Pointer Up handlers - omitted for brevity, assume unchanged)

  // userVocabulary 변경 시 단어 상태 동기화
  useEffect(() => {
    if (!isAssistant || isTyping) return;

    const parts = getSegments(message.content);
    let wordIndex = 0;
    const newWordStates: Record<number, number> = {};

    parts.forEach((part) => {
      const { isValid, wordKey } = processPart(part);

      if (!isValid) return;

      const globalEntry = userVocabulary?.[wordKey];
      const pendingState = pendingUpdates.current[wordKey];
      let state = 0;

      // [CRITICAL FIX] Check if global entry matches pending state to clear pending
      if (pendingState !== undefined) {
        if (globalEntry) {
          let globalStateNum = 0;
          if (globalEntry.status === "red") globalStateNum = 1;
          else if (globalEntry.status === "yellow") globalStateNum = 2;
          else if (globalEntry.status === "green") globalStateNum = 3;
          else if (globalEntry.status === "orange") globalStateNum = 4;

          if (globalStateNum === pendingState) {
            delete pendingUpdates.current[wordKey];
            state = globalStateNum;
          } else {
            state = pendingState; // Keep pending until synced
          }
        } else {
          state = pendingState; // Keep pending
        }
      } else if (globalEntry) {
        switch (globalEntry.status) {
          case "red": state = 1; break;
          case "yellow": state = 2; break;
          case "green": state = 3; break;
          case "orange": state = 4; break;
          default: state = 0; break;
        }
      }

      newWordStates[wordIndex] = state;
      wordIndex++;
    });

    setWordStates((prev) => {
      const merged = { ...prev };
      Object.keys(newWordStates).forEach((key) => {
        const numKey = parseInt(key);
        merged[numKey] = newWordStates[numKey];
      });
      const maxIndex = wordIndex;
      Object.keys(merged).forEach((key) => {
        const numKey = parseInt(key);
        if (numKey >= maxIndex) {
          delete merged[numKey];
        }
      });
      return merged;
    });
  }, [userVocabulary, message.content, isAssistant, isTyping]);

  const renderWords = (text: string) => {
    const parts = getSegments(text);
    let wordIndex = 0;

    return parts.map((part, partIndex) => {
      const { isValid, finalWord, wordKey } = processPart(part);

      if (!isValid) {
        return <span key={partIndex}>{part}</span>;
      }

      const currentWordIndex = wordIndex;
      wordIndex++;

      const globalEntry = userVocabulary?.[wordKey];
      const pendingState = pendingUpdates.current[wordKey];
      const localState = wordStates[currentWordIndex] || 0;

      let finalState = 0;

      // [CRITICAL FIX] Prioritize pending updates
      if (pendingState !== undefined) {
        finalState = pendingState;
      } else if (globalEntry) {
        switch (globalEntry.status) {
          case "red": finalState = 1; break;
          case "yellow": finalState = 2; break;
          case "green": finalState = 3; break;
          case "orange": finalState = 4; break;
          default: finalState = 0; break;
        }
      } else {
        finalState = localState;
      }

      const wordState = finalState;
      const isSelected = radialMenu.selectedWordData?.index === currentWordIndex;
      const isCurrentlyHolding = isHolding[currentWordIndex] || false;
      const isHighlighted = highlightWord === currentWordIndex;

      return (
        <WordSpan
          key={partIndex}
          part={part}
          partIndex={partIndex}
          wordIndex={currentWordIndex}
          finalWord={finalWord}
          wordState={wordState}
          isSelected={isSelected}
          isCurrentlyHolding={isCurrentlyHolding}
          isHighlighted={isHighlighted}
          onLongPress={handleLongPress}
          onClick={handleWordClick}
          setIsHolding={setIsHolding}
        />
      );
    });
  };

  // 롱프레스 핸들러 - 래디얼 메뉴 열기
  // 롱프레스 핸들러 - 래디얼 메뉴 열기
  const handleLongPress = useCallback((
    e: React.PointerEvent,
    wordIndex: number,
    word: string
  ) => {
    if (!isAssistant || isTyping) return;

    // 이벤트 전파 방지
    e.preventDefault();
    e.stopPropagation();

    // 클릭된 정확한 지점의 화면 좌표 (이벤트의 clientX, clientY 사용)
    const clickX = e.clientX;
    const clickY = e.clientY;

    // 파란색 하이라이트 애니메이션 시작
    setHighlightWord(wordIndex);

    // 햅틱 피드백
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }

    // 래디얼 메뉴 표시 (클릭된 정확한 지점을 중심으로)
    const cleanWord = cleanMarkdown(word);
    const finalWord = cleanWord.trim().split(/[\s\n.,?!;:()\[\]{}"'`]+/)[0];

    setRadialMenu({
      showRadialMenu: true,
      menuCenter: { x: clickX, y: clickY },
      selectedWordData: {
        index: wordIndex,
        word: finalWord,
        wordId: `${message.id}-${wordIndex}-${finalWord.toLowerCase()}`,
      },
    });

    setIsHolding((prev) => {
      const updated = { ...prev };
      delete updated[wordIndex];
      return updated;
    });

    // 하이라이트는 조금 더 유지 후 제거
    setTimeout(() => {
      setHighlightWord(null);
    }, 100);
  }, [isAssistant, isTyping, message.id]);

  // Pointer Move - 드래그 방향 감지 (RadialMenu 컴포넌트에서 처리하므로 여기서는 제거)
  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    // 래디얼 메뉴가 열려있을 때는 RadialMenu 컴포넌트가 이벤트를 처리함
    // 구형 로직 제거됨
  }, []);

  // Radial Menu 선택 핸들러
  const handleRadialSelect = useCallback((direction: RadialDirection) => {
    const selectedWordData = radialMenu.selectedWordData;
    if (!selectedWordData) return;

    const cleanWord = cleanMarkdown(selectedWordData.word);
    const finalWord = cleanWord.trim().split(/[\s\n.,?!;:()\[\]{}"'`]+/)[0];

    switch (direction) {
      case "left":
        // ⬅️ Left: 문장 저장 (Save Sentence)
        if (onSaveSentence && finalWord && finalWord.length >= 2) {
          // 현재 메시지에서 해당 단어가 포함된 문장 추출 (간단한 구현)
          // 실제로는 더 정교한 문장 분리 로직이 필요할 수 있음
          const sentences = message.content.split(/[.?!]\s+/);
          const containingSentence = sentences.find(s => s.includes(finalWord)) || message.content;

          onSaveSentence(containingSentence.trim());
          toast.success(`문장이 저장되었습니다.`, {
            duration: 2000,
          });
        }
        break;
      case "right":
        // ➡️ Right: 중요 단어 저장 (Save Important)
        if (onSaveImportant && finalWord && finalWord.length >= 2) {
          onSaveImportant({
            id: selectedWordData.wordId,
            word: finalWord,
            status: "red", // 기본값
            messageId: message.id,
            sentence: message.content,
            timestamp: new Date(),
            koreanMeaning: userVocabulary?.[finalWord.toLowerCase()]?.koreanMeaning || ""
          });
          toast.success(`단어 "${finalWord}"이(가) 중요 단어장에 저장되었습니다`, {
            duration: 2000,
          });
        }
        break;
      case "bottom":
        // ⬇️ Bottom: 발음 듣기 (TTS)
        if (window.speechSynthesis && finalWord && finalWord.length >= 2) {
          const utterance = new SpeechSynthesisUtterance(finalWord);
          utterance.lang = "en-US";
          window.speechSynthesis.speak(utterance);
          toast.success(`"${finalWord}" 발음을 재생합니다.`, {
            duration: 2000,
          });
        } else {
          toast.error("음성 재생을 지원하지 않는 브라우저입니다.");
        }
        break;
      case "top":
        // ⬆️ Top: 상세보기 (Detail)
        if (finalWord && finalWord.length >= 2) {
          const entry = userVocabulary?.[finalWord.toLowerCase()];
          setSelectedDetailWord({
            word: finalWord,
            koreanMeaning: entry?.koreanMeaning || "",
            status: entry?.status || "white",
            messageId: message.id,
            fullSentence: message.content
          });
        }
        break;
      default:
        // 다른 방향은 아직 기능 없음 (Placeholder)
        break;
    }

    // 메뉴 닫기
    setRadialMenu({
      showRadialMenu: false,
      menuCenter: null,
      selectedWordData: null,
    });
  }, [radialMenu.selectedWordData, onSaveSentence, onSaveImportant, message.content, message.id, userVocabulary]);



  return (
    <div className={`flex ${isAssistant ? "justify-start" : "justify-end"} mb-6`}>
      <div className={`flex flex-col max-w-[85%] ${isAssistant ? "items-start" : "items-end"}`}>
        {isAssistant && (
          <div className="flex items-center gap-2 mb-1 ml-1">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-sm">
              <Bot className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-xs font-medium text-slate-500">AI Assistant</span>
          </div>
        )}

        <div
          className={`relative px-5 py-4 rounded-2xl shadow-sm transition-all duration-200 ${isAssistant
            ? "bg-white border border-slate-100 text-slate-800 rounded-tl-none hover:shadow-md"
            : "bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-tr-none shadow-blue-200"
            }`}
        >
          {isTyping ? (
            <div className="flex gap-1.5 items-center h-6 px-2">
              <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
              <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
              <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" />
            </div>
          ) : (
            <div className="text-[15px] leading-relaxed whitespace-pre-wrap break-words">
              {isAssistant ? renderWords(message.content) : message.content}
            </div>
          )}
        </div>

        <span className="text-[11px] text-slate-400 mt-1 px-1">
          {message.timestamp instanceof Date
            ? message.timestamp.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })
            : ""}
        </span>
      </div>

      {/* Radial Menu */}
      {radialMenu.showRadialMenu && radialMenu.menuCenter && (
        <RadialMenu
          center={radialMenu.menuCenter}
          isOpen={radialMenu.showRadialMenu}
          onSelect={handleRadialSelect}
          onClose={() =>
            setRadialMenu((prev) => ({ ...prev, showRadialMenu: false }))
          }
          selectedWord={radialMenu.selectedWordData?.word || ""}
          variant="chat"
        />
      )}

      {/* Word Detail Modal */}
      {selectedDetailWord && (
        <WordDetailModal
          open={!!selectedDetailWord}
          onOpenChange={(open) => !open && setSelectedDetailWord(null)}
          word={selectedDetailWord.word}
          koreanMeaning={selectedDetailWord.koreanMeaning}
          status={selectedDetailWord.status}
          onGenerateStudyTips={generateStudyTips}
        />
      )}
    </div>
  );
}
