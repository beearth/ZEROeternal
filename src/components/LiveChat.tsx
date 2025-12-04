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
    const [isInitialLoad, setIsInitialLoad] = useState(true);
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

    // Track failed translations to prevent infinite retries in the same session
    const failedTranslations = useRef(new Set<string>());

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

    useEffect(() => {
        const q = query(collection(db, "chats"), orderBy("timestamp", "asc"));
        const unsubscribe = onSnapshot(q, async (snapshot) => {
            // Use Promise.all to handle async translations
            const totalDocs = snapshot.docs.length;
            // CRITICAL OPTIMIZATION: Only translate the VERY LAST message automatically.
            // This drastically reduces API calls to prevent 429 Quota Exceeded errors.
            const startIndexToTranslate = Math.max(0, totalDocs - 1);

            const promises = snapshot.docs.map(async (doc, index) => {
                const data = doc.data() as Omit<ChatMessage, 'id'>;
                const msg: ChatMessage = { id: doc.id, ...data };
                const allowApiCall = index >= startIndexToTranslate;

                // ---------------------------------------------------------
                // 1. Determine Native Translation (Line 1)
                // ---------------------------------------------------------

                let nativeTx = "";
                const cachedNative = localStorage.getItem(`trans_${msg.id}_${nativeLang}`);
                const nativeFailKey = `${msg.id}_${nativeLang}`;

                if (cachedNative) {
                    nativeTx = cachedNative;
                } else {
                    if (msg.originalLang === nativeLang && msg.senderId === user?.uid) {
                        nativeTx = msg.text;
                    } else if (msg.targetLang === nativeLang && msg.translatedText && msg.translatedText !== msg.text) {
                        nativeTx = msg.translatedText;
                    } else if (allowApiCall && !failedTranslations.current.has(nativeFailKey)) {
                        try {
                            const hasKorean = /[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(msg.text);
                            if (nativeLang === 'ko' && hasKorean) {
                                nativeTx = msg.text;
                            } else {
                                nativeTx = await translateText(msg.text, nativeLang);
                                localStorage.setItem(`trans_${msg.id}_${nativeLang}`, nativeTx);
                            }
                        } catch (e) {
                            console.error("Native translation failed", e);
                            failedTranslations.current.add(nativeFailKey); // Mark as failed to avoid retry
                            nativeTx = msg.text;
                        }
                    } else {
                        nativeTx = msg.text;
                    }
                }
                msg.nativeTranslation = nativeTx;


                // ---------------------------------------------------------
                // 2. Determine Learning Translation (Line 2)
                // ---------------------------------------------------------

                let learningTx = "";
                const learningFailKey = `${msg.id}_${targetLang}`;

                if (targetLang !== nativeLang) {
                    const cachedLearning = localStorage.getItem(`trans_${msg.id}_${targetLang}`);

                    if (cachedLearning) {
                        learningTx = cachedLearning;
                    } else {
                        // Check DB - BUT verify if it's actually translated
                        // If translation failed during send, translatedText might be same as text
                        const isDbTranslated = msg.targetLang === targetLang && msg.translatedText && msg.translatedText !== msg.text;

                        if (isDbTranslated) {
                            learningTx = msg.translatedText!;
                        } else if (allowApiCall && !failedTranslations.current.has(learningFailKey)) {
                            try {
                                learningTx = await translateText(msg.text, targetLang);
                                localStorage.setItem(`trans_${msg.id}_${targetLang}`, learningTx);
                            } catch (e: any) {
                                console.error("Learning translation failed", e);
                                failedTranslations.current.add(learningFailKey); // Mark as failed
                            }
                        }
                    }
                }
                msg.learningTranslation = learningTx;

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
            // 1. Translate text (Attempt)
            let translated = inputText;
            try {
                translated = await translateText(inputText, targetLang);
            } catch (translationError) {
                console.error("Translation failed during send:", translationError);
                toast.warning("번역 실패. 원문으로 전송됩니다.");
                // Fallback to original text is already set
            }

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
        }

        setRadialMenu({
            showRadialMenu: false,
            menuCenter: null,
            selectedWordData: null,
        });
    }, [radialMenu, onSaveSentence, onSaveImportant, onUpdateWordStatus, userVocabulary]);

    // Helper to render text with clickable words
    const renderClickableText = (text: string | undefined, messageId: string) => {
        if (!text) return null;

        // Split by spaces but keep punctuation
        const parts = text.split(/(\s+)/);

        return (
            <div className="flex flex-wrap items-center gap-y-1">
                {parts.map((part, index) => {
                    if (!part.trim()) return <span key={index}>{part}</span>;

                    const clean = cleanMarkdown(part);
                    const wordKey = clean.trim().split(/[\s\n.,?!;:()\[\]{}"'`]+/)[0].toLowerCase();
                    const uniqueKey = `${messageId}-${wordKey}`;

                    // Determine status
                    const globalEntry = userVocabulary[wordKey];
                    const status = globalEntry
                        ? globalEntry.status
                        : (wordStates[uniqueKey] === 1 ? "red" : wordStates[uniqueKey] === 2 ? "yellow" : wordStates[uniqueKey] === 3 ? "green" : "white");

                    let bgClass = "hover:bg-slate-200";
                    let textClass = "text-slate-800";

                    if (status === "red") {
                        bgClass = "bg-red-100 hover:bg-red-200";
                        textClass = "text-red-700 font-medium";
                    } else if (status === "yellow") {
                        bgClass = "bg-yellow-100 hover:bg-yellow-200";
                        textClass = "text-yellow-700 font-medium";
                    } else if (status === "green") {
                        bgClass = "bg-green-100 hover:bg-green-200";
                        textClass = "text-green-700 font-medium";
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

    return (
        <div className="flex flex-col h-screen bg-slate-50 relative">
            {/* Radial Menu */}
            {radialMenu.showRadialMenu && radialMenu.menuCenter && (
                <RadialMenu
                    centerX={radialMenu.menuCenter.x}
                    centerY={radialMenu.menuCenter.y}
                    onSelect={handleRadialSelect}
                    onClose={() => setRadialMenu(prev => ({ ...prev, showRadialMenu: false }))}
                />
            )}

            {/* Word Detail Modal */}
            {selectedDetailWord && (
                <WordDetailModal
                    word={selectedDetailWord.word}
                    koreanMeaning={selectedDetailWord.koreanMeaning}
                    status={selectedDetailWord.status}
                    onClose={() => setSelectedDetailWord(null)}
                    onGenerateTips={async () => {
                        try {
                            const tips = await generateStudyTips(selectedDetailWord.word);
                            return tips;
                        } catch (error) {
                            console.error("Failed to generate tips", error);
                            return "팁 생성 실패";
                        }
                    }}
                />
            )}

            {/* Header */}
            <div className="bg-white border-b border-slate-200 p-4 flex items-center justify-between shadow-sm z-10">
                <div className="flex items-center gap-3">
                    <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                        <ArrowLeft className="w-5 h-5 text-slate-600" />
                    </button>
                    <div>
                        <h1 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                            <Bot className="w-5 h-5 text-blue-500" />
                            Live Chat
                        </h1>
                        <p className="text-xs text-slate-500">
                            Native: {nativeLang.toUpperCase()} | Target: {targetLang.toUpperCase()}
                        </p>
                    </div>
                </div>
                <div className="flex gap-2">
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
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((msg) => {
                    const isMe = msg.senderId === user?.uid;
                    return (
                        <div
                            key={msg.id}
                            className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                        >
                            <div className={`flex flex-col max-w-[85%] ${isMe ? "items-end" : "items-start"}`}>
                                {!isMe && (
                                    <span className="text-xs text-slate-500 mb-1 ml-1">
                                        {msg.senderName}
                                    </span>
                                )}
                                <div className="flex items-end gap-2">
                                    <div
                                        className={`p-4 rounded-2xl shadow-sm ${isMe
                                            ? "bg-blue-600 text-white rounded-tr-none"
                                            : "bg-white text-slate-800 border border-slate-100 rounded-tl-none"
                                            }`}
                                    >
                                        {/* 1. Native Translation (Primary) */}
                                        <div className="text-[15px] leading-relaxed font-medium">
                                            {renderClickableText(msg.nativeTranslation || msg.text, msg.id)}
                                        </div>

                                        {/* 2. Learning Translation (Secondary) */}
                                        {msg.learningTranslation ? (
                                            <div className={`text-sm mt-3 pt-2 border-t ${isMe ? "border-blue-400/30 text-blue-50" : "border-slate-100 text-slate-600"}`}>
                                                <div className="flex items-center gap-1 mb-1 opacity-70">
                                                    <span className="text-[10px] uppercase tracking-wider font-bold">
                                                        Learning
                                                    </span>
                                                </div>
                                                {renderClickableText(msg.learningTranslation, msg.id)}
                                            </div>
                                        ) : (
                                            targetLang !== nativeLang && (
                                                <div className={`text-xs mt-2 pt-2 border-t ${isMe ? "border-blue-400/30 text-blue-200" : "border-slate-100 text-slate-400"}`}>
                                                    <button
                                                        onClick={async (e) => {
                                                            e.stopPropagation();
                                                            try {
                                                                toast.info("번역 시도 중...");
                                                                const translated = await translateText(msg.text, targetLang);
                                                                // Update local state
                                                                setMessages(prev => prev.map(m =>
                                                                    m.id === msg.id ? { ...m, learningTranslation: translated } : m
                                                                ));
                                                                // Cache it
                                                                localStorage.setItem(`trans_${msg.id}_${targetLang}`, translated);
                                                                toast.success("번역 완료!");
                                                            } catch (error) {
                                                                console.error("Manual translation failed", error);
                                                                toast.error("번역 실패. API 키나 할당량을 확인하세요.");
                                                            }
                                                        }}
                                                        className="flex items-center gap-1 hover:underline opacity-70 hover:opacity-100 transition-opacity"
                                                    >
                                                        <RefreshCw className="w-3 h-3" />
                                                        <span>번역 다시 시도</span>
                                                    </button>
                                                </div>
                                            )
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
