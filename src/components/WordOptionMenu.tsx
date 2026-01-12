import React from "react";
import { BookOpen, Volume2, Search, X, Trash2, TextSelect } from "lucide-react";

export type WordOptionType = "sentence" | "tts" | "detail" | "delete" | "select";

interface WordOptionMenuProps {
    isOpen: boolean;
    onClose: () => void;
    word: string;
    onSelectOption: (option: WordOptionType) => void;
    hideSentenceOption?: boolean;
    hideDeleteOption?: boolean;
}

export const WordOptionMenu: React.FC<WordOptionMenuProps> = ({
    isOpen,
    onClose,
    word,
    onSelectOption,
    hideSentenceOption,
    hideDeleteOption,
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200"
                onClick={onClose}
            />

            {/* Menu Container */}
            <div className="relative w-full max-w-xs bg-[#2b2d31] rounded-2xl shadow-2xl border border-slate-700/50 overflow-hidden animate-in zoom-in-95 duration-200 p-1">

                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-700/50 bg-[#313338] flex justify-between items-center">
                    <h3 className="text-lg font-bold text-slate-200 truncate pr-4">
                        {word}
                    </h3>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-white transition-colors p-1 rounded-full hover:bg-slate-700"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Options List */}
                <div className="p-2 space-y-1">
                    {!hideSentenceOption && (
                        <MenuButton
                            icon={<BookOpen className="w-5 h-5 text-blue-400" />}
                            label="문장 저장"
                            subLabel="이 문장을 보관함에 저장"
                            onClick={() => {
                                onSelectOption("sentence");
                                onClose();
                            }}
                        />
                    )}
                    <MenuButton
                        icon={<Volume2 className="w-5 h-5 text-green-400" />}
                        label="발음 듣기"
                        subLabel="단어 발음 재생"
                        onClick={() => {
                            onSelectOption("tts");
                            onClose();
                        }}
                    />
                    <MenuButton
                        icon={<Search className="w-5 h-5 text-purple-400" />}
                        label="상세 보기"
                        subLabel="AI 학습 전략 확인"
                        onClick={() => {
                            onSelectOption("detail");
                            onClose();
                        }}
                    />
                    <MenuButton
                        icon={<TextSelect className="w-5 h-5 text-cyan-400" />}
                        label="텍스트 선택"
                        subLabel="복사할 텍스트 선택"
                        onClick={() => {
                            onSelectOption("select");
                            onClose();
                        }}
                    />
                    {!hideDeleteOption && (
                        <MenuButton
                            icon={<Trash2 className="w-5 h-5 text-red-400" />}
                            label="단어 삭제"
                            subLabel="목록에서 제거"
                            onClick={() => {
                                onSelectOption("delete");
                                onClose();
                            }}
                        />
                    )}
                </div>
            </div>
        </div>
    );
};

interface MenuButtonProps {
    icon: React.ReactNode;
    label: string;
    subLabel: string;
    onClick: () => void;
}

const MenuButton: React.FC<MenuButtonProps> = ({ icon, label, subLabel, onClick }) => (
    <button
        onClick={onClick}
        className="w-full flex items-center gap-4 px-4 py-3 rounded-xl hover:bg-[#383a40] active:bg-[#404249] transition-all group text-left"
    >
        <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center group-hover:scale-110 transition-transform shadow-inner">
            {icon}
        </div>
        <div className="flex-1">
            <div className="text-sm font-semibold text-slate-200 group-hover:text-white transition-colors">
                {label}
            </div>
            <div className="text-xs text-slate-500 group-hover:text-slate-400">
                {subLabel}
            </div>
        </div>
    </button>
);
