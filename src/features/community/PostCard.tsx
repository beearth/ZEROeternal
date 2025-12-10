import React, { useState } from 'react';
import { Heart, MessageSquareMore, Pencil, Trash2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from "../../components/ui/avatar";

export interface PostCardProps {
    id: string;
    user: {
        name: string;
        avatar: string;
        location: string;
        flag: string;
    };
    image?: string;
    content: string;
    likes: number;
    timeAgo: string;
    onChat?: () => void;
    isOwner?: boolean;
    onEdit?: () => void;
    onDelete?: () => void;
    onLike?: () => void;
    isLiked?: boolean;
    onClickProfile?: () => void;
    currentUser?: {
        name?: string;
        avatar?: string;
    } | null;
}

export function PostCard({ user, image, content, likes, timeAgo, onChat, isOwner = false, onEdit, onDelete, onLike, isLiked = false, onClickProfile, currentUser }: PostCardProps) {

    const [showComments, setShowComments] = useState(false);
    const [newComment, setNewComment] = useState("");
    const [comments, setComments] = useState<{ id: number; user: string; content: string; timeAgo: string }[]>([
        { id: 1, user: "Study_Master", content: "정말 멋진 사진이네요!", timeAgo: "10m" },
        { id: 2, user: "English_King", content: "Wow, looks great!", timeAgo: "5m" }
    ]);

    const handleShare = async () => {
        try {
            await navigator.clipboard.writeText(window.location.href);
            // Simple alert or toast could be used here, but for now we'll rely on the user knowing it copied
            // If toast is available in context, we could use it.
            // Assuming toast is not directly passed, we might just log or use a simple alert if needed, 
            // but the requirement just says "Enable", so clipboard copy is standard.
            // Let's see if we can use the toast from sonner if it was imported, but it's not in imports.
            // We will just copy for now.
             alert("링크가 복사되었습니다!");
        } catch (err) {
            console.error('Failed to copy: ', err);
        }
    };

    const handleAddComment = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newComment.trim()) return;
        
        const comment = {
            id: Date.now(),
            user: currentUser?.name || "Me",
            content: newComment,
            timeAgo: "Just now"
        };
        
        setComments([...comments, comment]);
        setNewComment("");
    };

    const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
    const [editContent, setEditContent] = useState("");

    const handleEditComment = (commentId: number, content: string) => {
        setEditingCommentId(commentId);
        setEditContent(content);
    };

    const handleSaveEdit = (commentId: number) => {
        if (!editContent.trim()) return;
        setComments(comments.map(c => 
            c.id === commentId ? { ...c, content: editContent } : c
        ));
        setEditingCommentId(null);
        setEditContent("");
    };

    const handleDeleteComment = (commentId: number) => {
        if (window.confirm("댓글을 삭제하시겠습니까?")) {
            setComments(comments.filter(c => c.id !== commentId));
        }
    };

    return (
        <div className='p-4 border border-slate-100 rounded-2xl'>
            {/* Header: User Profile & Actions */}
            <div className="flex items-start justify-between">
                <button
                    className="flex items-center gap-2 cursor-pointer text-left"
                    onClick={onClickProfile}
                >
                    <Avatar className="rounded-full border-2 border-slate-200">
                        <AvatarImage src={user.avatar} alt={user.name} className="h-10 w-10 object-cover rounded-full" />
                        <AvatarFallback className="bg-slate-200 text-slate-500 rounded-full">{user.name[0]}</AvatarFallback>
                    </Avatar>

                    <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                            <span className="font-bold text-[15px] text-slate-900 leading-tight group-hover:text-blue-600 transition-colors">{user.name}</span>
                            <span className="text-xs text-slate-400">• {timeAgo}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                            <span>{user.flag}</span>
                            <span>{user.location}</span>
                            <span>•</span>
                            <span>{timeAgo}</span>
                        </div>
                    </div>
                </button>
                {isOwner && (
                    <div className="flex items-center gap-1">
                        <button onClick={onEdit} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-all">
                            <Pencil size={16} />
                        </button>
                        <button onClick={onDelete} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-all">
                            <Trash2 size={16} />
                        </button>
                    </div>
                )}
            </div>
            
            <div className="h-px w-full bg-slate-200 my-4" />

            {/* Content: Text first, then Image */}
            <div className="flex flex-col">
                <p className="text-[15px] text-slate-800 leading-relaxed whitespace-pre-wrap mb-3">{content}</p>
                
                {image && (
                    <div className="relative w-full rounded-2xl overflow-hidden bg-slate-50 border border-slate-100 mb-4">
                        <img 
                            src={image} 
                            alt="Post" 
                            className="w-full h-auto object-cover max-h-[500px] rounded-lg"
                        />
                    </div>
                )}

                {/* Footer: Actions */}
                <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={onLike}
                            className="flex items-center gap-2 group"
                        >
                            <Heart 
                                size={16} 
                                className={`transition-colors ${isLiked ? 'fill-red-500 text-red-500' : 'text-slate-400 group-hover:text-red-500'}`} 
                            />
                            <span className={`text-sm font-medium ${isLiked ? 'text-red-500' : 'text-slate-500 group-hover:text-red-500'}`}>
                                {likes}
                            </span>
                        </button>
                        <button 
                            onClick={() => setShowComments(!showComments)}
                            className="flex items-center gap-2 group"
                        >
                            <MessageSquareMore size={16} className="text-slate-400 group-hover:text-blue-500 transition-colors" />
                            <span className='text-sm font-medium text-slate-500 group-hover:text-blue-500 transition-colors'>
                                {comments.length}
                            </span>
                        </button>
                    </div>
                    <button 
                        onClick={handleShare}
                        className="flex items-center gap-2 group" 
                        title="공유하기"
                    >
                        <span className="text-sm font-medium text-slate-500 group-hover:text-green-500 transition-colors">공유</span>
                    </button>
                </div>
            </div>

            {/* Comments Section */}
            {showComments && (
                <div className="mt-4 pt-4 border-t border-slate-100 animate-in slide-in-from-top-2 duration-200">
                    <div className="space-y-4 mb-4">
                        {comments.map((comment) => (
                            <div key={comment.id} className="flex gap-3 group/comment">
                                <Avatar className="w-8 h-8">
                                    <AvatarFallback>{comment.user[0]}</AvatarFallback>
                                </Avatar>
                                <div className="flex-1">
                                    <div className="bg-slate-50 rounded-2xl px-4 py-2 relative">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="font-bold text-sm text-slate-900">{comment.user}</span>
                                            <span className="text-xs text-slate-400">{comment.timeAgo}</span>
                                        </div>
                                        {editingCommentId === comment.id ? (
                                            <div className="flex flex-col gap-2">
                                                <input
                                                    type="text"
                                                    value={editContent}
                                                    onChange={(e) => setEditContent(e.target.value)}
                                                    className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                                    autoFocus
                                                />
                                                <div className="flex justify-end gap-2">
                                                    <button 
                                                        onClick={() => setEditingCommentId(null)}
                                                        className="text-xs text-slate-500 hover:text-slate-700"
                                                    >
                                                        취소
                                                    </button>
                                                    <button 
                                                        onClick={() => handleSaveEdit(comment.id)}
                                                        className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                                                    >
                                                        저장
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <>
                                                <p className="text-sm text-slate-700">{comment.content}</p>
                                                {/* Edit/Delete buttons for comment owner */}
                                                {(comment.user === (currentUser?.name || "Me")) && (
                                                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover/comment:opacity-100 transition-opacity">
                                                        <button 
                                                            onClick={() => handleEditComment(comment.id, comment.content)}
                                                            className="p-1 text-slate-400 hover:text-blue-600 rounded-full hover:bg-blue-50"
                                                        >
                                                            <Pencil size={12} />
                                                        </button>
                                                        <button 
                                                            onClick={() => handleDeleteComment(comment.id)}
                                                            className="p-1 text-slate-400 hover:text-red-600 rounded-full hover:bg-red-50"
                                                        >
                                                            <Trash2 size={12} />
                                                        </button>
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                    <form onSubmit={handleAddComment} className="flex gap-2">
                        <input
                            type="text"
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            placeholder="댓글을 입력하세요..."
                            className="flex-1 bg-slate-50 border-none rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-blue-100 transition-all"
                        />
                        <button 
                            type="submit"
                            disabled={!newComment.trim()}
                            className="px-4 py-2 bg-blue-500 text-white text-sm font-bold rounded-xl hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            게시
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
}
