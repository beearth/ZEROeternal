import React, { useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Send } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface DirectMessage {
    id: string;
    content: string;
    senderId: string;
    timestamp: Date;
}

export function DirectChat() {
    const { userId } = useParams<{ userId: string }>();
    const location = useLocation();
    const navigate = useNavigate();
    const { userName, userAvatar, userFlag, userLocation } = location.state || {};

    const [messages, setMessages] = useState<DirectMessage[]>([]);
    const [inputValue, setInputValue] = useState('');

    const currentUserId = 'me'; // Mock current user ID

    const handleSendMessage = () => {
        if (!inputValue.trim()) return;

        const newMessage: DirectMessage = {
            id: Date.now().toString(),
            content: inputValue,
            senderId: currentUserId,
            timestamp: new Date()
        };

        setMessages([...messages, newMessage]);
        setInputValue('');
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    return (
        <div className="flex-1 flex flex-col h-full bg-white">
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-200 bg-white sticky top-0 z-10">
                <button
                    onClick={() => navigate('/community')}
                    className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                >
                    <ArrowLeft className="w-5 h-5 text-slate-600" />
                </button>

                <Avatar className="h-10 w-10 border border-slate-100">
                    <AvatarImage src={userAvatar} alt={userName || 'User'} className="object-cover" />
                    <AvatarFallback>{userName?.[0] || 'U'}</AvatarFallback>
                </Avatar>

                <div className="flex flex-col flex-1">
                    <span className="font-semibold text-slate-900">{userName || 'Unknown User'}</span>
                    {userFlag && userLocation && (
                        <div className="flex items-center gap-1.5 text-xs text-slate-500">
                            <span>{userFlag}</span>
                            <span>{userLocation}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 bg-[#f8f9fa]">
                {messages.length === 0 ? (
                    <div className="h-full flex items-center justify-center">
                        <div className="text-center text-slate-500">
                            <p className="text-sm">대화를 시작해보세요!</p>
                            <p className="text-xs mt-1">메시지를 입력하고 전송하세요.</p>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-3 max-w-3xl mx-auto">
                        {messages.map((message) => (
                            <div
                                key={message.id}
                                className={`flex ${message.senderId === currentUserId ? 'justify-end' : 'justify-start'}`}
                            >
                                <div
                                    className={`max-w-[70%] rounded-2xl px-4 py-2 ${message.senderId === currentUserId
                                            ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white'
                                            : 'bg-white border border-slate-200 text-slate-800'
                                        }`}
                                >
                                    <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                                    <p
                                        className={`text-xs mt-1 ${message.senderId === currentUserId ? 'text-blue-100' : 'text-slate-400'
                                            }`}
                                    >
                                        {message.timestamp.toLocaleTimeString('ko-KR', {
                                            hour: '2-digit',
                                            minute: '2-digit'
                                        })}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Input Area */}
            <div className="border-t border-slate-200 bg-white p-4">
                <div className="max-w-3xl mx-auto flex gap-2">
                    <Input
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="메시지를 입력하세요..."
                        className="flex-1 rounded-full px-4 border-slate-300 focus:border-blue-500"
                    />
                    <Button
                        onClick={handleSendMessage}
                        disabled={!inputValue.trim()}
                        className="rounded-full px-6 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                    >
                        <Send className="w-4 h-4" />
                    </Button>
                </div>
            </div>
        </div>
    );
}
