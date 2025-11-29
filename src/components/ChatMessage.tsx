import React, { useState, useRef, useEffect } from "react";
import { Bot, User, ArrowLeft, ArrowRight, ArrowDown } from "lucide-react";
import { toast } from "sonner";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export interface WordData {
  id: string;
  word: string;
  status: "red" | "yellow" | "green";
  messageId: string;
  sentence: string;
  timestamp: Date;
  isInteractive?: boolean;
  koreanMeaning?: string; // 한글 뜻 추가
}

interface ChatMessageProps {
  message: Message;
  isTyping?: boolean;
  onUpdateWordStatus?: (
    wordId: string,
    newStatus: "red" | "yellow" | "green",
    word: string,
    messageId: string,
    sentence: string,
    koreanMeaning?: string,
    isReturningToRed?: boolean
  ) => Promise<void>;
  onSaveImportant?: (word: WordData) => void;
  onSaveSentence?: (sentence: string) => void;
  userVocabulary?: Record<string, { status: "red" | "yellow" | "green"; koreanMeaning: string }>;
}

interface WordInteractionState {
  interactionState: "idle" | "pressing" | "menu-open";
  activeDirection: "none" | "left" | "right" | "bottom";
  selectedWord: {
    index: number;
    word: string;
    startX: number;
    startY: number;
  } | null;
}

export function ChatMessage({
  message,
  isTyping = false,
  onUpdateWordStatus,
  onSaveImportant,
  onSaveSentence,
  userVocabulary = {},
}: ChatMessageProps) {
  const isAssistant = message.role === "assistant";
  const [wordStates, setWordStates] = useState<Record<number, number>>({});
  const [interactionState, setInteractionState] =
    useState<WordInteractionState>({
      interactionState: "idle",
      activeDirection: "none",
      selectedWord: null,
    });

  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const startPosRef = useRef<{ x: number; y: number } | null>(null);

  // userVocabulary 변경 시 단어 상태 동기화
  useEffect(() => {
    if (!isAssistant || isTyping) return;

    // 메시지 텍스트를 토큰화해서 전역 단어장과 동기화
    const parts = message.content.split(/([\s\n.,?!;:()\[\]{}"'`]+)/);
    let wordIndex = 0;
    const newWordStates: Record<number, number> = {};

    parts.forEach((part) => {
      if (/^[\s\n.,?!;:()\[\]{}"'`]+$/.test(part)) return;
      
      const cleanedWord = cleanMarkdown(part);
      if (!isMeaningfulWord(part)) return;

      const wordKey = cleanedWord.toLowerCase();
      const globalEntry = userVocabulary?.[wordKey];
      
      if (globalEntry) {
        const status = globalEntry.status;
        const state = status === "red" ? 1 : status === "yellow" ? 2 : 3;
        newWordStates[wordIndex] = state;
      }
      
      wordIndex++;
    });

    // 기존 상태와 병합 (사용자가 직접 변경한 것은 유지)
    setWordStates((prev) => {
      const merged = { ...prev };
      Object.keys(newWordStates).forEach((key) => {
        const numKey = parseInt(key);
        // 전역 상태가 있고 로컬 상태가 없거나 0이면 전역 상태 사용
        if (!prev[numKey] || prev[numKey] === 0) {
          merged[numKey] = newWordStates[numKey];
        }
      });
      return merged;
    });
  }, [userVocabulary, message.content, isAssistant, isTyping]);

  // 단어 클릭 (짧은 탭) - 색상 순환 및 상태 업데이트
  const handleWordClick = async (index: number, word: string) => {
    if (
      !isAssistant ||
      isTyping ||
      interactionState.interactionState !== "idle"
    )
      return;

    // 순수 텍스트만 사용 (마크다운 제거)
    const cleanWord = cleanMarkdown(word);
    if (!isMeaningfulWord(word)) return;

    // 단어만 추출 (공백이나 문장부호 제거)
    const finalWord = cleanWord.trim().split(/[\s\n.,?!;:()\[\]{}"'`]+/)[0];
    if (!finalWord || finalWord.length < 2) return;

    const currentState = wordStates[index] || 0;
    let nextState: number;
    
    // 순환 로직: 0(없음) -> 1(red) -> 2(yellow) -> 3(green) -> 1(red) ...
    if (currentState === 0) {
      nextState = 1; // 없음 -> red
    } else if (currentState === 3) {
      nextState = 1; // green -> red (순환 완성)
    } else {
      nextState = currentState + 1; // red -> yellow -> green
    }
    
    // 상태 업데이트
    setWordStates((prev) => {
      const newStates = { ...prev };
      newStates[index] = nextState;
      return newStates;
    });

    // 상태에 따라 App.tsx의 핸들러 호출 (비동기)
    if (onUpdateWordStatus) {
      const statusMap: Record<number, "red" | "yellow" | "green"> = {
        1: "red",
        2: "yellow",
        3: "green",
      };
      const statusNames = {
        1: "Red",
        2: "Yellow",
        3: "Green",
      };
      const wordId = `${message.id}-${index}-${finalWord.toLowerCase()}`;
      const newStatus = statusMap[nextState];
      const isReturningToRed = currentState === 3 && nextState === 1;

      // 순수 단어만 저장 (문장부호, 공백 제거)
      try {
        await onUpdateWordStatus(
          wordId,
          newStatus,
          finalWord,
          message.id,
          message.content,
          "", // koreanMeaning: AI로 자동 가져옴
          isReturningToRed // green -> red 순환 플래그
        );

        // 피드백 메시지
        if (isReturningToRed) {
          toast.success(
            `단어 "${finalWord}"이(가) 다시 복습 주기로 돌아갑니다 (Red Stack)`,
            {
              duration: 2000,
            }
          );
        } else {
          toast.success(
            `${finalWord}이(가) ${statusNames[nextState]} 스택에 저장되었습니다`,
            {
              duration: 2000,
            }
          );
        }
      } catch (error) {
        console.error("단어 상태 업데이트 실패:", error);
      }
    }
  };

  // Pointer Down - 홀딩 시작
  const handlePointerDown = (
    e: React.PointerEvent,
    wordIndex: number,
    word: string
  ) => {
    if (!isAssistant || isTyping) return;

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    startPosRef.current = { x: e.clientX, y: e.clientY };

    setInteractionState({
      interactionState: "pressing",
      activeDirection: "none",
      selectedWord: {
        index: wordIndex,
        word,
        startX: rect.left + rect.width / 2,
        startY: rect.top + rect.height / 2,
      },
    });

    // 500ms 후 메뉴 열기
    longPressTimerRef.current = setTimeout(() => {
      setInteractionState((prev) => ({
        ...prev,
        interactionState: "menu-open",
      }));

      // 햅틱 피드백
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
    }, 500);
  };

  // Pointer Move - 드래그 방향 감지
  const handlePointerMove = (e: React.PointerEvent) => {
    if (
      interactionState.interactionState !== "menu-open" ||
      !startPosRef.current
    )
      return;

    const deltaX = e.clientX - startPosRef.current.x;
    const deltaY = e.clientY - startPosRef.current.y;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    if (distance > 20) {
      let direction: "left" | "right" | "bottom" = "bottom";

      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        direction = deltaX < 0 ? "left" : "right";
      } else if (deltaY > 0) {
        direction = "bottom";
      }

      setInteractionState((prev) => ({
        ...prev,
        activeDirection: direction,
      }));
    }
  };

  // Pointer Up - 제스처 완료 또는 취소
  const handlePointerUp = () => {
    const wasMenuOpen = interactionState.interactionState === "menu-open";
    const wasPressing = interactionState.interactionState === "pressing";
    const currentDirection = interactionState.activeDirection;
    const currentSelectedWord = interactionState.selectedWord;

    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    if (wasMenuOpen && currentDirection !== "none") {
      // 제스처 완료 - 액션 실행
      if (currentSelectedWord) {
        switch (currentDirection) {
          case "bottom":
            // TTS - 단어 읽기
            if (window.speechSynthesis) {
              const cleanWord = cleanMarkdown(currentSelectedWord.word);
              const utterance = new SpeechSynthesisUtterance(cleanWord);
              utterance.lang = "en-US";
              window.speechSynthesis.speak(utterance);
            }
            break;
          case "right":
            // 단어 저장 (Important Stack)
            if (onSaveImportant && currentSelectedWord) {
              // 순수 텍스트만 저장 (마크다운 제거 및 단어만 추출)
              const cleanWord = cleanMarkdown(currentSelectedWord.word);
              const finalWord = cleanWord.trim().split(/[\s\n.,?!;:()\[\]{}"'`]+/)[0];
              
              if (!finalWord || finalWord.length < 2) {
                toast.error("유효한 단어를 선택해주세요.");
                return;
              }
              
              const wordData: WordData = {
                id: `${message.id}-${currentSelectedWord.index}-${finalWord.toLowerCase()}`,
                word: finalWord,
                status: "red", // 기본값
                messageId: message.id,
                sentence: message.content,
                timestamp: new Date(),
                isInteractive: true,
              };
              onSaveImportant(wordData);
              toast.success(
                `단어 "${finalWord}"이(가) Important 스택에 저장되었습니다`,
                {
                  duration: 2000,
                }
              );
            }
            break;
          case "left":
            // 문장 저장
            if (onSaveSentence) {
              onSaveSentence(message.content);
              toast.success("문장이 Sentence 스택에 저장되었습니다", {
                duration: 2000,
              });
            }
            break;
        }
      }
    }
    // 단순 클릭은 onClick에서 처리하므로 여기서는 제거

    // 상태 초기화
    setInteractionState({
      interactionState: "idle",
      activeDirection: "none",
      selectedWord: null,
    });
    startPosRef.current = null;
  };

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

  // 마크다운 제거 함수
  const cleanMarkdown = (text: string): string => {
    return text
      .replace(/\*\*/g, "") // ** 제거
      .replace(/\*/g, "") // * 제거
      .replace(/`/g, "") // 백틱 제거
      .replace(/#{1,6}\s/g, "") // 헤더 마크다운 제거
      .trim();
  };

  // 의미 있는 단어인지 확인 (영문자, 숫자, 하이픈 포함)
  const isMeaningfulWord = (text: string): boolean => {
    const cleaned = cleanMarkdown(text);
    // 최소 2글자 이상이고, 영문자/숫자로 구성된 단어만 의미 있음
    return /^[a-zA-Z0-9-]{2,}$/.test(cleaned);
  };

  const renderWords = (text: string) => {
    // 줄바꿈, 공백, 문장부호를 경계로 분리
    const parts = text.split(/([\s\n.,?!;:()\[\]{}"'`]+)/);
    let wordIndex = 0;

    return parts.map((part, partIndex) => {
      // 공백, 줄바꿈, 문장부호만 있는 경우 그대로 렌더링
      if (/^[\s\n.,?!;:()\[\]{}"'`]+$/.test(part)) {
        return <span key={partIndex}>{part}</span>;
      }

      // 마크다운 제거
      const cleanedPart = cleanMarkdown(part);
      
      // 의미 있는 단어가 아니면 그대로 렌더링 (클릭 불가)
      if (!isMeaningfulWord(part)) {
        return <span key={partIndex}>{part}</span>;
      }

      // 단어만 추출 (공백이나 문장부호 제거)
      const finalWord = cleanedPart.trim().split(/[\s\n.,?!;:()\[\]{}"'`]+/)[0];
      if (!finalWord || finalWord.length < 2) {
        return <span key={partIndex}>{part}</span>;
      }

      const currentWordIndex = wordIndex;
      wordIndex++;
      
      // 전역 단어장에서 해당 단어의 상태 확인
      const wordKey = finalWord.toLowerCase();
      const globalEntry = userVocabulary?.[wordKey];
      
      // 전역 상태가 있으면 그것을 우선 사용, 없으면 로컬 상태 사용
      const localState = wordStates[currentWordIndex] || 0;
      const finalState = globalEntry
        ? globalEntry.status === "red"
          ? 1
          : globalEntry.status === "yellow"
          ? 2
          : 3
        : localState;
      
      // 전역 상태가 있으면 로컬 상태도 동기화
      if (globalEntry && localState !== finalState) {
        setWordStates((prev) => ({
          ...prev,
          [currentWordIndex]: finalState,
        }));
      }
      
      const wordState = finalState;
      const styleInfo = getWordStyle(wordState);
      const isSelected =
        interactionState.selectedWord?.index === currentWordIndex;

      return (
        <span
          key={partIndex}
          onClick={(e) => {
            // 단순 클릭 처리 (홀딩이 아닌 경우)
            if (interactionState.interactionState === "idle") {
              e.stopPropagation();
              handleWordClick(currentWordIndex, finalWord);
            }
          }}
          onPointerDown={(e) => handlePointerDown(e, currentWordIndex, finalWord)}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          className={`inline-block rounded px-1 cursor-pointer transition-colors relative ${
            wordState > 0 ? styleInfo.className : "hover:bg-slate-100"
          }`}
          style={{
            userSelect: "none",
            ...styleInfo.style,
          }}
        >
          {part}
          {isSelected && interactionState.interactionState === "menu-open" && (
            <div
              className="absolute z-50 flex items-center justify-center gap-6"
              style={{
                left: "50%",
                top: "-80px",
                transform: "translateX(-50%)",
                pointerEvents: "none",
              }}
            >
              {/* Left */}
              <div
                className={`w-14 h-14 rounded-full flex items-center justify-center transition-all shadow-2xl border-3 ${
                  interactionState.activeDirection === "left"
                    ? "scale-125 bg-blue-600 border-blue-300 ring-4 ring-blue-200"
                    : "bg-white border-4 border-slate-800"
                }`}
              >
                <ArrowLeft
                  className={`w-7 h-7 ${
                    interactionState.activeDirection === "left"
                      ? "text-white"
                      : "text-slate-800"
                  } font-bold`}
                />
              </div>

              {/* Right */}
              <div
                className={`w-14 h-14 rounded-full flex items-center justify-center transition-all shadow-2xl border-3 ${
                  interactionState.activeDirection === "right"
                    ? "scale-125 bg-blue-600 border-blue-300 ring-4 ring-blue-200"
                    : "bg-white border-4 border-slate-800"
                }`}
              >
                <ArrowRight
                  className={`w-7 h-7 ${
                    interactionState.activeDirection === "right"
                      ? "text-white"
                      : "text-slate-800"
                  } font-bold`}
                />
              </div>

              {/* Bottom */}
              <div
                className={`w-14 h-14 rounded-full flex items-center justify-center transition-all shadow-2xl border-3 ${
                  interactionState.activeDirection === "bottom"
                    ? "scale-125 bg-blue-600 border-blue-300 ring-4 ring-blue-200"
                    : "bg-white border-4 border-slate-800"
                }`}
              >
                <ArrowDown
                  className={`w-7 h-7 ${
                    interactionState.activeDirection === "bottom"
                      ? "text-white"
                      : "text-slate-800"
                  } font-bold`}
                />
              </div>
            </div>
          )}
        </span>
      );
    });
  };

  return (
    <div
      className={`flex gap-4 ${isAssistant ? "justify-start" : "justify-end"}`}
    >
      {isAssistant && (
        <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-md">
          <Bot className="w-6 h-6 text-white" />
        </div>
      )}
      <div
        className={`max-w-[70%] ${
          isAssistant
            ? "bg-white border border-slate-200 rounded-2xl rounded-tl-sm"
            : "bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-2xl rounded-tr-sm"
        } px-5 py-3 shadow-sm`}
      >
        {isTyping ? (
          <div className="flex gap-1.5 py-1">
            <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
            <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
            <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" />
          </div>
        ) : (
          <p
            className={`whitespace-pre-wrap ${
              isAssistant ? "text-slate-800" : "text-white"
            }`}
          >
            {isAssistant ? renderWords(message.content) : message.content}
          </p>
        )}
      </div>
      {!isAssistant && (
        <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-slate-200 flex items-center justify-center">
          <User className="w-6 h-6 text-slate-600" />
        </div>
      )}
    </div>
  );
}
