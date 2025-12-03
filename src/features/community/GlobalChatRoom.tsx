import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, Globe, BookOpen } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ChatMessage {
    id: string;
    content: string;
    translation: string;
    senderId: string;
    senderName: string;
    senderAvatar: string;
    timestamp: Date;
    language: string;
}

const MOCK_MESSAGES: ChatMessage[] = [
    {
        id: '1',
        content: "Hello everyone! How are you doing?",
        translation: "안녕하세요 여러분! 어떻게 지내세요?",
        senderId: 'user1',
        senderName: 'Alex',
        senderAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop',
        timestamp: new Date(Date.now() - 1000 * 60 * 5),
        language: 'en'
    },
    {
        id: '2',
        content: "こんにちは！元気です。",
        translation: "Hello! I'm doing well.",
        senderId: 'user2',
        senderName: 'Yuki',
        senderAvatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop',
        timestamp: new Date(Date.now() - 1000 * 60 * 3),
        language: 'ja'
    },
    {
        id: '3',
        content: "Hola! Me gustaría aprender coreano.",
        translation: "Hello! I would like to learn Korean.",
        senderId: 'user3',
        senderName: 'Maria',
        senderAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop',
        timestamp: new Date(Date.now() - 1000 * 60 * 1),
        language: 'es'
    }
];

export function GlobalChatRoom() {
    const navigate = useNavigate();
    const [messages, setMessages] = useState<ChatMessage[]>(MOCK_MESSAGES);
    const [inputValue, setInputValue] = useState('');
    const [showToast, setShowToast] = useState(false);

    const currentUserId = 'me';

    const handleSendMessage = () => {
        if (!inputValue.trim()) return;

        const newMessage: ChatMessage = {
            id: Date.now().toString(),
            content: inputValue,
            translation: "번역 중... (Simulated Translation)", // Mock translation
            senderId: currentUserId,
            senderName: 'Me',
            senderAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop',
            timestamp: new Date(),
            language: 'ko'
        };

        setMessages([...messages, newMessage]);
        setInputValue('');

        // Simulate translation arrival
        setTimeout(() => {
            setMessages(prev => prev.map(msg =>
                msg.id === newMessage.id
                    ? { ...msg, translation: `Translated: ${msg.content}` }
                    : msg
            ));
        }, 1000);
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    const handleMessageClick = (message: ChatMessage) => {
        // Chat-to-Stack logic
        console.log(`Added to Red Stack: ${message.content}`);
        setShowToast(true);
        setTimeout(() => setShowToast(false), 2000);
    };

    return (
        <div className="flex-1 flex flex-col h-full bg-[#f0f2f5] relative">
            {/* Toast Notification */}
            {showToast && (
                <div className="absolute top-20 left-1/2 transform -translate-x-1/2 bg-red-500 text-white px-4 py-2 rounded-full shadow-lg z-50 flex items-center gap-2 animate-in fade-in slide-in-from-top-5">
                    <BookOpen className="w-4 h-4" />
                    <span className="text-sm font-bold">Red Stack에 저장되었습니다!</span>
                </div>
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
                    <span className="text-xs text-slate-500">실시간 번역이 활성화되었습니다</span>
                </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((message) => (
                    <div
                        key={message.id}
                        className={`flex gap-3 ${message.senderId === currentUserId ? 'flex-row-reverse' : 'flex-row'}`}
                    >
                        {message.senderId !== currentUserId && (
                            <Avatar className="h-10 w-10 border border-slate-200 mt-1">
                                <AvatarImage src={message.senderAvatar} />
                                <AvatarFallback>{message.senderName[0]}</AvatarFallback>
                            </Avatar>
                        )}

                        <div className={`flex flex-col max-w-[75%] ${message.senderId === currentUserId ? 'items-end' : 'items-start'}`}>
                            {message.senderId !== currentUserId && (
                                <span className="text-xs text-slate-500 mb-1 ml-1">{message.senderName}</span>
                            )}

                            {/* Double Bubble UI */}
                            <div
                                onClick={() => handleMessageClick(message)}
                                className={`
                                    cursor-pointer active:scale-95 transition-transform
                                    rounded-2xl overflow-hidden shadow-sm border border-slate-100
                                    ${message.senderId === currentUserId ? 'bg-blue-50' : 'bg-white'}
                                `}
                            >
                                {/* Original Text */}
                                <div className={`px-4 py-2 ${message.senderId === currentUserId ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-900'}`}>
                                    <p className="text-[15px] leading-relaxed">{message.content}</p>
                                </div>

                                {/* Translated Text */}
                                <div className="px-4 py-2 bg-white/50 border-t border-slate-100/50 backdrop-blur-sm">
                                    <p className="text-sm text-slate-600 font-medium flex items-center gap-1.5">
                                        <span className="text-[10px] uppercase tracking-wider text-slate-400">Translated</span>
                                        {message.translation}
                                    </p>
                                </div>
                            </div>

                            <span className="text-[10px] text-slate-400 mt-1 px-1">
                                {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Input Area */}
            <div className="border-t border-slate-200 bg-white p-4 pb-6">
                <div className="max-w-3xl mx-auto flex gap-2">
                    <Input
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="메시지를 입력하세요 (자동 번역됩니다)..."
                        className="flex-1 rounded-full px-4 border-slate-300 focus:border-blue-500 h-11"
                    />
                    <Button
                        onClick={handleSendMessage}
                        disabled={!inputValue.trim()}
                        className="h-11 w-11 rounded-full bg-blue-600 hover:bg-blue-700 p-0 flex items-center justify-center shadow-md"
                    >
                        <Send className="w-5 h-5 text-white" />
                    </Button>
                </div>
            </div>
        </div>
    );
}
