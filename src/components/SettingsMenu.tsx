import React, { useState, useRef, useEffect } from "react";
import { Settings, LogOut, RefreshCw, MoreHorizontal, User } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface SettingsMenuProps {
    onLogout: () => void;
    onResetLanguage: () => void;
}

export function SettingsMenu({ onLogout, onResetLanguage }: SettingsMenuProps) {
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
        <div className="relative" ref={menuRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                title="설정"
            >
                <MoreHorizontal className="w-6 h-6" />
            </button>

            {isOpen && (
                <div className="absolute left-0 top-full mt-2 w-56 bg-white rounded-xl shadow-lg border border-slate-100 py-2 z-50 animate-in fade-in zoom-in-95 duration-200">
                    <div className="px-4 py-2 border-b border-slate-100 mb-1">
                        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                            설정
                        </h3>
                    </div>

                    <button
                        onClick={() => {
                            onResetLanguage();
                            setIsOpen(false);
                        }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-slate-600 hover:bg-slate-50 hover:text-blue-600 transition-colors text-sm"
                    >
                        <RefreshCw className="w-4 h-4" />
                        <span>언어 설정 초기화</span>
                    </button>

                    <button
                        onClick={() => {
                            navigate("/profile/current_user");
                            setIsOpen(false);
                        }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-slate-600 hover:bg-slate-50 hover:text-blue-600 transition-colors text-sm"
                    >
                        <User className="w-4 h-4" />
                        <span>내 프로필</span>
                    </button>

                    <div className="my-1 border-t border-slate-100" />

                    <button
                        onClick={() => {
                            onLogout();
                            setIsOpen(false);
                        }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-red-500 hover:bg-red-50 transition-colors text-sm"
                    >
                        <LogOut className="w-4 h-4" />
                        <span>로그아웃</span>
                    </button>
                </div>
            )}
        </div>
    );
}
