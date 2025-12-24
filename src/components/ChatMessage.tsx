import React, { useState, useRef, useEffect, useCallback } from "react";
import { Bot, User, ArrowLeft, ArrowRight, ArrowDown, ArrowUp, RotateCcw, Languages } from "lucide-react";
import { EternalLogo } from "./EternalLogo";
import { toast } from "../services/toast";
import { useLongPress } from "../hooks/useLongPress";
import { WordDetailModal } from "./WordDetailModal";
import { WordOptionMenu, type WordOptionType } from "./WordOptionMenu";
import { format } from "date-fns";
import { generateStudyTips, generateText } from "../services/gemini";
import type { WordData, VocabularyEntry } from "../types";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  images?: string[];
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
  userVocabulary?: Record<string, VocabularyEntry>;
  learningMode?: 'knowledge' | 'language';
}

// Helper function for styles
const getWordStyle = (state: number) => {
  switch (state) {
    case 1:
      return {
        className: "group",
        style: {},
      };
    default:
      return { className: "", style: {} };
  }
};

// 단어 컴포넌트 (롱프레스 훅 사용)
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
  startOffset,
  koreanMeaning,
  onRedSignalClick,
  isBold,
  isSaved,
}: {
  part: string;
  partIndex: number;
  wordIndex: number;
  finalWord: string;
  wordState: number;
  isSelected: boolean;
  isCurrentlyHolding: boolean;
  isHighlighted: boolean;
  onLongPress: (e: React.PointerEvent, wordIndex: number, word: string, startOffset: number) => void;
  onClick: (index: number, word: string) => void;
  setIsHolding: React.Dispatch<React.SetStateAction<Record<number, boolean>>>;
  startOffset: number;
  koreanMeaning?: string;
  onRedSignalClick: (word: string) => Promise<void>;
  isBold?: boolean;
  isSaved?: boolean;
}) => {

  // ...
  const [isProcessing, setIsProcessing] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);

  const longPressHandlers = useLongPress({
    onLongPress: (e) => {
      setIsHolding((prev) => ({ ...prev, [wordIndex]: true }));
      onLongPress(e, wordIndex, finalWord, startOffset);
    },
    onClick: (e) => {
      e.stopPropagation();
      onClick(wordIndex, finalWord);
    },
    delay: 500,
    threshold: 10,
  });

  const styleInfo = getWordStyle(wordState);

  const getHoldingBackgroundColor = (): string => {
    if (!isCurrentlyHolding) return (styleInfo.style as any).backgroundColor || "transparent";
    if (wordState === 1) return "#fca5a5";
    if (wordState === 2) return "#fde047";
    if (wordState === 3) return "#86efac";
    if (wordState === 4) return "#93c5fd";
    return "#d1d5db";
  };

  return (
    <span
      key={partIndex}
      {...longPressHandlers}
      onContextMenu={(e) => e.preventDefault()}
      onPointerLeave={(e) => {
        longPressHandlers.onPointerLeave?.(e);
        setIsHolding((prev) => {
          const updated = { ...prev };
          delete updated[wordIndex];
          return updated;
        });
      }}
      className={`inline whitespace-pre-wrap px-0.5 cursor-pointer relative align-baseline ${wordState > 0 ? styleInfo.className : "hover:bg-slate-100 rounded"
        } ${isCurrentlyHolding
          ? "scale-[0.98] shadow-inner font-medium text-white"
          : ""
        } ${isHighlighted
          ? "ring-2 ring-blue-500 shadow-lg shadow-blue-500/40 animate-pulse"
          : ""
        } ${isBold ? "font-bold text-blue-300" : ""}`}

      style={{
        userSelect: "none",
        WebkitUserSelect: "none",
        MozUserSelect: "none",
        msUserSelect: "none",
        WebkitTouchCallout: "none",
        touchAction: "manipulation",
        ...styleInfo.style,
        backgroundColor: getHoldingBackgroundColor(),
        transform: isCurrentlyHolding ? 'scale(0.98)' : 'scale(1)',
      }}
    >
      <span>{cleanMarkdown(part, false)}</span>
      {wordState === 1 && (
        <span
          onPointerDown={(e) => e.stopPropagation()}
          onPointerUp={async (e) => {
             e.stopPropagation();
             if (isSaved) return; // Already saved
             if (isProcessing) return;
             setIsProcessing(true);
             try {
                await onRedSignalClick(finalWord);
                setIsConfirmed(true); 
             } catch (err) {
                console.error(err);
             } finally {
                setIsProcessing(false);
             }
          }}
          className={`absolute -top-0.5 -right-0.5 flex shrink-0 rounded-full transition-all duration-300 ${
            isSaved ? "bg-[#FF3B30] scale-100 opacity-100" : 
            (isConfirmed ? "opacity-0 invisible" : (isProcessing ? "bg-blue-500 scale-125" : "bg-[#FF3B30] animate-pulse"))
          } ${isSaved ? "cursor-default" : "cursor-pointer"}`}
          style={{
            display: 'inline-block',
            width: isSaved ? "4.5px" : "4px",
            height: isSaved ? "4.5px" : "4px",
            boxShadow: isSaved ? "0 0 3px rgba(255, 59, 48, 0.4)" : (isProcessing ? "0 0 8px #3b82f6" : "0 0 6px rgba(255, 59, 48, 0.4)"),
            pointerEvents: 'auto'
          }}
        />
      )}


      
      {/* Tooltip */}
      {wordState === 1 && (
         <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 text-xs font-medium text-white bg-zinc-800/90 backdrop-blur-sm rounded-lg shadow-xl opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100 transition-all duration-200 pointer-events-none whitespace-nowrap z-50 border border-white/10">
            {koreanMeaning || "뜻을 불러오는 중..."}
            <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-zinc-800/90 rotate-45 transform border-r border-b border-white/10" />
         </span>
      )}
    </span>
  );
});

// 마크다운 제거 함수 (Display용)
const cleanMarkdown = (text: string, trim = true): string => {
  // Bold, Header, Backticks 등 모든 특수문자 제거하고 텍스트만 남김
  const cleaned = text
    .replace(/\*\*/g, "")
    .replace(/\*/g, "")
    .replace(/`/g, "")
    .replace(/#{1,6}\s/g, "")
    .replace(/\[.*\]\(.*\)/g, "") // 링크 제거
    .replace(/[\[\]]/g, ""); // 대괄호 제거
  
  return trim ? cleaned.trim() : cleaned;
};

const isMeaningfulWord = (text: string): boolean => {
  const cleaned = cleanMarkdown(text);
  return /[\p{L}\p{N}]/u.test(cleaned);
};

const getSegments = (text: string) => {
  let parts: string[] = [];
  if (typeof Intl !== 'undefined' && 'Segmenter' in Intl) {
    const segmenter = new (Intl as any).Segmenter(undefined, { granularity: 'word' });
    const segments = segmenter.segment(text);
    for (const { segment } of segments) {
      parts.push(segment);
    }
  } else {
    parts = text.split(/([\s\n.,?!;:()\[\]{}"'`，。？！、：；“”‘’（）《》【】]+)/);
  }
  return parts;
};

const processPart = (part: string) => {
  if (/^[\s\n.,?!;:()\[\]{}"'`，。？！、：；“”‘’（）《》【】]+$/.test(part)) {
    return { isValid: false, finalWord: '', wordKey: '' };
  }
  const isBold = part.includes('**');
  const cleanedPart = cleanMarkdown(part);
  if (!isMeaningfulWord(part)) {
    return { isValid: false, finalWord: '', wordKey: '', isBold: false };
  }
  const finalWord = cleanedPart.trim().split(/[\s\n.,?!;:()\[\]{}"'`]+/)[0];
  if (!finalWord || finalWord.length < 2) {
    return { isValid: false, finalWord: '', wordKey: '', isBold: false };
  }
  return { isValid: true, finalWord, wordKey: finalWord.toLowerCase(), isBold };
};

export function ChatMessage({
  message,
  isTyping = false,
  onUpdateWordStatus,
  onResetWordStatus,
  onSaveImportant,
  onSaveSentence,
  userVocabulary = {},
  learningMode = 'knowledge',
}: ChatMessageProps) {
  const isAssistant = message.role === "assistant";
  const [wordStates, setWordStates] = useState<Record<number, number>>({});
  const [isHolding, setIsHolding] = useState<Record<number, boolean>>({});
  const [highlightWord, setHighlightWord] = useState<number | null>(null);
  const [translation, setTranslation] = useState<string | null>(null);

  useEffect(() => {
    if (learningMode === 'language' && isAssistant && !isTyping && !translation && message.content && message.content.length > 0) {
      const timer = setTimeout(() => {
        generateText(`Translate the following English text to natural Korean. Output only the Korean translation:\n\n"${message.content}"`)
          .then(text => setTranslation(text))
          .catch(err => console.error("Auto-translation failed:", err));
      }, 500); // 딜레이를 주어 너무 빠른 요청 방지
      return () => clearTimeout(timer);
    }
  }, [learningMode, isAssistant, isTyping, translation, message.content]);

  const [radialMenu, setRadialMenu] = useState<{
    showRadialMenu: boolean;
    menuCenter: { x: number; y: number } | null;
    selectedWordData: {
      index: number;
      word: string;
      wordId: string;
      startOffset: number;
    } | null;
  }>({
    showRadialMenu: false,
    menuCenter: null,
    selectedWordData: null,
  });

  const [selectedDetailWord, setSelectedDetailWord] = useState<{
    word: string;
    koreanMeaning: string;
    status: "red" | "yellow" | "green" | "white" | "orange";
    messageId: string;
    fullSentence: string;
    wordId: string;
  } | null>(null);

  const updateTimeouts = useRef<Record<number, ReturnType<typeof setTimeout>>>({});
  const pendingUpdates = useRef<Record<string, number>>({});
  const wordStatesRef = useRef(wordStates);

  // Phrase collection for auto-merge
  const lastClickedWordRef = useRef<{ word: string; index: number; time: number } | null>(null);
  const [phraseCollection, setPhraseCollection] = useState<string[]>([]);
  const [showPhrasePrompt, setShowPhrasePrompt] = useState(false);

  useEffect(() => {
    wordStatesRef.current = wordStates;
  }, [wordStates]);

  // Phrase merge handlers
  const confirmPhraseMerge = async () => {
    if (phraseCollection.length >= 2 && onUpdateWordStatus) {
      const phrase = phraseCollection.join(' ');
      const wordId = `${message.id}-phrase-${phrase.toLowerCase().replace(/\s+/g, '-')}`;
      
      try {
        // 1. 합쳐진 구문 저장
        await onUpdateWordStatus(
          wordId,
          "red",
          phrase,
          message.id,
          message.content,
          "",
          false
        );

        // 2. 개별 단어들을 구문에 연결 (그냥 두면 됨, onUpdateWordStatus가 이미 처리하거나 
        // 앱이 handleMergeWords를 통해 처리해야 함)
        // 여기서는 개별 단어들의 상태를 'red'로 유지하여 하이라이팅이 유지되게 함
        // (onResetWordStatus를 호출하면 하이라이팅이 사라짐)
        
        toast.success(`✨ "${phrase}" 저장됨!`);

      } catch (error) {
        console.error(error);
      }
    }
    setShowPhrasePrompt(false);
    setPhraseCollection([]);
    lastClickedWordRef.current = null;
  };

  const cancelPhraseMerge = () => {
    setShowPhrasePrompt(false);
    setPhraseCollection([]);
    lastClickedWordRef.current = null;
  };

  const handleWordClick = useCallback(async (index: number, word: string) => {
    if (!isAssistant || isTyping) return;

    const cleanWord = cleanMarkdown(word);
    if (!isMeaningfulWord(word)) return;
    const finalWord = cleanWord.trim().split(/[\s\n.,?!;:()\[\]{}"'`]+/)[0];
    if (!finalWord || finalWord.length < 2) return;

    const now = Date.now();
    const lastClick = lastClickedWordRef.current;
    
    // Check for consecutive click within 2 seconds
    if (lastClick && now - lastClick.time < 2000 && lastClick.word !== finalWord) {
      // Consecutive click detected - show merge prompt
      // Cancel the first word's pending save
      if (updateTimeouts.current[lastClick.index]) {
        clearTimeout(updateTimeouts.current[lastClick.index]);
        delete updateTimeouts.current[lastClick.index];
      }
      // Revert the first word's visual state
      setWordStates((prev) => {
        const newStates = { ...prev };
        delete newStates[lastClick.index];
        return newStates;
      });
      // Remove from pending updates
      delete pendingUpdates.current[lastClick.word.toLowerCase()];
      
      setPhraseCollection([lastClick.word, finalWord]);
      setShowPhrasePrompt(true);
      lastClickedWordRef.current = null;
      return;
    }
    
    // Record this click
    lastClickedWordRef.current = { word: finalWord, index, time: now };

    const currentState = wordStatesRef.current[index] || 0;
    const nextState = currentState === 1 ? 0 : 1;

    setWordStates((prev) => {
      const newStates = { ...prev };
      newStates[index] = nextState;
      return newStates;
    });

    pendingUpdates.current[finalWord.toLowerCase()] = nextState;

    if (updateTimeouts.current[index]) {
      clearTimeout(updateTimeouts.current[index]);
    }

    updateTimeouts.current[index] = setTimeout(async () => {
      if (nextState === 0) {
        if (onResetWordStatus) {
          try {
            await Promise.resolve(onResetWordStatus(finalWord));
            // No toast - just visual change
          } catch (error) {
            console.error(error);
          }
        }
      } else if (onUpdateWordStatus && nextState > 0) {
        const statusMap: Record<number, "red" | "yellow" | "green" | "orange"> = {
          1: "red", 2: "yellow", 3: "green", 4: "orange",
        };
        const wordId = `${message.id}-${index}-${finalWord.toLowerCase()}`;

        try {
          await onUpdateWordStatus(
            wordId,
            statusMap[nextState],
            finalWord,
            message.id,
            message.content,
            "",
            false
          );
          // No toast - just visual red dot appears
        } catch (error) {
          console.error(error);
        }
      }
      delete updateTimeouts.current[index];
    }, 600);
  }, [isAssistant, isTyping, message.id, message.content, onResetWordStatus, onUpdateWordStatus]);

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
            state = pendingState;
          }
        } else {
          state = pendingState;
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

    // Completely recalculate wordStates based on userVocabulary (no merge with prev)
    // This ensures that when userVocabulary is cleared, wordStates is also cleared
    setWordStates(newWordStates);
  }, [userVocabulary, message.content, isAssistant, isTyping]);

  const handleLongPress = useCallback((e: React.PointerEvent, wordIndex: number, word: string, startOffset: number) => {
    if (!isAssistant || isTyping) return;

    const clickX = e.clientX;
    const clickY = e.clientY;

    setHighlightWord(wordIndex);
    if (navigator.vibrate) navigator.vibrate(50);

    const cleanWord = cleanMarkdown(word);
    const finalWord = cleanWord.trim().split(/[\s\n.,?!;:()\[\]{}"'`]+/)[0];

    setRadialMenu({
      showRadialMenu: true,
      menuCenter: { x: clickX, y: clickY },
      selectedWordData: {
        index: wordIndex,
        word: finalWord,
        wordId: `${message.id}-${wordIndex}-${finalWord.toLowerCase()}`,
        startOffset,
      },
    });

    setIsHolding((prev) => {
      const updated = { ...prev };
      delete updated[wordIndex];
      return updated;
    });

    setTimeout(() => {
      setHighlightWord(null);
    }, 100);
  }, [isAssistant, isTyping, message.id]);

  const handleOptionSelect = useCallback((option: WordOptionType) => {
    const selectedWordData = radialMenu.selectedWordData;
    if (!selectedWordData) return;

    const { word: finalWord, wordId, startOffset } = selectedWordData;

    switch (option) {
      case "sentence":
        if (onSaveSentence && finalWord && finalWord.length >= 2) {
          const fullText = message.content;
          const targetOffset = startOffset;
          const sentenceRegex = /([.?!](?:\s+|$)|(?:\r?\n){2,})/;
          const parts = fullText.split(sentenceRegex);
          let currentPos = 0;
          let foundSentence = "";

          for (let i = 0; i < parts.length; i++) {
            const part = parts[i];
            const partLength = part.length;
            const endPos = currentPos + partLength;
            if (targetOffset >= currentPos && targetOffset < endPos) {
              foundSentence = part;
              break;
            }
            currentPos += partLength;
          }

          const selection = window.getSelection()?.toString().trim();
          if (selection && selection.length > 5) {
            onSaveSentence(selection);
            toast.success(`선택한 문장이 저장되었습니다.`);
            return;
          }

          const targetSentence = foundSentence.trim() || message.content;
          if (targetSentence) {
            onSaveSentence(targetSentence.trim());
            toast.success(`문장이 저장되었습니다.`);
          }
        }
        break;
      case "tts":
        if (window.speechSynthesis && finalWord && finalWord.length >= 2) {
          const utterance = new SpeechSynthesisUtterance(finalWord);
          utterance.lang = "en-US";
          window.speechSynthesis.speak(utterance);
        } else {
          toast.error("음성 재생을 지원하지 않는 브라우저입니다.");
        }
        break;
      case "detail":
        if (finalWord && finalWord.length >= 2) {
          const entry = userVocabulary?.[finalWord.toLowerCase()];
          setSelectedDetailWord({
            word: finalWord,
            koreanMeaning: entry?.koreanMeaning || "",
            status: entry?.status || "white",
            messageId: message.id,
            fullSentence: message.content,
            wordId: wordId,
          });
        }
        break;
      case "translate":
        // 문장 번역 - 해당 문장을 찾아서 번역 요청
        if (finalWord && finalWord.length >= 2) {
          const fullText = message.content;
          const targetOffset = startOffset;
          const sentenceRegex = /([.?!](?:\s+|$)|(?:\r?\n){2,})/;
          const parts = fullText.split(sentenceRegex);
          let currentPos = 0;
          let foundSentence = "";

          for (let i = 0; i < parts.length; i++) {
            const part = parts[i];
            const partLength = part.length;
            const endPos = currentPos + partLength;
            if (targetOffset >= currentPos && targetOffset < endPos) {
              foundSentence = part;
              break;
            }
            currentPos += partLength;
          }

          const targetSentence = foundSentence.trim() || message.content;
          if (targetSentence) {
            // 번역 API 호출 (gemini 서비스 사용)
            import("../services/gemini").then(({ generateText }) => {
              generateText(`다음 영어 문장을 한국어로 자연스럽게 번역해주세요. 번역 결과만 출력하세요:\n\n"${targetSentence}"`)
                .then(translation => {
                  toast.success(`번역: ${translation}`, { duration: 8000 });
                })
                .catch(() => {
                  toast.error("번역에 실패했습니다.");
                });
            });
            toast.info("번역 중...");
          }
        }
        break;
    }

    setRadialMenu({
      showRadialMenu: false,
      menuCenter: null,
      selectedWordData: null,
    });
  }, [radialMenu.selectedWordData, onSaveSentence, message.content, message.id, userVocabulary]);

  const renderWords = (text: string) => {
    const parts = getSegments(text);
    let wordIndex = 0;
    let charCursor = 0;

    return parts.map((part, partIndex) => {
      const currentStartOffset = charCursor;
      charCursor += part.length;
      const { isValid, finalWord, wordKey, isBold } = processPart(part);

      // Handle non-valid parts (whitespace, punctuation, symbols)
      if (!isValid) {
        // preserve formatting for newlines and spaces, but clean markdown characters
        const displayPart = cleanMarkdown(part, false);
        return <span key={partIndex} className={`align-baseline whitespace-pre-wrap ${part.includes('**') ? 'font-bold text-blue-300' : ''}`}>{displayPart}</span>;
      }

      const currentWordIndex = wordIndex;
      wordIndex++;

      const globalEntry = userVocabulary?.[wordKey];
      const pendingState = pendingUpdates.current[wordKey];
      const localState = wordStates[currentWordIndex] || 0;
      let finalState = 0;

      if (pendingState !== undefined) finalState = pendingState;
      else if (globalEntry) {
        switch (globalEntry.status) {
          case "red": finalState = 1; break;
          case "yellow": finalState = 2; break;
          case "green": finalState = 3; break;
          case "orange": finalState = 4; break;
          default: 
            // Check if this word is part of a red phrase
            if (globalEntry.linkedTo) {
               const parentEntry = userVocabulary[globalEntry.linkedTo.toLowerCase()];
               if (parentEntry?.status === 'red') finalState = 1;
            }
            break;
        }
      } else finalState = localState;


      const isSelected = radialMenu.showRadialMenu && radialMenu.selectedWordData?.index === currentWordIndex;
      const isCurrentlyHolding = isHolding[currentWordIndex] || false;
      const isHighlighted = highlightWord === currentWordIndex;

      return (
        <WordSpan
          key={partIndex}
          part={part}
          partIndex={partIndex}
          wordIndex={currentWordIndex}
          finalWord={finalWord}
          wordState={finalState}
          isSelected={isSelected}
          isCurrentlyHolding={isCurrentlyHolding}
          isHighlighted={isHighlighted}
          onLongPress={handleLongPress}
          onClick={handleWordClick}
          setIsHolding={setIsHolding}
          startOffset={currentStartOffset}
          koreanMeaning={globalEntry?.koreanMeaning}
          isBold={isBold}
          isSaved={globalEntry?.status === 'red' || (globalEntry?.linkedTo ? userVocabulary[globalEntry.linkedTo.toLowerCase()]?.status === 'red' : false)}


          onRedSignalClick={async (word) => {
              // 'Red Room' (Unknown Stack) API 호출
              // status 1(Red)로 확실히 저장.
              // 이미 Red 상태일 수 있으나, 명시적 '클릭'은 '저장/확인'의 의미.
             
              // 1. 상태 업데이트 호출
              const wordId = `${message.id}-${currentWordIndex}-${word.toLowerCase()}`;
              if (onUpdateWordStatus) {
                  await onUpdateWordStatus(
                      wordId,
                      "red",
                      word,
                      message.id,
                      message.content, // 전체 문장 (임시) - 실제로는 getFullSentence 로직 필요 가능
                      globalEntry?.koreanMeaning || "",
                      false
                  );
                  toast.success(`'${word}' 가 Red Room에 저장되었습니다.`);
              }
          }}
        />
      );
    });
  };

  return (
    <>
      {/* Phrase Merge Prompt Modal */}
      {showPhrasePrompt && phraseCollection.length >= 2 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[#1e1f20] border border-[#2a2b2c] rounded-2xl p-6 max-w-sm mx-4 shadow-xl">
            <h3 className="text-lg font-bold text-white mb-3">✨ 구 저장</h3>
            <p className="text-zinc-400 mb-4">
              다음 단어들을 하나의 구로 저장할까요?
            </p>
            <div className="flex items-center justify-center gap-2 mb-6">
              <span className="px-3 py-1.5 bg-red-600 text-white rounded-full font-bold text-sm">
                {phraseCollection[0]}
              </span>
              <span className="text-zinc-500">+</span>
              <span className="px-3 py-1.5 bg-red-600 text-white rounded-full font-bold text-sm">
                {phraseCollection[1]}
              </span>
            </div>
            <div className="flex gap-3">
              <button
                onClick={cancelPhraseMerge}
                className="flex-1 px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg transition-colors"
              >
                취소
              </button>
              <button
                onClick={confirmPhraseMerge}
                className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
              >
                저장 ✨
              </button>
            </div>
          </div>
        </div>
      )}
      
    <div className={`flex ${isAssistant ? "justify-start" : "justify-end"} mb-6`}>
      <div className={`flex flex-col ${isAssistant ? "w-full max-w-full" : "max-w-[85%]"} ${isAssistant ? "items-start" : "items-end"}`}>
        {isAssistant && (
          <div className="mb-2">
            <EternalLogo textClassName="hidden" dotClassName="w-2.5 h-2.5" onlyDot />
          </div>
        )}

        <div
          className={`relative px-5 py-4 rounded-2xl shadow-sm transition-all duration-200 ${isAssistant
            ? "bg-transparent text-zinc-50 pl-0 text-left w-full"
            : "bg-[#2a2b2c] text-white rounded-tr-2xl"
            }`}
        >
          {message.images && message.images.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {message.images.map((img, idx) => (
                <img
                  key={idx}
                  src={img}
                  alt="attached"
                  className="max-w-full h-auto rounded-lg max-h-[300px] object-cover border border-zinc-600/50"
                />
              ))}
            </div>
          )}

          {isTyping ? (
            <div className="flex gap-1.5 items-center h-6 px-2">
              <div className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
              <div className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
              <div className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce" />
            </div>
          ) : (
            <div className="text-[16px] leading-7 whitespace-pre-wrap break-words font-normal tracking-normal text-zinc-100">
              {isAssistant ? renderWords(message.content) : message.content}
            </div>
          )}

          {/* Auto Translation Display */}
          {translation && (
            <div className="mt-4 pt-3 border-t border-zinc-700/50 animate-in fade-in duration-500">
              <div className="flex items-start gap-2.5 text-zinc-300/90 text-[15px] leading-7">
                <Languages className="w-4 h-4 mt-1.5 text-blue-400 shrink-0" />
                <p>{translation}</p>
              </div>
            </div>
          )}

        </div>

        <span className="text-[11px] text-slate-400 mt-1 px-1">
          {message.timestamp instanceof Date
            ? format(message.timestamp, "HH:mm")
            : ""}
        </span>
      </div>

      <WordOptionMenu
        isOpen={radialMenu.showRadialMenu}
        word={radialMenu.selectedWordData?.word || ""}
        onClose={() => setRadialMenu(prev => ({ ...prev, showRadialMenu: false }))}
        onSelectOption={handleOptionSelect}
        hideDeleteOption={true}
      />

      {selectedDetailWord && (
        <WordDetailModal
          open={!!selectedDetailWord}
          onOpenChange={(open) => !open && setSelectedDetailWord(null)}
          word={selectedDetailWord.word}
          koreanMeaning={selectedDetailWord.koreanMeaning}
          status={selectedDetailWord.status}
          onUpdateWordStatus={async (word, newStatus) => {
            if (onUpdateWordStatus && selectedDetailWord) {
              await onUpdateWordStatus(
                selectedDetailWord.wordId,
                newStatus,
                selectedDetailWord.word,
                selectedDetailWord.messageId,
                selectedDetailWord.fullSentence,
                selectedDetailWord.koreanMeaning,
                false
              );
              setSelectedDetailWord(prev => prev ? { ...prev, status: newStatus } : null);
            }
          }}
          onGenerateStudyTips={() =>
            generateStudyTips(selectedDetailWord.word, selectedDetailWord.status)
          }
        />
      )}
    </div>
    </>
  );
}
