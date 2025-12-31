import React, { useState, useEffect, useCallback, useRef } from "react";
import { X, ChevronRight, CheckCircle2, AlertCircle, RotateCcw, Brain, Trophy, Volume2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { toast } from "../services/toast";
import type { VocabularyEntry } from "../types";

interface QuizModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userVocabulary: Record<string, VocabularyEntry>;
  toeicWordList: string[];
}

type QuizMode = "meaning" | "word" | "dictation";

interface Question {
  word: string;
  meaning: string;
  options: string[];
  correctAnswer: string;
  type: QuizMode;
}

export function QuizModal({
  open,
  onOpenChange,
  userVocabulary,
  toeicWordList,
}: QuizModalProps) {
  const [step, setStep] = useState<"settings" | "quiz" | "result">("settings");
  const [mode, setMode] = useState<QuizMode>("meaning");
  const [source, setSource] = useState<"all" | "red" | "toeic">("red");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState("");
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [showFeedback, setShowFeedback] = useState<"correct" | "incorrect" | null>(null);
  
  const inputRef = useRef<HTMLInputElement>(null);

  // 리셋 로직: 모달이 열릴 때 초기 상태로 되돌림
  useEffect(() => {
    if (open) {
      setStep("settings");
      setQuestions([]);
      setCurrentIndex(0);
      setUserAnswer("");
      setIsAnswered(false);
      setScore(0);
      setShowFeedback(null);
    }
  }, [open]);

  // 퀴즈 생성 로직
  const generateQuiz = useCallback(() => {
    let pool: { word: string; meaning: string }[] = [];

    // 소스에 따라 단어 풀 구성
    if (source === "red") {
      pool = Object.entries(userVocabulary)
        .filter(([_, entry]) => entry.status === "red" && entry.koreanMeaning)
        .map(([word, entry]) => ({ word, meaning: entry.koreanMeaning }));
    } else if (source === "toeic") {
      pool = Object.entries(userVocabulary)
        .filter(([_, entry]) => entry.category === "toeic" && entry.koreanMeaning)
        .map(([word, entry]) => ({ word, meaning: entry.koreanMeaning }));
    } else {
      pool = Object.entries(userVocabulary)
        .filter(([_, entry]) => entry.koreanMeaning)
        .map(([word, entry]) => ({ word, meaning: entry.koreanMeaning }));
    }

    if (pool.length < 4 && mode !== "dictation") {
      toast.error("퀴즈를 생성하기 위한 단어가 부족합니다. (최소 4개 필요)");
      return;
    }

    // 랜덤하게 10문제 추출
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, 10);

    const generatedQuestions: Question[] = selected.map((item) => {
      let options: string[] = [];
      let correctAnswer = "";

      if (mode === "meaning") {
        correctAnswer = item.meaning;
        const otherMeanings = pool
          .filter(p => p.meaning !== item.meaning)
          .map(p => p.meaning)
          .sort(() => Math.random() - 0.5)
          .slice(0, 3);
        options = [correctAnswer, ...otherMeanings].sort(() => Math.random() - 0.5);
      } else if (mode === "word") {
        correctAnswer = item.word;
        const otherWords = pool
          .filter(p => p.word !== item.word)
          .map(p => p.word)
          .sort(() => Math.random() - 0.5)
          .slice(0, 3);
        options = [correctAnswer, ...otherWords].sort(() => Math.random() - 0.5);
      } else {
        // dictation
        correctAnswer = item.word;
      }

      return {
        word: item.word,
        meaning: item.meaning,
        options,
        correctAnswer,
        type: mode,
      };
    });

    setQuestions(generatedQuestions);
    setCurrentIndex(0);
    setScore(0);
    setIsAnswered(false);
    setUserAnswer("");
    setStep("quiz");
  }, [source, mode, userVocabulary]);

  const handleAnswer = (answer: string) => {
    if (isAnswered) return;

    const current = questions[currentIndex];
    const isCorrect = answer.toLowerCase().trim() === current.correctAnswer.toLowerCase().trim();

    setIsAnswered(true);
    setUserAnswer(answer);

    if (isCorrect) {
      setScore(prev => prev + 1);
      setShowFeedback("correct");
      if (navigator.vibrate) navigator.vibrate(50);
    } else {
      setShowFeedback("incorrect");
      if (navigator.vibrate) navigator.vibrate([50, 50, 50]);
    }

    setTimeout(() => {
      setShowFeedback(null);
      if (currentIndex < questions.length - 1) {
        setCurrentIndex(prev => prev + 1);
        setIsAnswered(false);
        setUserAnswer("");
      } else {
        setStep("result");
      }
    }, 1500);
  };

  const handleTTS = (text: string) => {
    if (!window.speechSynthesis) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    if (step === "quiz" && mode === "dictation" && !isAnswered) {
      inputRef.current?.focus();
    }
  }, [step, mode, currentIndex, isAnswered]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-[#1e1f20] border-[#2a2b2e] text-white p-0 overflow-hidden rounded-2xl">
        <DialogHeader className="p-6 border-b border-[#2a2b2e]">
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <Brain className="w-6 h-6 text-blue-400" />
            Language Quiz
          </DialogTitle>
        </DialogHeader>

        <div className="p-6 min-h-[400px] flex flex-col">
          {step === "settings" && (
            <div className="space-y-6 flex-1">
              <div>
                <label className="text-sm font-medium text-zinc-400 mb-3 block">퀴즈 모드 선택</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "meaning", label: "뜻 맞추기" },
                    { id: "word", label: "단어 맞추기" },
                    { id: "dictation", label: "받아쓰기" }
                  ].map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setMode(m.id as QuizMode)}
                      className={`py-3 rounded-xl border text-sm transition-all ${
                        mode === m.id 
                          ? "bg-blue-600/20 border-blue-500 text-blue-400" 
                          : "bg-zinc-800/50 border-zinc-700 text-zinc-400 hover:bg-zinc-800"
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-zinc-400 mb-3 block">단어 소스 선택</label>
                <div className="space-y-2">
                  {[
                    { id: "red", label: "Red Stack (모르는 단어)", count: Object.values(userVocabulary).filter(v => v.status === "red" && v.koreanMeaning).length },
                    { id: "toeic", label: "TOEIC 4000 (토익 단어)", count: Object.values(userVocabulary).filter(v => v.category === "toeic" && v.koreanMeaning).length },
                    { id: "all", label: "전체 단어장", count: Object.values(userVocabulary).filter(v => v.koreanMeaning).length }
                  ].map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setSource(s.id as any)}
                      className={`w-full p-4 rounded-xl border text-left flex items-center justify-between transition-all ${
                        source === s.id 
                          ? "bg-zinc-800 border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.15)]" 
                          : "bg-zinc-800/30 border-zinc-700 hover:bg-zinc-800/50"
                      }`}
                    >
                      <span className={source === s.id ? "text-white font-medium" : "text-zinc-400"}>{s.label}</span>
                      <span className="text-xs bg-zinc-900 px-2 py-1 rounded text-zinc-500">{s.count}개</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-4 mt-auto">
                <Button 
                  onClick={generateQuiz}
                  className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-lg font-bold shadow-lg shadow-blue-900/20"
                >
                  퀴즈 시작하기
                </Button>
              </div>
            </div>
          )}

          {step === "quiz" && questions.length > 0 && (
            <div className="flex flex-col h-full relative">
              {/* Progress Bar */}
              <div className="w-full h-1.5 bg-zinc-800 rounded-full mb-8 overflow-hidden">
                <div 
                  className="h-full bg-blue-500 transition-all duration-300"
                  style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
                />
              </div>

              <div className="w-full flex items-center justify-between mb-8">
                <button 
                  onClick={() => setStep("settings")}
                  className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  <RotateCcw className="w-3 h-3" />
                  설정으로
                </button>
                <div className="text-zinc-500 text-sm font-mono tracking-tighter">QUESTION {currentIndex + 1}/{questions.length}</div>
                <div className="w-10" /> {/* Spacer */}
              </div>

              <div className="flex-1 flex flex-col items-center">
                <div className="flex items-center gap-2 mb-8">
                  <div className="text-3xl font-bold text-center px-4">
                    {mode === "meaning" ? questions[currentIndex].word : questions[currentIndex].meaning}
                  </div>
                  {mode === "meaning" && (
                    <button 
                      onClick={() => handleTTS(questions[currentIndex].word)}
                      className="p-2 bg-zinc-800 rounded-full hover:bg-zinc-700 transition-colors"
                    >
                      <Volume2 className="w-5 h-5 text-blue-400" />
                    </button>
                  )}
                </div>

                {mode === "dictation" ? (
                  <div className="w-full space-y-4">
                    <Input
                      ref={inputRef}
                      value={userAnswer}
                      onChange={(e) => setUserAnswer(e.target.value)}
                      onKeyPress={(e) => e.key === "Enter" && handleAnswer(userAnswer)}
                      disabled={isAnswered}
                      placeholder="단어를 입력하세요..."
                      className="h-14 bg-zinc-800 border-zinc-700 text-xl text-center focus:ring-blue-500 rounded-xl"
                    />
                    <Button 
                       onClick={() => handleAnswer(userAnswer)}
                       disabled={isAnswered || !userAnswer.trim()}
                       className="w-full h-12 bg-zinc-700 hover:bg-zinc-600 rounded-xl"
                    >
                      확인
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3 w-full">
                    {questions[currentIndex].options.map((option, i) => (
                      <button
                        key={i}
                        onClick={() => handleAnswer(option)}
                        disabled={isAnswered}
                        className={`p-4 rounded-xl border text-left transition-all relative ${
                          isAnswered
                            ? option === questions[currentIndex].correctAnswer
                              ? "bg-emerald-500/20 border-emerald-500 text-emerald-400 font-bold"
                              : option === userAnswer
                                ? "bg-red-500/20 border-red-500 text-red-400"
                                : "bg-zinc-800/30 border-zinc-700 text-zinc-600"
                            : "bg-zinc-800/50 border-zinc-700 hover:bg-zinc-800 hover:border-zinc-600 text-zinc-300"
                        }`}
                      >
                        <span className="font-medium text-[15px]">{option}</span>
                        {isAnswered && option === questions[currentIndex].correctAnswer && (
                          <CheckCircle2 className="w-5 h-5 absolute right-4 top-1/2 -translate-y-1/2" />
                        )}
                        {isAnswered && option === userAnswer && option !== questions[currentIndex].correctAnswer && (
                          <AlertCircle className="w-5 h-5 absolute right-4 top-1/2 -translate-y-1/2" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Feedback Overlay */}
              {showFeedback && (
                <div className={`absolute inset-0 flex items-center justify-center pointer-events-none animate-in fade-in zoom-in duration-300 z-50`}>
                  <div className={`p-6 rounded-3xl shadow-2xl flex items-center gap-3 ${
                    showFeedback === "correct" ? "bg-emerald-500 text-white" : "bg-red-500 text-white"
                  }`}>
                    {showFeedback === "correct" ? <CheckCircle2 className="w-8 h-8" /> : <AlertCircle className="w-8 h-8" />}
                    <span className="text-2xl font-bold">{showFeedback === "correct" ? "Correct!" : "Wrong!"}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {step === "result" && (
            <div className="flex flex-col h-full items-center justify-center animate-in fade-in slide-in-from-bottom-4">
              <div className="relative mb-6">
                <div className="w-32 h-32 rounded-full bg-blue-500/10 flex items-center justify-center">
                  <Trophy className="w-16 h-16 text-yellow-500 drop-shadow-lg" />
                </div>
                <div className="absolute -bottom-2 -right-2 bg-blue-600 text-white w-12 h-12 rounded-full flex items-center justify-center font-bold border-4 border-[#1e1f20] shadow-lg">
                  {Math.round((score / questions.length) * 100)}%
                </div>
              </div>
              
              <h2 className="text-2xl font-bold mb-2">Quiz Completed!</h2>
              <p className="text-zinc-500 mb-8">
                {questions.length}문제 중 {score}문제를 맞혔습니다.
              </p>

              <div className="flex gap-3 w-full">
                <Button 
                   onClick={() => setStep("settings")}
                   variant="outline"
                   className="flex-1 h-12 border-zinc-700 hover:bg-zinc-800 rounded-xl text-zinc-300"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  다시 하기
                </Button>
                <Button 
                   onClick={() => onOpenChange(false)}
                   className="flex-1 h-12 bg-blue-600 hover:bg-blue-700 rounded-xl font-bold"
                >
                  완료
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
