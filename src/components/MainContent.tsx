import React from "react";
import { Menu, X, User, LogOut, Send } from "lucide-react";
import { toast } from "sonner";
import { ChatMessage } from "./ChatMessage";
import { ChatInput } from "./ChatInput";
import type { User as FirebaseUser } from "firebase/auth";
import type { WordData, VocabularyEntry } from "../types";

interface Message {
    id: string;
    role: "user" | "assistant";
    content: string;
    timestamp: Date;
}

interface Conversation {
    id: string;
    title: string;
    messages: Message[];
    timestamp: Date;
}

interface MainContentProps {
    nativeLang: string;
    targetLang: string | null;
    currentConversation?: Conversation;
    isTyping: boolean;
    onSendMessage: (content: string) => Promise<void>;
    isSidebarOpen: boolean;
    onToggleSidebar: () => void;
    user: FirebaseUser | null;
    onLogout: () => Promise<void>;
    userVocabulary: Record<string, VocabularyEntry>;
    onUpdateWordStatus: (
        wordId: string,
        newStatus: "red" | "yellow" | "green" | "white",
        word: string,
        messageId: string,
        sentence: string,
        koreanMeaning?: string,
        isReturningToRed?: boolean
    ) => Promise<void>;
    onResetWordStatus: (word: string) => void;
    onSaveImportant: (word: WordData) => void;
    onSaveSentence: (sentence: string) => void;
}

export function MainContent({
    nativeLang,
    targetLang,
    currentConversation,
    isTyping,
    onSendMessage,
    isSidebarOpen,
    onToggleSidebar,
    user,
    onLogout,
    userVocabulary,
    onUpdateWordStatus,
    onResetWordStatus,
    onSaveImportant,
    onSaveSentence,
}: MainContentProps) {
    return (
        <div className="flex-1 flex flex-col">
            {/* 헤더 */}
            <header className="bg-white border-b border-slate-200 px-4 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <button
                        onClick={onToggleSidebar}
                        className="p-2 hover:bg-slate-100 rounded-lg transition-colors lg:hidden"
                    >
                        {isSidebarOpen ? (
                            <X className="w-5 h-5 text-slate-600" />
                        ) : (
                            <Menu className="w-5 h-5 text-slate-600" />
                        )}
                    </button>
                    <div>
                        <h1 className="text-slate-800">AI 채팅</h1>
                        <p className="text-sm text-slate-500">인공지능과 대화하세요</p>
                    </div>
                </div>

                {/* 사용자 정보 */}
                {user && (
                    <div className="flex items-center gap-3">
                        <div className="hidden sm:flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-lg">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                                <User className="w-4 h-4 text-white" />
                            </div>
                            <div className="text-sm">
                                <p className="text-slate-800 font-medium">
                                    {user.displayName || user.email?.split("@")[0] || "사용자"}
                                </p>
                                <p className="text-xs text-slate-500">{user.email}</p>
                            </div>
                        </div>
                        <button
                            onClick={async () => {
                                await onLogout();
                                toast.success("로그아웃되었습니다.");
                            }}
                            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                            title="로그아웃"
                        >
                            <LogOut className="w-5 h-5 text-slate-600" />
                        </button>
                    </div>
                )}
            </header>

            {/* 메시지 영역 */}
            <div className="flex-1 overflow-y-auto px-4 py-6">
                {!targetLang ? (
                    <div className="h-full flex items-center justify-center">
                        <div className="text-center max-w-md">
                            <div className="w-16 h-16 bg-slate-100 rounded-2xl mx-auto mb-4 flex items-center justify-center">
                                <Send className="w-8 h-8 text-slate-400" />
                            </div>
                            <h2 className="text-slate-800 mb-2 font-semibold">언어 설정 필요</h2>
                            <p className="text-slate-500">
                                대화를 시작하려면 먼저 학습할 언어를 선택해주세요.
                            </p>
                        </div>
                    </div>
                ) : currentConversation?.messages.length === 0 ? (
                    <div className="h-full flex items-center justify-center">
                        <div className="text-center max-w-md">
                            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl mx-auto mb-4 flex items-center justify-center">
                                <Send className="w-8 h-8 text-white" />
                            </div>
                            <h2 className="text-slate-800 mb-2">새로운 대화 시작</h2>
                            <p className="text-slate-500">
                                무엇이든 물어보세요. AI가 답변해드립니다.
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="max-w-3xl mx-auto space-y-6">
                        {currentConversation?.messages.map((message) => (
                            <ChatMessage
                                key={message.id}
                                message={message}
                                onUpdateWordStatus={onUpdateWordStatus}
                                onResetWordStatus={onResetWordStatus}
                                onSaveImportant={onSaveImportant}
                                onSaveSentence={onSaveSentence}
                                userVocabulary={userVocabulary}
                            />
                        ))}
                        {isTyping && (
                            <ChatMessage
                                message={{
                                    id: "typing",
                                    role: "assistant",
                                    content: "",
                                    timestamp: new Date(),
                                }}
                                isTyping={true}
                            />
                        )}
                    </div>
                )}
            </div>

            {/* 입력 영역 */}
            <div className="border-t border-slate-200 bg-white px-4 py-4">
                <div className="max-w-3xl mx-auto">
                    <ChatInput
                        onSendMessage={onSendMessage}
                        disabled={isTyping || !targetLang}
                    />
                </div>
            </div>
        </div>
    );
}
