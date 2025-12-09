import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PenSquare, Globe } from 'lucide-react';
import { PostCard, PostCardProps } from './PostCard';
import { FriendRecommendations } from './FriendRecommendations';
import { Button } from "../../components/ui/button";

// Extended interface with authorId and title
interface ExtendedPostCardProps extends PostCardProps {
    id: string;
    authorId: string;
    title: string;
    likedBy: string[]; // Array of user IDs who liked this post
}

const INITIAL_POSTS: ExtendedPostCardProps[] = [
    {
        id: '1',
        authorId: 'user_alex',
        title: "Hiking Adventure",
        likedBy: [],
        user: {
            name: "Alex0812",
            avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop",
            location: "Canada, Toronto",
            flag: "🇨🇦"
        },
        image: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=800&fit=crop",
        content: "I came hiking again today.\nHave a great day, everyone! #hiking",
        likes: 48,
        timeAgo: "30분"
    },
    {
        id: '2',
        authorId: 'user_cheese',
        title: "Cafe Dessert",
        likedBy: [],
        user: {
            name: "チーズマウス",
            avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop",
            location: "Japan, Osaka",
            flag: "🇯🇵"
        },
        image: "https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?w=800&h=800&fit=crop",
        content: "좋아하는 카페 디저트입니다\nお気に入りのカフェデザートです。🥰",
        likes: 63,
        timeAgo: "30분"
    },
    {
        id: '3',
        authorId: 'current_user', // This is owned by current user
        title: "Spicy Ramen Lunch",
        likedBy: ['current_user'], // Already liked by current user
        user: {
            name: "Seoul_Lover",
            avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop",
            location: "Korea, Seoul",
            flag: "🇰🇷"
        },
        image: "https://images.unsplash.com/photo-1569937728357-4071d9d561a4?w=800&h=800&fit=crop",
        content: "오늘 점심은 매운 라면!\nToday's lunch is spicy ramen! 🍜",
        likes: 120,
        timeAgo: "1시간"
    }
];

const CURRENT_USER_ID = 'current_user';
const CURRENT_USER = {
    name: "Seoul_Lover",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop",
    location: "Korea, Seoul",
    flag: "�🇷"
};

export function CommunityFeed() {
    const navigate = useNavigate();

    // Load posts from localStorage on mount
    const [posts, setPosts] = useState<ExtendedPostCardProps[]>(() => {
        const savedPosts = localStorage.getItem('communityPosts');
        if (savedPosts) {
            const parsed = JSON.parse(savedPosts);
            // Ensure all posts have likedBy array
            return parsed.map((post: any) => ({
                ...post,
                likedBy: post.likedBy || []
            }));
        }
        return INITIAL_POSTS;
    });

    // Save posts to localStorage whenever they change
    React.useEffect(() => {
        localStorage.setItem('communityPosts', JSON.stringify(posts));
    }, [posts]);

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

    const handleDeletePost = (postId: string) => {
        console.log('handleDeletePost called with postId:', postId);
        console.log('Current posts:', posts.length);
        const updatedPosts = posts.filter(p => p.id !== postId);
        console.log('Updated posts:', updatedPosts.length);
        setPosts(updatedPosts);
        // Update localStorage immediately
        localStorage.setItem('communityPosts', JSON.stringify(updatedPosts));
        console.log('Posts deleted and saved to localStorage');
    };

    const handleLike = (postId: string) => {
        const updatedPosts = posts.map(post => {
            if (post.id === postId) {
                // Ensure likedBy exists
                const likedBy = post.likedBy || [];
                const isLiked = likedBy.includes(CURRENT_USER_ID);
                if (isLiked) {
                    // Unlike: remove user and decrease count
                    return {
                        ...post,
                        likes: Math.max(0, post.likes - 1),
                        likedBy: likedBy.filter(id => id !== CURRENT_USER_ID)
                    };
                } else {
                    // Like: add user and increase count
                    return {
                        ...post,
                        likes: post.likes + 1,
                        likedBy: [...likedBy, CURRENT_USER_ID]
                    };
                }
            }
            return post;
        });
        setPosts(updatedPosts);
        // Save to localStorage immediately
        localStorage.setItem('communityPosts', JSON.stringify(updatedPosts));
    };



    return (
        <>
            <div className="w-full h-full bg-[#f2f0ea] flex flex-col relative">
                {/* Sticky Header with Create Button */}
                <div className="bg-[#f2f0ea] border-b border-slate-200 sticky top-0 z-20">
                    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900">커뮤니티</h1>
                            <p className="text-slate-500 mt-1">전 세계 친구들의 일상을 구경해보세요.</p>
                        </div>

                        <div className="flex gap-2">
                            {/* Global Chat Button */}
                            <Button
                                onClick={() => navigate('/community/global-chat')}
                                className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-md hover:shadow-lg transition-all p-0 flex items-center justify-center"
                                title="Global Open Chat"
                            >
                                <Globe className="h-6 w-6" />
                            </Button>

                            {/* Create Post Button */}
                            <Button
                                onClick={() => navigate('/create-post')}
                                className="w-12 h-12 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 shadow-sm hover:shadow-md transition-all p-0 flex items-center justify-center"
                            >
                                <PenSquare className="h-6 w-6" />
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto bg-[#f2f0ea]">
                    <div className="max-w-3xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
                        {/* Friend Recommendations Section */}
                        <FriendRecommendations />

                        {/* Divider */}
                        <div className="h-2 bg-slate-200 my-10 rounded-full opacity-50" />

                        {/* Feed Section */}
                        <div className="space-y-6 bg-[#f2f0ea] rounded-3xl p-2">
                            <h2 className="text-lg font-bold text-slate-900 px-1 mb-2">피드</h2>
                            {posts.map((post) => (
                                <PostCard
                                    key={post.id}
                                    {...post}
                                    onChat={post.authorId === CURRENT_USER_ID ? undefined : () => handleChat(post)}
                                    onClickProfile={() => navigate(`/profile/${post.authorId || 'user1'}`)}
                                    isOwner={post.authorId === CURRENT_USER_ID}
                                    onEdit={() => navigate(`/edit-post/${post.id}`)}
                                    onDelete={() => handleDeletePost(post.id)}
                                    onLike={() => handleLike(post.id)}
                                    isLiked={(post.likedBy || []).includes(CURRENT_USER_ID)}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

