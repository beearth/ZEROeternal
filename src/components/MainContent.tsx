import React, { useRef, useEffect } from "react";
import { Menu, X, User, LogOut, Send } from "lucide-react";
import { toast } from "sonner";
import { ChatMessage } from "./ChatMessage";
import { EternalLogo } from "./EternalLogo";
import { ChatInput } from "./ChatInput";
import { NotificationsPopover } from "./NotificationsPopover";
import type { User as FirebaseUser } from "firebase/auth";
import type { WordData, VocabularyEntry } from "../types";

interface Message {
    id: string;
    role: "user" | "assistant";
    content: string;
    timestamp: Date;
    images?: string[];
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
    onSendMessage: (content: string, images?: string[]) => Promise<void>;
    isSidebarOpen: boolean;
    onToggleSidebar: () => void;
    user: FirebaseUser | null;
    onLogout: () => Promise<void>;
    userVocabulary: Record<string, VocabularyEntry>;
    onUpdateWordStatus: (
        wordId: string,
        newStatus: "red" | "yellow" | "green" | "white" | "orange",
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
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [currentConversation?.messages, isTyping]);
    return (
        <div className="flex-1 flex flex-col bg-[#1e1f20]">
            {/* 헤더 */}
            <header className="bg-[#1e1f20] border-b border-[#2a2b2c] px-4 py-4 flex items-center justify-between relative z-50">
                {/* Left Section: Menu (Visible) & Logo (Hidden on Desktop) */}
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => {
                            // alert("DEBUG: Clicked");
                            console.log("MainContent: Button Clicked");
                            onToggleSidebar();
                        }}
                        className="p-2 hover:bg-[#2a2b2c] rounded-lg transition-colors text-zinc-400 hover:text-white"
                    >
                        {isSidebarOpen ? (
                            <Menu className="w-5 h-5" />
                        ) : (
                            <Menu className="w-5 h-5" />
                        )}
                    </button>

                    {/* Logo: Visible on Mobile, Hidden on Desktop to prevent duplication with Sidebar */}
                    <div className="lg:hidden">
                        <EternalLogo />
                    </div>
                </div>

                {/* User Section: Forced to right with ml-auto */}
                {user && (
                    <div className="flex items-center gap-3 ml-auto">
                        <div className="mr-1">
                            <NotificationsPopover userId={user.uid} />
                        </div>
                        <div className="hidden sm:flex items-center gap-2 px-3 py-2 bg-[#2a2b2c] rounded-lg">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                                <User className="w-4 h-4 text-white" />
                            </div>
                            <div className="text-sm">
                                <p className="text-white font-medium">
                                    {user.displayName || user.email?.split("@")[0] || "사용자"}
                                </p>
                                <p className="text-xs text-zinc-500">{user.email}</p>
                            </div>
                        </div>
                        <button
                            onClick={async () => {
                                await onLogout();
                                toast.success("로그아웃되었습니다.");
                            }}
                            className="p-2 hover:bg-[#2a2b2c] rounded-lg transition-colors"
                            title="로그아웃"
                        >
                            <LogOut className="w-5 h-5 text-zinc-400" />
                        </button>
                    </div>
                )}
            </header>

            {/* 메시지 영역 */}
            <div className="flex-1 overflow-hidden relative flex flex-col">
                {!targetLang ? (
                    <div className="h-full flex items-center justify-center p-4">
                        <div className="text-center max-w-md w-full">
                            <div className="w-16 h-16 bg-[#2a2b2c] rounded-2xl mx-auto mb-6 flex items-center justify-center">
                                <Send className="w-8 h-8 text-zinc-500" />
                            </div>
                            <h2 className="text-2xl text-white mb-2 font-semibold">언어 설정 필요</h2>
                            <p className="text-zinc-500 mb-8">
                                대화를 시작하려면 먼저 학습할 언어를 선택해주세요.
                            </p>
                            <ChatInput
                                onSendMessage={onSendMessage}
                                disabled={true}
                            />
                        </div>
                    </div>
                ) : !currentConversation?.messages.length ? (
                    /* 빈 상태 (제미니 스타일) */
                    <div className="h-full flex flex-col items-center justify-center p-4">
                        <div className="w-full max-w-3xl space-y-8">
                            <div className="space-y-2">
                                <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-red-400 text-transparent bg-clip-text">
                                    안녕하세요, {user?.displayName || "사용자"}님
                                </h1>
                                <p className="text-2xl md:text-3xl text-[#444746] font-medium">
                                    무엇을 도와드릴까요?
                                </p>
                            </div>

                            <div className="w-full">
                                <ChatInput
                                    onSendMessage={onSendMessage}
                                    disabled={!targetLang}
                                />
                            </div>

                            {/* 추천 질문 예시 (선택 사항) */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-4">
                                {/* 추후 칩 추가 가능 */}
                            </div>
                        </div>
                    </div>
                ) : (
                    /* 대화 중 상태 */
                    <>
                        <div className="flex-1 overflow-y-auto px-4 py-6">
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
                                <div ref={messagesEndRef} />
                            </div>
                        </div>

                        {/* 하단 입력바 (대화 중에만 표시) - Standard Sticky Layout */}
                        <div className="border-t border-[#2a2b2c] bg-[#1e1f20] px-4 py-4 sticky bottom-0 z-30">
                            <div className="max-w-3xl mx-auto w-full">
                                <ChatInput
                                    onSendMessage={onSendMessage}
                                    disabled={!targetLang}
                                />
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
