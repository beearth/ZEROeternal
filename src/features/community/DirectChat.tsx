import React, { useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Send } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from "../../components/ui/avatar";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";



import { User } from 'firebase/auth';

interface DirectChatProps {
    user: User | null;
}

import { subscribeToChat, sendMessage, ChatMessage } from '../../services/chatService';
import { useEffect } from 'react';

// ... (interface DirectChatProps remains)

export function DirectChat({ user }: DirectChatProps) {
    const { userId: targetUserId } = useParams<{ userId: string }>();
    const navigate = useNavigate();
    const location = useLocation();

    // Initial state from navigation (may be lost on refresh)
    const initialState = location.state as {
        userName?: string;
        userAvatar?: string;
        userFlag?: string;
        userLocation?: string;
    } | null;

    const [msgInput, setMsgInput] = useState('');
    const [messages, setMessages] = useState<ChatMessage[]>([]);

    // Robust Profile State: Starts with navigation state, backfills from messages
    const [partnerProfile, setPartnerProfile] = useState({
        name: initialState?.userName,
        avatar: initialState?.userAvatar,
        flag: initialState?.userFlag,
        location: initialState?.userLocation
    });

    const currentUserId = user?.uid;
    // Generate valid chatId
    const chatId = [currentUserId, targetUserId].sort().join('_');

    // Subscribe to real-time messages
    useEffect(() => {
        if (!currentUserId || !targetUserId) return;

        const unsubscribe = subscribeToChat(chatId, (newMessages) => {
            setMessages(newMessages);

            // If we lack profile info (e.g. refresh), try to find it in history
            if (!partnerProfile.name && targetUserId) {
                const partnerMsg = newMessages.find(m => m.senderId === targetUserId);
                if (partnerMsg) {
                    setPartnerProfile(prev => ({
                        ...prev,
                        name: partnerMsg.senderName,
                        avatar: partnerMsg.senderAvatar,
                        // Messages don't store flag/location usually, but at least we get name/avatar
                    }));
                }
            }
        });

        return () => unsubscribe();
    }, [chatId, currentUserId, targetUserId, partnerProfile.name]);

    const handleSendMessage = async () => {
        if (!msgInput.trim() || !currentUserId) return;

        try {
            await sendMessage(chatId, currentUserId, msgInput);
            setMsgInput('');
        } catch (error) {
            console.error("Failed to send message:", error);
            // Optionally show error toast
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    return (
        <div className="flex flex-col h-full bg-[#fdfbf6] relative">
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-200 bg-white sticky top-0 z-10 shadow-sm">
                <button
                    onClick={() => navigate('/community')}
                    className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                >
                    <ArrowLeft className="w-5 h-5 text-slate-600" />
                </button>

                <div
                    className="flex items-center gap-3 flex-1 cursor-pointer hover:bg-slate-50 p-2 -ml-2 rounded-lg transition-colors"
                    onClick={() => navigate(`/profile/${targetUserId}`, {
                        state: {
                            userName: partnerProfile.name,
                            userAvatar: partnerProfile.avatar,
                            userFlag: partnerProfile.flag,
                            userLocation: partnerProfile.location
                        }
                    })}
                >
                    <Avatar className="h-10 w-10 border border-slate-100 shadow-sm">
                        <AvatarImage src={partnerProfile.avatar} alt={partnerProfile.name || 'User'} className="object-cover" />
                        <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-bold">{partnerProfile.name?.[0] || 'U'}</AvatarFallback>
                    </Avatar>

                    <div className="flex flex-col">
                        <span className="font-semibold text-slate-900">{partnerProfile.name || 'Unknown User'}</span>
                        {partnerProfile.flag && partnerProfile.location && (
                            <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                <span>{partnerProfile.flag}</span>
                                <span>{partnerProfile.location}</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 bg-[#f8f9fa] space-y-4">
                {messages.length === 0 ? (
                    <div className="h-full flex items-center justify-center">
                        <div className="text-center text-slate-500">
                            <p className="text-sm font-medium">대화를 시작해보세요!</p>
                            <p className="text-xs mt-1 text-slate-400">메시지를 입력하고 전송하세요.</p>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-3 max-w-3xl mx-auto">
                        {messages.map((message) => {
                            const isMe = message.senderId === currentUserId;
                            return (
                                <div
                                    key={message.id}
                                    className={`flex items-end gap-2 ${isMe ? 'justify-end' : 'justify-start'}`}
                                >
                                    {!isMe && (
                                        <Avatar
                                            className="h-8 w-8 cursor-pointer hover:opacity-80 transition-opacity ring-2 ring-white"
                                            onClick={() => navigate(`/profile/${targetUserId}`, {
                                                state: {
                                                    userName: partnerProfile.name,
                                                    userAvatar: partnerProfile.avatar,
                                                    userFlag: partnerProfile.flag,
                                                    userLocation: partnerProfile.location
                                                }
                                            })}
                                        >
                                            <AvatarImage src={partnerProfile.avatar} className="object-cover" />
