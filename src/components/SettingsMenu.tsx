import React, { useState, useRef, useEffect } from "react";
import { Settings, LogOut, User, AlertTriangle, Lightbulb, ChevronRight, Trash2, Volume2, Mic, Globe } from "lucide-react";



import { useNavigate } from "react-router-dom";
import type { PersonaInstruction } from "../types";


interface SettingsMenuProps {
    onLogout: () => void;
    onResetLanguage: () => void;
    onResetVocabulary?: () => void;
    isCollapsed?: boolean;
    personaInstructions?: PersonaInstruction[];
    onUpdatePersonaInstructions?: (newInstructions: PersonaInstruction[]) => void;
    isAutoTTS?: boolean;
    onToggleAutoTTS?: () => void;
    vocabularyCount?: number;
    onOpenLanguageSettings?: () => void;
}



export function SettingsMenu({ 
    onLogout, 
    onResetLanguage, 
    onResetVocabulary, 
    isCollapsed = false,
    personaInstructions = [],
    onUpdatePersonaInstructions,
    isAutoTTS = false,
    onToggleAutoTTS,
    vocabularyCount = 0,
    onOpenLanguageSettings
}: SettingsMenuProps) {


    const [isOpen, setIsOpen] = useState(false);
    const [showResetModal, setShowResetModal] = useState(false);
    const [showLanguageHelp, setShowLanguageHelp] = useState(false);
    const [confirmInput, setConfirmInput] = useState("");
    const [newInstruction, setNewInstruction] = useState("");
    const [isAdding, setIsAdding] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();

    const handleAddInstruction = () => {
        if (!newInstruction.trim() || !onUpdatePersonaInstructions) return;
        
        const newItem: PersonaInstruction = {
            id: Date.now().toString(),
            content: newInstruction.trim(),
            isActive: true
        };
        
        onUpdatePersonaInstructions([...personaInstructions, newItem]);
        setNewInstruction("");
        setIsAdding(false);
    };

    const handleDeleteInstruction = (id: string) => {
        if (!onUpdatePersonaInstructions) return;
        onUpdatePersonaInstructions(personaInstructions.filter(p => p.id !== id));
    };

    const handleToggleInstruction = (id: string) => {
        if (!onUpdatePersonaInstructions) return;
        onUpdatePersonaInstructions(
            personaInstructions.map(p => p.id === id ? { ...p, isActive: !p.isActive } : p)
        );
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    const handleResetConfirm = () => {
        if (confirmInput === "초기화" && onResetVocabulary) {
            onResetVocabulary();
            setShowResetModal(false);
            setConfirmInput("");
            setIsOpen(false);
        }
    };

    return (
        <>
            <div className={`relative ${isCollapsed ? 'w-full flex justify-center' : 'w-full'}`} ref={menuRef}>
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className={`flex items-center py-2 rounded-lg text-zinc-400 hover:text-white hover:bg-[#27272a] transition-all duration-300 w-full`}
                    title="설정"
                >
                    <div className="w-10 flex items-center justify-center flex-shrink-0">
                        <Settings className="w-4 h-4" />
                    </div>
                    {!isCollapsed && (
                        <div className="flex-1 text-left opacity-100 ml-2">
                             <span className="text-sm font-medium whitespace-nowrap">설정 및 도움말</span>
                        </div>
                    )}
                </button>

                {isOpen && (
                    <div 
                        className={`absolute min-w-[220px] bg-[#1e1f20] rounded-xl shadow-lg border border-[#2a2b2c] py-1.5 z-[9999] animate-in fade-in zoom-in-95 duration-200 ${
                            isCollapsed 
                            ? "left-full bottom-0 ml-2 origin-bottom-left"
                            : "left-0 bottom-full mb-2 origin-bottom-left"
                        }`}
                    >
                        {/* AI Instructions */}
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                navigate("/settings/instructions");
                                setIsOpen(false);
                            }}
                            className="w-full flex items-center px-4 py-2.5 text-[#E3E3E3] hover:bg-[#2a2b2c] transition-colors text-sm gap-3 group"
                        >
                            <Lightbulb className="w-4 h-4 text-zinc-400 group-hover:text-blue-400 transition-colors" />
                            <span>지침 관리</span>
                            {personaInstructions.some(p => p.isActive) && (
                                <span className="ml-auto w-1.5 h-1.5 bg-blue-500 rounded-full" />
                            )}
                        </button>

                         {/* Voice Toggle */}
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onToggleAutoTTS?.();
                            }}
                            className="w-full flex items-center px-4 py-2.5 text-[#E3E3E3] hover:bg-[#2a2b2c] transition-colors text-sm gap-3 group"
                        >
                            <Volume2 className={`w-4 h-4 ${isAutoTTS ? 'text-green-400' : 'text-zinc-400 group-hover:text-white'} transition-colors`} />
                            <span>답변 읽어주기</span>
                            <div className={`ml-auto w-8 h-4 rounded-full p-0.5 transition-colors ${isAutoTTS ? 'bg-green-600' : 'bg-zinc-700'}`}>
                                <div className={`w-3 h-3 bg-white rounded-full transition-transform ${isAutoTTS ? 'translate-x-4' : 'translate-x-0'}`} />
                            </div>
                        </button>

                        {/* Language Settings */}
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                if (onOpenLanguageSettings) {
                                    onOpenLanguageSettings();
                                } else {
                                    setShowLanguageHelp(true);
                                }
                                setIsOpen(false);
                            }}
                            className="w-full flex items-center px-4 py-2.5 text-[#E3E3E3] hover:bg-[#2a2b2c] transition-colors text-sm gap-3 group"
                        >
                            <Globe className="w-4 h-4 text-zinc-400 group-hover:text-indigo-400 transition-colors" />
                            <span>언어 설정</span>
                        </button>

                        <div className="my-1.5 border-t border-[#2a2b2c]" />

                        {/* Reset Vocabulary */}
                        {onResetVocabulary && (
                            <button
                                onClick={() => {
                                    setShowResetModal(true);
                                    setIsOpen(false);
                                }}
                                className="w-full flex items-center px-4 py-2.5 text-[#E3E3E3] hover:bg-[#2a2b2c] transition-colors text-sm gap-3 group"
                            >
                                <Trash2 className="w-4 h-4 text-zinc-400 group-hover:text-red-400 transition-colors" />
                                <span>모든 저장소 초기화</span>
                            </button>
                        )}

                        {/* Profile */}
                        <button
                            onClick={() => {
                                navigate("/profile/current_user");
                                setIsOpen(false);
                            }}
                            className="w-full flex items-center px-4 py-2.5 text-[#E3E3E3] hover:bg-[#2a2b2c] transition-colors text-sm gap-3"
                        >
                            <User className="w-4 h-4 text-zinc-400" />
                            <span>내 프로필</span>
                        </button>

                        <div className="my-1.5 border-t border-[#2a2b2c]" />

                        {/* Logout */}
                        <button
                            onClick={() => {
                                onLogout();
                                setIsOpen(false);
                            }}
                            className="w-full flex items-center px-4 py-2.5 text-[#E3E3E3] hover:bg-[#2a2b2c] transition-colors text-sm gap-3"
                        >
                            <LogOut className="w-4 h-4 text-zinc-400" />
                            <span>로그아웃</span>
                        </button>
                    </div>
                )}
            </div>

            {/* Custom Reset Confirmation Modal */}
            {showResetModal && (
                <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="w-[400px] bg-[#1e1f20] border border-[#27272a] rounded-2xl shadow-2xl p-6 animate-in zoom-in-95 duration-200">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                                <AlertTriangle className="w-5 h-5 text-red-400" />
                            </div>
                            <h3 className="text-lg font-semibold text-white">저장소 초기화</h3>
                        </div>
                        
                        <p className="text-sm text-zinc-400 mb-4 leading-relaxed">
                            정말로 모든 단어/문장 데이터를 초기화하시겠습니까?<br />
                            <span className="text-red-400 font-medium">현재 저장된 {vocabularyCount}개의 단어 데이터가 영구적으로 삭제됩니다.</span><br />
                            <span className="text-red-400 font-medium italic underline">이 작업은 절대 되돌릴 수 없습니다.</span>
                        </p>
                        
                        <p className="text-sm text-zinc-500 mb-3">
                            계속하려면 아래에 <span className="text-white font-bold">'초기화'</span>를 입력하세요.
                        </p>

                        
                        <input
                            type="text"
                            value={confirmInput}
                            onChange={(e) => setConfirmInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") handleResetConfirm();
                                if (e.key === "Escape") {
                                    setShowResetModal(false);
                                    setConfirmInput("");
                                }
                            }}
                            placeholder="초기화"
                            autoFocus
                            className="w-full bg-[#27272a] text-white px-4 py-3 rounded-xl border border-zinc-700 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500 transition-all mb-6 placeholder-zinc-600"
                        />
                        
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => {
                                    setShowResetModal(false);
                                    setConfirmInput("");
                                }}
                                className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors rounded-lg"
                            >
                                취소
                            </button>
                            <button
                                onClick={handleResetConfirm}
                                disabled={confirmInput !== "초기화"}
                                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                                    confirmInput === "초기화"
                                        ? "bg-red-600 hover:bg-red-500 text-white"
                                        : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                                }`}
                            >
                                초기화
                            </button>
                        </div>
                    </div>
                </div>
            )}
            
            {/* Language Help Modal */}
            {showLanguageHelp && (
                 <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setShowLanguageHelp(false)}>
                    <div 
                        className="w-[480px] bg-[#1e1f20] border border-[#27272a] rounded-2xl shadow-2xl p-6 animate-in zoom-in-95 duration-200"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center">
                                <Globe className="w-5 h-5 text-indigo-400" />
                            </div>
                            <h3 className="text-lg font-semibold text-white">언어 설정 가이드</h3>
                        </div>
                        
                        <div className="space-y-6">
                            <div className="bg-[#27272a] rounded-xl p-4 border border-[#3f3f46]">
                                <h4 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                                    Native Language (모국어)
                                </h4>
                                <p className="text-sm text-zinc-400 leading-relaxed ml-4">
                                    상대방의 메시지가 <span className="text-white font-medium">번역되어 표시될 언어</span>입니다.<br/>
                                    "Korean"으로 설정하면 모든 메시지를 한국어로 볼 수 있습니다.
                                </p>
                            </div>

                            <div className="bg-[#27272a] rounded-xl p-4 border border-[#3f3f46]">
                                <h4 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                    Target Language (학습 언어)
                                </h4>
                                <p className="text-sm text-zinc-400 leading-relaxed ml-4">
                                    내가 <span className="text-white font-medium">배우고 싶은 언어</span>입니다.<br/>
                                    AI가 문장 분석 및 학습 팁을 제공할 때 기준이 됩니다.
                                </p>
                            </div>

                            <div className="text-sm text-zinc-500 bg-zinc-800/50 p-4 rounded-xl">
                                <p>
                                    💡 <span className="font-medium text-zinc-300">Global Chat 상단</span>의 드롭다운 메뉴에서<br/>
                                    언제든지 설정을 변경할 수 있습니다.
                                </p>
                            </div>
                        </div>

                        <div className="flex justify-end mt-6">
                            <button
                                onClick={() => setShowLanguageHelp(false)}
                                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-xl transition-all shadow-lg shadow-blue-900/20"
                            >
                                확인
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
