import React, { useState, useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import type { WordData } from "./ChatMessage";
import { getKoreanMeaning } from "../services/gemini";

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
}

export function StackView({ title, color, items, onBack, userVocabulary = {}, onUpdateVocabulary }: StackViewProps) {
  // Red, Yellow, Green Stack은 string[] 타입, Important는 WordData[], Sentences는 string[]
  const isStringArray = items.length > 0 && typeof items[0] === "string";
  const isWordDataArray = items.length > 0 && typeof items[0] === "object" && "word" in (items[0] as any);
  
  // Sentences인지 확인 (문장은 여러 단어로 구성되어 있음)
  const isSentenceStack = title === "Sentences";
  
  // 한글 뜻이 없는 단어들을 추적하고 자동으로 가져오기
  const [meanings, setMeanings] = useState<Record<string, string>>({});
  const [loadingMeanings, setLoadingMeanings] = useState<Set<string>>(new Set());

  // 한글 뜻이 없는 단어들에 대해 AI로 자동 번역
  useEffect(() => {
    if (isStringArray && !isSentenceStack) {
      const wordsToTranslate: Array<{ word: string; wordKey: string }> = [];
      (items as string[]).forEach((word) => {
        const wordKey = word.toLowerCase();
        const vocabEntry = userVocabulary[wordKey];
        if (!vocabEntry?.koreanMeaning && !meanings[wordKey] && !loadingMeanings.has(wordKey)) {
          wordsToTranslate.push({ word, wordKey });
        }
      });

      if (wordsToTranslate.length > 0) {
        // 모든 단어를 병렬로 번역
        wordsToTranslate.forEach(({ word, wordKey }) => {
          setLoadingMeanings((prev) => new Set(prev).add(wordKey));
          
          getKoreanMeaning(word)
            .then((meaning) => {
              if (meaning && meaning.trim()) {
                const trimmedMeaning = meaning.trim();
                setMeanings((prev) => ({
                  ...prev,
                  [wordKey]: trimmedMeaning,
                }));
                // userVocabulary에도 저장 (부모 컴포넌트에 알림)
                if (onUpdateVocabulary) {
                  onUpdateVocabulary(wordKey, trimmedMeaning);
                }
              } else {
                console.warn(`단어 "${word}"의 한글 뜻을 가져오지 못했습니다.`);
              }
            })
            .catch((error) => {
              console.error(`단어 "${word}"의 한글 뜻 가져오기 실패:`, error);
            })
            .finally(() => {
              setLoadingMeanings((prev) => {
                const newSet = new Set(prev);
                newSet.delete(wordKey);
                return newSet;
              });
            });
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, userVocabulary, isStringArray, isSentenceStack]);

  return (
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
                const koreanMeaning = vocabEntry?.koreanMeaning || meanings[wordKey] || "";
                const isLoading = loadingMeanings.has(wordKey);
                
                return (
                  <div
                    key={index}
                    className="bg-[#1e1f20] border border-[#2a2b2c] rounded-xl p-5 hover:border-[#3a3b3c] transition-colors"
                  >
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <h3
                        className="text-xl font-semibold"
                        style={{ color: color }}
                      >
                        {item}
                      </h3>
                      {isLoading ? (
                        <span className="text-sm text-[#6b7280] italic">
                          (번역 중...)
                        </span>
                      ) : koreanMeaning ? (
                        <span className="text-sm text-[#9ca3af]">
                          {koreanMeaning}
                        </span>
                      ) : (
                        <span className="text-sm text-[#6b7280] italic">
                          (뜻 없음)
                        </span>
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
                
                return (
                  <div
                    key={item.id}
                    className="bg-[#1e1f20] border border-[#2a2b2c] rounded-xl p-5 hover:border-[#3a3b3c] transition-colors"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-baseline gap-2 flex-1">
                        <h3
                          className="text-xl font-semibold"
                          style={{ color: color }}
                        >
                          {item.word}
                        </h3>
                        {koreanMeaning && (
                          <span className="text-sm text-[#9ca3af]">
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
    </div>
  );
}

