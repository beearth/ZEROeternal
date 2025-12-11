import React, { useState } from 'react';
import { translateText } from '../../services/gemini';
import { Heart, MessageCircle, Send, Repeat, MoreVertical, Edit, Trash2, Flag, Bookmark, EyeOff, Ban, Link as LinkIcon, BellOff, UserMinus, Languages } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from "../../components/ui/avatar";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "../../components/ui/tooltip";
import { toast } from "sonner";

export interface Comment {
    id: string;
    authorId: string;
    authorName: string;
    content: string;
    createdAt: string;
}

export interface PostCardProps {
    id: string;
    user: {
        name: string;
        avatar: string;
        location: string;
        location?: string; // Add optional if needed or strict
        flag: string;
        targetLang?: string; // Author's learning language
    };
    viewerNativeLang?: string;
    viewerTargetLang?: string;
    title?: string;
    image: string;
    content: string;
    likes: number;
    reposts?: number;
    timeAgo: string;
    comments?: Comment[];
    onAddComment?: (text: string) => void;
    onShare?: () => void;
    onRepost?: () => void;
    isOwner?: boolean;
    onEdit?: () => void;
    onDelete?: () => void;
    onLike?: () => void;
    isLiked?: boolean;
    isReposted?: boolean;
    onClickProfile?: () => void;
    currentUserId?: string; // Added for comment ownership check
    onDeleteComment?: (commentId: string) => void; // Added for comment deletion
}

export function PostCard({
    id,
    user,
    title,
    image,
    content,
    likes,
    reposts = 0,
    timeAgo,
    comments = [],
    onAddComment,
    onShare,
    onRepost,
    isOwner = false,
    onEdit,
    onDelete,
    onLike,
    isLiked = false,
    isReposted = false,
    onClickProfile,
    viewerNativeLang = 'KO',
    viewerTargetLang = 'EN',
    currentUserId,
    onDeleteComment
}: PostCardProps) {
    const [showComments, setShowComments] = useState(false);
    const [commentText, setCommentText] = useState("");

    // Optimistic UI for comments
    const [optimisticComments, setOptimisticComments] = useState<Comment[]>(comments);

    // Optimistic UI for likes
    const [optimisticLikes, setOptimisticLikes] = useState(likes);
    const [optimisticIsLiked, setOptimisticIsLiked] = useState(isLiked);

    // Sync optimistic comments with real comments when they change from server
    React.useEffect(() => {
        setOptimisticComments(comments);
    }, [comments]);

    // Sync optimistic likes with real data
    React.useEffect(() => {
        setOptimisticLikes(likes);
        setOptimisticIsLiked(isLiked);
    }, [likes, isLiked]);

    // State to toggle between modes: 'original' -> 'target' -> 'native' -> 'original'
    const [displayMode, setDisplayMode] = useState<'original' | 'target' | 'native'>('original');

    // Store translations separately
    const [translatedTarget, setTranslatedTarget] = useState<string | null>(null);
    const [translatedNative, setTranslatedNative] = useState<string | null>(null);

    const [isTranslating, setIsTranslating] = useState(false);

    const handleTranslate = async (e: React.MouseEvent) => {
        e.stopPropagation();

        // Cycle: Original -> Target -> Native -> Original
        if (displayMode === 'original') {
            // Try switching to TARGET
            if (translatedTarget) {
                setDisplayMode('target');
                return;
            }
            // Fetch Target
            await fetchTranslation(viewerTargetLang, 'target');
        } else if (displayMode === 'target') {
            // Try switching to NATIVE
            if (translatedNative) {
                setDisplayMode('native');
                return;
            }
            // Fetch Native
            await fetchTranslation(viewerNativeLang, 'native');
        } else {
            // Switch back to ORIGINAL
            setDisplayMode('original');
        }
    };

    const fetchTranslation = async (langCode: string, mode: 'target' | 'native') => {
        setIsTranslating(true);
        try {
            const code = langCode.toLowerCase();
            const result = await translateText(content, code);

            if (mode === 'target') {
                setTranslatedTarget(result);
                setDisplayMode('target');
            } else {
                setTranslatedNative(result);
                setDisplayMode('native');
            }
        } catch (error) {
            console.error("Translation failed:", error);
            toast.error("번역에 실패했습니다.");
        } finally {
            setIsTranslating(false);
        }
    };

    const handleSubmitComment = () => {
        if (!commentText.trim() || !onAddComment) return;

        // Optimistic Add
        const newTempComment: Comment = {
            id: `temp-${Date.now()}`,
            authorId: currentUserId || 'me',
            authorName: 'Me', // We might not have full name here easily unless passed, but 'Me' is fine for instant feedback or we can pass userName prop
            content: commentText,
            createdAt: 'Just now'
        };

        setOptimisticComments(prev => [...prev, newTempComment]);

        onAddComment(commentText);
        setCommentText("");
    };

    const handleDeleteComment = (commentId: string) => {
        if (!onDeleteComment) return;
        if (window.confirm("댓글을 삭제하시겠습니까?")) {
            // Optimistic Delete
            setOptimisticComments(prev => prev.filter(c => c.id !== commentId));
            onDeleteComment(commentId);
        }
    };

    const handleLike = () => {
        if (!onLike) return;
        const newIsLiked = !optimisticIsLiked;
        setOptimisticIsLiked(newIsLiked);
        setOptimisticLikes(prev => newIsLiked ? prev + 1 : prev - 1);
        onLike();
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmitComment();
        }
    };

    return (
        <div className='flex flex-col bg-white border border-slate-100 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow mb-6'>
            {/* 1. Image Section (YouTube Style: Top & Dominant) */}
            {image && (
                <div className="w-full aspect-video bg-slate-50 relative cursor-pointer">
                    <img
                        src={image}
                        alt={title || "Post content"}
                        className="w-full h-full object-cover"
                    />
                </div>
            )}

            {/* 2. Info & Meta Section */}
            <div className="p-4 flex gap-3 items-start relative">
                {/* Avatar */}
                <div onClick={onClickProfile} className="cursor-pointer flex-shrink-0 mt-0.5">
                    <Avatar className="h-10 w-10 border border-slate-100">
                        <AvatarImage src={user.avatar} alt={user.name} className="object-cover" />
                        <AvatarFallback>{user.name[0]}</AvatarFallback>
                    </Avatar>
                </div>

                {/* Text Content */}
                <div className="flex-1 min-w-0 pr-6">
                    {/* Metadata: Name • Views/Time */}
                    <div className="flex items-center flex-wrap text-xs text-slate-500 gap-1 mb-2">
                        <span className="hover:text-slate-800 cursor-pointer text-sm font-semibold text-slate-900 mr-1" onClick={onClickProfile}>
                            {user.name}
                        </span>
                        <span className="text-lg leading-none" title={`Country: ${user.location}`}>{user.flag}</span>
                        {user.targetLang && (
                            <span className="ml-1 px-1.5 py-0.5 text-[10px] bg-slate-100 text-slate-500 rounded-md border border-slate-200 font-medium tracking-tight">
                                Learning {user.targetLang}
                            </span>
                        )}
                        <span>•</span>
                        <span>{timeAgo}</span>
                    </div>

                    {/* Content Body (Always shown if exists) */}
                    {content && (
                        <div className="w-full">
                            <p className={`text-[15px] whitespace-pre-wrap leading-relaxed transition-colors duration-300 ${displayMode === 'target' ? 'text-blue-700 font-medium' : 'text-slate-800'
                                }`}>
                                {isTranslating ? (
                                    <span className="flex items-center gap-2 text-slate-400">
                                        <span className="animate-spin text-lg">⏳</span> 번역 중...
                                    </span>
                                ) : (
                                    displayMode === 'target' ? translatedTarget || content :
                                        displayMode === 'native' ? translatedNative || content :
                                            content
                                )}
                            </p>
                            <div className="flex gap-2 mt-3">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (displayMode === 'target') {
                                            setDisplayMode('original');
                                        } else {
                                            if (translatedTarget) {
                                                setDisplayMode('target');
                                            } else {
                                                fetchTranslation(viewerTargetLang, 'target');
                                            }
                                        }
                                    }}
                                    disabled={isTranslating}
                                    className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border transition-all ${displayMode === 'target'
                                        ? 'bg-blue-50 text-blue-600 border-blue-200 shadow-sm ring-1 ring-blue-100'
                                        : 'bg-slate-50 text-slate-500 border-slate-100 hover:bg-white hover:border-blue-100 hover:text-blue-600'
                                        } disabled:opacity-50`}
                                >
                                    <Languages className="w-3.5 h-3.5" />
                                    <span>학습 언어({viewerTargetLang})</span>
                                </button>

                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (displayMode === 'native') {
                                            setDisplayMode('original');
                                        } else {
                                            if (translatedNative) {
                                                setDisplayMode('native');
                                            } else {
                                                fetchTranslation(viewerNativeLang, 'native');
                                            }
                                        }
                                    }}
                                    disabled={isTranslating}
                                    className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border transition-all ${displayMode === 'native'
                                        ? 'bg-slate-100 text-slate-800 border-slate-300 shadow-sm'
                                        : 'bg-slate-50 text-slate-500 border-slate-100 hover:bg-white hover:border-slate-300 hover:text-slate-800'
                                        } disabled:opacity-50`}
                                >
                                    <Languages className="w-3.5 h-3.5" />
                                    <span>모국어({viewerNativeLang})</span>
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Owner Actions (Top Right of Info) */}
                <div className="absolute top-4 right-4">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button className="p-2 rounded-full hover:bg-slate-100 text-slate-600 transition-colors">
                                <MoreVertical className="h-5 w-5" />
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-[200px] p-2">
                            {isOwner ? (
                                <>
                                    <DropdownMenuItem onClick={() => toast.success("링크가 복사되었습니다.")} className="cursor-pointer gap-2 p-2.5">
                                        <LinkIcon className="h-4 w-4 text-slate-500" />
                                        <span className="text-slate-700 font-medium">링크 복사</span>
                                    </DropdownMenuItem>
                                    <div className="h-px bg-slate-100 my-1" />
                                    {onEdit && (
                                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(); }} className="cursor-pointer gap-2 p-2.5">
                                            <Edit className="h-4 w-4 text-slate-500" />
                                            <span className="text-slate-700 font-medium">수정하기</span>
                                        </DropdownMenuItem>
                                    )}
                                    {onDelete && (
                                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDelete(); }} className="text-red-600 focus:text-red-600 cursor-pointer gap-2 p-2.5">
                                            <Trash2 className="h-4 w-4" />
                                            <span className="font-medium">삭제하기</span>
                                        </DropdownMenuItem>
                                    )}
                                </>
                            ) : (
                                <>
                                    <DropdownMenuItem onClick={() => toast.success("저장되었습니다.")} className="cursor-pointer gap-2 p-2.5">
                                        <Bookmark className="h-4 w-4 text-slate-900" />
                                        <span className="text-slate-900 font-medium">저장</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => toast.success("이 게시글 유형이 적게 표시됩니다.")} className="cursor-pointer gap-2 p-2.5">
                                        <EyeOff className="h-4 w-4 text-slate-900" />
                                        <span className="text-slate-900 font-medium">관심 없음</span>
                                    </DropdownMenuItem>
                                    <div className="h-px bg-slate-100 my-1" />
                                    <DropdownMenuItem onClick={() => toast.success("차단되었습니다.")} className="cursor-pointer gap-2 p-2.5 text-red-600 focus:text-red-600">
                                        <Ban className="h-4 w-4" />
                                        <span className="font-medium">차단하기</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); }} className="cursor-pointer gap-2 p-2.5 text-red-600 focus:text-red-600">
                                        <Flag className="h-4 w-4" />
                                        <span className="font-medium">신고하기</span>
                                    </DropdownMenuItem>
                                    <div className="h-px bg-slate-100 my-1" />
                                    <DropdownMenuItem onClick={() => toast.success("링크가 복사되었습니다.")} className="cursor-pointer gap-2 p-2.5">
                                        <LinkIcon className="h-4 w-4 text-slate-500" />
                                        <span className="text-slate-700 font-medium">링크 복사</span>
                                    </DropdownMenuItem>
                                </>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            {/* 3. Interaction Bar (Threads Style) */}
            <div className="px-4 pb-3 flex items-center gap-2 ml-[52px]">
                <TooltipProvider delayDuration={200}>
                    {/* Like */}
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <button
                                onClick={handleLike}
                                className="flex items-center gap-1.5 p-2 rounded-full hover:bg-slate-100 transition-colors group"
                            >
                                <Heart size={20} className={`transition-colors ${optimisticIsLiked ? 'fill-red-500 text-red-500' : 'text-slate-900 group-hover:text-red-500'}`} />
                                <span className={`text-sm font-medium ${optimisticIsLiked ? 'text-red-500' : 'text-slate-600'}`}>{optimisticLikes > 0 && optimisticLikes}</span>
                            </button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>좋아요</p>
                        </TooltipContent>
                    </Tooltip>

                    {/* Comment */}
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <button
                                onClick={() => setShowComments(!showComments)}
                                className="flex items-center gap-1.5 p-2 rounded-full hover:bg-slate-100 transition-colors group"
                            >
                                <MessageCircle size={20} className={`transition-colors ${showComments ? 'text-blue-600' : 'text-slate-900 group-hover:text-blue-600'}`} />
                                <span className={`text-sm font-medium ${showComments ? 'text-blue-600' : 'text-slate-600'}`}>{optimisticComments.length > 0 && optimisticComments.length}</span>
                            </button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>답글 달기</p>
                        </TooltipContent>
                    </Tooltip>

                    {/* Repost (New) */}
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <button
                                onClick={onRepost}
                                className="flex items-center gap-1.5 p-2 rounded-full hover:bg-slate-100 transition-colors group"
                            >
                                <Repeat size={20} className={`transition-colors ${isReposted ? 'text-green-600' : 'text-slate-900 group-hover:text-green-600'}`} />
                                <span className={`text-sm font-medium ${isReposted ? 'text-green-600' : 'text-slate-600'}`}>{reposts > 0 && reposts}</span>
                            </button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>리포스트</p>
                        </TooltipContent>
                    </Tooltip>

                    {/* Send / Share */}
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <button
                                onClick={onShare}
                                className="flex items-center gap-1.5 p-2 rounded-full hover:bg-slate-100 transition-colors group"
                            >
                                <Send size={20} className="text-slate-900 group-hover:text-cyan-600 transition-colors" />
                            </button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>공유하기</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            </div>

            {/* Comments Expanded Section */}
            {showComments && (
                <div className="bg-slate-50 border-t border-slate-100 p-4 animate-in fade-in slide-in-from-top-1 duration-200">
                    {/* Comment Input */}
                    <div className="flex items-center gap-3 mb-4">
                        <Avatar className="w-8 h-8">
                            {/* Ideally current user avatar, but simplistic fallback */}
                            <AvatarFallback className="bg-slate-200 text-slate-600 text-xs font-bold">Me</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 relative">
                            <input
                                type="text"
                                value={commentText}
                                onChange={(e) => setCommentText(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="댓글 추가..."
                                className="w-full bg-transparent border-b border-slate-300 py-1.5 text-sm text-slate-900 focus:outline-none focus:border-slate-900 transition-colors placeholder:text-slate-500"
                            />
                        </div>
                        <button
                            onClick={handleSubmitComment}
                            disabled={!commentText.trim()}
                            className="text-sm font-semibold text-blue-600 disabled:opacity-50 hover:text-blue-700"
                        >
                            게시
                        </button>
                    </div>

                    {/* Comment List */}
                    {optimisticComments.length > 0 && (
                        <div className="space-y-4">
                            {optimisticComments.map((comment) => (
                                <div key={comment.id} className="flex gap-3 items-start group">
                                    <Avatar className="w-8 h-8 mt-0.5">
                                        <AvatarFallback className="bg-purple-100 text-purple-700 text-xs">{comment.authorName[0]}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-0.5">
                                            <span className="text-xs font-semibold text-slate-900">{comment.authorName}</span>
                                            <span className="text-[10px] text-slate-500">{comment.createdAt}</span>
                                        </div>
                                        <p className="text-sm text-slate-800 leading-relaxed">{comment.content}</p>
                                    </div>

                                    {/* Delete Comment Button (Only for owner) */}
                                    {(currentUserId && comment.authorId === currentUserId) && (
                                        <button
                                            onClick={() => handleDeleteComment(comment.id)}
                                            className="p-1 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                                            title="삭제"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
