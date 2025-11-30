import React, { useState, useRef } from "react";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import type { WordData } from "./ChatMessage";
import { WordDetailModal } from "./WordDetailModal";

interface VocabularyEntry {
  status: "red" | "yellow" | "green";
  koreanMeaning: string;
}

interface StackViewProps {
  title: string;
  color: string;
  items: WordData[] | string[];
  onBack: () => void;
  userVocabulary?: Record<string, VocabularyEntry>;
  onUpdateVocabulary?: (word: string, meaning: string) => void;
  onGenerateStudyTips?: (wordText: string, status: "red" | "yellow" | "green") => Promise<string>;
  onUpdateWordStatus?: (word: string, newStatus: "red" | "yellow" | "green") => void;
  onDeleteWord?: (word: string) => void;
}

export function StackView({ title, color, items, onBack, userVocabulary = {}, onUpdateVocabulary, onGenerateStudyTips, onUpdateWordStatus, onDeleteWord }: StackViewProps) {
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
    status: "red" | "yellow" | "green";
  } | null>(null);

  // 홀딩 관련 상태 및 ref
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const startPosRef = useRef<{ x: number; y: number } | null>(null);
  const [pressingWord, setPressingWord] = useState<string | null>(null);
  const [isHolding, setIsHolding] = useState<Record<string, boolean>>({});
  const [highlightWord, setHighlightWord] = useState<string | null>(null);

  // 삭제 중인 단어 추적 (애니메이션용)
  const [deletingWords, setDeletingWords] = useState<Set<string>>(new Set());

  // 현재 스택의 상태 결정
  const getCurrentStatus = (): "red" | "yellow" | "green" => {
    if (title === "Red Stack") return "red";
    if (title === "Yellow Stack") return "yellow";
    if (title === "Green Stack") return "green";
    return "red"; // 기본값
  };

  // 단어 클릭 핸들러 (삭제/리셋)
  const handleWordClick = (word: string) => {
    // 이미 삭제 중이면 무시
    if (deletingWords.has(word)) return;

    // 현재 상태 저장 (복구용)
    const oldStatus = getCurrentStatus();

    // 1. 삭제 상태로 변경 (애니메이션 시작)
    setDeletingWords((prev) => {
      const newSet = new Set(prev);
      newSet.add(word);
      return newSet;
    });

    // 2. 애니메이션 종료 후 실제 삭제 (300ms)
    setTimeout(() => {
      if (onDeleteWord) {
        onDeleteWord(word);

        // 실행 취소 (Undo) 토스트 표시
        toast.success(`'${word}' 삭제됨`, {
          action: {
            label: "실행 취소",
            onClick: () => {
              if (onUpdateWordStatus) {
                // 원래 상태로 복구
                onUpdateWordStatus(word, oldStatus);
                toast.success(`'${word}' 복구됨`);
              }
            },
          },
          duration: 4000, // 4초 동안 표시
        });
      } else if (onUpdateWordStatus) {
        // onDeleteWord가 없으면 status 업데이트로 처리 시도 (혹은 무시)
      }

      // 상태 정리 (컴포넌트가 리렌더링되면서 항목이 사라지겠지만 안전하게)
      setDeletingWords((prev) => {
        const newSet = new Set(prev);
        newSet.delete(word);
        return newSet;
      });
    }, 300);
  };

  // 단어 상세 모달 열기
  const openWordDetail = (word: string, koreanMeaning: string) => {
    if (onGenerateStudyTips) {
      setSelectedWord({
        word,
        koreanMeaning,
        status: getCurrentStatus(),
      });
    }
  };

  // Pointer Down - 홀딩 시작
  const handlePointerDown = (
    e: React.PointerEvent,
    word: string,
    koreanMeaning: string
  ) => {
    e.preventDefault();
    startPosRef.current = { x: e.clientX, y: e.clientY };
    setPressingWord(word);
    setIsHolding((prev) => ({ ...prev, [word]: true }));

    // 500ms 후 모달 열기
    longPressTimerRef.current = setTimeout(() => {
      // 파란색 하이라이트 애니메이션 시작 (깜박임 효과)
      setHighlightWord(word);

      // 햅틱 피드백
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }

      // 짧은 딜레이 후 모달 열기 (하이라이트가 보이도록)
      setTimeout(() => {
        openWordDetail(word, koreanMeaning);

        setPressingWord(null);
        setIsHolding((prev) => {
          const updated = { ...prev };
          delete updated[word];
          return updated;
        });
        // 하이라이트는 조금 더 유지 후 제거
        setTimeout(() => {
          setHighlightWord(null);
        }, 100);
      }, 300); // 하이라이트 애니메이션을 더 길게 보이도록
    }, 500);
  };

  // Pointer Up - 홀딩 취소
  const handlePointerUp = (word?: string) => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    if (word) {
      setIsHolding((prev) => {
        const updated = { ...prev };
        delete updated[word];
        return updated;
      });
    }
    setPressingWord(null);
    setHighlightWord(null);
    startPosRef.current = null;
  };

  // Pointer Move - 움직이면 홀딩 취소
  const handlePointerMove = (e: React.PointerEvent, word: string) => {
    if (!startPosRef.current) return;

    const deltaX = Math.abs(e.clientX - startPosRef.current.x);
    const deltaY = Math.abs(e.clientY - startPosRef.current.y);
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    // 10px 이상 움직이면 홀딩 취소
    if (distance > 10) {
      handlePointerUp(word);
    }
  };

  // Context Menu 방지 (우클릭 메뉴 비활성화)
  const handleContextMenu = (e: React.MouseEvent, word: string) => {
    e.preventDefault();
    setIsHolding((prev) => {
      const updated = { ...prev };
      delete updated[word];
      return updated;
    });
  };

  // 한글 뜻은 App.tsx의 handleUpdateWordStatus에서 Red Stack 진입 시 영구적으로 저장되므로
  // 여기서는 userVocabulary에 저장된 값만 사용합니다.
  // 번역 API 호출 로직은 제거되었습니다.

  return (
    <>
      <div className="flex-1 flex flex-col bg-[#131314] text-[#E3E3E3]">
        {/* 헤더 */}
        <header className="bg-[#1e1f20] border-b border-[#2a2b2c] px-6 py-4 flex items-center gap-4">
          <button
            onClick={onBack}
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
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {items.length === 0 ? (
            <div className="h-full flex items-center justify-center">
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
                  단어를 클릭하거나 드래그하여 저장해보세요.
                </p>
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto space-y-4">
              {isStringArray && !isWordDataArray ? (
                // Red, Yellow, Green Stack (string[]) 또는 Sentences (string[])
                (items as string[]).map((item, index) => {
                  // Sentences인 경우 그대로 표시
                  if (isSentenceStack) {
                    return (
                      <div
                        key={index}
                        className="bg-[#1e1f20] border border-[#2a2b2c] rounded-xl p-5 hover:border-[#3a3b3c] transition-colors"
                      >
                        <p className="text-[#E3E3E3] whitespace-pre-wrap leading-relaxed">
                          {item}
                        </p>
                      </div>
                    );
                  }

                  // Red/Yellow/Green Stack인 경우 단어와 한글 뜻 표시
                  const wordKey = item.toLowerCase();
                  const vocabEntry = userVocabulary[wordKey];
                  // 한글 뜻은 userVocabulary에서만 가져옴 (App.tsx에서 Red Stack 진입 시 영구적으로 저장됨)
                  const koreanMeaning = vocabEntry?.koreanMeaning || "";

                  const isCurrentlyHolding = isHolding[item] || false;
                  const isHighlighted = highlightWord === item;
                  const isDeleting = deletingWords.has(item);

                  return (
                    <div
                      key={index}
                      className={`border rounded-xl p-5 hover:border-[#3a3b3c] cursor-pointer transition-all duration-[300ms] ${isDeleting
                          ? "bg-white border-white scale-105 opacity-0" // 삭제 애니메이션: 흰색 + 커짐 + 투명해짐
                          : isCurrentlyHolding
                            ? "bg-[#2a2b2c] scale-[0.98] shadow-inner"
                            : "bg-[#1e1f20]"
                        } ${isHighlighted
                          ? "border-blue-500 ring-4 ring-blue-500/50 shadow-xl shadow-blue-500/40 animate-pulse"
                          : isDeleting ? "border-white" : "border-[#2a2b2c]"
                        }`}
                      style={{
                        transform: isDeleting ? 'scale(1.05)' : isCurrentlyHolding ? 'scale(0.98)' : 'scale(1)',
                      }}
                      onPointerDown={(e) => handlePointerDown(e, item, koreanMeaning || "")}
                      onPointerUp={() => handlePointerUp(item)}
                      onPointerMove={(e) => handlePointerMove(e, item)}
                      onPointerLeave={() => handlePointerUp(item)}
                      onContextMenu={(e) => handleContextMenu(e, item)}
                      onClick={() => {
                        // 클릭 시 삭제 핸들러 호출
                        handleWordClick(item);
                      }}
                    >
                      <div className="flex items-center justify-between gap-4 w-full">
                        <div className="flex items-baseline gap-3 flex-1 min-w-0">
                          <h3
                            className={`text-xl font-semibold flex-shrink-0 transition-colors duration-300 ${isDeleting ? "text-black" : ""}`}
                            style={{ color: isDeleting ? "black" : color }}
                          >
                            {item}
                          </h3>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {koreanMeaning ? (
                              <span className={`text-sm whitespace-nowrap transition-colors duration-300 ${isDeleting ? "text-gray-500" : "text-[#9ca3af]"}`}>
                                {koreanMeaning}
                              </span>
                            ) : (
                              <span className={`text-sm italic whitespace-nowrap transition-colors duration-300 ${isDeleting ? "text-gray-400" : "text-[#6b7280]"}`}>
                                (뜻 없음)
                              </span>
                            )}
                          </div>
                        </div>
                        {pressingWord === item && !isDeleting && (
                          <div className="flex-shrink-0 text-xs text-[#9ca3af] animate-pulse whitespace-nowrap">
                            길게 누르는 중...
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : isWordDataArray ? (
                // Important Stack (WordData[])
                (items as WordData[]).map((item) => {
                  // userVocabulary에서 한글 뜻 가져오기 (없으면 WordData의 koreanMeaning 사용)
                  const wordKey = item.word.toLowerCase();
                  const vocabEntry = userVocabulary[wordKey];
                  const koreanMeaning = vocabEntry?.koreanMeaning || item.koreanMeaning || "";
                  const isCurrentlyHolding = isHolding[item.word] || false;
                  const isHighlighted = highlightWord === item.word;
                  const isDeleting = deletingWords.has(item.word);

                  return (
                    <div
                      key={item.id}
                      className={`border rounded-xl p-5 hover:border-[#3a3b3c] cursor-pointer transition-all duration-[300ms] ${isDeleting
                          ? "bg-white border-white scale-105 opacity-0"
                          : isCurrentlyHolding
                            ? "bg-[#2a2b2c] scale-[0.98] shadow-inner"
                            : "bg-[#1e1f20]"
                        } ${isHighlighted
                          ? "border-blue-500 ring-4 ring-blue-500/50 shadow-xl shadow-blue-500/40 animate-pulse"
                          : isDeleting ? "border-white" : "border-[#2a2b2c]"
                        }`}
                      style={{
                        transform: isDeleting ? 'scale(1.05)' : isCurrentlyHolding ? 'scale(0.98)' : 'scale(1)',
                      }}
                      onPointerDown={(e) => handlePointerDown(e, item.word, koreanMeaning || "")}
                      onPointerUp={() => handlePointerUp(item.word)}
                      onPointerMove={(e) => handlePointerMove(e, item.word)}
                      onPointerLeave={() => handlePointerUp(item.word)}
                      onContextMenu={(e) => handleContextMenu(e, item.word)}
                      onClick={() => {
                        handleWordClick(item.word);
                      }}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-baseline gap-2 flex-1">
                          <h3
                            className={`text-xl font-semibold transition-colors duration-300 ${isDeleting ? "text-black" : ""}`}
                            style={{ color: isDeleting ? "black" : color }}
                          >
                            {item.word}
                          </h3>
                          {koreanMeaning && (
                            <span className={`text-sm transition-colors duration-300 ${isDeleting ? "text-gray-500" : "text-[#9ca3af]"}`}>
                              {koreanMeaning}
                            </span>
                          )}
                        </div>
                        <span
                          className="px-2 py-1 rounded text-xs font-medium flex-shrink-0"
                          style={{
                            backgroundColor: `${color}20`,
                            color: color,
                          }}
                        >
                          {item.status === "red"
                            ? "Red"
                            : item.status === "yellow"
                              ? "Yellow"
                              : "Green"}
                        </span>
                      </div>
                      <p className="text-[#9ca3af] text-sm mb-2">
                        {item.sentence}
                      </p>
                      <p className="text-[#9ca3af] text-xs">
                        {new Date(item.timestamp).toLocaleDateString("ko-KR", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  );
                })
              ) : null}
            </div>
          )}
        </div>

        {/* 단어 상세 모달 */}
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
