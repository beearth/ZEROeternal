import React, { useState, useRef } from "react";
import { ArrowLeft, X, Trash2, FileText, Star, Volume2, Menu } from "lucide-react";
import { toast } from "sonner";
import type { WordData, VocabularyEntry } from "../types";
import { WordDetailModal } from "./WordDetailModal";
import { useNavigate } from "react-router-dom";
import { RadialMenu, type RadialDirection } from "./RadialMenuNew";

interface StackViewProps {
  title: string;
  color: string;
  items: WordData[] | string[];
  userVocabulary?: Record<string, VocabularyEntry>;
  onUpdateVocabulary?: (word: string, meaning: string) => void;
  onGenerateStudyTips?: (wordText: string, status: "red" | "yellow" | "green" | "white" | "orange") => Promise<string>;
  onUpdateWordStatus?: (word: string, newStatus: "red" | "yellow" | "green" | "white" | "orange") => void;
  onDeleteWord?: (word: string) => void;
  onSaveImportant?: (word: WordData) => void;
  onToggleSidebar: () => void;
}

export function StackView({ title, color, items, userVocabulary = {}, onUpdateVocabulary, onGenerateStudyTips, onUpdateWordStatus, onDeleteWord, onSaveImportant, onToggleSidebar }: StackViewProps) {
  const navigate = useNavigate();
  // Red, Yellow, Green Stack은 string[] 타입, Important는 WordData[], Sentences는 string[]
  const isStringArray = items.length > 0 && typeof items[0] === "string";
  const isWordDataArray = items.length > 0 && typeof items[0] === "object" && "word" in (items[0] as any);

  // Sentences인지 확인 (문장은 여러 단어로 구성되어 있음)
  const isSentenceStack = title === "Sentences";

  // 한글 뜻이 없는 단어들을 추적하고 자동으로 가져오기
  const [meanings, setMeanings] = useState<Record<string, string>>({});
  const [loadingMeanings, setLoadingMeanings] = useState<Set<string>>(new Set());

  // 단어 상세 모달 상태
  const [selectedWord, setSelectedWord] = useState<{
    word: string;
    koreanMeaning: string;
    status: "red" | "yellow" | "green" | "white" | "orange";
  } | null>(null);

  // 메뉴가 열린 단어 추적
  const [menuOpenWord, setMenuOpenWord] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ x: number; y: number } | null>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLongPress = useRef(false);

  // 삭제 중인 단어 추적 (애니메이션용)
  const [deletingWords, setDeletingWords] = useState<Set<string>>(new Set());

  // 현재 스택의 상태 결정
  const getCurrentStatus = (): "red" | "yellow" | "green" | "orange" => {
    if (title === "Red Signal") return "red";
    if (title === "Yellow Signal") return "yellow";
    if (title === "Green Signal") return "green";
    if (title === "중요 단어장" || title === "Important Words") return "orange";
    return "red"; // default
  };

  const currentStatus = getCurrentStatus();

  // 단어 삭제 핸들러
  const handleDeleteWord = (word: string) => {
    if (deletingWords.has(word)) return;

    // 1. 삭제 상태로 변경 (애니메이션 시작)
    setDeletingWords((prev) => {
      const newSet = new Set(prev);
      newSet.add(word);
      return newSet;
    });
    setMenuOpenWord(null); // 메뉴 닫기

    // 2. 애니메이션 종료 후 실제 삭제 (300ms)
    setTimeout(() => {
      if (onDeleteWord) {
        onDeleteWord(word);
        toast.success(`'${word}' 삭제됨`);
      } else if (onUpdateWordStatus) {
        onUpdateWordStatus(word, "white");
        toast.success(`'${word}' 삭제됨`);
      }

      // 상태 정리
      setDeletingWords((prev) => {
        const newSet = new Set(prev);
        newSet.delete(word);
        return newSet;
      });
    }, 300);
  };

  // 롱프레스 핸들러
  const handlePointerDown = (word: string, event?: React.PointerEvent) => {
    isLongPress.current = false;

    // RadialMenuNew를 위한 위치 저장
    if (event) {
      const x = event.clientX;
      const y = event.clientY;
      longPressTimerRef.current = setTimeout(() => {
        isLongPress.current = true;
        setMenuOpenWord(word);
        setMenuPosition({ x, y });
        // 햅틱 피드백 (모바일)
        if (navigator.vibrate) navigator.vibrate(50);
      }, 500);
    } else {
      // 기존 inline menu용 (event 없을 때)
      longPressTimerRef.current = setTimeout(() => {
        isLongPress.current = true;
        setMenuOpenWord(word);
        // 햅틱 피드백 (모바일)
        if (navigator.vibrate) navigator.vibrate(50);
      }, 500);
    }
  };

  // RadialMenu select 핸들러
  const handleRadialMenuSelect = (direction: RadialDirection) => {
    if (!menuOpenWord) return;

    const wordKey = menuOpenWord.toLowerCase();
    const vocabEntry = userVocabulary[wordKey];

    // Find item data if available (for Important stack)
    let itemData: WordData | undefined;
    if (isWordDataArray) {
      itemData = (items as WordData[]).find(item => item.word.toLowerCase() === wordKey);
    }

    switch (direction) {
      case "top": // 삭제
        if (onDeleteWord) {
          onDeleteWord(menuOpenWord);
        }
        break;
      case "bottom": // 듣기
        const utterance = new SpeechSynthesisUtterance(menuOpenWord);
        utterance.lang = 'en-US';
        window.speechSynthesis.speak(utterance);
        break;
      case "left": // 상세보기
        const meaning = vocabEntry?.koreanMeaning || itemData?.koreanMeaning || "";
        const status = vocabEntry?.status || itemData?.status || "white";

        setSelectedWord({
          word: menuOpenWord,
          koreanMeaning: meaning,
          status: status,
        });
        break;
      case "right": // 중요 저장
        if (onSaveImportant) {
          // Use existing data if available
          const currentMeaning = vocabEntry?.koreanMeaning || itemData?.koreanMeaning || "";
          const currentStatus = vocabEntry?.status || itemData?.status || "white";

          onSaveImportant({
            id: Date.now().toString(),
            word: menuOpenWord,
            koreanMeaning: currentMeaning,
            status: "orange", // 중요 단어는 주황색으로 저장
            messageId: "manual",
            sentence: "",
            timestamp: new Date()
          });
          toast.success("중요 단어장에 저장되었습니다.");
        }
        break;
    }
  };

  const handlePointerUp = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
    }
  };

  const handlePointerLeave = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
    }
  };

  // TTS 핸들러
  const handleTTS = (text: string) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    window.speechSynthesis.speak(utterance);
  };

  // Helper functions for styling (matched with ToeicWordList)
  const getStatusColor = (status: string) => {
    switch (status) {
      case "red": return "text-white border-red-500";
      case "yellow": return "text-black border-yellow-500";
      case "green": return "text-white border-green-500";
      case "orange": return "text-white border-orange-500";
      default: return "bg-white text-gray-900 border-2 border-gray-200 hover:border-gray-400 shadow-sm";
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case "red": return { backgroundColor: '#ef4444' };
      case "yellow": return { backgroundColor: '#eab308' };
      case "green": return { backgroundColor: '#22c55e' };
      case "orange": return { backgroundColor: '#f97316' }; // orange-500
      default: return { backgroundColor: '#ffffff' };
    }
  };

  // 단어 클릭 핸들러 (상태 순환)
  const handleWordClick = (word: string, currentStatus: string) => {
    // 롱프레스였거나 메뉴가 열려있으면 클릭 무시
    if (isLongPress.current) return;

    if (menuOpenWord === word) {
      setMenuOpenWord(null); // 메뉴 닫기
      return;
    }

    // 다른 메뉴가 열려있으면 닫기
    if (menuOpenWord) {
      setMenuOpenWord(null);
    }

    let nextStatus: "red" | "yellow" | "green" | "white" = "white";

    // 현재 스택에 따라 다음 상태 결정 (Red -> Yellow -> Green -> White)
    if (currentStatus === "red") nextStatus = "yellow";
    else if (currentStatus === "yellow") nextStatus = "green";
    else if (currentStatus === "green") nextStatus = "white";
    else nextStatus = "red";

    if (onUpdateWordStatus) {
      onUpdateWordStatus(word, nextStatus);
    }
  };

  return (
    <>
      <div className="flex-1 flex flex-col bg-[#1e1f20] text-[#E3E3E3]">
        {/* 헤더 */}
        <header className="bg-[#1e1f20] border-b border-[#2a2b2c] px-6 py-4 flex items-center gap-4">
          <button
            onClick={onToggleSidebar}
            className="p-2 hover:bg-[#2a2b2c] rounded-lg transition-colors lg:hidden"
          >
            <Menu className="w-5 h-5 text-[#E3E3E3]" />
          </button>
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ backgroundColor: `${color}20` }}
            >
              <div
                className="w-6 h-6 rounded-full"
                style={{ backgroundColor: color }}
              />
            </div>
            <div>
              <h1 className="text-[#E3E3E3] text-xl font-semibold">{title}</h1>
              <p className="text-sm text-[#9ca3af]">
                {items.length}개의 항목
              </p>
            </div>
          </div>
        </header>

        {/* 컨텐츠 */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-6xl mx-auto">
            {items.length === 0 ? (
              <div className="h-full flex items-center justify-center py-20">
                <div className="text-center max-w-md">
                  <div className="w-16 h-16 bg-[#2a2b2c] rounded-2xl mx-auto mb-4 flex items-center justify-center">
                    <div
                      className="w-8 h-8 rounded-full opacity-50"
                      style={{ backgroundColor: color }}
                    />
                  </div>
                  <h2 className="text-[#E3E3E3] mb-2 text-lg font-semibold">
                    아직 저장된 항목이 없습니다
                  </h2>
                  <p className="text-[#9ca3af]">
                    단어를 추가하여 학습을 시작해보세요.
                  </p>
                </div>
              </div>
            ) : (
              <>
                {isSentenceStack ? (
                  // Sentences는 기존 리스트 스타일 유지
                  <div className="space-y-4 max-w-3xl mx-auto">
                    {(items as string[]).map((item, index) => (
                      <div
                        key={index}
                        className="bg-[#1e1f20] border border-[#2a2b2c] rounded-xl p-5 hover:border-[#3a3b3c] transition-colors"
                      >
                        <p className="text-[#E3E3E3] whitespace-pre-wrap leading-relaxed">
                          {item}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  // Red/Yellow/Green Stack & Important Stack -> Grid Layout
                  <div
                    className="force-word-grid"
                  >
                    {isStringArray && !isWordDataArray ? (
                      // Red/Yellow/Green Stack (string[])
                      (items as string[]).map((item, index) => {
                        const wordKey = item.toLowerCase();
                        const vocabEntry = userVocabulary[wordKey];
                        const koreanMeaning = vocabEntry?.koreanMeaning || "";
                        const status = currentStatus;

                        const isDeleting = deletingWords.has(item);
                        return (
                          <div
                            key={index}
                            onPointerDown={(e) => handlePointerDown(item, e)}
                            onPointerUp={handlePointerUp}
                            onPointerLeave={handlePointerLeave}
                            onClick={() => handleWordClick(item, status)}
                            style={getStatusStyle(status)}
                            className={`flex items-center justify-center px-3 py-1.5 rounded-full border transition-all duration-200 cursor-pointer select-none shadow-sm ${getStatusColor(status)} ${isDeleting ? "opacity-0 scale-95" : ""}`}
                          >
                            <span className="font-bold text-sm mr-1">{item}</span>
                            {koreanMeaning && (
                              <span className="text-xs opacity-70 border-l border-current pl-1 ml-1">{koreanMeaning}</span>
                            )}


                          </div>
                        );
                      })
                    ) : isWordDataArray ? (
                      // Important Stack (WordData[])
                      (items as WordData[]).map((item) => {
                        const wordKey = item.word.toLowerCase();
                        const vocabEntry = userVocabulary[wordKey];
                        const koreanMeaning = vocabEntry?.koreanMeaning || item.koreanMeaning || "";
                        const status = "orange";

                        const isDeleting = deletingWords.has(item.word);
                        return (
                          <div
                            key={item.id}
                            onPointerDown={(e) => handlePointerDown(item.word, e)}
                            onPointerUp={handlePointerUp}
                            onPointerLeave={handlePointerLeave}
                            onClick={() => handleWordClick(item.word, status)}
                            style={getStatusStyle(status)}
                            className={`flex items-center justify-center px-3 py-1.5 rounded-full border transition-all duration-200 cursor-pointer select-none shadow-sm ${getStatusColor(status)} ${isDeleting ? "opacity-0 scale-95" : ""}`}
                          >
                            <span className="font-bold text-sm mr-1">{item.word}</span>
                            {koreanMeaning && (
                              <span className="text-xs opacity-70 border-l border-current pl-1 ml-1">{koreanMeaning}</span>
                            )}


                          </div>
                        );
                      })
                    ) : null}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* 단어 상세 모달 (필요 시 유지) */}
        {selectedWord && onGenerateStudyTips && (
          <WordDetailModal
            open={!!selectedWord}
            onOpenChange={(open) => {
              if (!open) setSelectedWord(null);
            }}
            word={selectedWord.word}
            koreanMeaning={selectedWord.koreanMeaning}
            status={selectedWord.status}
            onGenerateStudyTips={onGenerateStudyTips}
            onUpdateWordStatus={onUpdateWordStatus}
            onDeleteWord={onDeleteWord}
          />
        )}

        {/* RadialMenu */}
        {menuOpenWord && menuPosition && (
          <RadialMenu
            center={menuPosition}
            isOpen={!!menuOpenWord}
            onClose={() => {
              setMenuOpenWord(null);
              setMenuPosition(null);
            }}
            onSelect={handleRadialMenuSelect}
            selectedWord={menuOpenWord}
          />
        )}
      </div>
    </>
  );
}
