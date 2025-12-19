import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Globe, Menu, Search, Bell } from 'lucide-react';
import { PostCard, PostCardProps, Comment } from './PostCard';
import { FriendRecommendations } from './FriendRecommendations';
import { Button } from "../../components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "../../components/ui/avatar";
import { toast } from "sonner";
import { NotificationsPopover } from "../../components/NotificationsPopover";
import { AiKnowHowCard } from "./AiKnowHowCard";

// Extended interface with authorId and title
interface ExtendedPostCardProps extends PostCardProps {
    id: string;
    authorId: string;
    title: string;
    likedBy: string[]; // Array of user IDs who liked this post
    repostedBy?: string[]; // Array of user IDs who reposted this post
}

const ADMIN_POST: ExtendedPostCardProps = {
    id: 'admin-welcome',
    authorId: 'admin',
    title: '환영합니다! 👋',
    content: '커뮤니티에 오신 것을 환영합니다.\n이 글은 다른 사용자(관리자)가 작성한 예시 글입니다.\n\n우측 상단 3점 메뉴(⋮)를 눌러보세요.\n내가 쓴 글이 아닐 때 나타나는 [저장/관심없음/차단/신고] 기능을 확인하실 수 있습니다.',
    user: {
        name: 'Signal Team',
        avatar: 'https://github.com/shadcn.png',
        location: 'Official',
        flag: '🤖',
        targetLang: 'All'
    },
    image: '',
    likes: 128,
    reposts: 12,
    timeAgo: '공지',
    likedBy: [],
    repostedBy: [],
    comments: []
};

// Removed CURRENT_USER_ID and CURRENT_USER constants as they are replaced by dynamic user data

import { User } from 'firebase/auth';
import { subscribeToPosts, deletePost, toggleLike, addCommentToPost, toggleRepost, deleteCommentFromPost } from '../../services/firestore';

interface CommunityFeedProps {
    user?: User | null;
    nativeLang?: string;
    targetLang?: string | null;
    onToggleSidebar?: () => void;
}

export function CommunityFeed({ user, nativeLang, targetLang, onToggleSidebar }: CommunityFeedProps) {
    const navigate = useNavigate();

    // Init with empty or Admin Post, then load async
    const [posts, setPosts] = useState<ExtendedPostCardProps[]>([]);
    const [isLoaded, setIsLoaded] = useState(false);

    // 1. Load posts from IndexedDB on mount
    // 1. Subscribe to Firestore posts (Real-time)
    // 1. Subscribe to Firestore posts (Real-time) with Safety Guard
    const isSubscribed = React.useRef(false);

    React.useEffect(() => {
        if (isSubscribed.current) return;
        isSubscribed.current = true;

        console.log("Starting Firestore Subscription...");
        const unsubscribe = subscribeToPosts((updatedPosts) => {
            if (updatedPosts.length > 0) {
                setPosts(updatedPosts as ExtendedPostCardProps[]);
            } else {
                setPosts([ADMIN_POST]);
            }
            setIsLoaded(true);
        });

        return () => {
            // We don't flip isSubscribed to false immediately in dev strict mode to prevent double-sub
            // causing fast quota usage, although standard cleanup is usually fine.
            // But for safety:
            unsubscribe();
            // isSubscribed.current = false; // Keep it true to prevent re-sub on quick remounts if desired?
            // No, standard StrictMode needs cleanup.
            // Actually, the best way to save quota in Dev is just:
            // Don't listen?
            // No, we need to listen.
            isSubscribed.current = false;
        };
    }, []);

    const [selectedCategory, setSelectedCategory] = useState("전체");
    const categories = ["전체", "실시간 인기", "최신 질문", "정보 공유", "자유게시판", "동기부여"];

    // No saving effect needed, Firestore is the source of truth.

    const handleChat = (post: PostCardProps) => {
        navigate(`/chat/${post.user.name}`, {
            state: {
                userName: post.user.name,
                userAvatar: post.user.avatar,
                userFlag: post.user.flag,
                userLocation: post.user.location
            }
        });
    };

    const handleDeletePost = async (postId: string) => {
        if (window.confirm("정말 이 게시글을 삭제하시겠습니까?")) {
            await deletePost(postId);
            toast.success("게시글이 삭제되었습니다.");
        }
    };

    const currentUserId = user?.uid || 'anonymous';

    const handleLike = async (postId: string) => {
        const post = posts.find(p => p.id === postId);
        if (!post) return;

        const isLiked = (post.likedBy || []).includes(currentUserId);
        // Optimistic update locally not needed as Firestore listener is fast, 
        // but if needed we could setPosts locally. 
        // For now, let's rely on Firestore subscription.

        await toggleLike(postId, currentUserId, isLiked);
    };

    const handleAddComment = async (postId: string, text: string) => {
        const newComment: Comment = {
            id: Date.now().toString(),
            authorId: currentUserId,
            authorName: user?.displayName || '익명',
            content: text,
            createdAt: '방금 전'
        };
        await addCommentToPost(postId, newComment);
    };

    const handleRepost = async (postId: string) => {
        const post = posts.find(p => p.id === postId);
        if (!post) return;
        const isReposted = (post.repostedBy || []).includes(currentUserId);
        await toggleRepost(postId, currentUserId, isReposted);
        toast.success(isReposted ? "리포스트 취소" : "리포스트되었습니다.");
    };

    const handleShare = (post: PostCardProps) => {
        navigator.clipboard.writeText(`${post.content}`).then(() => {
            toast.success("클립보드에 복사되었습니다!");
        }).catch(() => toast.error("복사 실패"));
    };

    const handleDeleteComment = async (postId: string, commentId: string) => {
        await deleteCommentFromPost(postId, commentId);
        toast.success("댓글이 삭제되었습니다.");
    };




    return (
        <div className="flex-1 flex flex-col h-full bg-[#1e1f20] w-full min-w-0">
            {/* YouTube-style Header */}
            <header className="sticky top-0 z-40 bg-[#1e1f20]/95 backdrop-blur-sm border-b border-[#2a2b2c]">
                <div className="flex items-center justify-between px-4 h-14">
                    {/* Left: Menu & Logo */}
                    <div className="flex items-center gap-4">
                        <button onClick={onToggleSidebar} className="p-2 hover:bg-[#2a2b2c] rounded-full lg:hidden">
                            <Menu className="h-6 w-6 text-zinc-400" />
                        </button>
                        <h1
                            className="text-xl font-bold tracking-tight text-white cursor-pointer flex items-center gap-1"
                            onClick={() => navigate('/community')}
                        >
                            <span>AI KNOW HOW</span>
                        </h1>
                    </div>

                    {/* Center: Search Bar */}
                    <div className="hidden md:flex flex-1 max-w-[600px] mx-8">
                        <div className="flex w-full items-center">
                            <input
                                type="text"
                                placeholder="검색"
                                className="w-full h-10 px-4 rounded-l-full border border-[#2a2b2c] focus:border-blue-500 outline-none bg-[#2a2b2c] text-white text-[15px] placeholder:text-zinc-500"
                            />
                            <button className="h-10 px-6 bg-[#2a2b2c] border border-l-0 border-[#2a2b2c] rounded-r-full hover:bg-[#3a3b3c] flex items-center justify-center transition-colors">
                                <Search className="h-5 w-5 text-zinc-400" strokeWidth={2} />
                            </button>
                        </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-2 sm:gap-3">
                        <button className="p-2 hover:bg-[#2a2b2c] rounded-full md:hidden">
                            <Search className="h-6 w-6 text-zinc-400" />
                        </button>

                        {/* Open Chat Pill */}
                        <Button
                            onClick={() => navigate('/chat/global')}
                            className="flex items-center gap-2 h-9 w-9 p-0 sm:w-auto sm:px-4 rounded-full bg-[#2a2b2c] hover:bg-[#3a3b3c] text-white border border-[#2a2b2c] shadow-sm transition-colors"
                            title="Global Open Chat"
                        >
                            <Globe className="w-4 h-4" />
                            <span className="font-semibold text-sm hidden sm:inline">오픈챗</span>
                        </Button>

                        {/* Create Post Pill */}
                        <Button
                            onClick={() => navigate('/community/post')}
                            className="flex items-center gap-2 h-9 w-9 p-0 sm:w-auto sm:px-4 rounded-full bg-[#2a2b2c] hover:bg-[#3a3b3c] text-white border border-[#2a2b2c] shadow-sm transition-colors"
                        >
                            <Plus className="w-5 h-5" />
                            <span className="font-semibold text-sm hidden sm:inline">글쓰기</span>
                        </Button>

                        {/* Notification Bell */}
                        {user ? (
                            <div className="mr-1">
                                <NotificationsPopover userId={user.uid} />
                            </div>
                        ) : (
                            <button className="p-2 hover:bg-[#2a2b2c] rounded-full relative">
                                <Bell className="h-6 w-6 text-zinc-400" strokeWidth={1.5} />
                            </button>
                        )}

                        {/* User Profile */}
                        <Avatar className="h-8 w-8 ml-1 cursor-pointer border border-[#2a2b2c]" onClick={() => navigate(`/profile/${user?.uid || 'guest'}`)}>
                            <AvatarImage src={user?.photoURL && user.photoURL.startsWith('http') ? user.photoURL : undefined} />
                            <AvatarFallback className="bg-[#2a2b2c] text-zinc-400 text-sm font-medium">
                                {user?.displayName?.[0] || 'U'}
                            </AvatarFallback>
                        </Avatar>
                    </div>
                </div>

                {/* Categories Bar */}
                <div className="flex items-center gap-3 px-4 py-2 overflow-x-auto no-scrollbar border-t border-[#2a2b2c]">
                    {categories.map((cat) => (
                        <button
                            key={cat}
                            onClick={() => setSelectedCategory(cat)}
                            className={`px-3 py-1.5 rounded-lg text-[14px] font-semibold whitespace-nowrap transition-colors ${selectedCategory === cat
                                ? 'bg-white text-black'
                                : 'bg-[#2a2b2c] text-zinc-400 hover:bg-[#3a3b3c] hover:text-white'
                                }`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
            </header>

            {/* Main Feed Content */}
            <div className="flex-1 overflow-y-auto">
                <div className="max-w-2xl mx-auto pt-6 pb-20 px-4 space-y-6">
                    {/* Posts */}
                    <div className="mb-6">
                        <AiKnowHowCard
                            category="Prompt Tip"
                            title="DeepSeek로 리액트 코드 3초 컷 하기"
                            description="복잡한 설명 필요 없이 이 프롬프트 한 줄이면 구조까지 완벽하게 잡아줍니다. 지금 바로 내 채팅창에 적용해 보세요."
                            onAction={() => toast.success("Signal 적용됨!")}
                        />
                    </div>

                    {posts.map((post) => (
                        <PostCard
                            key={post.id}
                            {...post}
                            comments={post.comments}
                            onAddComment={(text) => handleAddComment(post.id, text)}
                            onShare={() => handleShare(post)}
                            onClickProfile={() => navigate(`/profile/${post.authorId || 'user1'}`, {
                                state: {
                                    userName: post.user.name,
                                    userAvatar: post.user.avatar,
                                    userFlag: post.user.flag,
                                    userLocation: post.user.location
                                }
                            })}
                            isOwner={post.authorId === currentUserId}
                            onEdit={() => navigate(`/edit-post/${post.id}`)}
                            onDelete={() => handleDeletePost(post.id)}
                            onLike={() => handleLike(post.id)}
                            isLiked={(post.likedBy || []).includes(currentUserId)}
                            onRepost={() => handleRepost(post.id)}
                            isReposted={(post.repostedBy || []).includes(currentUserId)}
                            reposts={post.reposts || 0}
                            viewerNativeLang={nativeLang || 'KO'}
                            viewerTargetLang={targetLang || 'EN'}
                            currentUserId={currentUserId}
                            onDeleteComment={(commentId) => handleDeleteComment(post.id, commentId)}
                            user={post.authorId === currentUserId ? {
                                ...post.user,
                                name: user?.displayName || post.user.name,
                                avatar: user?.photoURL || post.user.avatar,
                                targetLang: targetLang || 'EN'
                            } : post.user}
                        />
                    ))}

                    {posts.length === 0 && (
                        <div className="text-center py-20 text-zinc-500">
                            <p>게시물이 없습니다.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}