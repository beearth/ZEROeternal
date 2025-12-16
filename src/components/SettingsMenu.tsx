import React, { useState, useRef, useEffect } from "react";
import { Settings, LogOut, RefreshCw, MoreHorizontal, User, Trash2, Menu } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface SettingsMenuProps {
    onLogout: () => void;
    onResetLanguage: () => void;
    onResetVocabulary?: () => void;
}

export function SettingsMenu({ onLogout, onResetLanguage, onResetVocabulary }: SettingsMenuProps) {
    const [isOpen, setIsOpen] = useState(false);
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

    return (
        <div className="relative w-full" ref={menuRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center gap-3 px-2 py-2 text-[#9ca3af] hover:text-[#E3E3E3] hover:bg-[#2a2b2c] rounded-lg transition-colors"
                title="설정"
            >
                <Settings className="w-5 h-5" />
                <span className="font-medium text-sm">설정 및 도움말</span>
            </button>

            {isOpen && (
                <div className="absolute left-0 bottom-full mb-2 w-56 bg-[#1e1f20] rounded-xl shadow-lg border border-[#2a2b2c] py-2 z-50 animate-in fade-in zoom-in-95 duration-200">
                    <div className="px-4 py-2 border-b border-[#2a2b2c] mb-1">
                        <h3 className="text-xs font-semibold text-[#9ca3af] uppercase tracking-wider">
                            설정
                        </h3>
                    </div>

                    <button
                        onClick={() => {
                            onResetLanguage();
                            setIsOpen(false);
                        }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-[#E3E3E3] hover:bg-[#2a2b2c] transition-colors text-sm"
                    >
                        <RefreshCw className="w-4 h-4" />
                        <span>언어 설정 초기화</span>
                    </button>

                    {onResetVocabulary && (
                        <button
                            onClick={() => {
                                if (window.confirm("정말로 모든 단어/문장 데이터를 초기화하시겠습니까? 이 작업은 되돌릴 수 없습니다.")) {
                                    const userInput = window.prompt("초기화를 진행하려면 '초기화'를 입력하세요.");
                                    if (userInput === "초기화") {
                                        onResetVocabulary();
                                        setIsOpen(false);
                                    } else if (userInput !== null) {
                                        alert("입력값이 올바르지 않아 취소되었습니다.");
                                    }
                                }
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
    );
}
