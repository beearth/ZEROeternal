import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, Globe, BookOpen, RefreshCw, Trash2, Menu, Bot } from 'lucide-react';
import { Button } from "../../components/ui/button";
import { ChatAvatar, ChatUserName } from "./components/ChatUserIdentity";
import { Input } from "../../components/ui/input";
import { toast } from "../../services/toast";
import { translateText, generateStudyTips } from "../../services/gemini";
import type { User as FirebaseUser } from "firebase/auth";
import type { VocabularyEntry, WordData } from "../../types";
import { WordOptionMenu, type WordOptionType } from "../../components/WordOptionMenu";
import { useLongPress } from "../../hooks/useLongPress";
import { WordDetailModal } from "../../components/WordDetailModal";
import { subscribeToMessages, sendMessage, deleteMessage } from '../../services/chat';

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
    setNativeLang: (lang: string) => void;
    targetLang: string;
    onSaveSentence?: (sentence: string) => void;
    onSaveImportant?: (word: WordData) => void;
    importantStack: WordData[];
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
    wordState: number;
    isMe: boolean;
    messageId: string;
    fullSentence: string;
    onClick: () => void;
    onLongPress: (e: React.PointerEvent) => void;
}

// Helper function for styles (Strictly Same as ChatMessage)
const getWordStyle = (state: number) => {
    switch (state) {
        case 1:
            return {
                className: "bg-red-200 text-red-900 font-bold",
                style: { backgroundColor: "#fecaca", color: "#7f1d1d" },
            };
        case 2:
            return {
                className: "bg-yellow-200 text-yellow-900 font-bold",
                style: { backgroundColor: "#fef08a", color: "#713f12" },
            };
        case 3:
            return {
                className: "bg-green-200 text-green-900 font-bold",
                style: { backgroundColor: "#bbf7d0", color: "#14532d" },
            };
        case 4:
            return {
                className: "bg-blue-200 text-blue-900 font-bold",
                style: { backgroundColor: "#bfdbfe", color: "#1e3a8a" },
            };
        default:
            return { className: "", style: {} };
    }
};

const WordSpan = ({ part, wordState, isMe, messageId, fullSentence, onClick, onLongPress }: WordSpanProps) => {
    const longPressHandlers = useLongPress({
        onLongPress: (e) => onLongPress(e),
        onClick: onClick,
        delay: 500,
    });

    const styleInfo = getWordStyle(wordState);

    // Default Style (if no status) - Keeps bubble colors
    const defaultClass = isMe ? "hover:bg-blue-500 text-white" : "hover:bg-zinc-700 text-zinc-100";

    // Unified Class Logic
    const finalClassName = wordState > 0
        ? `${styleInfo.className} px-0.5 rounded shadow-sm cursor-pointer transition-colors inline-block`
        : `${defaultClass} px-0.5 rounded cursor-pointer transition-colors inline-block`;

    return (
        <span
            {...longPressHandlers}
            onContextMenu={(e) => e.preventDefault()}
            className={finalClassName}
            style={{
                userSelect: "none",
                WebkitUserSelect: "none",
                MozUserSelect: "none",
                msUserSelect: "none",
                WebkitTouchCallout: "none",
                touchAction: "manipulation",
                ...(wordState > 0 ? styleInfo.style : {})
            }}
            // @ts-ignore
            onSelectStart={(e) => e.preventDefault()}
        >
            {part}
        </span>
    );
};

// 텍스트 세그먼트 분리 함수 (일관된 토큰화 보장 - ChatMessage와 동일)
// Performance Optimization: Re-use Segmenter instance
const gSegmenter = (typeof Intl !== 'undefined' && 'Segmenter' in Intl)
    ? new (Intl as any).Segmenter("en", { granularity: 'word' })
    : null;

const getSegments = (text: string) => {
    let parts: string[] = [];
    if (gSegmenter) {
        const segments = gSegmenter.segment(text);
        for (const { segment } of segments) {
            parts.push(segment);
        }
    } else {
        parts = text.split(/([\s\n.,?!;:()\[\]{}"'`，。？！、：；“”‘’（）《》【】]+)/);
    }
    return parts;
};

export function GlobalChatRoom({
    user,
    userVocabulary,
    onUpdateWordStatus,
    onResetWordStatus,
    nativeLang,
    setNativeLang,
    targetLang,
    onSaveSentence,
    onSaveImportant,
    importantStack
}: GlobalChatRoomProps) {
    const navigate = useNavigate();
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [isSending, setIsSending] = useState(false);
    // const [targetLang, setTargetLang] = useState("en"); // Replaced by prop
    const [isInitialLoad, setIsInitialLoad] = useState(true);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Word interaction state
    const [wordStates, setWordStates] = useState<Record<string, number>>({});
    const updateTimeouts = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

    // Radial Menu State
    useEffect(() => {
        console.log("GlobalChatRoom importantStack:", importantStack);
    }, [importantStack]);

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

    const prevMessageCountRef = useRef<number>(0);

    useEffect(() => {
        const currentCount = messages.length;
        if (currentCount > 0) {
            if (isInitialLoad) {
                scrollToBottom("auto");
                setIsInitialLoad(false);
            } else if (currentCount > prevMessageCountRef.current) {
                // Only scroll if new messages arrived
                scrollToBottom("smooth");
            }
        }
        prevMessageCountRef.current = currentCount;
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
            // [OPTIMIZATION] AI Translation API Removed by User Request to save usage
            // The AI Logic is now "Code-Switching" so explicit translation is redundant.
            /*
            try {
                if (originalLang !== tLang) {
                    translated = await translateText(inputValue, tLang);
                }
            } catch (translationError) {
                console.warn("Translation failed:", translationError);
            }
            */

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
            await deleteMessage(messageId);
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
            ? (globalEntry.status === "red" ? 1 : globalEntry.status === "yellow" ? 2 : globalEntry.status === "green" ? 3 : globalEntry.status === "orange" ? 4 : 0)
            : (wordStates[uniqueKey] || 0);

        let nextState: number;
        if (currentState === 0) nextState = 1;
        else if (currentState === 4) nextState = 0; // Click orange -> clear
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

    const handleOptionSelect = useCallback((option: WordOptionType) => {
        const { selectedWordData } = radialMenu;
        if (!selectedWordData) return;

        const { word, messageId, fullSentence } = selectedWordData;

        switch (option) {
            case "sentence":
                if (onSaveSentence) {
                    // 1. Try to get user selection first (High Priority)
                    const selection = window.getSelection()?.toString().trim();
                    if (selection && selection.length > 5) {
                        onSaveSentence(selection);
                        toast.success("선택한 문장이 저장되었습니다.");
                    } else {
                        // 2. If no selection, try to extract the specific sentence containing the word
                        // Current `fullSentence` is usually the entire message content
                        const sentences = fullSentence.match(/[^.!?]+[.!?]+/g) || [fullSentence];
                        const targetSentence = sentences.find(s => s.toLowerCase().includes(word.toLowerCase()))?.trim() || fullSentence;

                        onSaveSentence(targetSentence);
                        toast.success(targetSentence === fullSentence ? "문장(전체)이 저장되었습니다." : "문장이 저장되었습니다.");
                    }
                } else {
                    toast.error("문장 저장 기능을 사용할 수 없습니다.");
                }
                break;
            case "detail":
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
            case "important":
                if (onSaveImportant) {
                    // Strict cleaning: remove punctuation from the saved word
                    const wordToSave = word.replace(/[.,!?:;()"']+/g, "").trim();

                    onSaveImportant({
                        id: `${messageId}-${wordToSave}`,
                        word: wordToSave,
                        status: "orange",
                        messageId: messageId,
                        sentence: fullSentence,
                        timestamp: new Date(),
                        koreanMeaning: userVocabulary[wordToSave.toLowerCase()]?.koreanMeaning || ""
                    });
                    toast.success(`"${wordToSave}" 중요 단어로 저장됨`);
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
            case "tts":
                if (window.speechSynthesis) {
                    const utterance = new SpeechSynthesisUtterance(word);
                    utterance.lang = "en-US";
                    window.speechSynthesis.speak(utterance);
                }
                break;
            /* case "delete":
                toast.info("채팅에서는 단어 삭제를 지원하지 않습니다");
                break; */
        }

        setRadialMenu(prev => ({
            ...prev,
            showRadialMenu: false,
            selectedWordData: undefined
        }));
    }, [radialMenu, onSaveSentence, onSaveImportant, onUpdateWordStatus, userVocabulary]);

    const renderClickableText = (text: string | undefined, messageId: string, isMe: boolean) => {
        if (!text) return null;

        const parts = getSegments(text);

        return (
            <div className="flex flex-wrap items-center gap-y-1">
                {parts.map((part, index) => {
                    // preserve whitespace or punctuation as is (Comprehensive check)
                    if (/^[\s\n.,?!;:()\[\]{}"'`，。？！、：；“”‘’（）《》【】]+$/.test(part)) {
                        return <span key={index}>{part}</span>;
                    }

                    const clean = cleanMarkdown(part);
                    // Strict cleaning for key matching: remove punctuation
                    const wordKey = clean.replace(/[.,!?:;()"']+/g, "").trim().toLowerCase();

                    if (!wordKey) return <span key={index}>{part}</span>;

                    // Use unique key for random state consistency
                    const uniqueKey = `${messageId}-${index}`;

                    // Initialize random state if needed (consistency)
                    if (wordStates[uniqueKey] === undefined) {
                        // ...
                    }

                    const globalEntry = userVocabulary[wordKey];

                    // [STRICT TRUTH] Only use userVocabulary (globalEntry).
                    // If word is in vocabulary, use its status.
                    // If deleted (globalEntry undefined), fall back to random wordStates or White.
                    // This prevents "Ghost Orange" colors from stale importantStack.
                    const status = globalEntry
                        ? globalEntry.status
                        : (wordStates[uniqueKey] === 1 ? "red" : wordStates[uniqueKey] === 2 ? "yellow" : wordStates[uniqueKey] === 3 ? "green" : "white");

                    // Debug Log for "Community" or similar
                    if (wordKey === "community") {
                        console.log(`[GlobalChat Debug] Word: ${wordKey}, globalEntry:`, globalEntry, "status:", status);
                    }

                    // Map status to number for WordSpan interaction
                    let statusNumber = 0;
                    if (status === "red") statusNumber = 1;
                    else if (status === "yellow") statusNumber = 2;
                    else if (status === "green") statusNumber = 3;
                    else if (status === "orange") statusNumber = 4;

                    // Use WordSpan for unified behavior (matches ChatMessage exactly)
                    // Note: WordSpan handles its own styling via getWordStyle internally if we pass wordState
                    // We remove manual bgClass/textClass to avoid conflict

                    return (
                        <WordSpan
                            key={index}
                            part={part}
                            wordState={statusNumber}
                            isMe={isMe}
                            messageId={messageId}
                            fullSentence={text}
                            onClick={() => handleWordClick(wordKey, messageId, text)}
                            onLongPress={(e) => handleLongPress(e, wordKey, messageId, text)}
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
        <div className="flex-1 flex flex-col h-full bg-[#09090b] relative">
            {/* WordOptionMenu */}
            <WordOptionMenu
                isOpen={radialMenu.showRadialMenu}
                word={radialMenu.selectedWord || ""}
                onClose={() => setRadialMenu(prev => ({ ...prev, showRadialMenu: false }))}
                onSelectOption={handleOptionSelect}
                hideDeleteOption={true}
            />

            {/* Word Detail Modal */}
            {selectedWordDetail && (
                <WordDetailModal
                    open={!!selectedWordDetail}
                    onOpenChange={(open) => !open && setSelectedWordDetail(null)}
                    word={selectedWordDetail.word}
                    koreanMeaning={selectedWordDetail.koreanMeaning || ""}
                    status={selectedWordDetail.status}
                    onGenerateStudyTips={generateStudyTips}
                    onUpdateWordStatus={async (word, status) => {
                        if (selectedWordDetail) {
                            await onUpdateWordStatus(
                                `${selectedWordDetail.messageId}-${word}`,
                                status,
                                word,
                                selectedWordDetail.messageId,
                                selectedWordDetail.sentence || ""
                            );
                        }
                    }}
                    onDeleteWord={(word) => onResetWordStatus(word)}
                />
            )}

            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-800 bg-[#1e1f20] sticky top-0 z-10 shadow-sm">
                <button
                    onClick={() => navigate('/community')}
                    className="p-2 hover:bg-zinc-700 rounded-lg transition-colors"
                >
                    <ArrowLeft className="w-5 h-5 text-zinc-400" />
                </button>

                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white">
                    <Globe className="w-6 h-6" />
                </div>

                <div className="flex flex-col flex-1">
                    <span className="font-bold text-white text-lg">Global Open Chat 🌏</span>

                </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#09090b]">
                {messages.map((message) => {
                    const isMe = message.senderId === user?.uid;
                    return (
                        <div
                            key={message.id}
                            className={`flex gap-3 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}
                        >
                            {!isMe && (
                                <ChatAvatar
                                    userId={message.senderId}
                                    name={message.senderName}
                                    avatar={message.senderAvatar}
                                    className="h-10 w-10 border border-zinc-700 mt-1"
                                />
                            )}

                            <div className={`flex flex-col max-w-[85%] ${isMe ? 'items-end' : 'items-start'}`}>
                                {!isMe && (
                                    <ChatUserName
                                        userId={message.senderId}
                                        name={message.senderName}
                                        className="text-xs text-zinc-500 mb-1 ml-1 font-medium"
                                    />
                                )}

                                <div
                                    className={`p-4 rounded-2xl shadow-sm ${isMe
                                        ? "bg-blue-600 text-white rounded-tr-none"
                                        : "bg-zinc-800 text-zinc-100 border border-zinc-700 rounded-tl-none"
                                        }`}
                                >
                                    {/* 1. Native Translation (Primary) */}
                                    <div className={`text-[15px] leading-relaxed font-medium ${isMe ? 'text-white' : 'text-zinc-100'}`}>
                                        {renderClickableText(message.nativeTranslation || message.text, message.id, isMe)}
                                    </div>

                                    {/* 2. Learning Translation (Secondary) */}
                                    {message.learningTranslation && (
                                        <div className={`text-sm mt-3 pt-2 border-t ${isMe ? "border-blue-400/50 text-blue-50" : "border-zinc-700 text-zinc-400"}`}>
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
                                    <span className="text-[10px] text-zinc-500">
                                        {message.timestamp ? new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}
                                    </span>
                                    {isMe && (
                                        <button
                                            onClick={() => handleDeleteMessage(message.id)}
                                            className="text-zinc-500 hover:text-red-500 p-1 rounded-full hover:bg-zinc-800 transition-colors"
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
            <div className="border-t border-zinc-800 bg-[#1e1f20] p-4 pb-6">
                <div className="max-w-3xl mx-auto flex gap-2">
                    <Input
                        ref={inputRef}
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="메시지를 입력하세요..."
                        className="flex-1 rounded-full px-4 border-zinc-700 focus:border-blue-500 h-11 bg-zinc-800 text-white placeholder:text-zinc-500"
                        disabled={isSending}
                    />
                    <Button
                        onClick={() => handleSendMessage()}
                        disabled={!inputValue.trim() || isSending}
                        className="h-11 w-11 rounded-full bg-red-600 hover:bg-red-700 p-0 flex items-center justify-center shadow-md"
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

