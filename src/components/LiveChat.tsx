import React, { useState, useEffect, useRef, useCallback } from "react";
import { Send, ArrowLeft, RefreshCw, Bot, User, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, Timestamp, deleteDoc, doc } from "firebase/firestore";
import { db } from "../firebase";
import { translateText } from "../services/gemini";
import type { User as FirebaseUser } from "firebase/auth";
import type { VocabularyEntry, WordData } from "../types";
import { useNavigate } from "react-router-dom";
import { RadialMenu, RadialDirection } from "./RadialMenuNew";
import { useLongPress } from "../hooks/useLongPress";
import { WordDetailModal } from "./WordDetailModal";
import { generateStudyTips } from "../services/gemini";

interface LiveChatProps {
    user: FirebaseUser | null;
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
    timestamp: Timestamp;
    originalLang: string;
    targetLang: string;
    learningTranslation?: string;
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

export function LiveChat({
    user,
    userVocabulary,
    onUpdateWordStatus,
    onResetWordStatus,
    nativeLang,
    onSaveSentence,
    onSaveImportant
}: LiveChatProps) {
    const navigate = useNavigate();
    const onBack = () => navigate("/");

    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputText, setInputText] = useState("");
    const [isSending, setIsSending] = useState(false);
    const [targetLang, setTargetLang] = useState("en"); // Default target language
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Word interaction state
    const [wordStates, setWordStates] = useState<Record<string, number>>({});
    const updateTimeouts = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

    // Radial Menu State
    const [radialMenu, setRadialMenu] = useState<{
        showRadialMenu: boolean;
        menuCenter: { x: number; y: number } | null;
        selectedWordData: {
            word: string;
            messageId: string;
            fullSentence: string;
        } | null;
    }>({
        showRadialMenu: false,
        menuCenter: null,
        selectedWordData: null,
    });

    // Word Detail Modal State
    const [selectedDetailWord, setSelectedDetailWord] = useState<{
        word: string;
        koreanMeaning: string;
        status: "red" | "yellow" | "green" | "white";
        messageId: string;
        fullSentence: string;
    } | null>(null);

    // Close Radial Menu on outside click
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent | PointerEvent) => {
            if (radialMenu.showRadialMenu) {
                setRadialMenu({
                    showRadialMenu: false,
                    menuCenter: null,
                    selectedWordData: null,
                });
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        document.addEventListener("pointerdown", handleClickOutside);

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
            document.removeEventListener("pointerdown", handleClickOutside);
        };
    }, [radialMenu.showRadialMenu]);

    // Scroll to bottom
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Subscribe to Firestore chats
    useEffect(() => {
        const q = query(collection(db, "chats"), orderBy("timestamp", "asc"));
        const unsubscribe = onSnapshot(q, async (snapshot) => {
            const msgs: ChatMessage[] = [];

            // Use Promise.all to handle async translations
            const totalDocs = snapshot.docs.length;
            const startIndexToTranslate = Math.max(0, totalDocs - 5); // Only translate last 5 messages via API

            const promises = snapshot.docs.map(async (doc, index) => {
                const data = doc.data() as Omit<ChatMessage, 'id'>;
                const msg: ChatMessage = { id: doc.id, ...data };

                // Logic to handle translations for ALL messages (both mine and others)
                // Goal:
                // 1. msg.translatedText -> Should always be in my Native Language (for understanding)
                // 2. msg.learningTranslation -> Should always be in my Target Language (for learning)

                const originalDbTranslatedText = msg.translatedText;
                const allowApiCall = index >= startIndexToTranslate;

                // 1. Ensure Main Translation is in Native Language (e.g. Korean)
                if (msg.targetLang === nativeLang) {
                    // If the message was sent targeting my native language, use the DB value
                    // This is correct for messages sent by others targeting my language
                } else {
                    // If I sent the message, msg.translatedText in DB is my Target Language (e.g. Spanish)
                    // So I need to translate it back to Native Language (Korean) for display

                    // Or if others sent it in a different language
                    try {
                        const cachedNative = localStorage.getItem(`trans_${msg.id}_${nativeLang}`);
                        if (cachedNative) {
                            msg.translatedText = cachedNative;
                        } else if (allowApiCall) {
                            // Translate ORIGINAL text to Native Language
                            const translated = await translateText(msg.text, nativeLang);
                            msg.translatedText = translated;
                            localStorage.setItem(`trans_${msg.id}_${nativeLang}`, translated);
                        }
                    } catch (e) {
                        console.error("Native translation failed", e);
                    }
                }

                // 2. Ensure Learning Translation is in Target Language (e.g. Spanish)
                if (targetLang !== nativeLang) {
                    // If I sent the message, the DB's translatedText IS ALREADY the target language
                    if (msg.senderId === user?.uid && msg.targetLang === targetLang) {
                        msg.learningTranslation = originalDbTranslatedText;
                    }
                    // If others sent it, or if I changed my target language
                    else if (msg.targetLang === targetLang) {
                        msg.learningTranslation = originalDbTranslatedText;
                    } else {
                        try {
                            const cachedLearning = localStorage.getItem(`trans_${msg.id}_${targetLang}`);
                            if (cachedLearning) {
                                msg.learningTranslation = cachedLearning;
                            } else if (allowApiCall) {
                                const translated = await translateText(msg.text, targetLang);
                                msg.learningTranslation = translated;
                                localStorage.setItem(`trans_${msg.id}_${targetLang}`, translated);
                            }
                        } catch (e) {
                            console.error("Learning translation failed", e);
                        }
                    }
                }

                return msg;
            });

            const resolvedMsgs = await Promise.all(promises);
            setMessages(resolvedMsgs);
        });

        return () => unsubscribe();
    }, [user, nativeLang, targetLang]);

    const handleSendMessage = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!inputText.trim() || !user || isSending) return;

        setIsSending(true);
        try {
            // 1. Translate text
            const translated = await translateText(inputText, targetLang);

            // 2. Save to Firestore
            await addDoc(collection(db, "chats"), {
                text: inputText,
                translatedText: translated,
                senderId: user.uid,
                senderName: user.displayName || "User",
                timestamp: serverTimestamp(),
                originalLang: nativeLang,
                targetLang: targetLang
            });

            setInputText("");
            // Focus input after sending
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
        if (!window.confirm("메시지를 삭제하시겠습니까?")) return;
        try {
            await deleteDoc(doc(db, "chats", messageId));
            toast.success("메시지가 삭제되었습니다.");
        } catch (error) {
            console.error("Error deleting message:", error);
            toast.error("메시지 삭제 실패");
        }
    };

    // Helper to clean markdown
    const cleanMarkdown = (text: string): string => {
        return text
            .replace(/\*\*/g, "")
            .replace(/\*/g, "")
            .replace(/`/g, "")
            .replace(/#{1,6}\s/g, "")
            .trim();
    };

    // Helper to check if word is meaningful
    const isMeaningfulWord = (text: string): boolean => {
        const cleaned = cleanMarkdown(text);
        // Use Unicode Property Escapes to match any letter in any language (\p{L})
        // Also allow numbers (\p{N})
        // This covers Hindi, Arabic, Thai, CJK, etc.
        return /[\p{L}\p{N}]/u.test(cleaned);
    };

    // Word Click Handler
    const handleWordClick = useCallback(async (word: string, messageId: string, fullSentence: string) => {
        const cleanWord = cleanMarkdown(word);
        if (!isMeaningfulWord(word)) return;

        const finalWord = cleanWord.trim().split(/[\s\n.,?!;:()\[\]{}"'`]+/)[0];
        if (!finalWord || finalWord.length < 2) return;

        const wordKey = finalWord.toLowerCase();
        const uniqueKey = `${messageId}-${wordKey}`;

        // Determine current state
        const globalEntry = userVocabulary[wordKey];
        const currentState = globalEntry
            ? (globalEntry.status === "red" ? 1 : globalEntry.status === "yellow" ? 2 : 3)
            : (wordStates[uniqueKey] || 0);

        let nextState: number;
        if (currentState === 0) nextState = 1;
        else if (currentState === 3) nextState = 0;
        else nextState = currentState + 1;

        // Optimistic update
        setWordStates(prev => ({ ...prev, [uniqueKey]: nextState }));

        // Debounced API call
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

    // Long Press Handler
    const handleLongPress = useCallback((e: React.PointerEvent, word: string, messageId: string, fullSentence: string) => {
        e.preventDefault();
        e.stopPropagation();

        const clickX = e.clientX;
        const clickY = e.clientY;

        if (navigator.vibrate) {
            navigator.vibrate(50);
        }

        const cleanWord = cleanMarkdown(word);
        const finalWord = cleanWord.trim().split(/[\s\n.,?!;:()\[\]{}"'`]+/)[0];

        setRadialMenu({
            showRadialMenu: true,
            menuCenter: { x: clickX, y: clickY },
            selectedWordData: {
                word: finalWord,
                messageId,
                fullSentence
            },
        });
    }, []);

    // Radial Menu Select Handler
    const handleRadialSelect = useCallback((direction: RadialDirection) => {
        const { selectedWordData } = radialMenu;
        if (!selectedWordData) return;

        const { word, messageId, fullSentence } = selectedWordData;

        switch (direction) {
            case "left": // 문장 저장 (Save Sentence)
                if (onSaveSentence) {
                    onSaveSentence(fullSentence);
                    toast.success("문장이 저장되었습니다.");
                } else {
                    toast.error("문장 저장 기능을 사용할 수 없습니다.");
                }
                break;
            case "top": // 상세보기 (Detail)
                const entry = userVocabulary[word.toLowerCase()];
                setSelectedDetailWord({
                    word: word,
                    koreanMeaning: entry?.koreanMeaning || "",
                    status: entry?.status || "white",
                    messageId: messageId,
                    fullSentence: fullSentence
                });
                break;
            case "right": // 중요 저장 (Save Important)
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
            case "bottom": // 듣기 (TTS)
                if (window.speechSynthesis) {
                    const utterance = new SpeechSynthesisUtterance(word);
                    utterance.lang = "en-US";
                    window.speechSynthesis.speak(utterance);
                }
                break;
            default:
                break;
        }

        setRadialMenu({
            showRadialMenu: false,
            menuCenter: null,
            selectedWordData: null,
        });
    }, [radialMenu, onUpdateWordStatus, userVocabulary, onSaveSentence]);

    // Render clickable words
    const renderClickableText = (text: string, messageId: string) => {
        let parts: string[] = [];

        // Use Intl.Segmenter for intelligent word segmentation
        if (typeof Intl !== 'undefined' && 'Segmenter' in Intl) {
            const segmenter = new (Intl as any).Segmenter(undefined, { granularity: 'word' });
            const segments = segmenter.segment(text);
            for (const { segment } of segments) {
                parts.push(segment);
            }
        } else {
            // Fallback
            parts = text.split(/([\s\n.,?!;:()\[\]{}"'`，。？！、：；“”‘’（）《》【】]+)/);
        }

        return parts.map((part, index) => {
            if (/^[\s\n.,?!;:()\[\]{}"'`]+$/.test(part)) {
                return <span key={index}>{part}</span>;
            }

            if (!isMeaningfulWord(part)) {
                return <span key={index}>{part}</span>;
            }

            const finalWord = cleanMarkdown(part).trim().split(/[\s\n.,?!;:()\[\]{}"'`]+/)[0];
            const wordKey = finalWord.toLowerCase();
            const uniqueKey = `${messageId}-${wordKey}`;

            const globalEntry = userVocabulary[wordKey];
            const state = globalEntry
                ? (globalEntry.status === "red" ? 1 : globalEntry.status === "yellow" ? 2 : 3)
                : (wordStates[uniqueKey] || 0);

            let bgClass = "";
            let textClass = "";

            if (state === 1) { bgClass = "bg-red-200"; textClass = "text-red-900"; }
            else if (state === 2) { bgClass = "bg-yellow-200"; textClass = "text-yellow-900"; }
            else if (state === 3) { bgClass = "bg-green-200"; textClass = "text-green-900"; }
            else { bgClass = "hover:bg-slate-100"; }

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
        });
    };

    return (
        <div className="flex flex-col h-full bg-slate-50">
            {/* Radial Menu */}
            {radialMenu.showRadialMenu && radialMenu.menuCenter && (
                <RadialMenu
                    center={radialMenu.menuCenter}
                    isOpen={radialMenu.showRadialMenu}
                    onClose={() => setRadialMenu({ showRadialMenu: false, menuCenter: null, selectedWordData: null })}
                    onSelect={handleRadialSelect}
                    selectedWord={radialMenu.selectedWordData?.word || ""}
                    showDelete={false}
                    variant="chat"
                />
            )}

            {/* Word Detail Modal */}
            <WordDetailModal
                open={!!selectedDetailWord}
                onOpenChange={(open) => !open && setSelectedDetailWord(null)}
                word={selectedDetailWord?.word || ""}
                koreanMeaning={selectedDetailWord?.koreanMeaning || ""}
                status={selectedDetailWord?.status || "white"}
                onGenerateStudyTips={generateStudyTips}
                onUpdateWordStatus={(word, newStatus) => {
                    if (selectedDetailWord) {
                        onUpdateWordStatus(
                            `${selectedDetailWord.messageId}-${word}`,
                            newStatus,
                            word,
                            selectedDetailWord.messageId,
                            selectedDetailWord.fullSentence
                        );
                        // Update local state to reflect change immediately in modal
                        setSelectedDetailWord(prev => prev ? { ...prev, status: newStatus } : null);
                    }
                }}
            />

            {/* Header */}
            <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between shadow-sm z-10">
                <div className="flex items-center gap-3">
                    <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                        <ArrowLeft className="w-5 h-5 text-slate-600" />
                    </button>
                    <div>
                        <h1 className="font-bold text-slate-800">Live AI Chat</h1>
                        <p className="text-xs text-slate-500">Real-time Translation & Stacking</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <select
                        value={targetLang}
                        onChange={(e) => setTargetLang(e.target.value)}
                        className="text-sm border border-slate-300 rounded-md px-2 py-1 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="en">English</option>
                        <option value="ja">Japanese</option>
                        <option value="zh">Chinese</option>
                        <option value="es">Spanish</option>
                        <option value="fr">French</option>
                        <option value="hi">Hindi</option>
                    </select>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {messages.map((msg) => {
                    const isMe = msg.senderId === user?.uid;

                    return (
                        <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                            <div className={`max-w-[80%] flex flex-col gap-1 ${isMe ? "items-end" : "items-start"}`}>
                                {!isMe && (
                                    <span className="text-xs text-slate-500 ml-1">
                                        {msg.senderName}
                                    </span>
                                )}
                                <div className={`px-4 py-3 rounded-2xl shadow-sm ${isMe
                                    ? "bg-blue-500 text-white rounded-tr-sm"
                                    : "bg-white border border-slate-200 text-slate-800 rounded-tl-sm"
                                    }`}>
                                    {/* Top Line: Original Text */}
                                    <div className={`text-sm mb-2 pb-2 border-b ${isMe ? "border-blue-400/50" : "border-slate-100"}`}>
                                        {msg.text}
                                    </div>

                                    {/* Bottom Line: Translated Text (Clickable) */}
                                    <div className={`text-base font-medium ${isMe ? "text-blue-50" : "text-slate-900"}`}>
                                        {isMe ? (
                                            <div className="text-white">
                                                {renderClickableText(msg.translatedText, msg.id)}
                                            </div>
                                        ) : (
                                            renderClickableText(msg.translatedText, msg.id)
                                        )}
                                    </div>

                                    {/* Learning Line: Target Language Translation (if exists) */}
                                    {msg.learningTranslation && (
                                        <div className={`text-sm mt-2 pt-2 border-t ${isMe ? "border-blue-400/30 text-blue-100" : "border-slate-100 text-slate-600"}`}>
                                            <div className="flex items-center gap-1 mb-1">
                                                <span className="text-[10px] uppercase tracking-wider opacity-70 bg-slate-100 px-1.5 py-0.5 rounded text-slate-500">
                                                    Learning
                                                </span>
                                            </div>
                                            {renderClickableText(msg.learningTranslation, msg.id)}
                                        </div>
                                    )}
                                </div>
                                <div className="flex items-center gap-1 px-1">
                                    <span className="text-xs text-slate-400">
                                        {msg.timestamp?.toDate ? msg.timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}
                                    </span>
                                    {isMe && (
                                        <button
                                            onClick={() => handleDeleteMessage(msg.id)}
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

            {/* Input */}
            <div className="bg-white border-t border-slate-200 p-4">
                <form onSubmit={handleSendMessage} className="flex gap-2 max-w-3xl mx-auto">
                    <input
                        ref={inputRef}
                        type="text"
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        placeholder="Type a message..."
                        className="flex-1 bg-slate-100 text-slate-900 placeholder:text-slate-500 border-0 rounded-full px-5 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                        disabled={isSending}
                    />
                    <button
                        type="submit"
                        disabled={!inputText.trim() || isSending}
                        className="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shadow-md shadow-blue-200"
                    >
                        {isSending ? (
                            <RefreshCw className="w-5 h-5 animate-spin" />
                        ) : (
                            <Send className="w-5 h-5" />
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}
