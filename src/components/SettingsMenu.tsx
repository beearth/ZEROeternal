import React, { useState, useRef, useEffect } from "react";
import { Settings, LogOut, User, AlertTriangle, Lightbulb, ChevronRight, Trash2, Volume2, Mic } from "lucide-react";



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
    vocabularyCount = 0
}: SettingsMenuProps) {


    const [isOpen, setIsOpen] = useState(false);
    const [showResetModal, setShowResetModal] = useState(false);
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
                        className={`absolute w-80 bg-[#1e1f20] rounded-xl shadow-lg border border-[#2a2b2c] py-2 z-[9999] animate-in fade-in duration-200 ${
                            isCollapsed 
                            ? "left-full bottom-0 ml-2 zoom-in-95 origin-bottom-left"
                            : "left-0 bottom-full mb-2 zoom-in-95 origin-bottom-left"
                        }`}
                    >
                        <div className="px-4 py-2 border-b border-[#2a2b2c] mb-1">
                            <h3 className="text-xs font-semibold text-[#9ca3af] uppercase tracking-wider">
                                설정
                            </h3>
                        </div>

                        {/* AI Persona Multi-Instruction Section - Simplified Link */}
                        <div className="px-4 py-3 border-b border-[#2a2b2c]">
                            <div className="flex items-center justify-between mb-2">
                                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-tight">
                                    AI 페르소나 지침
                                </label>
                                <span className="text-[10px] bg-blue-500/10 text-blue-400 px-1.5 py-0.5 rounded-full font-bold">
                                    {personaInstructions.filter(p => p.isActive).length}개 활성
                                </span>
                            </div>
                            
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    navigate("/settings/instructions");
                                    setIsOpen(false);
                                }}
                                className="w-full flex items-center justify-between p-3 bg-[#131314] hover:bg-[#27272a] rounded-xl border border-zinc-800 transition-all group cursor-pointer"
                            >
                                <div className="flex items-center gap-3 pointer-events-none">
                                    <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center">
                                        <Lightbulb className="w-4 h-4 text-blue-400" />
                                    </div>
                                    <div className="text-left">
                                        <div className="text-xs font-semibold text-white">지침 관리</div>
                                        <div className="text-[10px] text-zinc-500">나만의 AI 요청 사항 설정</div>
                                    </div>
                                </div>
                            </button>
                        </div>

                        {/* Voice Settings Section */}
                        <div className="px-4 py-3 border-b border-[#2a2b2c]">
                            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-tight mb-2 block">
                                음성 기능
                            </label>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onToggleAutoTTS?.();
                                }}
                                className="w-full flex items-center justify-between p-3 bg-[#131314] hover:bg-[#27272a] rounded-xl border border-zinc-800 transition-all group cursor-pointer"
                            >
                                <div className="flex items-center gap-3 pointer-events-none">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${isAutoTTS ? 'bg-green-500/10' : 'bg-zinc-800'}`}>
                                        <Volume2 className={`w-4 h-4 ${isAutoTTS ? 'text-green-400' : 'text-zinc-500'}`} />
                                    </div>
                                    <div className="text-left">
                                        <div className="text-xs font-semibold text-white">답변 읽어주기</div>
                                        <div className="text-[10px] text-zinc-500">AI 답변을 자동으로 음성 출력</div>
                                    </div>
                                </div>
                                <div className={`w-10 h-6 rounded-full p-1 transition-colors pointer-events-none ${isAutoTTS ? 'bg-green-600' : 'bg-zinc-700'}`}>
                                    <div className={`w-4 h-4 bg-white rounded-full transition-transform ${isAutoTTS ? 'translate-x-4' : 'translate-x-0'}`} />
                                </div>
                            </button>
                        </div>




                        {onResetVocabulary && (
                            <button
                                onClick={() => {
                                    setShowResetModal(true);
                                    setIsOpen(false);
                                }}
                                className="w-full flex items-center gap-3 px-4 py-2.5 text-[#E3E3E3] hover:bg-[#2a2b2c] transition-colors text-sm"
                            >
                                <Trash2 className="w-4 h-4" />
                                <span>모든 저장소 초기화</span>
                            </button>
                        )}

                        <button
                            onClick={() => {
                                navigate("/profile/current_user");
                                setIsOpen(false);
                            }}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-[#E3E3E3] hover:bg-[#2a2b2c] transition-colors text-sm"
                        >
                            <User className="w-4 h-4" />
                            <span>내 프로필</span>
                        </button>

                        <div className="my-1 border-t border-[#2a2b2c]" />

                        <button
                            onClick={() => {
                                onLogout();
                                setIsOpen(false);
                            }}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-[#E3E3E3] hover:bg-[#2a2b2c] transition-colors text-sm"
                        >
                            <LogOut className="w-4 h-4" />
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
        </>
    );
}
