import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, BookOpen, Plus, Menu } from "lucide-react";
import { toast } from "sonner";
import type { WordData, VocabularyEntry } from "../types";
import { WordDetailModal } from "./WordDetailModal";
import { RadialMenu, type RadialDirection } from "./RadialMenuNew";

interface ToeicWordListProps {
  userVocabulary: Record<string, VocabularyEntry>;
  onUpdateWordStatus: (
    word: string,
    newStatus: "red" | "yellow" | "green" | "white" | "orange"
  ) => void;
  onGenerateStudyTips: (
    word: string,
    status: "red" | "yellow" | "green" | "white" | "orange"
  ) => Promise<string>;
  onLoadMore: () => Promise<void>;
  onDeleteWord?: (word: string) => void;
  onSaveImportant?: (word: WordData) => void;
  isLoading: boolean;
  onToggleSidebar: () => void;
}

export function ToeicWordList({
  userVocabulary,
  onUpdateWordStatus,
  onGenerateStudyTips,
  onLoadMore,
  onDeleteWord,
  onSaveImportant,
  isLoading,
  onToggleSidebar,
}: ToeicWordListProps) {
  const navigate = useNavigate();
  // 메뉴가 열린 단어 추적
  const [menuOpenWord, setMenuOpenWord] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ x: number; y: number } | null>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLongPress = useRef(false);

  const [deletingWords, setDeletingWords] = useState<Set<string>>(new Set());
  const [selectedWord, setSelectedWord] = useState<{
    word: string;
    koreanMeaning: string;
    status: "red" | "yellow" | "green" | "white" | "orange";
  } | null>(null);

  const toeicWords = Object.entries(userVocabulary).filter(
    ([_, entry]) => entry.category === "toeic"
  );

  // 단어 삭제 핸들러 (X 버튼 클릭 시)
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
      } else {
        // onDeleteWord가 없으면 status를 white로 변경 (기본 동작)
        onUpdateWordStatus(word, "white");
        toast.success(`'${word}' 초기화됨`);
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
  const handlePointerDown = (word: string, event: React.PointerEvent) => {
    isLongPress.current = false;
    const x = event.clientX;
    const y = event.clientY;

    longPressTimerRef.current = setTimeout(() => {
      isLongPress.current = true;
      setMenuOpenWord(word);
      setMenuPosition({ x, y });
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

  // RadialMenu select 핸들러
  const handleRadialMenuSelect = (direction: RadialDirection) => {
    if (!menuOpenWord) return;

    const entry = userVocabulary[menuOpenWord];

    switch (direction) {
      case "top": // 삭제
        handleDeleteWord(menuOpenWord);
        break;
      case "bottom": // 듣기
        handleTTS(menuOpenWord);
        break;
      case "left": // 상세보기
        if (entry) {
          setSelectedWord({
            word: menuOpenWord,
            koreanMeaning: entry.koreanMeaning,
            status: entry.status,
          });
        }
        break;
      case "right": // 중요 저장
        if (onSaveImportant && entry) {
          onSaveImportant({
            id: Date.now().toString(),
            word: menuOpenWord,
            koreanMeaning: entry.koreanMeaning,
            status: entry.status === "white" ? "red" : entry.status,
            messageId: "manual",
            sentence: "",
            timestamp: new Date(),
          });
          toast.success("중요 단어장에 저장되었습니다.");
        }
        break;
    }
  };

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
    if (currentStatus === "white") nextStatus = "red";
    else if (currentStatus === "red") nextStatus = "yellow";
    else if (currentStatus === "yellow") nextStatus = "green";
    else if (currentStatus === "green") nextStatus = "white";

    onUpdateWordStatus(word, nextStatus);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "red":
        return "text-white border-red-500";
      case "yellow":
        return "text-black border-yellow-500";
      case "green":
        return "text-white border-green-500";
      default:
        return "bg-white text-gray-900 border-2 border-gray-200 hover:border-gray-400 shadow-sm";
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case "red":
        return { backgroundColor: "#ef4444" };
      case "yellow":
        return { backgroundColor: "#eab308" };
      case "green":
        return { backgroundColor: "#22c55e" };
      default:
        return { backgroundColor: "#ffffff" };
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#1e1f20] text-[#E3E3E3] relative">
      {/* 로딩 오버레이 */}
      {isLoading && (
        <div className="absolute inset-0 z-50 bg-black/50 backdrop-blur-sm flex flex-col items-center justify-center">
          <div className="bg-[#2a2b2c] p-8 rounded-2xl shadow-2xl flex flex-col items-center border border-gray-700">
            <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mb-4"></div>
            <h3 className="text-xl font-bold text-white mb-2">
              단어를 불러오는 중입니다
            </h3>
            <p className="text-gray-400 text-center">
              AI가 엄선한 토익 필수 단어를 가져오고 있습니다.
              <br />
              잠시만 기다려주세요...
            </p>
          </div>
        </div>
      )}

      {/* 헤더 */}
      <header className="bg-[#1e1f20] border-b border-[#2a2b2c] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={onToggleSidebar}
            className="p-2 hover:bg-[#2a2b2c] rounded-lg transition-colors lg:hidden"
          >
            <Menu className="w-5 h-5 text-[#E3E3E3]" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[#E3E3E3]">
                토익 필수 어휘 4000
              </h1>
              <p className="text-sm text-gray-400">
                총 {toeicWords.length}개 단어
              </p>
            </div>
          </div>
        </div>
        <button
          onClick={onLoadMore}
          disabled={isLoading}
          style={{
            backgroundColor: isLoading ? "#581c87" : "#7c3aed",
            color: "white",
            cursor: isLoading ? "not-allowed" : "pointer",
          }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors font-medium shadow-md hover:opacity-90"
        >
          {isLoading ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Plus className="w-4 h-4" />
          )}
          {isLoading ? "로딩 중..." : "단어 50개 추가"}
        </button>
      </header>

      {/* 컨텐츠 영역 */}
      <div className="flex-1 overflow-y-auto p-3 md:p-6">
        <div className="max-w-6xl mx-auto">
          {toeicWords.length > 0 ? (
            <div className="force-word-grid py-4">
              {toeicWords.map(([word, entry]) => {
                const isDeleting = deletingWords.has(word);
                return (
                  <div
                    key={word}
                    onPointerDown={(e) => handlePointerDown(word, e)}
                    onPointerUp={handlePointerUp}
                    onPointerLeave={handlePointerLeave}
                    onClick={() => {
                      handleWordClick(word, entry.status);
                    }}
                    style={getStatusStyle(entry.status)}
                    className={`flex items-center justify-center px-3 py-1.5 rounded-full border transition-all duration-200 cursor-pointer select-none shadow-sm ${getStatusColor(
                      entry.status
                    )} ${isDeleting ? "opacity-0 scale-95" : ""}`}
                  >
                    <span className="font-bold text-sm mr-1">{word}</span>
                    {entry.koreanMeaning && (
                      <span className="text-xs opacity-70 border-l border-current pl-1 ml-1">
                        {entry.koreanMeaning}
                      </span>
                    )}

                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-20">
              <div className="w-16 h-16 bg-[#2a2b2c] rounded-full flex items-center justify-center mx-auto mb-4">
                <BookOpen className="w-8 h-8 text-gray-500" />
              </div>
              <p className="text-gray-400 text-lg mb-2">
                아직 저장된 토익 단어가 없습니다.
              </p>
              <p className="text-gray-500 mb-6">
                학습을 시작하려면 아래 버튼을 눌러 단어를 추가하세요.
              </p>
              <button
                onClick={onLoadMore}
                disabled={isLoading}
                style={{
                  backgroundColor: isLoading ? "#581c87" : "#7c3aed",
                  color: "white",
                  cursor: isLoading ? "not-allowed" : "pointer",
                }}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl transition-colors font-medium text-lg shadow-lg hover:opacity-90"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Plus className="w-5 h-5" />
                )}
                {isLoading ? "단어를 불러오는 중..." : "토익 단어 50개 추가하기"}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 하단 정보 */}
      <div className="bg-[#1e1f20] border-t border-[#2a2b2c] p-4 text-center text-gray-500 text-sm">
        현재 {toeicWords.length}개의 단어가 저장되어 있습니다.
      </div>

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

      {/* 단어 상세 모달 */}
      <WordDetailModal
        open={!!selectedWord}
        onOpenChange={(open) => {
          if (!open) setSelectedWord(null);
        }}
        word={selectedWord?.word || ""}
        koreanMeaning={selectedWord?.koreanMeaning || ""}
        status={selectedWord?.status || "white"}
        onClose={() => setSelectedWord(null)}
        onGenerateStudyTips={onGenerateStudyTips}
      />
    </div >
  );
}
