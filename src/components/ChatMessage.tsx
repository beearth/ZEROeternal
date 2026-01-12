import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Bot, User, ArrowLeft, ArrowRight, ArrowDown, ArrowUp, RotateCcw, Languages, Loader2 } from "lucide-react";
import { EternalLogo } from "./EternalLogo";
import { toast } from "../services/toast";
import { useLongPress } from "../hooks/useLongPress";
import { WordDetailModal } from "./WordDetailModal";
import { WordOptionMenu, type WordOptionType } from "./WordOptionMenu";
import { format } from "date-fns";
import { generateStudyTips, generateText, translateText } from "../services/gemini";
import type { WordData, VocabularyEntry } from "../types";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  images?: string[];
  translation?: string;
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
  onSaveSentence?: (sentence: string) => void;
  userVocabulary?: Record<string, VocabularyEntry>;
  learningMode?: 'knowledge' | 'language';
  nativeLang?: string;
  targetLang?: string;
  onUpdateTranslation?: (id: string, translation: string) => void;
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
// -----------------------------------------------------------------------------
// WordSpan (Optimized: No Hooks, No Event Listeners, Pure Data)
// -----------------------------------------------------------------------------
const WordSpan = React.memo(({
  part,
  partIndex,
  wordIndex,
  finalWord,
  wordState,
  isCurrentlyHolding,
  isHighlighted,
  isBold,
  koreanMeaning,
  isSaved,
  isConfirmed,
  isProcessing,
  startOffset
}: {
  part: string;
  partIndex: number;
  wordIndex: number;
  finalWord: string;
  wordState: number;
  isCurrentlyHolding: boolean;
  isHighlighted: boolean;
  isBold?: boolean;
  koreanMeaning?: string;
  isSaved?: boolean;
  isConfirmed?: boolean;
  isProcessing?: boolean;
  startOffset?: number;
}) => {
  const styleInfo = getWordStyle(wordState);

  // Inline dynamic style logic
  let holdingBg = "transparent";
  if (isCurrentlyHolding) {
    if (wordState === 1) holdingBg = "#fca5a5";
    else if (wordState === 2) holdingBg = "#fde047";
    else if (wordState === 3) holdingBg = "#86efac";
    else if (wordState === 4) holdingBg = "#93c5fd";
    else holdingBg = "#d1d5db";
  } else if ((styleInfo.style as any).backgroundColor) {
    holdingBg = (styleInfo.style as any).backgroundColor;
  }

  return (
    <span
      key={`${partIndex}-${wordIndex}`}
      data-word-index={wordIndex}
      data-part-index={partIndex}
      data-final-word={finalWord}
      data-word-state={wordState}
      data-start-offset={startOffset}
      className={`inline whitespace-pre-wrap px-0.5 cursor-pointer relative align-baseline ${wordState > 0 ? styleInfo.className : "hover:bg-slate-100 rounded"
        } ${isCurrentlyHolding
          ? "scale-[0.98] shadow-inner font-medium text-white"
          : ""
        } ${isHighlighted
          ? "ring-2 ring-blue-500 shadow-lg shadow-blue-500/40 animate-pulse"
          : ""
        } ${isBold ? "font-bold text-blue-300" : ""}`}
      style={{
        userSelect: "text",
        WebkitUserSelect: "text",
        touchAction: "manipulation",
        ...styleInfo.style,
        backgroundColor: holdingBg,
        transform: isCurrentlyHolding ? 'scale(0.98)' : 'scale(1)',
      }}
    >
      <span>{cleanMarkdown(part, false)}</span>
      
      
      <span
        data-action="status-dot"
        data-word-index={wordIndex}
        data-word-for-dot={finalWord}
        className={`absolute -top-0.5 -right-0.5 flex shrink-0 rounded-full transition-all duration-300 ${
          isSaved ? "bg-[#FF3B30] scale-100 opacity-100" : 
          (wordState >= 1 ? (isConfirmed ? "opacity-0 invisible" : (isProcessing ? "scale-125" : "animate-pulse")) : "opacity-0 invisible")
        }`}
        style={{
          display: (isSaved || wordState >= 1) ? 'inline-block' : 'none',
          width: isSaved ? "4.5px" : "4px",
          height: isSaved ? "4.5px" : "4px",
          backgroundColor: isSaved ? "#FF3B30" : (
              wordState === 1 ? "#FF3B30" :
              wordState === 2 ? "#eab308" :
              wordState === 3 ? "#22c55e" :
              wordState === 4 ? "#f97316" : "#FF3B30"
          ),
          boxShadow: isSaved ? "0 0 3px rgba(255, 59, 48, 0.4)" : (
              isProcessing ? "0 0 8px #3b82f6" : 
              `0 0 6px ${
                  wordState === 1 ? "rgba(255, 59, 48, 0.4)" :
                  wordState === 2 ? "rgba(234, 179, 8, 0.4)" :
                  wordState === 3 ? "rgba(34, 197, 94, 0.4)" :
                  "rgba(249, 115, 22, 0.4)"
              }`
          ),
          pointerEvents: 'auto'
        }}
      />

      {/* Meanings Tooltip */}
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
  if (!finalWord || finalWord.length < 1) { // Allow length 1 words (e.g. "I", "a", Korean syllables)
    return { isValid: false, finalWord: '', wordKey: '', isBold: false };
  }
  return { isValid: true, finalWord, wordKey: finalWord.toLowerCase(), isBold };
};

export function ChatMessage({
  message,
  isTyping = false,
  onUpdateWordStatus,
  onResetWordStatus,
  onSaveSentence,
  userVocabulary = {},
  learningMode = 'knowledge',
  nativeLang = 'ko',
  targetLang = 'en',
  onUpdateTranslation,
}: ChatMessageProps) {
  const isAssistant = message.role === "assistant";
  const [wordStates, setWordStates] = useState<Record<number, number>>({});
  const [isHolding, setIsHolding] = useState<Record<number, boolean>>({});
  const [highlightWord, setHighlightWord] = useState<number | null>(null);
  const [translation, setTranslation] = useState<string | null>(message.translation || null);
  const [isTranslating, setIsTranslating] = useState(false);

  // Status dot animation state
  // - idle (red): message just created, waiting
  // - loading (yellow): AI is processing
  // - complete (green): AI response received - stays green permanently
  const [dotStatus, setDotStatus] = useState<'idle' | 'loading' | 'complete'>(
    message.content && !isTyping ? 'complete' : 'idle'
  );

  // Handle typing state transitions for dot animation: Red → Yellow → Green
  useEffect(() => {
    if (!isTyping && message.content) {
      // AI finished - show green (stays green permanently)
      setDotStatus('complete');
    } else if (isTyping) {
      // AI is processing - start with red briefly, then show yellow
      setDotStatus('idle'); // Show red first
      const timer = setTimeout(() => {
        setDotStatus('loading'); // After 1 second, switch to yellow
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [isTyping, message.content]);

  // Sync translation from props (DB persistence)
  useEffect(() => {
    if (message.translation) {
        setTranslation(message.translation);
    }
  }, [message.translation]);

  /* 
   * 🛡️ TRANSLATION LOGIC WITH DEDUPLICATION (Fixes 429 Errors)
   */
  const [translationError, setTranslationError] = useState(false);
  const lastRequestKeyRef = useRef<string | null>(null);

  const performTranslation = useCallback(async () => {
    // Basic guards
    // [OPTIMIZATION] Disabled auto-translation to save API usage
    return; 
    
    /*
    if (isTranslating || !message.content || isTyping) return;
    
    
    const target = targetLang || 'en';
    // Create a unique signature for this translation request
    const currentKey = `${message.id}_${message.content.length}_${target}`;
    
    // 1. Strict Deduplication: If we already processed this key, STOP immediately.
    if (lastRequestKeyRef.current === currentKey) {
        return;
    }

    // 2. Block Same-Language
    const hasKorean = /[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(message.content);
    if ((hasKorean && target === 'ko') || (!hasKorean && target !== 'ko')) {
        lastRequestKeyRef.current = currentKey; // Mark as processed so we don't check again
        return;
    }

    // 3. Start Translation
    lastRequestKeyRef.current = currentKey; // Lock this request!
    setIsTranslating(true);
    setTranslationError(false);
    
    try {
        const result = await translateText(message.content, target);
        if (result && result.trim() && result.trim() !== message.content.trim()) {
            setTranslation(result.trim());
            if (onUpdateTranslation) onUpdateTranslation(message.id, result.trim());
        }
    } catch (err) {
        console.error("Translation failed:", err);
        setTranslationError(true);
        // Do NOT clear lastRequestKeyRef on error to prevent infinite retry loops (429 protection)
    } finally {
        setIsTranslating(false);
    }
    */
  }, [message.content, message.id, targetLang, onUpdateTranslation, isTranslating, isTyping]);

  // Single Effect to trigger translation
  useEffect(() => {
    if (isTyping || !message.content) return;
    
    // Skip old messages (>10 mins)
    const timeSinceCreated = Date.now() - new Date(message.timestamp).getTime();
    if (timeSinceCreated > 600000) return; 

    // Debounce slightly to prevent flicker
    // const timer = setTimeout(performTranslation, 500);
    // return () => clearTimeout(timer);
  }, [isTyping, message.content, message.timestamp, targetLang, performTranslation]); // targetLang dependency is key!

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
    if (!finalWord || finalWord.length < 1) return;

    const now = Date.now();
    // Check for "Click + Hold" Coupling
    // If a word is already being held (via long press), clicking another word couples them.
    const heldWordEntries = Object.entries(isHolding).filter(([_, held]) => held);
    
    if (heldWordEntries.length > 0) {
       // We have a word being held!
       const [heldIndexStr] = heldWordEntries[0];
       const heldIndex = parseInt(heldIndexStr);
       
       // Don't merge with itself
       if (heldIndex === index) return;
       
       // Get the held word text (we need to retrieve it from wordStates or pass it differently, 
       // but for now let's assume we can get it or just use the current mechanism)
       // Since we don't have the held word's text easily accessible here without lookups,
       // we might need to store it in `isHolding` or a separate state.
       // However, looking at handleLongPress, we only set `isHolding`. 
       
       // Let's use a simpler approach: 
       // If isHolding is true, we need to find WHICH word is held.
       // The `isHolding` state is Record<number, boolean>.
       
       // NOTE: To make this robust, we should probably store the held word's TEXT in state too, 
       // but let's try to infer it or just use the current interaction flow.
       
       // Actually, the user's previous request implies they want:
       // 1. Long Press Word A -> "Holding" state (visual feedback).
       // 2. Click Word B -> "Do you want to merge 'A' and 'B'?"
       
       // Current `isHolding` is set in `handleLongPress`.
       // We need to access the text of the word at `heldIndex`. 
       // But `renderWords` generates the text on the fly. 
       // We might need to store `heldWordText` in state.
       
       // ERROR: We don't have `heldWordText` in state.
       // Correct fix: Update `handleLongPress` to store the text, OR
       // just show the prompt and let the user confirm? No, we need the text.
       
       // Let's assume for this "Restore" that `radialMenu.selectedWordData` might help?
       // `handleLongPress` sets `radialMenu`. 
       // If `radialMenu.showRadialMenu` is true, we have the word!
       
       if (radialMenu.showRadialMenu && radialMenu.selectedWordData) {
          const heldWord = radialMenu.selectedWordData.word;
           
          setPhraseCollection([heldWord, finalWord]);
          setShowPhrasePrompt(true);
          
          // Reset holding/menu state
          setRadialMenu(prev => ({ ...prev, showRadialMenu: false, selectedWordData: null }));
          setIsHolding({}); 
          return;
       }
    }
    
    // Record this click for potential "Click + Hold" coupling
    lastClickedWordRef.current = { word: finalWord, index, time: now };

    const wordKey = finalWord.toLowerCase();
    
    // Determine current state aggressively to prevent stale clicks
    // 1. Check pending updates (synchronous source of truth for rapid clicks)
    // 2. Fallback to rendered state
    let currentState = 0;
    if (pendingUpdates.current[wordKey] !== undefined) {
        currentState = pendingUpdates.current[wordKey];
    } else {
        currentState = wordStatesRef.current[index] || 0;
    }

    // Cycle: 0(None) -> 1(Red) -> 2(Yellow) -> 3(Green) -> 0(None)
    const nextState = (currentState >= 3) ? 0 : currentState + 1;

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
    
    const cleanWord = cleanMarkdown(word);
    const finalWord = cleanWord.trim().split(/[\s\n.,?!;:()\[\]{}"'`]+/)[0];

    // --- CLICK + HOLD LOGIC (Step Id: 90) ---
    // If user clicked a word recently (lastClickedWordRef), AND now Holds this word:
    // Trigger Merge.
    const lastClick = lastClickedWordRef.current;
    const now = Date.now();
    
    // Check key requirements:
    // 1. Last click exists
    // 2. Not too old (e.g. < 5 seconds to be generous)
    // 3. Different word
    if (lastClick && (now - lastClick.time < 5000) && lastClick.word !== finalWord) {
       // Trigger Merge Prompt
       setPhraseCollection([lastClick.word, finalWord]);
       setShowPhrasePrompt(true);
       
       // Clear last click so we don't trigger again essentially
       lastClickedWordRef.current = null;
       
       // Reset holding state that triggered this
       setIsHolding((prev) => {
          const updated = { ...prev };
          delete updated[wordIndex];
          return updated;
       });
       
       return; // SKIP RADIAL MENU
    }
    // ----------------------------------------

    setHighlightWord(wordIndex);
    if (navigator.vibrate) navigator.vibrate(50);


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

          // Handle selected text if available (highest priority)
          const selection = window.getSelection()?.toString().trim();
          if (selection && selection.length > 5) {
            onSaveSentence(selection);
            toast.success(`선택한 문장이 저장되었습니다.`);
            return;
          }

          // Extract full line (newline to newline) - priority over sentence boundaries
          const beforeText = fullText.substring(0, targetOffset);
          const afterText = fullText.substring(targetOffset);

          // Find line boundaries (newlines only)
          const lineStartMatch = beforeText.lastIndexOf('\n');
          const lineStart = lineStartMatch !== -1 ? lineStartMatch + 1 : 0;

          const lineEndMatch = afterText.indexOf('\n');
          const lineEnd = lineEndMatch !== -1 ? targetOffset + lineEndMatch : fullText.length;

          let foundSentence = fullText.substring(lineStart, lineEnd).trim();

          // Clean up: remove leading numbers/bullets like "1.", "→", "-", etc.
          foundSentence = foundSentence.replace(/^[\d]+\.\s*/, '').replace(/^[→\-•]\s*/, '').trim();

          if (foundSentence) {
            onSaveSentence(foundSentence);
            toast.success(`문장이 저장되었습니다.`);
          } else {
            // Fallback to whole content if extraction fails
            onSaveSentence(message.content.trim());
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
    }

    setRadialMenu({
      showRadialMenu: false,
      menuCenter: null,
      selectedWordData: null,
    });
  }, [radialMenu.selectedWordData, onSaveSentence, message.content, message.id, userVocabulary]);

  // Deep Optimization: Pre-calculate all token metadata to skip Regex on render
  const messageProcessedParts = useMemo(() => {
      if (!message.content) return [];
      return getSegments(message.content).map(part => {
          const { isValid, finalWord, wordKey, isBold } = processPart(part); // Heavy Regex
          const displayPart = cleanMarkdown(part, false); // Regex
          
          return { part, isValid, finalWord, wordKey, isBold, shouldDisable: false, displayPart };
      });
  }, [message.content]);

  // Memoize word rendering to prevent lag on clicks
  // Accepts pre-calculated parts to avoid re-processing
  const renderWords = (text: string, initialWordIndex: number = 0, precomputedParts?: any[]) => {
    if (!text) return null;
    
    let wordIndex = initialWordIndex;
    let charCursor = 0;
    
    // Use precomputed parts if available, otherwise calculate on the fly (Legacy/Translation path)
    const items = precomputedParts || getSegments(text).map(part => {
          const { isValid, finalWord, wordKey, isBold } = processPart(part);
          const displayPart = cleanMarkdown(part, false);
          return { part, isValid, finalWord, wordKey, isBold, shouldDisable: false, displayPart };
    });

    return items.map((item, partIndex) => {
      const { part, isValid, finalWord, wordKey, isBold, shouldDisable, displayPart } = item;
      
      const currentStartOffset = charCursor;
      charCursor += part.length;

      // Handle non-valid parts OR Pure Korean parts (render as plain text)
      if (!isValid || shouldDisable) {
        return <span key={`${text.substring(0, 10)}-${partIndex}-${wordIndex}`} className={`align-baseline whitespace-pre-wrap ${part.includes('**') ? 'font-bold text-blue-300' : ''}`}>{displayPart}</span>;
      }

      const currentWordIndex = wordIndex;
      wordIndex++; // Increment only for interactive words

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
      const isSaved = globalEntry?.status === 'red' || (globalEntry?.linkedTo ? userVocabulary[globalEntry.linkedTo.toLowerCase()]?.status === 'red' : false);

      return (
        <WordSpan
          key={`${text.substring(0, 10)}-${partIndex}-${currentWordIndex}`}
          part={part}
          partIndex={partIndex}
          wordIndex={currentWordIndex}
          finalWord={finalWord}
          wordState={finalState}
          isCurrentlyHolding={isCurrentlyHolding}
          isHighlighted={isHighlighted}
          koreanMeaning={globalEntry?.koreanMeaning}
          isBold={isBold}
          isSaved={isSaved}
          startOffset={currentStartOffset}
        />
      );
    });
  };

  // Helper to count interactive words
  const getInteractiveWordCount = useCallback((text: string) => {
      if (!text) return 0;
      const parts = getSegments(text);
      return parts.reduce((count, part) => {
          const { isValid } = processPart(part);
          
          if (!isValid) return count;
          return count + 1;
      }, 0);
  }, []);

  const mainWordCount = useMemo(() => getInteractiveWordCount(message.content), [message.content, getInteractiveWordCount]);

  const mainMessageElements = useMemo(() => {
     return renderWords(message.content, 0, messageProcessedParts);
  }, [message.content, messageProcessedParts, wordStates, isHolding, radialMenu, highlightWord, userVocabulary, handleLongPress, handleWordClick, onUpdateWordStatus]);

  // Memoize translation elements to prevent lag AND fix index collision
  const translationElements = useMemo(() => {
      if (!translation) return null;
      let cursor = mainWordCount;
      return translation.split('\n').filter(line => line.trim()).map((sentence, idx) => {
          const startIdx = cursor;
          cursor += getInteractiveWordCount(sentence);
          return (
             <div key={`trans-${idx}`} className="whitespace-pre-wrap mb-1">
                 {renderWords(sentence, startIdx)}
             </div>
          );
      });
  }, [translation, mainWordCount, getInteractiveWordCount, wordStates, isHolding, radialMenu, highlightWord, userVocabulary, handleLongPress, handleWordClick, onUpdateWordStatus]);

  // Handle Red Dot / Signal Click (Global)
  const handleRedSignalAction = async (wordIndex: number, word: string) => {
      const wordId = `${message.id}-${wordIndex}-${word.toLowerCase()}`;
      const globalEntry = userVocabulary?.[word.toLowerCase()];

      if (onUpdateWordStatus) {
          await onUpdateWordStatus(
              wordId,
              "red",
              word,
              message.id,
              message.content,
              globalEntry?.koreanMeaning || "",
              false
          );
          toast.success(`'${word}' 가 Red Room에 저장되었습니다.`);
      }
  };

  // Event Delegation Handlers
  const interactionRef = useRef<{
     startX: number;
     startY: number;
     startTime: number;
     targetIndex: number | null;
     targetWord: string | null;
     targetType: 'word' | 'dot' | null;
     longPressTimer: NodeJS.Timeout | null;
  }>({
    startX: 0,
    startY: 0,
    startTime: 0,
    targetIndex: null,
    targetWord: null,
    targetType: null,
    longPressTimer: null,
  });

  const handlePointerDown = (e: React.PointerEvent) => {
     if (e.button !== 0) return;

     const target = e.target as HTMLElement;
     
     // Check if we clicked the DOT
     if (target.getAttribute('data-action') === 'status-dot') {
          const index = parseInt(target.getAttribute('data-word-index') || '-1');
          const word = target.getAttribute('data-word-for-dot') || '';
          if (index !== -1 && word) {
             handleRedSignalAction(index, word);
             e.stopPropagation(); // Stop bubble so we don't trigger word logic
             return;
          }
     }

     const wordSpan = target.closest('[data-word-index]') as HTMLElement;
     if (!wordSpan) return;
     
     const index = parseInt(wordSpan.getAttribute('data-word-index') || '-1');
     const word = wordSpan.getAttribute('data-final-word') || '';
     const startOffset = parseInt(wordSpan.getAttribute('data-start-offset') || '0');
     
     if (index === -1) return;

     interactionRef.current.startX = e.clientX;
     interactionRef.current.startY = e.clientY;
     interactionRef.current.startTime = Date.now();
     interactionRef.current.targetIndex = index;
     interactionRef.current.targetWord = word;
     interactionRef.current.targetType = 'word';

     if (interactionRef.current.longPressTimer) clearTimeout(interactionRef.current.longPressTimer);

     // Start Long Press Timer
     interactionRef.current.longPressTimer = setTimeout(() => {
         setIsHolding(prev => ({ ...prev, [index]: true }));
         if (navigator.vibrate) navigator.vibrate(50);
         handleLongPress(e as any, index, word, startOffset); 
         interactionRef.current.targetIndex = null; // Mark as handled
     }, 400); 
  };

  const handlePointerMove = (e: React.PointerEvent) => {
      if (interactionRef.current.targetIndex == null) return;
      const moveThreshold = 10;
      const dx = Math.abs(e.clientX - interactionRef.current.startX);
      const dy = Math.abs(e.clientY - interactionRef.current.startY);
      if (dx > moveThreshold || dy > moveThreshold) {
          if (interactionRef.current.longPressTimer) {
              clearTimeout(interactionRef.current.longPressTimer);
              interactionRef.current.longPressTimer = null;
          }
          interactionRef.current.targetIndex = null;
      }
  };

  // DOM Manipulation Helpers
  const updateWordVisuals = (wordSpan: HTMLElement, nextState: number, word: string, index: number, isSaved: boolean) => {
      // 1. Update Classes
      if (nextState > 0) {
          wordSpan.classList.remove("hover:bg-slate-100", "rounded");
          wordSpan.classList.add("group");
      } else {
          wordSpan.classList.add("hover:bg-slate-100", "rounded");
          wordSpan.classList.remove("group");
      }

      // 2. Manage Dot (Toggle Visibility)
      let dot = wordSpan.querySelector('[data-action="status-dot"]') as HTMLElement;
      
      if (dot) {
         if (nextState >= 1) {
             dot.style.display = "inline-block";
             dot.classList.remove("opacity-0", "invisible");
             
             // Update Status Color
             const color = nextState === 1 ? "#FF3B30" : 
                           nextState === 2 ? "#eab308" : 
                           nextState === 3 ? "#22c55e" : "#f97316";
                           
             const shadowColor = nextState === 1 ? "rgba(255, 59, 48, 0.4)" :
                               nextState === 2 ? "rgba(234, 179, 8, 0.4)" :
                               nextState === 3 ? "rgba(34, 197, 94, 0.4)" : "rgba(249, 115, 22, 0.4)";

             if (isSaved) {
                  dot.style.width = "4.5px";
                  dot.style.height = "4.5px";
                  dot.style.backgroundColor = "#FF3B30";
                  dot.style.boxShadow = "0 0 3px rgba(255, 59, 48, 0.4)";
                  dot.className = "absolute -top-0.5 -right-0.5 flex shrink-0 rounded-full transition-all duration-300 pointer-events-auto bg-[#FF3B30] scale-100 opacity-100";
             } else {
                  dot.style.width = "4px";
                  dot.style.height = "4px";
                  dot.style.backgroundColor = color;
                  dot.style.boxShadow = `0 0 6px ${shadowColor}`;
                  
                  // Reset class (ensure animate-pulse if not saved)
                  dot.className = "absolute -top-0.5 -right-0.5 flex shrink-0 rounded-full transition-all duration-300 pointer-events-auto animate-pulse";
             }
         } else {
             // Hide Dot
             dot.style.display = "none";
             // Optional: Add opacity-0 for fade out effect if desired, but immediate feedback is better
         }
      }

      // 3. Update Data Attribute (for source of truth in DOM)
      wordSpan.setAttribute('data-word-state', String(nextState));
  };

  // State Management Refs
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pendingStateRef = useRef<Record<number, number>>({});

  const scheduleStateUpdate = () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      
      debounceTimerRef.current = setTimeout(() => {
          setWordStates(prev => {
              const newState = { ...prev, ...pendingStateRef.current };
              pendingStateRef.current = {}; // Clear pending
              return newState;
          });
          debounceTimerRef.current = null;
      }, 1000); // 1 Second debounce
  };

  const handlePointerUp = async (e: React.PointerEvent) => {
      const { targetIndex, targetWord, targetType, longPressTimer, startTime } = interactionRef.current;
      
      if (longPressTimer) {
          clearTimeout(longPressTimer);
          interactionRef.current.longPressTimer = null;
      }

      if (targetIndex !== null && targetWord) {
          const duration = Date.now() - startTime;
          
          if (duration < 400) { // Click Event
              const now = Date.now();
              if (targetType === 'dot') {
                  // Handle Dot Click
                  const wordId = `${message.id}-${targetIndex}-${targetWord.toLowerCase()}`;
                   const globalEntry = userVocabulary?.[targetWord.toLowerCase()];

                  if (onUpdateWordStatus) {
                      await onUpdateWordStatus(
                          wordId,
                          "red",
                          targetWord,
                          message.id,
                          message.content,
                          globalEntry?.koreanMeaning || "",
                          false
                      );
                      toast.success(`'${targetWord}' 가 Red Room에 저장되었습니다.`);
                  }
              } else {
                  // --- COUPLING LOGIC (Hold A + Click B) ---
                  if (radialMenu.showRadialMenu && radialMenu.selectedWordData) {
                      const heldIndex = radialMenu.selectedWordData.index;
                      if (heldIndex !== targetIndex) {
                          const heldWord = radialMenu.selectedWordData.word;
                          setPhraseCollection([heldWord, targetWord]);
                          setShowPhrasePrompt(true);
                          
                          // Reset holding/menu state
                          setRadialMenu(prev => ({ ...prev, showRadialMenu: false, selectedWordData: null }));
                          setIsHolding({}); 
                          lastClickedWordRef.current = null;
                          interactionRef.current.targetIndex = null;
                          return; // ABORT color cycle
                      }
                  }

                  // Record click for potential "Click A + Hold B" coupling
                  lastClickedWordRef.current = { word: targetWord, index: targetIndex, time: now };

                  // Handle Word Click (Instant Visual + Debounced State)
                  const wordSpan = (e.target as HTMLElement).closest('[data-word-index]') as HTMLElement;
                  if (wordSpan) {
                      const currentState = parseInt(wordSpan.getAttribute('data-word-state') || '0');
                      const nextState = (currentState >= 3) ? 0 : currentState + 1;
                      
                      // 1. Instant Visual Update (Direct DOM)
                      // Check for 'isSaved' via userVocabulary to ensure dot logic is correct visual-wise
                      const globalEntry = userVocabulary?.[targetWord.toLowerCase()];
                      const isSaved = globalEntry?.status === 'red' || (globalEntry?.linkedTo ? userVocabulary[globalEntry.linkedTo.toLowerCase()]?.status === 'red' : false);
                      
                      updateWordVisuals(wordSpan, nextState, targetWord, targetIndex, !!isSaved);
                      
                      // 2. Update Source of Truth (Ref)
                      pendingStateRef.current[targetIndex] = nextState;
                      pendingUpdates.current[targetWord.toLowerCase()] = nextState; // Sync with legacy pending check

                      // 3. Schedule React State Update
                      scheduleStateUpdate();

                      // 4. API Call (Immediate)
                      if (nextState > 0 && onUpdateWordStatus) {
                          const statusMap: Record<number, "red" | "yellow" | "green" | "orange"> = {
                              1: "red", 2: "yellow", 3: "green", 4: "orange",
                          };
                          const wordId = `${message.id}-${targetIndex}-${targetWord.toLowerCase()}`;
                          onUpdateWordStatus(
                              wordId,
                              statusMap[nextState],
                              targetWord,
                              message.id,
                              message.content,
                              globalEntry?.koreanMeaning || "",
                              false
                          ).catch(err => console.error(err));
                      } else if (nextState === 0 && onResetWordStatus) {
                           onResetWordStatus(targetWord);
                      }
                  }
              }
          }
      }
      
      interactionRef.current.targetIndex = null;
  };

  const handlePointerLeave = () => {
       if (interactionRef.current.longPressTimer) {
          clearTimeout(interactionRef.current.longPressTimer);
          interactionRef.current.longPressTimer = null;
      }
      interactionRef.current.targetIndex = null;
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
            <EternalLogo
              textClassName="hidden"
              dotClassName="w-2.5 h-2.5"
              onlyDot
              status={dotStatus}
            />
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
            <div 
              className="text-[16px] leading-7 whitespace-pre-wrap break-words font-normal tracking-normal text-zinc-100"
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerLeave}
              onContextMenu={(e) => e.preventDefault()}
              style={{ touchAction: 'pan-y' }}
            >
              {isAssistant ? mainMessageElements : message.content}
            </div>
          )}

          {/* Auto Translation Display */}
          {(isTranslating || translation) && (
            <div className="mt-4 pt-3 border-t border-zinc-700/50 animate-in fade-in duration-500">
              {isTranslating ? (
                <div className="flex items-center gap-2 text-zinc-400/70 text-sm">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Translating...</span>
                </div>
              ) : (
                <div className="flex items-start gap-2.5 text-zinc-300/90 text-[15px] leading-7">
                  <Languages className="w-4 h-4 mt-1.5 text-blue-400 shrink-0" />
                  <div 
                    className="flex flex-col gap-1 w-full"
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerLeave={handlePointerLeave}
                    onContextMenu={(e) => e.preventDefault()}
                    style={{ touchAction: 'pan-y' }}
                  >
                    {/* Use updated translationElements */}
                    {translationElements}
                  </div>
                </div>
              )}
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
