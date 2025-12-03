import React from 'react';
import { Heart } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

export interface PostCardProps {
    user: {
        name: string;
        avatar: string;
        location: string;
        flag: string;
    };
    image: string;
    content: string;
    likes: number;
    timeAgo: string;
    onChat?: () => void;
    isOwner?: boolean;
    onEdit?: () => void;
    onDelete?: () => void;
    onLike?: () => void;
    isLiked?: boolean;
}

export function PostCard({ user, image, content, likes, timeAgo, onChat, isOwner = false, onEdit, onDelete, onLike, isLiked = false }: PostCardProps) {

    return (
        <div className="bg-white rounded-[20px] shadow-sm border border-slate-100 overflow-hidden hover:shadow-md transition-shadow duration-200">
            <div className="p-5">
                {/* Header: User Profile & Actions */}
                <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10 border border-slate-100">
                            <AvatarImage src={user.avatar} alt={user.name} className="object-cover" />
                            <AvatarFallback>{user.name[0]}</AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                                <span className="font-bold text-[15px] text-slate-900 leading-tight">{user.name}</span>
                                <span className="text-xs text-slate-400">• {timeAgo}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                                <span>{user.flag}</span>
                                <span>{user.location}</span>
                            </div>
                        </div>
                    </div>

                    {/* Owner Actions */}
                    {isOwner && (
                        <div className="flex items-center gap-1">
                            {onEdit && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (onEdit) onEdit();
                                    }}
                                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                                    title="수정"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                                </button>
                            )}
                            {onDelete && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (onDelete) onDelete();
                                    }}
                                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                                    title="삭제"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {/* Content: Text first, then Image */}
                <div className="pl-[52px]">
                    <p className="text-[15px] text-slate-800 leading-relaxed whitespace-pre-wrap mb-3">{content}</p>

                    {image && (
                        <div className="relative w-full rounded-xl overflow-hidden bg-slate-50 border border-slate-100 mb-3">
                            <img src={image} alt="Post" className="w-full h-auto object-cover max-h-[500px]" />
                        </div>
                    )}

                    {/* Footer: Actions */}
                    <div className="flex items-center gap-6 pt-1">
                        <button
                            onClick={onLike}
                            className="flex items-center gap-2 group"
                        >
                            <Heart className={`w-5 h-5 transition-colors ${isLiked ? 'fill-red-500 text-red-500' : 'text-slate-400 group-hover:text-red-500'}`} />
                            <span className={`text-sm font-medium ${isLiked ? 'text-red-500' : 'text-slate-500 group-hover:text-red-500'}`}>{likes}</span>
                        </button>

                        {onChat && (
                            <button
                                onClick={onChat}
                                className="flex items-center gap-2 group"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400 group-hover:text-blue-500 transition-colors"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                                <span className="text-sm font-medium text-slate-500 group-hover:text-blue-500 transition-colors">채팅</span>
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
