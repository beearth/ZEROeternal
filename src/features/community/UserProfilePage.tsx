
import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Mail, Globe } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from "../../components/ui/avatar";
import { Button } from "../../components/ui/button";
import { PostCard } from './PostCard';


// Define User Profile Interface
interface UserProfile {
    id: string;
    name: string;
    avatar: string;
    joinDate: string;
    followers: number;
    following: number;
    studying: string[];
    native: string[];
    bio: string;
    location: string;
    flag: string;
}

// Mock Data for Multiple Users
const MOCK_USERS: Record<string, UserProfile> = {
    'user1': {
        id: 'user1',
        name: 'Seoul_Lover',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop',
        joinDate: 'Joined in Mar 2025',
        followers: 128,
        following: 45,
        studying: ['Spanish', 'French'],
        native: ['Korean'],
        bio: '자기 소개를 적어주세요. 자기 소개를 적어주세요. 자기 소개를 적어주세요. 자기 소개를 적어주세요. 자기 소개를 적어주세요. 자기 소개를 적어주세요.',
        location: 'Seoul, Korea',
        flag: '🇰🇷'
    },
    '1': {
        id: '1',
        name: 'Study_Master',
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&h=200&fit=crop',
        joinDate: 'Joined in Jan 2025',
        followers: 542,
        following: 120,
        studying: ['English', 'Japanese'],
        native: ['Korean'],
        bio: '매일매일 공부하는 습관! 함께해요 🔥\nDaily study habit! Let\'s do it together.',
        location: 'Busan, Korea',
        flag: '🇰🇷'
    },
    '2': {
        id: '2',
        name: 'English_King',
        avatar: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=200&h=200&fit=crop',
        joinDate: 'Joined in Feb 2025',
        followers: 890,
        following: 50,
        studying: ['Korean'],
        native: ['English'],
        bio: 'Teaching English in Seoul. Love K-pop!',
        location: 'New York, USA',
        flag: '🇺🇸'
    },
    '3': {
        id: '3',
        name: 'Voca_Queen',
        avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop',
        joinDate: 'Joined in Dec 2024',
        followers: 1200,
        following: 300,
        studying: ['Chinese', 'Spanish'],
        native: ['Korean'],
        bio: '단어 암기의 여왕 👑\nVoca Queen',
        location: 'Seoul, Korea',
        flag: '🇰🇷'
    },
    '4': {
        id: '4',
        name: 'Daily_Learner',
        avatar: 'https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=200&h=200&fit=crop',
        joinDate: 'Joined in Mar 2025',
        followers: 56,
        following: 100,
        studying: ['English'],
        native: ['Korean'],
        bio: '초보입니다. 잘 부탁드려요!',
        location: 'Incheon, Korea',
        flag: '🇰🇷'
    }
};

// Mock Data for User Posts
const MOCK_USER_POSTS = [
    {
        id: 1,
        authorId: 'user1',
        user: {
            name: 'Seoul_Lover',
            avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop',
            location: 'Seoul, Korea',
            flag: '🇰🇷'
        },
        image: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=800&h=600&fit=crop',
        content: "오늘 날씨가 정말 좋네요! 한강에서 산책하기 딱 좋은 날씨입니다. ☀️\n\nThe weather is so nice today! Perfect for a walk by the Han River.",
        likes: 45,
        timeAgo: '2 hours ago',
        isOwner: true
    },
    {
        id: 2,
        authorId: 'user1',
        user: {
            name: 'Seoul_Lover',
            avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop',
            location: 'Seoul, Korea',
            flag: '🇰🇷'
        },
        image: '',
        content: "새로운 언어를 배우는 건 정말 즐거운 일이에요. 다들 어떤 언어를 공부하고 계신가요?\n\nLearning a new language is truly enjoyable. What languages are you all studying?",
        likes: 23,
        timeAgo: '5 hours ago',
        isOwner: true
    },
    {
        id: 3,
        authorId: '1',
        user: {
            name: 'Study_Master',
            avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop',
            location: 'Busan, Korea',
            flag: '🇰🇷'
        },
        image: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=800&h=600&fit=crop',
        content: "오늘도 열심히 공부했습니다! 📚\nStudied hard today as well!",
        likes: 12,
        timeAgo: '1 day ago',
        isOwner: false
    },
    {
        id: 4,
        authorId: '2',
        user: {
            name: 'English_King',
            avatar: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=100&h=100&fit=crop',
            location: 'New York, USA',
            flag: '🇺🇸'
        },
        image: '',
        content: "K-pop is amazing! Who is your favorite group?",
        likes: 56,
        timeAgo: '3 hours ago',
        isOwner: false
    }
];

export function UserProfilePage() {
    const { userId } = useParams<{ userId: string }>();
    const navigate = useNavigate();
    const [isFollowing, setIsFollowing] = useState(false);

    // Select user based on ID, fallback to user1
    const selectedUser = MOCK_USERS[userId || 'user1'] || MOCK_USERS['user1'];

    // Bio Editing State
    const [isEditingBio, setIsEditingBio] = useState(false);
    const [bio, setBio] = useState(() => {
        // Initialize from localStorage or fallback to mock data
        const savedBio = localStorage.getItem(`user_bio_${selectedUser.id}`);
        return savedBio || selectedUser.bio;
    });
    const [tempBio, setTempBio] = useState(bio);

    // Update bio state when userId changes
    React.useEffect(() => {
        const user = MOCK_USERS[userId || 'user1'] || MOCK_USERS['user1'];
        const savedBio = localStorage.getItem(`user_bio_${user.id}`);
        setBio(savedBio || user.bio);
        setTempBio(savedBio || user.bio);
        setIsEditingBio(false);
    }, [userId]);

    const user = { ...selectedUser, bio }; // Use state bio

    const handleSaveBio = () => {
        setBio(tempBio);
        localStorage.setItem(`user_bio_${user.id}`, tempBio);
        setIsEditingBio(false);
    };

    const handleCancelBio = () => {
        setTempBio(bio);
        setIsEditingBio(false);
    };

    return <div className="flex-1 flex flex-col h-full bg-[#fdfbf6] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-[#fdfbf6]/80 backdrop-blur-md border-b border-slate-200">
            <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
                <button
                    onClick={() => navigate(-1)}
                    className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                >
                    <ArrowLeft className="w-5 h-5 text-slate-600" />
                </button>
                <h1 className="text-lg font-bold text-slate-800">프로필</h1>
            </div>
        </div>

        <div className="p-4 max-w-3xl mx-auto w-full space-y-6">
            {/* Profile Card */}
            <div className="bg-[#ffe8d6] rounded-[32px] overflow-hidden shadow-sm border border-orange-100 p-6 pt-0 relative">
                {/* Header Text */}
                <div className="absolute top-6 left-6 z-10">
                    {/* Header text removed as it's outside the card in the design, but keeping structure if needed */}
                </div>

                {/* Banner Area */}
                <div className="h-32 bg-[#d8b4fe] w-full rounded-2xl border-2 border-[#9333ea] mt-6 relative"></div>

                <div className="px-2 relative">
                    <div className="flex justify-between items-start min-h-[80px]">
                        {/* Avatar - Overlapping Banner */}
                        <div className="-mt-20 ml-4 relative z-10">
                            <div className="rounded-full p-1.5 bg-[#a7f3d0] border-[3px] border-black w-36 h-36 flex items-center justify-center overflow-hidden shadow-sm">
                                <Avatar className="w-full h-full bg-transparent rounded-full">
                                    <AvatarImage src={user.avatar} className="object-cover w-full h-full" />
                                    <AvatarFallback className="bg-transparent text-4xl font-bold rounded-full">{user.name[0]}</AvatarFallback>
                                </Avatar>
                            </div>
                        </div>

                        {/* Action Buttons & Stats */}
                        <div className="flex flex-col items-end mt-6 gap-4">
                            <div className="flex gap-3">
                                <Button
                                    onClick={() => setIsFollowing(!isFollowing)}
                                    className={`h-11 px-8 font-black text-lg border-[3px] border-[#ff4d4d] shadow-sm transition-all rounded-xl ${isFollowing
                                        ? 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                                        : 'bg-[#ffb3b3] hover:bg-[#ff9999] text-[#1a1a1a]'
                                        }`}
                                >
                                    {isFollowing ? 'FOLLOWING' : 'FOLLOW'}
                                </Button>
                                <Button
                                    onClick={() => navigate(`/chat/${userId}`)}
                                    className="w-11 h-11 p-0 rounded-full border-[3px] border-[#ff4d4d] bg-[#ffb3b3] hover:bg-[#ff9999] text-[#1a1a1a] shadow-sm flex items-center justify-center"
                                >
                                    <Mail className="w-6 h-6 stroke-[2.5]" />
                                </Button>
                            </div>
                            <div className="flex gap-6 pr-2">
                                <div className="flex items-center gap-1.5">
                                    <span className="font-black text-slate-900 text-base">{user.followers}</span>
                                    <span className="font-bold text-slate-600 text-sm">followers</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <span className="font-black text-slate-900 text-base">{user.following}</span>
                                    <span className="font-bold text-slate-600 text-sm">following</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* User Info */}
            <div className="mt-6 ml-4 space-y-1">
                <h2 className="text-3xl font-black text-slate-900 tracking-tight">@{user.name}</h2>
                <p className="text-base text-slate-500 font-bold">{user.joinDate}</p>
            </div>

            {/* Languages */}
            <div className="flex flex-wrap gap-10 mt-8 ml-4 text-sm font-black text-slate-900">
                <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4" />
                    <span>STUDYING</span>
                    <div className="flex gap-2">
                        {user.studying.map(lang => (
                            <span key={lang} className="w-6 h-6 bg-[#ff8e8e] rounded-sm border-2 border-[#ff4d4d]"></span>
                        ))}
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4" />
                    <span>NATIVE IN</span>
                    <div className="flex gap-2">
                        {user.native.map(lang => (
                            <span key={lang} className="w-6 h-6 bg-[#ff8e8e] rounded-sm border-2 border-[#ff4d4d]"></span>
                        ))}
                    </div>
                </div>
            </div>

            {/* Bio Box */}
            <div className="bg-[#fface4] rounded-xl p-4 border-2 border-[#ff5db6] shadow-sm relative group">
                {isEditingBio ? (
                    <div className="space-y-3">
                        <textarea
                            value={tempBio}
                            onChange={(e) => setTempBio(e.target.value)}
                            className="w-full bg-white/50 rounded-lg p-3 text-sm text-slate-800 border border-pink-300 focus:outline-none focus:ring-2 focus:ring-pink-400 min-h-[100px] resize-none"
                            placeholder="자기소개를 입력해주세요..."
                            autoFocus
                        />
                        <div className="flex justify-end gap-2">
                            <button
                                onClick={handleCancelBio}
                                className="px-3 py-1.5 text-xs font-bold bg-white text-slate-500 rounded-lg border border-slate-200 hover:bg-slate-50"
                            >
                                취소
                            </button>
                            <button
                                onClick={handleSaveBio}
                                className="px-3 py-1.5 text-xs font-bold bg-[#ff5db6] text-white rounded-lg hover:bg-[#ff40a0]"
                            >
                                저장
                            </button>
                        </div>
                    </div>
                ) : (
                    <>
                        <p className="text-sm text-slate-800 leading-relaxed font-medium whitespace-pre-wrap">
                            {user.bio}
                        </p>
                        <button
                            onClick={() => {
                                setTempBio(user.bio);
                                setIsEditingBio(true);
                            }}
                            className="absolute top-2 right-2 p-1.5 bg-white/50 hover:bg-white rounded-full text-pink-600 opacity-0 group-hover:opacity-100 transition-all"
                            title="자기소개 수정"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                        </button>
                    </>
                )}
            </div>

            {/* Divider */}
            <div className="border-b border-slate-200"></div>

            {/* User Feed */}
            <div className="space-y-6">
                {(() => {
                    // Load posts from localStorage or fallback to MOCK_USER_POSTS
                    const savedPosts = localStorage.getItem('communityPosts');
                    const allPosts = savedPosts ? JSON.parse(savedPosts) : MOCK_USER_POSTS;

                    // Filter posts for the current user
                    // Handle both 'current_user' and specific user IDs
                    const userPosts = allPosts.filter((post: any) => {
                        if (user.id === 'user1' || user.id === 'current_user') {
                            return post.authorId === 'user1' || post.authorId === 'current_user';
                        }
                        return post.authorId === user.id;
                    });

                    if (userPosts.length === 0) {
                        return (
                            <div className="text-center py-10 text-slate-500">
                                게시물이 없습니다.
                            </div>
                        );
                    }

                    return userPosts.map((post: any) => (
                        <PostCard
                            key={post.id}
                            {...post}
                            onLike={() => { }}
                            onChat={() => navigate(`/chat/${userId}`)}
                            isOwner={userId === 'current_user' || userId === 'user1' || post.authorId === 'current_user'}
                            onEdit={() => navigate(`/edit-post/${post.id}`)}
                            onDelete={() => {
                                // Delete post logic - for now just log
                                console.log('Delete post:', post.id);
                                // In real app, this would delete from database
                            }}
                            onClickProfile={() => navigate(`/profile/${post.authorId}`)}
                        />
                    ));
                })()}
            </div>
        </div>
    </div>

}

