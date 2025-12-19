import React, { useState, useRef, useEffect } from "react";
import { Settings, LogOut, User, Trash2, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface SettingsMenuProps {
    onLogout: () => void;
    onResetLanguage: () => void;
    onResetVocabulary?: () => void;
    isCollapsed?: boolean;
}

export function SettingsMenu({ onLogout, onResetLanguage, onResetVocabulary, isCollapsed = false }: SettingsMenuProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [showResetModal, setShowResetModal] = useState(false);
    const [confirmInput, setConfirmInput] = useState("");
    const menuRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();

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
            <div className="relative w-full" ref={menuRef}>
            <button
                    onClick={() => setIsOpen(!isOpen)}
                    className={`flex items-center py-2 rounded-lg text-zinc-400 hover:text-white hover:bg-[#27272a] transition-all duration-300 ${
                        isCollapsed ? "justify-center w-10 h-10" : "gap-3 px-1 w-full"
                    }`}
                    title="설정"
                >
                    <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
                        <Settings className="w-4 h-4" />
                    </div>
                    {!isCollapsed && (
                        <span className="text-sm font-medium whitespace-nowrap">설정 및 도움말</span>
                    )}
                </button>

                {isOpen && (
                    <div 
                        className={`absolute w-56 bg-[#1e1f20] rounded-xl shadow-lg border border-[#2a2b2c] py-2 z-[9999] animate-in fade-in duration-200 ${
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
                            <span className="text-red-400 font-medium">이 작업은 되돌릴 수 없습니다.</span>
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
