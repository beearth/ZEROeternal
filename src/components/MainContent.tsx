import React, { useRef, useEffect, useState } from "react";
import { Menu, X, User, LogOut, Send, Search, UserPlus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ChatMessage } from "./ChatMessage";
import { EternalLogo } from "./EternalLogo";
import { ChatInput } from "./ChatInput";
import { NotificationsPopover } from "./NotificationsPopover";
import { ModelSelector } from "./ModelSelector";
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
    onSendMessage: (content: string, images?: string[]) => Promise<string | void> | void;
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
    const prevMessageCountRef = useRef<number>(0);
    const navigate = useNavigate();
    const [showProfileMenu, setShowProfileMenu] = useState(false);
    const profileMenuRef = useRef<HTMLDivElement>(null);

    // 프로필 메뉴 외부 클릭 시 닫기
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
                setShowProfileMenu(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    // Only scroll to bottom when NEW messages are added, not on vocabulary updates
    useEffect(() => {
        const currentMessageCount = currentConversation?.messages?.length || 0;
        const prevCount = prevMessageCountRef.current;
        
        // Scroll only when message count increases or when typing starts
        if (currentMessageCount > prevCount || isTyping) {
            scrollToBottom();
        }
        
        prevMessageCountRef.current = currentMessageCount;
    }, [currentConversation?.messages?.length, isTyping]);
    return (
        <div className="flex-1 flex flex-col bg-[#1e1f20] h-full overflow-hidden">
            {/* 헤더 - Gemini Style */}
            <header style={{
                backgroundColor: '#1e1f20',
                borderBottom: '1px solid #2a2b2c',
                padding: '0.75rem 1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                position: 'sticky',
                top: 0,
                zIndex: 100, // Ensure it stays on top of Sidebar (z-60)
                minHeight: '60px',
            }}>
                {/* Left Section: Hamburger > Search > Red dot + ETERNAL (Gemini Style Fixed) */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {/* 1. Hamburger Menu (Mobile Only - or based on sidebar state) */}
                    {!isSidebarOpen && (
                        <button
                            onClick={() => onToggleSidebar()}
                            className="lg:hidden flex items-center justify-center p-2 rounded-lg text-zinc-400 hover:bg-zinc-800 transition-colors"
                        >
                            <Menu className="w-5 h-5" />
                        </button>
                    )}

                    {/* 2. ETERNAL Logo and Model Selector */}
                    <div className="flex items-center gap-4">
                         {/* Sidebar가 닫혀있거나 모바일일 때 로고 표시 */}
                        {(!isSidebarOpen || window.innerWidth < 1024) && (
                            <EternalLogo />
                        )}
                    </div>
                </div>

                {/* Right Section: Notifications + Profile Icon */}
                {user && (
                    <div ref={profileMenuRef} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: 'auto', position: 'relative' }}>
                        <NotificationsPopover userId={user.uid} />
                        {/* Small profile icon with dropdown */}
                        <div 
                            onClick={() => setShowProfileMenu(!showProfileMenu)}
                            style={{
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

                        {/* Profile Dropdown Menu */}
                        {showProfileMenu && (
                            <div className="absolute right-0 top-10 w-48 bg-[#2a2b2c] rounded-xl shadow-xl border border-zinc-700 py-2 z-50">
                                <button
                                    onClick={() => {
                                        navigate(`/profile/${user.uid}`);
                                        setShowProfileMenu(false);
                                    }}
                                    className="w-full px-4 py-2.5 text-left text-sm text-zinc-200 hover:bg-[#3f3f46] flex items-center gap-3"
                                >
                                    <User className="w-4 h-4" />
                                    <span>내 프로필</span>
                                </button>
                                <button
                                    onClick={() => {
                                        import("../services/auth").then(({ signInWithGoogle }) => {
                                            signInWithGoogle().catch(() => toast.error("계정 전환 실패"));
                                        });
                                        setShowProfileMenu(false);
                                    }}
                                    className="w-full px-4 py-2.5 text-left text-sm text-zinc-200 hover:bg-[#3f3f46] flex items-center gap-3"
                                >
                                    <UserPlus className="w-4 h-4" />
                                    <span>계정 추가/전환</span>
                                </button>
                                <div className="border-t border-zinc-700 my-1" />
                                <button
                                    onClick={() => {
                                        onLogout();
                                        setShowProfileMenu(false);
                                    }}
                                    className="w-full px-4 py-2.5 text-left text-sm text-red-400 hover:bg-[#3f3f46] flex items-center gap-3"
                                >
                                    <LogOut className="w-4 h-4" />
                                    <span>로그아웃</span>
                                </button>
                            </div>
                        )}
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
                    /* 빈 상태 (지식인 스타일) */
                    <div className="h-full flex flex-col items-center justify-center p-4 overflow-y-auto">
                        <div className="w-full max-w-3xl space-y-8">
                            <div className="space-y-2">
                                <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-red-400 text-transparent bg-clip-text">
                                    안녕하세요, {user?.displayName || "사용자"}님
                                </h1>
                                <p className="text-2xl md:text-3xl text-[#444746] font-medium">
                                    무엇이든 물어보세요
                                </p>
                            </div>

                            {/* 오늘의 지식 추천 */}
                            <div className="space-y-3">
                                <div className="flex items-center gap-2 text-sm text-zinc-500">
                                    <span className="text-lg">💡</span>
                                    <span className="font-medium">오늘의 추천 질문</span>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {[
                                        { icon: "🧠", title: "인공지능이란?", desc: "AI의 기본 원리와 활용 분야" },
                                        { icon: "🌍", title: "기후변화의 원인", desc: "지구 온난화가 일어나는 이유" },
                                        { icon: "💰", title: "주식 투자 기초", desc: "초보자를 위한 투자 가이드" },
                                        { icon: "🚀", title: "우주 탐사의 미래", desc: "화성 이주는 가능할까?" },
                                    ].map((item, i) => (
                                        <button
                                            key={i}
                                            onClick={() => onSendMessage(item.title)}
                                            className="flex items-start gap-3 p-4 bg-[#27272a] hover:bg-[#3f3f46] rounded-xl transition-colors text-left group"
                                        >
                                            <span className="text-2xl">{item.icon}</span>
                                            <div>
                                                <p className="text-white font-medium group-hover:text-blue-400 transition-colors">{item.title}</p>
                                                <p className="text-sm text-zinc-500">{item.desc}</p>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="w-full">
                                <ChatInput
                                    onSendMessage={onSendMessage}
                                    disabled={!targetLang}
                                />
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
