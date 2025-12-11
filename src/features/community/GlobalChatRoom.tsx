import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, Globe, BookOpen, RefreshCw, Trash2, Menu, Bot } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from "../../components/ui/avatar";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { toast } from "sonner";
import { translateText, generateStudyTips } from "../../services/gemini";
import type { User as FirebaseUser } from "firebase/auth";
import type { VocabularyEntry, WordData } from "../../types";
import { RadialMenu, RadialDirection } from "../../components/RadialMenuNew";
import { useLongPress } from "../../hooks/useLongPress";
import { WordDetailModal } from "../../components/WordDetailModal";
import { subscribeToMessages, sendMessage } from '../../services/chat';
import { supabase } from '../../supabase';

interface GlobalChatRoomProps {
    user: FirebaseUser | null;
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
    nativeLang: string;
    onSaveSentence?: (sentence: string) => void;
    onSaveImportant?: (word: WordData) => void;
}

interface ChatMessage {
    id: string;
    text: string;
    translatedText: string;
    senderId: string;
    senderName: string;
    senderAvatar?: string;
    timestamp: any; // string (ISO)
    originalLang: string;
    targetLang: string;
    learningTranslation?: string;
    nativeTranslation?: string;
}

interface WordSpanProps {
    part: string;
    messageId: string;
    fullSentence: string;
    bgClass: string;
    textClass: string;
    onClick: () => void;
    onLongPress: (e: React.PointerEvent) => void;
}

const WordSpan = ({ part, messageId, fullSentence, bgClass, textClass, onClick, onLongPress }: WordSpanProps) => {
    const longPressHandlers = useLongPress({
        onLongPress: (e) => onLongPress(e),
        onClick: onClick,
        delay: 500,
    });

    return (
        <span
            {...longPressHandlers}
            className={`inline-block rounded px-0.5 cursor-pointer transition-colors ${bgClass} ${textClass}`}
        >
            {part}
        </span>
    );
};

export function GlobalChatRoom({
    user,
    userVocabulary,
    onUpdateWordStatus,
    onResetWordStatus,
    nativeLang,
    onSaveSentence,
    onSaveImportant
}: GlobalChatRoomProps) {
    const navigate = useNavigate();
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [targetLang, setTargetLang] = useState("en");
    const [isInitialLoad, setIsInitialLoad] = useState(true);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Word interaction state
    const [wordStates, setWordStates] = useState<Record<string, number>>({});
    const updateTimeouts = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

    // Radial Menu State
    const [radialMenu, setRadialMenu] = useState<{
        showRadialMenu: boolean;
        menuPosition: { x: number; y: number };
        selectedWord: string | null;
        selectedMessageId: string | null;
        fullSentence: string | null;
        selectedWordData?: { word: string; messageId: string; fullSentence: string }; // Compatible
    }>({
        showRadialMenu: false,
        menuPosition: { x: 0, y: 0 },
        selectedWord: null,
        selectedMessageId: null,
        fullSentence: null
    });

    const [studyTip, setStudyTip] = useState<string | null>(null);
    const [isGeneratingTip, setIsGeneratingTip] = useState(false);
    const [selectedMessageForTip, setSelectedMessageForTip] = useState<string | null>(null);
    const failedTranslations = useRef<Set<string>>(new Set());
    const [selectedWordDetail, setSelectedWordDetail] = useState<WordData | null>(null);

    // Close menu on click outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent | PointerEvent) => {
            if (radialMenu.showRadialMenu) {
                const target = e.target as HTMLElement;
                if (target.closest('.radial-menu-container')) return;
                setRadialMenu(prev => ({ ...prev, showRadialMenu: false }));
            }
        };

        if (radialMenu.showRadialMenu) {
            document.addEventListener("mousedown", handleClickOutside);
            document.addEventListener("pointerdown", handleClickOutside);
        }

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
            document.removeEventListener("pointerdown", handleClickOutside);
        };
    }, [radialMenu.showRadialMenu]);

    // Scroll to bottom
    const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
        messagesEndRef.current?.scrollIntoView({ behavior });
    };

    useEffect(() => {
        if (messages.length > 0) {
            if (isInitialLoad) {
                scrollToBottom("auto");
                setIsInitialLoad(false);
            } else {
                scrollToBottom("smooth");
            }
        }
    }, [messages, isInitialLoad]);

    // Supabase Subscription Logic + Translation Logic
    useEffect(() => {
        const unsubscribe = subscribeToMessages(async (fetchedMessages) => {
            // Process translation logic here similar to previous onSnapshot
            // fetchedMessages are generic, we need to map to ChatMessage with local logic

            const processedMessages = await Promise.all(fetchedMessages.map(async (msg) => {
                const chatMsg: ChatMessage = {
                    ...msg,
                    timestamp: msg.timestamp // Should be ISO string
                };

                // 1. Native Translation
                let nativeTx = "";
                const cachedNative = localStorage.getItem(`trans_${chatMsg.id}_${nativeLang}`);
                const nativeFailKey = `${chatMsg.id}_${nativeLang}`;

                if (cachedNative) {
                    nativeTx = cachedNative;
                } else {
                    const isMyMessage = chatMsg.senderId === user?.uid;
                    const isNativeLangMatch = chatMsg.originalLang === nativeLang;
                    let looksLikeNative = true;
                    if (nativeLang === 'ko') {
                        looksLikeNative = /[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(chatMsg.text);
                    }

                    if (isMyMessage && isNativeLangMatch && looksLikeNative) {
                        nativeTx = chatMsg.text;
                    } else if (chatMsg.targetLang === nativeLang && chatMsg.translatedText && chatMsg.translatedText !== chatMsg.text) {
                        nativeTx = chatMsg.translatedText;
                    } else if (!failedTranslations.current.has(nativeFailKey)) {
                        // Only translate if needed
                        // For simplicity in MVP, skipping deep translation logic unless explicitly requested or clearly different
                        nativeTx = chatMsg.text;
                        // Note: Previous code did lots of async translation checks. 
                        // We can restore it if we want advanced translation,
                        // but for 'Chat is gone', getting basic functionality is priority.
                        // Let's use stored translatedText if compatible
                        if (nativeLang !== chatMsg.originalLang && chatMsg.translatedText) {
                            nativeTx = chatMsg.translatedText;
                        }
                    } else {
                        nativeTx = chatMsg.text;
                    }
                }
                chatMsg.nativeTranslation = nativeTx || chatMsg.text;

                // 2. Learning Translation
                let learningTx = "";
                if (targetLang !== nativeLang) {
                    // Check if caching exists or if text is already in targetLang
                    if (chatMsg.targetLang === targetLang) {
                        learningTx = chatMsg.translatedText;
                    }
                }
                chatMsg.learningTranslation = learningTx; // Can be empty, UI handles it

                return chatMsg;
            }));

            // Deduplicate logic
            const uniqueMsgs: ChatMessage[] = [];
            processedMessages.forEach((msg) => {
                if (uniqueMsgs.length > 0) {
                    const lastMsg = uniqueMsgs[uniqueMsgs.length - 1];
                    if (lastMsg.senderId === msg.senderId && lastMsg.text === msg.text) {
                        return; // Basic dedupe
                    }
                }
                uniqueMsgs.push(msg);
            });

            setMessages(uniqueMsgs);
        });

        // The unsubscribe function void
        return () => {
            // wrapper to call unsubscribe
            unsubscribe();
        };
    }, [nativeLang, targetLang, user]);


    const handleSendMessage = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!inputValue.trim() || !user || isSending) return;

        setIsSending(true);
        try {
            // Determine Original Lang
            const hasKorean = /[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(inputValue);
            const originalLang = hasKorean ? 'ko' : 'en';
            // If user types Korean, target is probably English, and vice versa.
            // But we have targetLang state.
            // If user types Korean and target is English:
            const tLang = targetLang;

            let translated = inputValue;
            try {
                if (originalLang !== tLang) {
                    translated = await translateText(inputValue, tLang);
                }
            } catch (translationError) {
                console.warn("Translation failed:", translationError);
            }

            await sendMessage(
                inputValue,
                translated,
                user,
                originalLang,
                tLang
            );

            setInputValue('');
            setTimeout(() => {
                inputRef.current?.focus();
            }, 0);
        } catch (error) {
            console.error("Error sending message:", error);
            toast.error("메시지 전송 실패");
        } finally {
            setIsSending(false);
        }
    };

    const handleDeleteMessage = async (messageId: string) => {
        if (!window.confirm("메시지를 삭제하시겠습니까? (본인만 가능)")) return;
        try {
            const { error } = await supabase.from('messages').delete().eq('id', messageId);
            if (error) throw error;
            toast.success("메시지가 삭제되었습니다.");
            // Subscription will update UI
        } catch (error) {
            console.error("Error deleting message:", error);
            toast.error("메시지 삭제 실패");
        }
    };

    const cleanMarkdown = (text: string): string => {
        return text
            .replace(/\*\*/g, "")
            .replace(/\*/g, "")
            .replace(/`/g, "")
            .replace(/#{1,6}\s/g, "")
            .trim();
    };

    const isMeaningfulWord = (text: string): boolean => {
        const cleaned = cleanMarkdown(text);
        return /[\p{L}\p{N}]/u.test(cleaned);
    };

    const handleWordClick = useCallback(async (word: string, messageId: string, fullSentence: string) => {
        const cleanWord = cleanMarkdown(word);
        if (!isMeaningfulWord(word)) return;

        const finalWord = cleanWord.trim().split(/[\s\n.,?!;:()\[\]{}"'`]+/)[0];
        if (!finalWord || finalWord.length < 2) return;

        const wordKey = finalWord.toLowerCase();
        const uniqueKey = `${messageId}-${wordKey}`;

        const globalEntry = userVocabulary[wordKey];
        const currentState = globalEntry
            ? (globalEntry.status === "red" ? 1 : globalEntry.status === "yellow" ? 2 : 3)
            : (wordStates[uniqueKey] || 0);

        let nextState: number;
        if (currentState === 0) nextState = 1;
        else if (currentState === 3) nextState = 0;
        else nextState = currentState + 1;

        setWordStates(prev => ({ ...prev, [uniqueKey]: nextState }));

        if (updateTimeouts.current[uniqueKey]) {
            clearTimeout(updateTimeouts.current[uniqueKey]);
        }

        updateTimeouts.current[uniqueKey] = setTimeout(async () => {
            if (nextState === 0) {
                onResetWordStatus(finalWord);
                toast.success(`"${finalWord}" 초기화됨`);
            } else {
                const statusMap: Record<number, "red" | "yellow" | "green"> = { 1: "red", 2: "yellow", 3: "green" };
                await onUpdateWordStatus(
                    `${messageId}-${finalWord}`,
                    statusMap[nextState],
                    finalWord,
                    messageId,
                    fullSentence
                );
                toast.success(`"${finalWord}" -> ${statusMap[nextState].toUpperCase()}`);
            }
            delete updateTimeouts.current[uniqueKey];
        }, 500);

    }, [userVocabulary, wordStates, onUpdateWordStatus, onResetWordStatus]);

    const handleLongPress = useCallback((e: React.PointerEvent, word: string, messageId: string, fullSentence: string) => {
        e.preventDefault();
        e.stopPropagation();

        const clickX = e.clientX;
        const clickY = e.clientY;

        if (navigator.vibrate) navigator.vibrate(50);

        const cleanWord = cleanMarkdown(word);
        const finalWord = cleanWord.trim().split(/[\s\n.,?!;:()\[\]{}"'`]+/)[0];

        setRadialMenu({
            showRadialMenu: true,
            menuPosition: { x: clickX, y: clickY },
            selectedWord: finalWord,
            selectedMessageId: messageId,
            fullSentence,
            selectedWordData: { word: finalWord, messageId, fullSentence }
        });
    }, []);

    const handleRadialSelect = useCallback((direction: RadialDirection) => {
        const { selectedWordData } = radialMenu;
        if (!selectedWordData) return;

        const { word, messageId, fullSentence } = selectedWordData;

        switch (direction) {
            case "left":
                if (onSaveSentence) {
                    onSaveSentence(fullSentence);
                    toast.success("문장이 저장되었습니다.");
                } else {
                    toast.error("문장 저장 기능을 사용할 수 없습니다.");
                }
                break;
            case "top":
                const entry = userVocabulary[word.toLowerCase()];
                setSelectedWordDetail({ // Fixed state set
                    word: word,
                    koreanMeaning: entry?.koreanMeaning || "",
                    status: entry?.status || "white",
                    messageId: messageId,
                    sentence: fullSentence, // aligned with type if needed, or pass fullSentence
                    timestamp: new Date()
                } as any);
                break;
            case "right":
                if (onSaveImportant) {
                    onSaveImportant({
                        id: `${messageId}-${word}`,
                        word: word,
                        status: "red",
                        messageId: messageId,
                        sentence: fullSentence,
                        timestamp: new Date(),
                        koreanMeaning: userVocabulary[word.toLowerCase()]?.koreanMeaning || ""
                    });
                    toast.success(`"${word}" 중요 단어로 저장됨`);
                } else {
                    onUpdateWordStatus(
                        `${messageId}-${word}`,
                        "red",
                        word,
                        messageId,
                        fullSentence
                    );
                    toast.success(`"${word}" 중요 단어로 저장됨`);
                }
                break;
            case "bottom":
                if (window.speechSynthesis) {
                    const utterance = new SpeechSynthesisUtterance(word);
                    utterance.lang = "en-US";
                    window.speechSynthesis.speak(utterance);
                }
                break;
        }

        setRadialMenu(prev => ({
            ...prev,
            showRadialMenu: false,
            selectedWordData: undefined
        }));
    }, [radialMenu, onSaveSentence, onSaveImportant, onUpdateWordStatus, userVocabulary]);

    const renderClickableText = (text: string | undefined, messageId: string, isMe: boolean) => {
        if (!text) return null;

        let parts: string[] = [];
        parts = text.split(/([\s\n.,?!;:()\[\]{}"'`，。？！、：；“”‘’（）《》【】]+)/);

        return (
            <div className="flex flex-wrap items-center gap-y-1">
                {parts.map((part, index) => {
                    if (/^[\s\n.,?!;:()\[\]{}"'`，。？！、：；“”‘’（）《》【】]+$/.test(part)) {
                        return <span key={index}>{part}</span>;
                    }

                    const clean = cleanMarkdown(part);
                    if (!isMeaningfulWord(part)) {
                        return <span key={index}>{part}</span>;
                    }

                    const wordKey = clean.trim().toLowerCase();
                    const uniqueKey = `${messageId}-${wordKey}`;

                    const globalEntry = userVocabulary[wordKey];
                    const status = globalEntry
                        ? globalEntry.status
                        : (wordStates[uniqueKey] === 1 ? "red" : wordStates[uniqueKey] === 2 ? "yellow" : wordStates[uniqueKey] === 3 ? "green" : "white");

                    // Default Style
                    let bgClass = isMe ? "hover:bg-blue-500" : "hover:bg-slate-200";
                    let textClass = isMe ? "text-white" : "text-slate-800";

                    // Status Style (Overrides)
                    if (status === "red") {
                        bgClass = "bg-red-100/20 hover:bg-red-200/30";
                        textClass = isMe ? "text-red-100 font-bold underline decoration-red-300" : "text-red-600 font-bold";
                    } else if (status === "yellow") {
                        bgClass = "bg-yellow-100/20 hover:bg-yellow-200/30";
                        textClass = isMe ? "text-yellow-100 font-bold underline decoration-yellow-300" : "text-yellow-600 font-bold";
                    } else if (status === "green") {
                        bgClass = "bg-green-100/20 hover:bg-green-200/30";
                        textClass = isMe ? "text-green-100 font-bold underline decoration-green-300" : "text-green-600 font-bold";
                    }

                    return (
                        <WordSpan
                            key={index}
                            part={part}
                            messageId={messageId}
                            fullSentence={text}
                            bgClass={bgClass}
                            textClass={textClass}
                            onClick={() => handleWordClick(part, messageId, text)}
                            onLongPress={(e) => handleLongPress(e, part, messageId, text)}
                        />
                    );
                })}
            </div>
        );
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    return (
        <div className="flex-1 flex flex-col h-full bg-[#f0f2f5] relative">
            {/* Radial Menu */}
            {radialMenu.showRadialMenu && (
                <RadialMenu
                    center={radialMenu.menuPosition}
                    isOpen={radialMenu.showRadialMenu}
                    onSelect={handleRadialSelect}
                    onClose={() => setRadialMenu(prev => ({ ...prev, showRadialMenu: false }))}
                    selectedWord={radialMenu.selectedWord || ""}
                    variant="chat"
                />
            )}

            {/* Word Detail Modal */}
            {selectedWordDetail && (
                <WordDetailModal
                    open={!!selectedWordDetail}
                    onOpenChange={(open) => !open && setSelectedWordDetail(null)}
                    word={selectedWordDetail.word}
                    koreanMeaning={selectedWordDetail.koreanMeaning || ""}
                    status={selectedWordDetail.status}
                    onGenerateStudyTips={generateStudyTips}
                />
            )}

            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-200 bg-white sticky top-0 z-10 shadow-sm">
                <button
                    onClick={() => navigate('/community')}
                    className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                >
                    <ArrowLeft className="w-5 h-5 text-slate-600" />
                </button>

                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white">
                    <Globe className="w-6 h-6" />
                </div>

                <div className="flex flex-col flex-1">
                    <span className="font-bold text-slate-900 text-lg">Global Open Chat 🌏</span>
                    <span className="text-xs text-slate-500">
                        Native: {nativeLang.toUpperCase()} | Target: {targetLang.toUpperCase()}
                    </span>
                </div>

                <select
                    value={targetLang}
                    onChange={(e) => setTargetLang(e.target.value)}
                    className="text-sm border border-slate-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                    <option value="en">English</option>
                    <option value="ko">Korean</option>
                    <option value="ja">Japanese</option>
                    <option value="zh">Chinese</option>
                    <option value="es">Spanish</option>
                    <option value="fr">French</option>
                    <option value="de">German</option>
                </select>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-100">
                {messages.map((message) => {
                    const isMe = message.senderId === user?.uid;
                    return (
                        <div
                            key={message.id}
                            className={`flex gap-3 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}
                        >
                            {!isMe && (
                                <Avatar className="h-10 w-10 border border-slate-200 mt-1">
                                    <AvatarImage src={message.senderAvatar} />
                                    <AvatarFallback>{message.senderName[0]}</AvatarFallback>
                                </Avatar>
                            )}

                            <div className={`flex flex-col max-w-[85%] ${isMe ? 'items-end' : 'items-start'}`}>
                                {!isMe && (
                                    <span className="text-xs text-slate-500 mb-1 ml-1">{message.senderName}</span>
                                )}

                                <div
                                    className={`p-4 rounded-2xl shadow-sm ${isMe
                                        ? "bg-blue-600 text-white rounded-tr-none"
                                        : "bg-white text-gray-900 border border-slate-200 rounded-tl-none"
                                        }`}
                                >
                                    {/* 1. Native Translation (Primary) */}
                                    <div className={`text-[15px] leading-relaxed font-medium ${isMe ? 'text-white' : 'text-gray-900'}`}>
                                        {renderClickableText(message.nativeTranslation || message.text, message.id, isMe)}
                                    </div>

                                    {/* 2. Learning Translation (Secondary) */}
                                    {message.learningTranslation && (
                                        <div className={`text-sm mt-3 pt-2 border-t ${isMe ? "border-blue-400/50 text-blue-50" : "border-slate-100 text-slate-600"}`}>
                                            <div className="flex items-center gap-1 mb-1 opacity-70">
                                                <span className="text-[10px] uppercase tracking-wider font-bold">
                                                    Learning
                                                </span>
                                            </div>
                                            {renderClickableText(message.learningTranslation, message.id, isMe)}
                                        </div>
                                    )}
                                </div>

                                <div className="flex items-center gap-1 px-1 mt-1">
                                    <span className="text-[10px] text-slate-400">
                                        {message.timestamp ? new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}
                                    </span>
                                    {isMe && (
                                        <button
                                            onClick={() => handleDeleteMessage(message.id)}
                                            className="text-slate-400 hover:text-red-500 p-1 rounded-full hover:bg-slate-100 transition-colors"
                                            title="메시지 삭제"
                                        >
                                            <Trash2 className="w-3 h-3" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="border-t border-slate-200 bg-white p-4 pb-6">
                <div className="max-w-3xl mx-auto flex gap-2">
                    <Input
                        ref={inputRef}
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="메시지를 입력하세요..."
                        className="flex-1 rounded-full px-4 border-slate-300 focus:border-blue-500 h-11 bg-white text-black"
                        disabled={isSending}
                    />
                    <Button
                        onClick={() => handleSendMessage()}
                        disabled={!inputValue.trim() || isSending}
                        className="h-11 w-11 rounded-full bg-blue-600 hover:bg-blue-700 p-0 flex items-center justify-center shadow-md"
                    >
                        {isSending ? (
                            <RefreshCw className="w-5 h-5 animate-spin text-white" />
                        ) : (
                            <Send className="w-5 h-5 text-white" />
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );
}
