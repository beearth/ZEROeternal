import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog";
import { Sparkles, Loader2, Volume2, Trash2, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { useBackNavigation } from "../hooks/useBackNavigation";

interface WordDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  word: string;
  koreanMeaning: string;
  status: "red" | "yellow" | "green";
  onGenerateStudyTips: (wordText: string, status: "red" | "yellow" | "green") => Promise<string>;
  onUpdateWordStatus?: (word: string, newStatus: "red" | "yellow" | "green") => void;
  onDeleteWord?: (word: string) => void;
}

export function WordDetailModal({
  open,
  onOpenChange,
  word,
  koreanMeaning,
  status,
  onGenerateStudyTips,
  onUpdateWordStatus,
  onDeleteWord,
}: WordDetailModalProps) {
  const [studyTips, setStudyTips] = useState<string | null>(null);
  const [isLoadingTips, setIsLoadingTips] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 뒤로가기 키(마우스 뒤로가기 포함)로 모달 닫기
  useBackNavigation(() => onOpenChange(false), open);

  // 모달이 열릴 때마다 AI 학습 전략 가져오기
  useEffect(() => {
    if (open && word) {
      setIsLoadingTips(true);
      setError(null);
      setStudyTips(null);

      onGenerateStudyTips(word, status)
        .then((tips) => {
          setStudyTips(tips);
          setIsLoadingTips(false);
        })
        .catch((err) => {
          console.error("학습 전략 생성 실패:", err);
          setError("학습 전략을 가져오는 중 오류가 발생했습니다.");
          setIsLoadingTips(false);
        });
    } else if (!open) {
      // 모달이 닫힐 때 상태 초기화
      setStudyTips(null);
      setIsLoadingTips(false);
      setError(null);
    }
  }, [open, word, status, onGenerateStudyTips]);

  const statusLabels = {
    red: "모르는 단어",
    yellow: "학습 중인 단어",
    green: "마스터한 단어",
  };

  const statusColors = {
    red: "text-red-400",
    yellow: "text-yellow-400",
    green: "text-green-400",
  };

  // 다음 상태로 이동하는 함수
  const handleMoveToNextStatus = () => {
    let nextStatus: "red" | "yellow" | "green";
    if (status === "red") {
      nextStatus = "yellow";
    } else if (status === "yellow") {
      nextStatus = "green";
    } else {
      nextStatus = "red"; // green -> red (순환)
    }

    if (onUpdateWordStatus) {
      onUpdateWordStatus(word, nextStatus);
      const statusNames = {
        red: "Red Stack",
        yellow: "Yellow Stack",
        green: "Green Stack",
      };
      toast.success(`단어 "${word}"이(가) ${statusNames[nextStatus]}으로 이동되었습니다.`);
      onOpenChange(false);
    }
  };

  // 단어 삭제 함수
  const handleDeleteWord = () => {
    if (onDeleteWord) {
      onDeleteWord(word);
      toast.success(`단어 "${word}"이(가) 삭제되었습니다.`);
      onOpenChange(false);
    }
  };

  // TTS 함수
  const handlePlayPronunciation = () => {
    if (window.speechSynthesis) {
      const utterance = new SpeechSynthesisUtterance(word);
      utterance.lang = "en-US";
      window.speechSynthesis.speak(utterance);
      toast.success(`"${word}" 발음을 재생합니다.`);
    } else {
      toast.error("음성 재생을 지원하지 않는 브라우저입니다.");
    }
  };

  // 다음 상태 정보 (상태에 따라 다른 라벨과 색상)
  const getNextStatusInfo = () => {
    if (status === "red") {
      return {
        label: "🟡 Yellow Stack으로 이동",
        description: "이 단어를 학습 중인 단어로 이동합니다",
        color: "#eab308",
        icon: "🟡",
        showButton: true
      };
    } else if (status === "yellow") {
      return {
        label: "🟢 Green Stack으로 이동",
        description: "이 단어를 마스터 완료 상태로 이동합니다",
        color: "#22c55e",
        icon: "🟢",
        showButton: true
      };
    } else {
      // Green 상태일 때만 Red로 되돌리기 버튼 표시
      return {
        label: "🔴 Red Stack으로 되돌리기 (복습)",
        description: "복습이 필요하여 다시 학습 주기로 돌아갑니다",
        color: "#ef4444",
        icon: "🔴",
        showButton: true
      };
    }
  };

  const nextStatusInfo = getNextStatusInfo();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-[#1e1f20] border-[#2a2b2c] text-[#E3E3E3]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-[#E3E3E3] flex items-center gap-3">
            <span className="text-3xl">{word}</span>
            {koreanMeaning && (
              <span className="text-lg font-normal text-[#9ca3af]">
                {koreanMeaning}
              </span>
            )}
          </DialogTitle>
          <DialogDescription className="text-[#9ca3af]">
            <span className={`font-medium ${statusColors[status]}`}>
              {statusLabels[status]}
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="mt-6 space-y-6">
          {/* 액션 버튼 섹션 */}
          <div className="border-t border-[#2a2b2c] pt-6">
            <h3 className="text-lg font-semibold text-[#E3E3E3] mb-4">단어 관리</h3>
            <div className="space-y-3">
              {/* 발음 듣기 버튼 (항상 표시) */}
              <button
                onClick={handlePlayPronunciation}
                className="w-full flex items-center gap-3 px-4 py-3 bg-[#2a2b2c] hover:bg-[#3a3b3c] border border-[#2a2b2c] rounded-lg transition-colors text-[#E3E3E3]"
              >
                <Volume2 className="w-5 h-5 text-blue-400 flex-shrink-0" />
                <div className="flex flex-col items-start flex-1">
                  <span className="text-sm font-medium text-[#E3E3E3]">🔊 발음 듣기</span>
                  <span className="text-xs text-[#9ca3af]">단어의 영어 발음을 재생합니다</span>
                </div>
              </button>

              {/* 다음 스택으로 이동 버튼 (상태에 따라 하나만 표시) */}
              {onUpdateWordStatus && nextStatusInfo.showButton && (
                <button
                  onClick={handleMoveToNextStatus}
                  className="w-full flex items-center gap-3 px-4 py-3 border rounded-lg transition-all hover:scale-[1.02] text-[#E3E3E3]"
                  style={{
                    borderColor: nextStatusInfo.color + "40",
                    backgroundColor: nextStatusInfo.color + "10",
                    borderWidth: "2px"
                  }}
                >
                  <ArrowRight className="w-5 h-5 flex-shrink-0" style={{ color: nextStatusInfo.color }} />
                  <div className="flex flex-col items-start flex-1">
                    <span className="text-sm font-semibold" style={{ color: nextStatusInfo.color }}>
                      {nextStatusInfo.label}
                    </span>
                    <span className="text-xs text-[#9ca3af]">{nextStatusInfo.description}</span>
                  </div>
                </button>
              )}

              {/* 삭제 버튼 */}
              {onDeleteWord && (
                <button
                  onClick={handleDeleteWord}
                  className="w-full flex items-center gap-3 px-4 py-3 bg-red-500/10 hover:bg-red-500/20 border-2 border-red-500/20 rounded-lg transition-all hover:scale-[1.02] text-red-400"
                >
                  <Trash2 className="w-5 h-5 flex-shrink-0" />
                  <div className="flex flex-col items-start flex-1">
                    <span className="text-sm font-semibold">🗑️ 단어 삭제</span>
                    <span className="text-xs text-red-400/70">단어를 완전히 삭제합니다</span>
                  </div>
                </button>
              )}
            </div>
          </div>

          {/* AI 맞춤 학습 전략 섹션 */}
          <div className="border-t border-[#2a2b2c] pt-6">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-purple-400" />
              <h3 className="text-lg font-semibold text-[#E3E3E3]">
                ✨ AI 맞춤 전략
              </h3>
            </div>

            {isLoadingTips ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="animate-pulse bg-[#2a2b2c] rounded-lg p-4 space-y-2"
                  >
                    <div className="h-4 bg-[#3a3b3c] rounded w-3/4"></div>
                    <div className="h-4 bg-[#3a3b3c] rounded w-full"></div>
                    <div className="h-4 bg-[#3a3b3c] rounded w-5/6"></div>
                  </div>
                ))}
                <div className="flex items-center gap-2 text-[#9ca3af] text-sm mt-4">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>AI가 맞춤 학습 전략을 생성하고 있습니다...</span>
                </div>
              </div>
            ) : error ? (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-red-400">
                {error}
              </div>
            ) : studyTips ? (
              <div className="prose prose-invert max-w-none">
                <div className="text-[#E3E3E3] whitespace-pre-wrap leading-relaxed">
                  {studyTips.split('\n').map((line, index) => {
                    // 번호 리스트 감지 (1., 2., 3. 등)
                    if (/^\d+\./.test(line.trim())) {
                      return (
                        <div key={index} className="mb-3 pl-4 border-l-2 border-purple-500/30">
                          <p className="text-[#E3E3E3]">{line.trim()}</p>
                        </div>
                      );
                    }
                    // 볼드 텍스트 감지 (**text**)
                    if (line.includes('**')) {
                      const parts = line.split(/(\*\*.*?\*\*)/g);
                      return (
                        <p key={index} className="mb-2">
                          {parts.map((part, partIndex) => {
                            if (part.startsWith('**') && part.endsWith('**')) {
                              return (
                                <strong key={partIndex} className="text-purple-300">
                                  {part.replace(/\*\*/g, '')}
                                </strong>
                              );
                            }
                            return <span key={partIndex}>{part}</span>;
                          })}
                        </p>
                      );
                    }
                    return (
                      <p key={index} className="mb-2 text-[#E3E3E3]">
                        {line}
                      </p>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
