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
    newStatus: "red" | "yellow" | "green" | "white",
    word: string,
    messageId: string,
    sentence: string,
    koreanMeaning?: string,
    isReturningToRed?: boolean
  ) => Promise<void>;
  onResetWordStatus?: (word: string) => void;
  onSaveImportant?: (word: WordData) => void;
  onSaveSentence?: (sentence: string) => void;
  userVocabulary?: Record<string, { status: "red" | "yellow" | "green" | "white"; koreanMeaning: string }>;
}

interface WordInteractionState {
  interactionState: "idle" | "pressing" | "menu-open";
  activeDirection: "none" | "left" | "right" | "bottom" | "top";
  selectedWord: {
    index: number;
    word: string;
    startX: number;
    startY: number;
  } | null;
  menuPosition: {
    x: number;
    y: number;
  } | null;
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
  onPointerMove,
  onPointerUp,
  setIsHolding,
  interactionState,
  radialMenu,
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
  onPointerMove: (e: React.PointerEvent) => void;
  onPointerUp: (wordIndex: number) => void;
  setIsHolding: React.Dispatch<React.SetStateAction<Record<number, boolean>>>;
  interactionState: WordInteractionState;
  radialMenu: RadialMenuState;
}) => {
  const longPressHandlers = useLongPress({
    onLongPress: (e) => {
      setIsHolding((prev) => ({ ...prev, [wordIndex]: true }));
      onLongPress(e, wordIndex, finalWord);
    },
    onClick: (e) => {
      if (interactionState.interactionState === "idle") {
        e.stopPropagation();
        onClick(wordIndex, finalWord);
      }
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
    return "#d1d5db"; // gray-300
  };

  return (
    <span
      key={partIndex}
      {...longPressHandlers}
      onPointerMove={(e) => {
        // 래디얼 메뉴가 열려있을 때는 방향 감지 (전역 이벤트)
        if (radialMenu.showRadialMenu) {
          onPointerMove(e);
        } else {
          // 래디얼 메뉴가 닫혀있을 때는 롱프레스 훅의 move만 실행
          longPressHandlers.onPointerMove?.(e);
        }
      }}
      onPointerUp={(e) => {
        // 래디얼 메뉴가 열려있을 때는 전역 핸들러 사용
        if (radialMenu.showRadialMenu) {
          onPointerUp(wordIndex);
        } else {
          // 래디얼 메뉴가 닫혀있을 때는 롱프레스 훅의 up 실행
          longPressHandlers.onPointerUp?.(e);
          onPointerUp(wordIndex);
        }
      }}
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

export function ChatMessage({
  message,
  isTyping = false,
  onUpdateWordStatus,
  onResetWordStatus,
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
      menuPosition: null,
    });
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
    status: "red" | "yellow" | "green" | "white";
    messageId: string;
    fullSentence: string;
  } | null>(null);

  const startPosRef = useRef<{ x: number; y: number } | null>(null);
  const radialMenuRef = useRef<HTMLDivElement | null>(null);

  // 전역 클릭 리스너: 래디얼 메뉴 외부 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | PointerEvent) => {
      if (radialMenu.showRadialMenu) {
        const target = event.target as HTMLElement;
        // 래디얼 메뉴 요소 내부가 아닌 경우에만 닫기
        setRadialMenu({
          showRadialMenu: false,
          menuCenter: null,
          selectedWordData: null,
        });
        setInteractionState((prev) => ({
          ...prev,
          interactionState: "idle",
          activeDirection: "none",
          selectedWord: null,
          menuPosition: null,
        }));
      }
    };

    // 이벤트 리스너 등록
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("pointerdown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("pointerdown", handleClickOutside);
    };
  }, [radialMenu.showRadialMenu]);

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
      } else {
        // 전역 단어장에 없으면 0(White)으로 명시적 설정 (동기화 보장)
        newWordStates[wordIndex] = 0;
      }

      wordIndex++;
    });

    // 기존 상태와 병합 (전역 상태를 우선시하여 덮어쓰기)
    setWordStates((prev) => {
      const merged = { ...prev };
      Object.keys(newWordStates).forEach((key) => {
        const numKey = parseInt(key);
        merged[numKey] = newWordStates[numKey];
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

  // 단어 클릭 (짧은 탭) - 색상 순환 및 상태 업데이트
  const handleWordClick = useCallback(async (index: number, word: string) => {
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

    // Use ref to get current state without adding dependency
    const currentState = wordStatesRef.current[index] || 0;
    let nextState: number;

    // 순환 로직: 0(White/없음) -> 1(red) -> 2(yellow) -> 3(green) -> 0(White) -> 1(red) ...
    if (currentState === 0) {
      nextState = 1; // White/없음 -> red
    } else if (currentState === 3) {
      nextState = 0; // green -> White/없음 (초기화)
    } else {
      nextState = currentState + 1; // red -> yellow -> green
    }

    // 1. 즉시 로컬 상태 업데이트 (UI 반응성 향상)
    setWordStates((prev) => {
      const newStates = { ...prev };
      newStates[index] = nextState;
      return newStates;
    });

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
      // Red, Yellow, Green 상태 업데이트
      else if (onUpdateWordStatus && nextState > 0) {
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
  }, [isAssistant, isTyping, interactionState.interactionState, message.id, message.content, onResetWordStatus, onUpdateWordStatus]);

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

    // 기존 interactionState도 업데이트 (기존 메뉴와의 호환성)
    setInteractionState((prev) => ({
      ...prev,
      interactionState: "menu-open",
      menuPosition: {
        x: clickX,
        y: clickY,
      },
      selectedWord: {
        index: wordIndex,
        word,
        startX: clickX,
        startY: clickY,
      },
    }));

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
    if (radialMenu.showRadialMenu) return;

    // 기존 메뉴 로직 (호환성 유지)
    if (
      interactionState.interactionState !== "menu-open" ||
      !startPosRef.current
    )
      return;

    const deltaX = e.clientX - startPosRef.current.x;
    const deltaY = e.clientY - startPosRef.current.y;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    if (distance > 20) {
      const angleRad = Math.atan2(deltaY, deltaX);
      let angleDeg = angleRad * (180 / Math.PI);
      if (angleDeg < 0) {
        angleDeg += 360;
      }

      let direction: "left" | "right" | "bottom" | "top" | "none" = "none";

      if ((angleDeg >= 315 && angleDeg <= 360) || (angleDeg >= 0 && angleDeg <= 45)) {
        direction = "right";
      } else if (angleDeg >= 45 && angleDeg <= 135) {
        direction = "bottom";
      } else if (angleDeg >= 135 && angleDeg <= 225) {
        direction = "left";
      } else if (angleDeg >= 225 && angleDeg < 315) {
        direction = "top";
      }

      setInteractionState((prev) => ({
        ...prev,
        activeDirection: direction,
      }));
    } else {
      setInteractionState((prev) => ({
        ...prev,
        activeDirection: "none",
      }));
    }
  }, [radialMenu.showRadialMenu, interactionState.interactionState]);

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
    setInteractionState((prev) => ({
      ...prev,
      interactionState: "idle",
      activeDirection: "none",
      selectedWord: null,
      menuPosition: null,
    }));
  }, [radialMenu.selectedWordData, onSaveSentence, onSaveImportant, message.content, message.id, userVocabulary]);

  // Pointer Up - 제스처 완료 또는 취소
  const handlePointerUp = useCallback((wordIndex?: number) => {
    // 홀딩 상태 해제
    if (wordIndex !== undefined) {
      setIsHolding((prev) => {
        const updated = { ...prev };
        delete updated[wordIndex];
        return updated;
      });
    }
    setHighlightWord(null);
  }, []);

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
    // 힌디어, 아랍어, 태국어 등 포함
    return /[\p{L}\p{N}]/u.test(cleaned);
  };

  const renderWords = (text: string) => {
    let parts: string[] = [];

    // Use Intl.Segmenter for intelligent word segmentation (supports CJK, etc.)
    if (typeof Intl !== 'undefined' && 'Segmenter' in Intl) {
      const segmenter = new (Intl as any).Segmenter(undefined, { granularity: 'word' });
      const segments = segmenter.segment(text);
      for (const { segment } of segments) {
        parts.push(segment);
      }
    } else {
      // Fallback for older browsers: split by whitespace and punctuation
      parts = text.split(/([\s\n.,?!;:()\[\]{}"'`，。？！、：；“”‘’（）《》【】]+)/);
    }

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
      const isSelected =
        interactionState.selectedWord?.index === currentWordIndex;
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
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          setIsHolding={setIsHolding}
          interactionState={interactionState}
          radialMenu={radialMenu}
        />
      );
    });
  };

  return (
    <>
      {/* 래디얼 메뉴 */}
      {radialMenu.showRadialMenu && radialMenu.menuCenter && (
        <RadialMenu
          center={radialMenu.menuCenter}
          isOpen={radialMenu.showRadialMenu}
          onClose={() => {
            setRadialMenu({
              showRadialMenu: false,
              menuCenter: null,
              selectedWordData: null,
            });
          }}
          onSelect={handleRadialSelect}
          selectedWord={radialMenu.selectedWordData?.word || ""}
          showDelete={false}
          variant="chat"
        />
      )}

      <div
        className={`flex gap-4 ${isAssistant ? "justify-start" : "justify-end"}`}
      >
        {isAssistant && (
          <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-md">
            <Bot className="w-6 h-6 text-white" />
          </div>
        )}
        <div
          className={`max-w-[70%] ${isAssistant
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
              className={`whitespace-pre-wrap ${isAssistant ? "text-slate-800" : "text-white"
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

      {/* Word Detail Modal */}
      <WordDetailModal
        open={!!selectedDetailWord}
        onOpenChange={(open) => !open && setSelectedDetailWord(null)}
        word={selectedDetailWord?.word || ""}
        koreanMeaning={selectedDetailWord?.koreanMeaning || ""}
        status={selectedDetailWord?.status || "white"}
        onGenerateStudyTips={generateStudyTips}
        onUpdateWordStatus={(word, newStatus) => {
          if (selectedDetailWord && onUpdateWordStatus) {
            onUpdateWordStatus(
              `${selectedDetailWord.messageId}-${word}`,
              newStatus,
              word,
              selectedDetailWord.messageId,
              selectedDetailWord.fullSentence
            );
            // Update local state to reflect change immediately in modal
            setSelectedDetailWord(prev => prev ? { ...prev, status: newStatus } : null);
          }
        }}
      />
    </>
  );
}
