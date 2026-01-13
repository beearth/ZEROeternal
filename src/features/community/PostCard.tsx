import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { translateText } from '../../services/gemini';
import { getUserProfile, subscribeToUserProfile } from '../../services/userData';
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
import { toast } from "../../services/toast";

export interface Comment {
    id: string;
    authorId: string;
    authorName: string;
    content: string;
    createdAt: string;
}

export interface PostCardProps {
    id: string;
    authorId?: string;
    user: {
        name: string;
        avatar: string;
        location: string;
        flag: string;
        targetLang?: string;
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
    currentUserId?: string;
    onDeleteComment?: (commentId: string) => void;
}

export function PostCard({
    id,
    authorId,
    user: initialUser,
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
    const navigate = useNavigate();
    const [showComments, setShowComments] = useState(false);
    const [commentText, setCommentText] = useState("");

    // State for user profile (starts with props, updates from DB)
    const [displayUser, setDisplayUser] = useState(initialUser);

    // Initial sync with props
    useEffect(() => {
        setDisplayUser(initialUser);
    }, [initialUser]);

    // REAL-TIME Sync with Firestore
    useEffect(() => {
        if (!authorId) return;

        // Subscribe to changes
        const unsubscribe = subscribeToUserProfile(authorId, (profile) => {
            if (profile) {
                setDisplayUser(prev => ({
                    ...prev,
                    name: profile.name,
                    avatar: profile.avatar,
                    flag: profile.flag || prev.flag,
                    location: profile.location || prev.location
                }));
            }
        });

        return () => unsubscribe(); // Cleanup listener on unmount
    }, [authorId]);

    // Internal navigation handler using FRESH data
    const handleProfileClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (authorId) {
            navigate(`/profile/${authorId}`, {
                state: {
                    name: displayUser.name,
                    avatar: displayUser.avatar,
                    flag: displayUser.flag,
                    location: displayUser.location,
                    userName: displayUser.name, // Support legacy
                    userAvatar: displayUser.avatar
                }
            });
        } else if (onClickProfile) {
            onClickProfile(); // Fallback to prop if no authorId (unlikely)
        }
    };

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
        // 한글 IME 조합 중에는 Enter 무시 (맥북 중복 입력 버그 방지)
        if (e.nativeEvent.isComposing) return;

        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmitComment();
        }
    };

    return (
        <div className="bg-[#2a2b2c] rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow border border-[#2a2b2c] mb-6">
            {/* 1. Image Section (YouTube Style: Top & Dominant) */}
            {image && (
                <div className="w-full aspect-video bg-[#1e1f20] relative cursor-pointer">
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
                <div onClick={handleProfileClick} className="cursor-pointer flex-shrink-0 mt-0.5">
                    <Avatar className="h-10 w-10 border border-[#3a3b3c]">
                        <AvatarImage src={displayUser.avatar} alt={displayUser.name} className="object-cover" />
                        <AvatarFallback>{displayUser.name[0]}</AvatarFallback>
                    </Avatar>
                </div>

                {/* Text Content */}
                <div className="flex-1 min-w-0 pr-6">
                    {/* Metadata: Name • Views/Time */}
                    <div className="flex items-center flex-wrap text-xs text-zinc-400 gap-1 mb-2">
                        <span className="hover:text-white cursor-pointer text-sm font-semibold text-white mr-1" onClick={handleProfileClick}>
                            {displayUser.name}
                        </span>
                        <span className="text-lg leading-none" title={`Country: ${displayUser.location}`}>{displayUser.flag}</span>
                        {displayUser.targetLang && (
                            <span className="ml-1 px-1.5 py-0.5 text-[10px] bg-[#3a3b3c] text-zinc-400 rounded-md border border-[#3a3b3c] font-medium tracking-tight">
                                Learning {displayUser.targetLang}
                            </span>
                        )}
                        <span>•</span>
                        <span>{timeAgo}</span>
                    </div>

                    {/* Content Body (Always shown if exists) */}
                    {content && (
                        <div className="w-full">
                            <p className={`text-[15px] whitespace-pre-wrap leading-relaxed transition-colors duration-300 ${displayMode === 'target' ? 'text-blue-400 font-medium' : 'text-zinc-200'
                                }`}>
                                {isTranslating ? (
                                    <span className="flex items-center gap-2 text-zinc-500">
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
                                    onClick={handleTranslate}
                                    disabled={isTranslating}
                                    className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border transition-all ${displayMode === 'target'
                                        ? 'bg-blue-500/10 text-blue-400 border-blue-500/20 shadow-sm ring-1 ring-blue-500/20'
                                        : 'bg-[#3a3b3c] text-zinc-400 border-[#3a3b3c] hover:bg-[#4a4b4c] hover:text-white'
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
                                        ? 'bg-[#3a3b3c] text-white border-[#4a4b4c] shadow-sm'
                                        : 'bg-[#3a3b3c] text-zinc-400 border-[#3a3b3c] hover:bg-[#4a4b4c] hover:text-white'
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
                            <button className="p-2 rounded-full hover:bg-[#3a3b3c] text-zinc-400 transition-colors">
                                <MoreVertical className="h-5 w-5" />
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-[200px] p-2 bg-[#1e1f20] border-[#2a2b2c] text-zinc-300">
                            {isOwner ? (
                                <>
                                    <DropdownMenuItem onClick={() => toast.success("링크가 복사되었습니다.")} className="cursor-pointer gap-2 p-2.5 hover:bg-[#2a2b2c] focus:bg-[#2a2b2c]">
                                        <LinkIcon className="h-4 w-4 text-zinc-500" />
                                        <span className="text-zinc-300 font-medium">링크 복사</span>
                                    </DropdownMenuItem>
                                    <div className="h-px bg-[#2a2b2c] my-1" />
                                    {onEdit && (
                                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(); }} className="cursor-pointer gap-2 p-2.5 hover:bg-[#2a2b2c] focus:bg-[#2a2b2c]">
                                            <Edit className="h-4 w-4 text-zinc-500" />
                                            <span className="text-zinc-300 font-medium">수정하기</span>
                                        </DropdownMenuItem>
                                    )}
                                    {onDelete && (
                                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDelete(); }} className="text-red-400 focus:text-red-400 cursor-pointer gap-2 p-2.5 hover:bg-red-500/10 focus:bg-red-500/10">
                                            <Trash2 className="h-4 w-4" />
                                            <span className="font-medium">삭제하기</span>
                                        </DropdownMenuItem>
                                    )}
                                </>
                            ) : (
                                <>
                                    <DropdownMenuItem onClick={() => toast.success("저장되었습니다.")} className="cursor-pointer gap-2 p-2.5 hover:bg-[#2a2b2c] focus:bg-[#2a2b2c]">
                                        <Bookmark className="h-4 w-4 text-zinc-300" />
                                        <span className="text-zinc-300 font-medium">저장</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => toast.success("이 게시글 유형이 적게 표시됩니다.")} className="cursor-pointer gap-2 p-2.5 hover:bg-[#2a2b2c] focus:bg-[#2a2b2c]">
                                        <EyeOff className="h-4 w-4 text-zinc-300" />
                                        <span className="text-zinc-300 font-medium">관심 없음</span>
                                    </DropdownMenuItem>
                                    <div className="h-px bg-[#2a2b2c] my-1" />
                                    <DropdownMenuItem onClick={() => toast.success("차단되었습니다.")} className="cursor-pointer gap-2 p-2.5 text-red-400 focus:text-red-400 hover:bg-red-500/10 focus:bg-red-500/10">
                                        <Ban className="h-4 w-4" />
                                        <span className="font-medium">차단하기</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); }} className="cursor-pointer gap-2 p-2.5 text-red-400 focus:text-red-400 hover:bg-red-500/10 focus:bg-red-500/10">
                                        <Flag className="h-4 w-4" />
                                        <span className="font-medium">신고하기</span>
                                    </DropdownMenuItem>
                                    <div className="h-px bg-[#2a2b2c] my-1" />
                                    <DropdownMenuItem onClick={() => toast.success("링크가 복사되었습니다.")} className="cursor-pointer gap-2 p-2.5 hover:bg-[#2a2b2c] focus:bg-[#2a2b2c]">
                                        <LinkIcon className="h-4 w-4 text-zinc-500" />
                                        <span className="text-zinc-300 font-medium">링크 복사</span>
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
                                className="flex items-center gap-1.5 p-2 rounded-full hover:bg-[#3a3b3c] transition-colors group"
                            >
                                <Heart size={20} className={`transition-colors ${optimisticIsLiked ? 'fill-red-500 text-red-500' : 'text-zinc-400 group-hover:text-red-500'}`} />
                                <span className={`text-sm font-medium ${optimisticIsLiked ? 'text-red-500' : 'text-zinc-400'}`}>{optimisticLikes > 0 && optimisticLikes}</span>
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
                                className="flex items-center gap-1.5 p-2 rounded-full hover:bg-[#3a3b3c] transition-colors group"
                            >
                                <MessageCircle size={20} className={`transition-colors ${showComments ? 'text-blue-500' : 'text-zinc-400 group-hover:text-blue-500'}`} />
                                <span className={`text-sm font-medium ${showComments ? 'text-blue-500' : 'text-zinc-400'}`}>{optimisticComments.length > 0 && optimisticComments.length}</span>
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
                                className="flex items-center gap-1.5 p-2 rounded-full hover:bg-[#3a3b3c] transition-colors group"
                            >
                                <Repeat size={20} className={`transition-colors ${isReposted ? 'text-green-500' : 'text-zinc-400 group-hover:text-green-500'}`} />
                                <span className={`text-sm font-medium ${isReposted ? 'text-green-500' : 'text-zinc-400'}`}>{reposts > 0 && reposts}</span>
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
                                className="flex items-center gap-1.5 p-2 rounded-full hover:bg-[#3a3b3c] transition-colors group"
                            >
                                <Send size={20} className="text-zinc-400 group-hover:text-cyan-500 transition-colors" />
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
                <div className="bg-[#1e1f20] border-t border-[#3a3b3c] p-4 animate-in fade-in slide-in-from-top-1 duration-200">
                    {/* Comment Input */}
                    <div className="flex items-center gap-3 mb-4">
                        <Avatar className="w-8 h-8">
                            <AvatarFallback className="bg-[#3a3b3c] text-zinc-400 text-xs font-bold">Me</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 relative">
                            <input
                                type="text"
                                value={commentText}
                                onChange={(e) => setCommentText(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="댓글 추가..."
                                className="w-full bg-transparent border-b border-[#3a3b3c] py-1.5 text-sm text-white focus:outline-none focus:border-white transition-colors placeholder:text-zinc-600"
                            />
                        </div>
                        <button
                            onClick={handleSubmitComment}
                            disabled={!commentText.trim()}
                            className="text-sm font-semibold text-blue-500 disabled:opacity-50 hover:text-blue-400"
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
                                        <AvatarFallback className="bg-purple-500/10 text-purple-400 text-xs">{comment.authorName[0]}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-0.5">
                                            <span className="text-xs font-semibold text-white">{comment.authorName}</span>
                                            <span className="text-[10px] text-zinc-500">{comment.createdAt}</span>
                                        </div>
                                        <p className="text-sm text-zinc-300 leading-relaxed">{comment.content}</p>
                                    </div>

                                    {/* Delete Comment Button (Only for owner) */}
                                    {(currentUserId && comment.authorId === currentUserId) && (
                                        <button
                                            onClick={() => handleDeleteComment(comment.id)}
                                            className="p-1 text-zinc-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
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
