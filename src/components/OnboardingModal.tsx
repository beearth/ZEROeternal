import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Globe, LogOut, BookOpen, MessageCircle } from "lucide-react";

interface OnboardingModalProps {
    isOpen: boolean;
    onComplete: (nativeLang: string, targetLang: string, contentType: 'free' | 'toeic') => void;
    onLogout: () => void;
}

const LANGUAGES = [
    { code: "ko", name: "한국어", flag: "🇰🇷" },
    { code: "en", name: "English", flag: "🇺🇸" },
    { code: "ja", name: "日本語", flag: "🇯🇵" },
    { code: "zh", name: "中文", flag: "🇨🇳" },
    { code: "es", name: "Español", flag: "🇪🇸" },
    { code: "fr", name: "Français", flag: "🇫🇷" },
    { code: "de", name: "Deutsch", flag: "🇩🇪" },
];

export function OnboardingModal({ isOpen, onComplete, onLogout }: OnboardingModalProps) {
    const [nativeLang, setNativeLang] = useState("ko");
    const [targetLang, setTargetLang] = useState<string | null>(null);
    const [step, setStep] = useState<'language' | 'content'>('language');
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    if (!isOpen || !mounted) return null;

    const handleNext = () => {
        if (targetLang) {
            setStep('content');
        }
    };

    const handleContentSelect = (type: 'free' | 'toeic') => {
        if (targetLang) {
            onComplete(nativeLang, targetLang, type);
        }
    };

    return createPortal(
        <div 
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 9999,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '1rem',
                backgroundColor: 'rgba(0, 0, 0, 0.8)' // Force dark background
            }}
        >
            {/* Modal Card */}
            <div 
                className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg p-8 animate-in fade-in zoom-in duration-300"
                style={{
                    maxHeight: '90vh',
                    overflowY: 'auto'
                }}
            >
                {/* Logout Button */}
                <button
                    onClick={onLogout}
                    className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
                    title="로그아웃"
                >
                    <LogOut className="w-5 h-5" />
                </button>

                {step === 'language' ? (
                    <>
                        <div className="flex flex-col items-center mb-8">
                            <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mb-4 shadow-sm">
                                <Globe className="w-8 h-8 text-blue-600" />
                            </div>
                            <h2 className="text-2xl font-bold text-slate-900 mb-2">환영합니다! 👋</h2>
                            <p className="text-slate-500">학습할 언어를 선택해주세요.</p>
                        </div>

                        <div className="space-y-4 mb-8">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">모국어</label>
                                <div className="relative">
                                    <select
                                        value={nativeLang}
                                        onChange={(e) => setNativeLang(e.target.value)}
                                        className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 pr-10 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer hover:bg-slate-100"
                                    >
                                        {LANGUAGES.map((lang) => (
                                            <option key={lang.code} value={lang.code}>
                                                {lang.flag} {lang.name}
                                            </option>
                                        ))}
                                    </select>
                                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">학습할 언어</label>
                                <div className="relative">
                                    <select
                                        value={targetLang || ""}
                                        onChange={(e) => setTargetLang(e.target.value)}
                                        className={`w-full appearance-none border rounded-xl px-4 py-3 pr-10 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer ${
                                            targetLang 
                                            ? "bg-blue-50 border-blue-200 text-blue-900" 
                                            : "bg-white border-slate-200 text-slate-900 hover:bg-slate-50"
                                        }`}
                                    >
                                        <option value="" disabled>언어 선택</option>
                                        {LANGUAGES.filter(l => l.code !== nativeLang).map((lang) => (
                                            <option key={lang.code} value={lang.code}>
                                                {lang.flag} {lang.name}
                                            </option>
                                        ))}
                                    </select>
                                    <ChevronDown className={`absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 pointer-events-none ${targetLang ? "text-blue-500" : "text-slate-400"}`} />
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={handleNext}
                            disabled={!targetLang}
                            style={{
                                backgroundColor: '#2563eb', // blue-600
                                color: 'white',
                                opacity: targetLang ? 1 : 0.5,
                                cursor: targetLang ? 'pointer' : 'not-allowed'
                            }}
                            className="w-full py-4 rounded-xl font-bold text-lg transition-all duration-200 hover:bg-blue-700 shadow-lg shadow-blue-500/30"
                        >
                            다음
                        </button>
                    </>
                ) : (
                    <>
                        <div className="flex flex-col items-center mb-8">
                            <div className="w-16 h-16 bg-purple-50 rounded-2xl flex items-center justify-center mb-4 shadow-sm">
                                <BookOpen className="w-8 h-8 text-purple-600" />
                            </div>
                            <h2 className="text-2xl font-bold text-slate-900 mb-2">학습 콘텐츠 선택</h2>
                            <p className="text-slate-500">어떤 방식으로 학습을 시작하시겠어요?</p>
                        </div>

                        <div className="space-y-4 mb-4">
                            <button
                                onClick={() => handleContentSelect('free')}
                                className="w-full p-6 rounded-xl border-2 border-slate-100 hover:border-blue-500 hover:bg-blue-50 transition-all group text-left flex items-center gap-4"
                            >
                                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                                    <MessageCircle className="w-6 h-6 text-blue-600" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-900 text-lg mb-1">자유 주제 대화 시작</h3>
                                    <p className="text-slate-500 text-sm">AI와 자유롭게 대화하며 언어를 익힙니다.</p>
                                </div>
                            </button>

                            <button
                                onClick={() => handleContentSelect('toeic')}
                                className="w-full p-6 rounded-xl border-2 border-slate-100 hover:border-purple-500 hover:bg-purple-50 transition-all group text-left flex items-center gap-4"
                            >
                                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center group-hover:bg-purple-200 transition-colors">
                                    <BookOpen className="w-6 h-6 text-purple-600" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-900 text-lg mb-1">토익 필수 어휘 코스 시작</h3>
                                    <p className="text-slate-500 text-sm">빈출 어휘를 학습하고 퀴즈를 풉니다.</p>
                                </div>
                            </button>
                        </div>
                        
                        <button 
                            onClick={() => setStep('language')}
                            className="w-full py-3 text-slate-400 hover:text-slate-600 text-sm font-medium"
                        >
                            이전 단계로
                        </button>
                    </>
                )}
            </div>
        </div>,
        document.body
    );
}
