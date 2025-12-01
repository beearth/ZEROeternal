import React, { useState, useRef } from "react";
import { ArrowLeft, X, Trash2, FileText, Star, Volume2 } from "lucide-react";
import { toast } from "sonner";
import type { WordData, VocabularyEntry } from "../types";
import { WordDetailModal } from "./WordDetailModal";
import { useNavigate } from "react-router-dom";

interface StackViewProps {
  title: string;
  color: string;
  items: WordData[] | string[];
  userVocabulary?: Record<string, VocabularyEntry>;
  onUpdateVocabulary?: (word: string, meaning: string) => void;
  onGenerateStudyTips?: (wordText: string, status: "red" | "yellow" | "green" | "white") => Promise<string>;
  onUpdateWordStatus?: (word: string, newStatus: "red" | "yellow" | "green" | "white") => void;
  onDeleteWord?: (word: string) => void;
  onSaveImportant?: (word: WordData) => void;
}

export function StackView({ title, color, items, userVocabulary = {}, onUpdateVocabulary, onGenerateStudyTips, onUpdateWordStatus, onDeleteWord, onSaveImportant }: StackViewProps) {
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
    status: "red" | "yellow" | "green" | "white";
  } | null>(null);

  // 메뉴가 열린 단어 추적
  const [menuOpenWord, setMenuOpenWord] = useState<string | null>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPress = useRef(false);

  // 삭제 중인 단어 추적 (애니메이션용)
  const [deletingWords, setDeletingWords] = useState<Set<string>>(new Set());

  // 현재 스택의 상태 결정
  const getCurrentStatus = (): "red" | "yellow" | "green" => {
    if (title === "Red Stack") return "red";
    if (title === "Yellow Stack") return "yellow";
    if (title === "Green Stack") return "green";
    return "red";
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
  const handlePointerDown = (word: string) => {
    isLongPress.current = false;
    longPressTimerRef.current = setTimeout(() => {
      isLongPress.current = true;
      setMenuOpenWord(word);
      // 햅틱 피드백 (모바일)
      if (navigator.vibrate) navigator.vibrate(50);
    }, 500);
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
      default: return "bg-white text-gray-900 border-2 border-gray-200 hover:border-gray-400 shadow-sm";
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case "red": return { backgroundColor: '#ef4444' };
      case "yellow": return { backgroundColor: '#eab308' };
      case "green": return { backgroundColor: '#22c55e' };
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
            onClick={() => navigate("/")}
            className="p-2 hover:bg-[#2a2b2c] rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-[#E3E3E3]" />
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
                    className="grid grid-cols-3 md:grid-cols-4 gap-3"
                  >
                    {isStringArray && !isWordDataArray ? (
                      // Red/Yellow/Green Stack (string[])
                      (items as string[]).map((item, index) => {
                        const wordKey = item.toLowerCase();
                        const vocabEntry = userVocabulary[wordKey];
                        const koreanMeaning = vocabEntry?.koreanMeaning || "";
                        const status = vocabEntry?.status || currentStatus;

                        return (
                          <div
                            key={index}
                            onPointerDown={() => handlePointerDown(item)}
                            onPointerUp={handlePointerUp}
                            onPointerLeave={handlePointerLeave}
                            onClick={() => handleWordClick(item, status)}
                            style={getStatusStyle(status)}
                            className={`p-3 rounded-xl border-2 transition-all duration-200 text-left group relative overflow-hidden cursor-pointer min-w-0 ${getStatusColor(status)}`}
                          >
                            <span className="font-bold text-sm sm:text-lg block mb-1 truncate">{item}</span>
                            {koreanMeaning && (
                              <span className="text-sm opacity-70 block truncate">{koreanMeaning}</span>
                            )}
                            <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />

                            {/* 롱프레스 메뉴 (Radial Menu) */}
                            {menuOpenWord === item && (
                              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-20 animate-in fade-in duration-200">
                                <div className="relative w-48 h-48 flex items-center justify-center">
                                  {/* 중앙 원 (단어 앞글자) */}
                                  <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-lg z-10">
                                    <span className="text-xl font-bold text-gray-800">{item.substring(0, 2).toUpperCase()}</span>
                                  </div>

                                  {/* 상단: 삭제 (X) */}
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteWord(item);
                                    }}
                                    className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center shadow-md hover:bg-red-100 transition-colors"
                                  >
                                    <X className="w-6 h-6 text-gray-600 hover:text-red-500" />
                                  </button>

                                  {/* 하단: 듣기 (Speaker) */}
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleTTS(item);
                                      setMenuOpenWord(null);
                                    }}
                                    className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center shadow-md hover:bg-blue-100 transition-colors"
                                  >
                                    <Volume2 className="w-6 h-6 text-gray-600 hover:text-blue-500" />
                                  </button>

                                  {/* 좌측: 상세 (FileText) */}
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedWord({
                                        word: item,
                                        koreanMeaning: koreanMeaning,
                                        status: status,
                                      });
                                      setMenuOpenWord(null);
                                    }}
                                    className="absolute left-0 top-1/2 -translate-y-1/2 w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center shadow-md hover:bg-purple-100 transition-colors"
                                  >
                                    <FileText className="w-6 h-6 text-gray-600 hover:text-purple-500" />
                                  </button>

                                  {/* 우측: 중요 (Star) */}
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (onSaveImportant) {
                                        onSaveImportant({
                                          id: Date.now().toString(),
                                          word: item,
                                          koreanMeaning: koreanMeaning,
                                          status: status,
                                          messageId: "manual",
                                          sentence: "",
                                          timestamp: new Date()
                                        });
                                        toast.success("중요 단어장에 저장되었습니다.");
                                      }
                                      setMenuOpenWord(null);
                                    }}
                                    className="absolute right-0 top-1/2 -translate-y-1/2 w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center shadow-md hover:bg-yellow-100 transition-colors"
                                  >
                                    <Star className="w-6 h-6 text-gray-600 hover:text-yellow-500" />
                                  </button>
                                </div>
                              </div>
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
                        const status = item.status || "red";

                        return (
                          <div
                            key={item.id}
                            onPointerDown={() => handlePointerDown(item.word)}
                            onPointerUp={handlePointerUp}
                            onPointerLeave={handlePointerLeave}
                            onClick={() => handleWordClick(item.word, status)}
                            style={getStatusStyle(status)}
                            className={`p-3 rounded-xl border-2 transition-all duration-200 text-left group relative overflow-hidden cursor-pointer min-w-0 ${getStatusColor(status)}`}
                          >
                            <span className="font-bold text-sm sm:text-lg block mb-1 truncate">{item.word}</span>
                            {koreanMeaning && (
                              <span className="text-sm opacity-70 block truncate">{koreanMeaning}</span>
                            )}
                            <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />

                            {/* 롱프레스 메뉴 (Radial Menu) */}
                            {menuOpenWord === item.word && (
                              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-20 animate-in fade-in duration-200">
                                <div className="relative w-48 h-48 flex items-center justify-center">
                                  {/* 중앙 원 */}
                                  <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-lg z-10">
                                    <span className="text-xl font-bold text-gray-800">{item.word.substring(0, 2).toUpperCase()}</span>
                                  </div>

                                  {/* 상단: 삭제 */}
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteWord(item.word);
                                    }}
                                    className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center shadow-md hover:bg-red-100 transition-colors"
                                  >
                                    <X className="w-6 h-6 text-gray-600 hover:text-red-500" />
                                  </button>

                                  {/* 하단: 듣기 */}
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleTTS(item.word);
                                      setMenuOpenWord(null);
                                    }}
                                    className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center shadow-md hover:bg-blue-100 transition-colors"
                                  >
                                    <Volume2 className="w-6 h-6 text-gray-600 hover:text-blue-500" />
                                  </button>

                                  {/* 좌측: 상세 */}
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedWord({
                                        word: item.word,
                                        koreanMeaning: koreanMeaning,
                                        status: status,
                                      });
                                      setMenuOpenWord(null);
                                    }}
                                    className="absolute left-0 top-1/2 -translate-y-1/2 w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center shadow-md hover:bg-purple-100 transition-colors"
                                  >
                                    <FileText className="w-6 h-6 text-gray-600 hover:text-purple-500" />
                                  </button>

                                  {/* 우측: 중요 */}
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (onSaveImportant) {
                                        onSaveImportant(item);
                                        toast.success("중요 단어장에 저장되었습니다.");
                                      }
                                      setMenuOpenWord(null);
                                    }}
                                    className="absolute right-0 top-1/2 -translate-y-1/2 w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center shadow-md hover:bg-yellow-100 transition-colors"
                                  >
                                    <Star className="w-6 h-6 text-gray-600 hover:text-yellow-500" />
                                  </button>
                                </div>
                              </div>
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
      </div>
    </>
  );
}
