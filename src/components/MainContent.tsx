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
            {/* 헤더 - Gemini Style */}
            <header style={{
                backgroundColor: '#1e1f20',
                borderBottom: '1px solid #2a2b2c',
                padding: '0.75rem 1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                position: 'relative',
                zIndex: 50,
            }}>
                {/* Left Section: Hamburger + Title */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    {/* Hamburger - Mobile only */}
                    <button
                        onClick={() => onToggleSidebar()}
                        className="lg:hidden"
                        style={{
                            padding: '0.5rem',
                            borderRadius: '0.375rem',
                            color: '#a1a1aa',
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                        }}
                    >
                        <Menu style={{ width: '1.25rem', height: '1.25rem' }} />
                    </button>

                    {/* Title - ETERNAL brand or chat title */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {/* Red dot - brand element */}
                        <div style={{
                            width: '0.75rem',
                            height: '0.75rem',
                            borderRadius: '50%',
                            backgroundColor: '#dc2626',
                            boxShadow: '0 0 10px #dc2626, 0 0 20px #dc2626',
                            flexShrink: 0,
                        }} />
                        <span style={{
                            fontSize: '1rem',
                            fontWeight: '500',
                            color: '#e4e4e7',
                        }}>
                            {currentConversation?.title || 'ETERNAL'}
                        </span>
                    </div>
                </div>

                {/* Right Section: Notifications + Profile Icon */}
                {user && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <NotificationsPopover userId={user.uid} />
                        {/* Small profile icon */}
                        <div style={{
                            width: '2rem',
                            height: '2rem',
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, #3b82f6, #9333ea)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                        }}>
                            <User style={{ width: '1rem', height: '1rem', color: 'white' }} />
                        </div>
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
