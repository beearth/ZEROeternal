import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Globe, LogOut, BookOpen, MessageCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface OnboardingModalProps {
    isOpen: boolean;
    onComplete: (nativeLang: string, targetLang: string, contentType: 'free' | 'toeic') => void;
    onLogout?: () => void;
    onClose?: () => void;
}

import { LANGUAGES } from "../constants/languages";

export function OnboardingModal({ isOpen, onComplete, onLogout, onClose }: OnboardingModalProps) {
    const [nativeLang, setNativeLang] = useState("ko");
    const [targetLang, setTargetLang] = useState<string | null>(null);
    const [mounted, setMounted] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    if (!isOpen || !mounted) return null;

    const handleStart = () => {
        if (targetLang) {
            onComplete(nativeLang, targetLang, 'free');
            if (onClose) {
                 onClose();
            } else {
                 navigate('/');
            }
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
                {/* Close Button (Only if onClose is provided - Edit Mode) */}
                {onClose && (
                     <button
                        onClick={onClose}
                        className="absolute top-4 left-4 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
                        title="닫기"
                    >
                        <ChevronDown className="w-5 h-5 rotate-90" />
                    </button>
                )}

                {/* Logout Button (Only if onLogout is provided - Initial Onboarding) */}
                {onLogout && (
                    <button
                        onClick={onLogout}
                        className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
                        title="로그아웃"
                    >
                        <LogOut className="w-5 h-5" />
                    </button>
                )}

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
                    onClick={handleStart}
                    disabled={!targetLang}
                    style={{
                        backgroundColor: '#2563eb', // blue-600
                        color: 'white',
                        opacity: targetLang ? 1 : 0.5,
                        cursor: targetLang ? 'pointer' : 'not-allowed'
                    }}
                    className="w-full py-4 rounded-xl font-bold text-lg transition-all duration-200 hover:bg-blue-700 shadow-lg shadow-blue-500/30"
                >
                    시작하기
                </button>
            </div>
        </div>,
        document.body
    );
}
