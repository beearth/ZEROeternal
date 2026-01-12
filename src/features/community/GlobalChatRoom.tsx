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
    startOffset: number;
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

const WordSpan = ({ part, wordState, isMe, messageId, fullSentence, startOffset, onClick, onLongPress }: WordSpanProps) => {
    const longPressHandlers = useLongPress({
        onLongPress: (e) => onLongPress(e),
        onClick: onClick,
        delay: 500,
    });

    const styleInfo = getWordStyle(wordState);

    // Default Style (if no status) - Keeps bubble colors
    const defaultClass = isMe ? "hover:bg-zinc-500 text-white" : "hover:bg-zinc-700 text-zinc-100";

    // Unified Class Logic
    const finalClassName = wordState > 0
        ? `${styleInfo.className} px-0.5 rounded shadow-sm cursor-pointer transition-colors inline-block`
        : `${defaultClass} px-0.5 rounded cursor-pointer transition-colors inline-block`;

    return (
        <span
            {...longPressHandlers}
            onPointerDown={(e: React.PointerEvent<HTMLSpanElement>) => {
                // First call the long press handler to ensure click/longPress logic works
                longPressHandlers.onPointerDown(e);

                // Then store cursor position for sentence extraction
                (window as any).lastClickOffset = fullSentence.indexOf(part, (window as any)._lastSearchIndex || 0);
                (window as any)._lastSearchIndex = (window as any).lastClickOffset + part.length;
            }}
            onContextMenu={(e) => e.preventDefault()}
            className={finalClassName}
            style={{
                userSelect: "text",
                WebkitUserSelect: "text",
                cursor: "text",
                ...(wordState > 0 ? styleInfo.style : {})
            }}
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

    // Ref to store selected word data (fixes stale closure issue)
    const selectedWordDataRef = useRef<{ word: string; messageId: string; fullSentence: string; startOffset: number } | null>(null);

    // Radial Menu State

    const [radialMenu, setRadialMenu] = useState<{
        showRadialMenu: boolean;
        menuPosition: { x: number; y: number };
        selectedWord: string | null;
        selectedMessageId: string | null;
        fullSentence: string | null;
        startOffset: number;
        selectedWordData?: { word: string; messageId: string; fullSentence: string; startOffset: number }; // Compatible
    }>({
        showRadialMenu: false,
        menuPosition: { x: 0, y: 0 },
        selectedWord: null,
        selectedMessageId: null,
        fullSentence: null,
        startOffset: 0
    });

    const [studyTip, setStudyTip] = useState<string | null>(null);
    const [isGeneratingTip, setIsGeneratingTip] = useState(false);
    const [selectedMessageForTip, setSelectedMessageForTip] = useState<string | null>(null);
    const failedTranslations = useRef<Set<string>>(new Set());
    const [selectedWordDetail, setSelectedWordDetail] = useState<WordData | null>(null);

    // Text selection mode state
    const [selectionMode, setSelectionMode] = useState<string | null>(null); // messageId when in selection mode

    // Clear selection mode when clicking outside or after copying
    useEffect(() => {
        if (!selectionMode) return;

        console.log("Selection mode active for:", selectionMode);

        const handleClearSelection = (e: MouseEvent | TouchEvent) => {
            // Don't clear if selecting text
            const selection = window.getSelection();
            if (selection && selection.toString().length > 0) {
                console.log("Not clearing - text is selected:", selection.toString());
                return;
            }

            console.log("Clearing selection mode");
            setSelectionMode(null);
        };

        // Add listeners with delay so it doesn't trigger immediately
        const timer = setTimeout(() => {
            document.addEventListener('click', handleClearSelection);
            document.addEventListener('touchend', handleClearSelection);
        }, 1000); // Increased to 1 second

        return () => {
            clearTimeout(timer);
            document.removeEventListener('click', handleClearSelection);
            document.removeEventListener('touchend', handleClearSelection);
        };
    }, [selectionMode]);

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


    useEffect(() => {
        const unsubscribe = subscribeToMessages((fetchedMessages) => {
            console.log("GlobalChatRoom: Received messages update:", fetchedMessages.length);
            
            // Map messages to ChatMessage type with fallback translation logic
            const processed = fetchedMessages.map((msg) => {
                const chatMsg: ChatMessage = {
                    ...msg,
                    nativeTranslation: "",
                    learningTranslation: ""
                };

                // Logic to determine what to show based on user's native/target languages
                // If it has translatedText and that matches our native/target, use it
                if (msg.translatedText && msg.translatedText !== msg.text) {
                     // Check if this translation is for our native language
                     if (msg.targetLang === nativeLang) {
                         chatMsg.nativeTranslation = msg.translatedText;
                     } else if (msg.targetLang === targetLang) {
                         chatMsg.learningTranslation = msg.translatedText;
                     }
                }
                
                // Fallbacks if no translations found or matched
                if (!chatMsg.nativeTranslation) chatMsg.nativeTranslation = msg.text;

                return chatMsg;
            });

            setMessages(processed);
            if (isInitialLoad && processed.length > 0) {
                setTimeout(() => scrollToBottom("auto"), 200);
                setIsInitialLoad(false);
            }
        });

        return () => unsubscribe();
    }, [nativeLang, targetLang, user, isInitialLoad]);


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
            // Determined target language for translation: If source is KO, target is EN, and vice versa.
            const translationTarget = originalLang === 'ko' ? 'en' : 'ko';

            try {
                // Always try to translate to the opposite language for Global Chat
                translated = await translateText(inputValue, translationTarget);
            } catch (translationError) {
                console.warn("Translation failed:", translationError);
            }

            await sendMessage(
                inputValue,
                translated,
                user,
                originalLang,
                translationTarget // Use the actual translation target
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
        // Aligned cleaning logic with renderClickableText
        const clean = cleanMarkdown(word);
        const wordKey = clean.replace(/[.,!?:;()"']+/g, "").trim().toLowerCase();
        
        if (!wordKey || wordKey.length < 2) return;

        console.log("GlobalChatRoom: Word Clicked:", wordKey, "MessageId:", messageId);
        const globalEntry = userVocabulary[wordKey];
        
        // Determine current status (0-white, 1-red, 2-yellow, 3-green)
        let currentState = 0;
        if (globalEntry) {
            const status = globalEntry.status;
            if (status === "red") currentState = 1;
            else if (status === "yellow") currentState = 2;
            else if (status === "green") currentState = 3;
            else if (status === "orange") currentState = 4;
        }

        // Cycle through states: 0 -> 1(red) -> 2(yellow) -> 3(green) -> 0
        let nextState: number;
        if (currentState === 0) nextState = 1;
        else if (currentState === 3) nextState = 0;
        else if (currentState === 4) nextState = 0;
        else nextState = currentState + 1;

        console.log(`GlobalChatRoom: State Cycle: ${currentState} -> ${nextState}`);

        // Update local UI immediately for responsiveness
        const uniqueKey = `${messageId}-${wordKey}`;
        setWordStates(prev => ({ ...prev, [uniqueKey]: nextState }));

        // Send to server (onUpdateWordStatus or onResetWordStatus)
        try {
            if (nextState === 0) {
                onResetWordStatus(wordKey);
            } else {
                const statusMap: Record<number, "red" | "yellow" | "green"> = { 1: "red", 2: "yellow", 3: "green" };
                const targetStatus = statusMap[nextState] || "red";
                
                await onUpdateWordStatus(
                    `${messageId}-${wordKey}`,
                    targetStatus,
                    wordKey,
                    messageId,
                    fullSentence
                );
            }
        } catch (error) {
            console.error("Error updating word status from Global Chat:", error);
            toast.error("단어 상태 업데이트 실패");
        }
    }, [userVocabulary, onUpdateWordStatus, onResetWordStatus]);

    const handleLongPress = useCallback((e: React.PointerEvent, word: string, messageId: string, fullSentence: string, targetOffset?: number) => {
        e.preventDefault();
        e.stopPropagation();

        const clickX = e.clientX;
        const clickY = e.clientY;

        if (navigator.vibrate) navigator.vibrate(50);

        const cleanWord = cleanMarkdown(word);
        const finalWord = cleanWord.trim().split(/[\s\n.,?!;:()\[\]{}"'`]+/)[0];
        
        const offset = targetOffset !== undefined ? targetOffset : ((window as any).lastClickOffset || 0);

        // Store in ref immediately (sync) to avoid stale closure
        console.log("=== handleLongPress: Setting ref ===");
        console.log("finalWord:", finalWord, "messageId:", messageId, "fullSentence:", fullSentence, "offset:", offset);
        selectedWordDataRef.current = { word: finalWord, messageId, fullSentence, startOffset: offset };
        console.log("selectedWordDataRef.current after set:", selectedWordDataRef.current);

        setRadialMenu({
            showRadialMenu: true,
            menuPosition: { x: clickX, y: clickY },
            selectedWord: finalWord,
            selectedMessageId: messageId,
            fullSentence,
            startOffset: offset,
            selectedWordData: { word: finalWord, messageId, fullSentence, startOffset: offset }
        });
    }, []);

    const handleOptionSelect = useCallback((option: WordOptionType) => {
        console.log("=== handleOptionSelect START ===");
        console.log("option:", option);
        console.log("selectedWordDataRef.current:", selectedWordDataRef.current);
        console.log("onSaveSentence exists:", !!onSaveSentence);

        // Use ref to avoid stale closure (ref is always current)
        const selectedWordData = selectedWordDataRef.current;

        if (!selectedWordData) {
            console.error("selectedWordData is null/undefined!");
            toast.error("단어 데이터가 없습니다. 다시 시도해주세요.");
            return;
        }

        const { word, messageId, fullSentence } = selectedWordData;
        console.log("word:", word, "fullSentence:", fullSentence);

        switch (option) {
            case "sentence":
                console.log("SENTENCE case entered");
                if (onSaveSentence) {
                    console.log("onSaveSentence is defined, proceeding...");
                    // Handle selected text if available (highest priority)
                    const selection = window.getSelection()?.toString().trim();
                    if (selection && selection.length > 5) {
                        onSaveSentence(selection);
                        toast.success(`선택한 문장이 저장되었습니다.`);
                        return;
                    }

                    const targetOffset = selectedWordData.startOffset || 0;
                    console.log("targetOffset:", targetOffset);

                    // Extract full line (newline to newline) - priority over sentence boundaries
                    const beforeText = fullSentence.substring(0, targetOffset);
                    const afterText = fullSentence.substring(targetOffset);

                    // Find line boundaries (newlines only)
                    const lineStartMatch = beforeText.lastIndexOf('\n');
                    const lineStart = lineStartMatch !== -1 ? lineStartMatch + 1 : 0;

                    const lineEndMatch = afterText.indexOf('\n');
                    const lineEnd = lineEndMatch !== -1 ? targetOffset + lineEndMatch : fullSentence.length;

                    let foundSentence = fullSentence.substring(lineStart, lineEnd).trim();
                    console.log("foundSentence before cleanup:", foundSentence);

                    // Clean up: remove leading numbers/bullets like "1.", "→", "-", etc.
                    foundSentence = foundSentence.replace(/^[\d]+\.\s*/, '').replace(/^[→\-•]\s*/, '').trim();
                    console.log("foundSentence after cleanup:", foundSentence);

                    if (foundSentence) {
                        console.log("Calling onSaveSentence with:", foundSentence);
                        onSaveSentence(foundSentence);
                        toast.success(`문장이 저장되었습니다.`);
                        console.log("Toast shown, sentence saved!");
                    } else {
                        console.log("No foundSentence, saving fullSentence:", fullSentence.trim());
                        onSaveSentence(fullSentence.trim());
                        toast.success(`문장이 저장되었습니다.`);
                    }
                } else {
                    console.error("onSaveSentence is NOT defined!");
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

            case "tts":
                if (window.speechSynthesis) {
                    const utterance = new SpeechSynthesisUtterance(word);
                    utterance.lang = "en-US";
                    window.speechSynthesis.speak(utterance);
                }
                break;

            case "select":
                // Enable selection mode for this message
                console.log("=== SELECT MODE TRIGGERED ===");
                console.log("messageId:", messageId);
                setSelectionMode(messageId);
                toast.success("텍스트를 선택하세요. 다른 곳을 탭하면 해제됩니다.");
                // Close menu but keep selectionMode
                setRadialMenu(prev => ({
                    ...prev,
                    showRadialMenu: false,
                }));
                return;
        }

        // Clear ref when done
        selectedWordDataRef.current = null;

        setRadialMenu(prev => ({
            ...prev,
            showRadialMenu: false,
            selectedWordData: undefined
        }));
    }, [onSaveSentence, onUpdateWordStatus, userVocabulary]);

    const renderClickableText = (text: string | undefined, messageId: string, isMe: boolean) => {
        if (!text) return null;

        // If in selection mode for this message, render plain selectable text
        if (selectionMode === messageId) {
            console.log("Rendering selectable text for messageId:", messageId);
            return (
                <div
                    className="whitespace-pre-wrap"
                    style={{
                        userSelect: "text",
                        WebkitUserSelect: "text",
                        MozUserSelect: "text",
                        cursor: "text",
                    }}
                >
                    {text}
                </div>
            );
        }

        const parts = getSegments(text);
        let charCursor = 0;

        return (
            <div className="flex flex-wrap items-center gap-y-1">
                {parts.map((part, index) => {
                    const currentOffset = charCursor;
                    charCursor += part.length;

                    // preserve whitespace or punctuation as is (Comprehensive check)
                    if (/^[\s\n.,?!;:()\[\]{}"'`，。？！、：；“”‘’（）《》【】]+$/.test(part)) {
                        return <span key={index}>{part}</span>;
                    }

                    const clean = cleanMarkdown(part);
                    // Strict cleaning for key matching: remove punctuation
                    const wordKey = clean.replace(/[.,!?:;()"']+/g, "").trim().toLowerCase();

                    if (!wordKey) return <span key={index}>{part}</span>;

                    // Use unique key consistent with handleWordClick
                    const uniqueKey = `${messageId}-${wordKey}`;

                    const globalEntry = userVocabulary[wordKey];

                    // Truth: Priority to global vocabulary status, then local wordStates
                    const status = globalEntry
                        ? globalEntry.status
                        : (wordStates[uniqueKey] === 1 ? "red" : wordStates[uniqueKey] === 2 ? "yellow" : wordStates[uniqueKey] === 3 ? "green" : "white");

                    if (index === 0) (window as any)._lastSearchIndex = 0;

                    // Map status to number for WordSpan interaction
                    let statusNumber = 0;
                    if (status === "red") statusNumber = 1;
                    else if (status === "yellow") statusNumber = 2;
                    else if (status === "green") statusNumber = 3;
                    else if (status === "orange") statusNumber = 4;

                    return (
                        <WordSpan
                            key={index}
                            part={part}
                            wordState={statusNumber}
                            isMe={isMe}
                            messageId={messageId}
                            fullSentence={text}
                            startOffset={currentOffset}
                            onClick={() => handleWordClick(wordKey, messageId, text)}
                            onLongPress={(e) => handleLongPress(e, wordKey, messageId, text, currentOffset)}
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
                                        ? "bg-[#3a3b3c] text-white rounded-tr-none"
                                        : "bg-zinc-800 text-zinc-100 border border-zinc-700 rounded-tl-none"
                                        } ${selectionMode === message.id ? "ring-2 ring-cyan-500 ring-opacity-70" : ""}`}
                                >
                                    {/* 1. Native Translation (Primary) */}
                                    <div className={`text-[15px] leading-relaxed font-medium ${isMe ? 'text-white' : 'text-zinc-100'}`}>
                                        {renderClickableText(message.nativeTranslation || message.text, message.id, isMe)}
                                    </div>

                                    {/* 2. Learning Translation (Secondary) */}
                                    {message.learningTranslation && (
                                        <div className={`text-sm mt-3 pt-2 border-t ${isMe ? "border-zinc-500/50 text-zinc-200" : "border-zinc-700 text-zinc-400"}`}>
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

