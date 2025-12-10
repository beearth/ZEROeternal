import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Mail, Globe, Pencil } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from "../../components/ui/avatar";
import { Button } from "../../components/ui/button";
import { PostCard } from './PostCard';
import { User } from 'firebase/auth';
import { updateProfile } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';

interface UserProfilePageProps {
    user?: User | null;
}


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
        name: 'Kim_Traveler',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop',
        joinDate: 'Joined in Mar 2025',
        followers: 128,
        following: 45,
        studying: ['Spanish', 'French'],
        native: ['Korean'],
        bio: '여행을 사랑하는 김여행입니다.\nI love traveling!',
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
            name: 'Kim_Traveler',
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
            name: 'Kim_Traveler',
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

export function UserProfilePage({ user: currentUser }: UserProfilePageProps) {
    const { userId } = useParams<{ userId: string }>();
    const navigate = useNavigate();
    const [isFollowing, setIsFollowing] = useState(() => {
        const saved = localStorage.getItem('followed_friends');
        const followedFriends = saved ? JSON.parse(saved) : {};
        return followedFriends[userId || ''] || false;
    });

    const toggleFollow = () => {
        const newStatus = !isFollowing;
        setIsFollowing(newStatus);
        
        const saved = localStorage.getItem('followed_friends');
        const followedFriends = saved ? JSON.parse(saved) : {};
        
        if (userId) {
            followedFriends[userId] = newStatus;
            localStorage.setItem('followed_friends', JSON.stringify(followedFriends));
        }
    };

    // Determine if we are viewing the current user's profile
    const isCurrentUser = currentUser && (userId === currentUser.uid || userId === 'current_user');

    // Create a profile object for the current user if available
    const currentUserProfile: UserProfile | undefined = currentUser ? {
        id: currentUser.uid,
        name: currentUser.displayName || 'Anonymous',
        avatar: currentUser.photoURL || 'https://via.placeholder.com/200',
        joinDate: `Joined in ${new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`,
        followers: 0,
        following: 0,
        studying: ['English'], // Default or fetch from user prefs
        native: ['Korean'], // Default or fetch
        bio: 'Hello! I am learning languages.',
        location: 'Earth',
        flag: '🌍'
    } : undefined;

    // Select user based on ID, fallback to mock data
    // If it's current user, use currentUserProfile, otherwise looks in MOCK_USERS
    const selectedUser = isCurrentUser && currentUserProfile
        ? currentUserProfile
        : (MOCK_USERS[userId || 'user1'] || MOCK_USERS['user1']);

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

    const handleSaveBio = async () => {
        setBio(tempBio);
        localStorage.setItem(`user_bio_${user.id}`, tempBio);
        
        if (isCurrentUser && currentUser) {
            try {
                const userRef = doc(db, "users", currentUser.uid);
                await updateDoc(userRef, {
                    bio: tempBio
                });
            } catch (error) {
                console.error("Error updating bio:", error);
                alert("자기소개 업데이트에 실패했습니다.");
            }
        }
        
        setIsEditingBio(false);
    };

    const handleCancelBio = () => {
        setTempBio(bio);
        setIsEditingBio(false);
    };

    const handleEditProfile = async () => {
        if (!currentUser) return;

        const newName = window.prompt("새로운 닉네임을 입력하세요:", currentUser.displayName || "");
        if (newName && newName !== currentUser.displayName) {
            try {
                // 1. Update Firebase Auth Profile
                await updateProfile(currentUser, {
                    displayName: newName
                });

                // 2. Update Firestore User Document
                const userRef = doc(db, "users", currentUser.uid);
                await updateDoc(userRef, {
                    name: newName
                });

                // toast.success("프로필이 업데이트되었습니다."); // toast is not imported, use alert or import toast
                alert("프로필이 업데이트되었습니다.");
                window.location.reload(); 
            } catch (error) {
                console.error("Error updating profile:", error);
                alert("프로필 업데이트에 실패했습니다.");
            }
        }
    };

    return (
        <div className="flex-1 flex flex-col h-full bg-[#fdfbf6] overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-[#fdfbf6]/80 backdrop-blur-md border-b border-slate-200 px-4 py-3 flex items-center gap-3">
                <button 
                    onClick={() => navigate(-1)}
                    className="p-2 -ml-2 hover:bg-slate-100 rounded-full transition-colors"
                >
                    <ArrowLeft className="w-6 h-6 text-slate-600" />
                </button>
                <h1 className="text-lg font-bold text-slate-800">프로필</h1>
            </div>

            <div className="p-4 max-w-3xl mx-auto w-full space-y-6">
                {/* Profile Card */}
                <div className="bg-[#ffe8d6] rounded-[32px] p-6 shadow-sm relative overflow-hidden">
                    {/* Background Pattern */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-[#ffd1a8] rounded-full blur-3xl -mr-16 -mt-16 opacity-50" />
                    <div className="absolute bottom-0 left-0 w-48 h-48 bg-[#fff0e0] rounded-full blur-2xl -ml-10 -mb-10" />

                    <div className="relative z-10">
                        <div className="flex justify-between items-start min-h-[80px]">
                            {/* Avatar */}
                            <div className="relative">
                                <div className="w-24 h-24 rounded-full border-4 border-white shadow-lg overflow-hidden bg-white">
                                    <Avatar className="w-full h-full">
                                        <AvatarImage src={user.avatar} className="object-cover" />
                                        <AvatarFallback className="text-2xl font-bold bg-slate-100 text-slate-400">
                                            {user.name[0]}
                                        </AvatarFallback>
                                    </Avatar>
                                </div>
                                <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-1.5 shadow-sm border border-slate-100">
                                    <span className="text-xl leading-none block">{user.flag}</span>
                                </div>
                            </div>

                            {/* Action Buttons & Stats */}
                            <div className="flex flex-col items-end mt-6 gap-4">
                                <div className="flex gap-3">
                                    {!isCurrentUser && (
                                        <>
                                            <Button
                                                onClick={toggleFollow}
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
                                        </>
                                    )}
                                </div>
                                <div className="flex gap-6 pr-2">
                                    <div className="flex items-center gap-1.5">
                                        <span className="font-black text-slate-900 text-base">
                                            {isFollowing ? user.followers + 1 : user.followers}
                                        </span>
                                        <span className="font-bold text-slate-600 text-sm">followers</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <span className="font-black text-slate-900 text-base">{user.following}</span>
                                        <span className="font-bold text-slate-600 text-sm">following</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* User Info */}
                        <div className="mt-6 ml-4 space-y-1 relative group">
                            {isCurrentUser ? (
                                <div className="flex items-center gap-2">
                                    <h2 className="text-3xl font-black text-slate-900 tracking-tight">@{user.name}</h2>
                                    <button
                                        onClick={handleEditProfile}
                                        className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold transition-all"
                                    >
                                        <Pencil size={12} />
                                        EDIT
                                    </button>
                                </div>
                            ) : (
                                <h2 className="text-3xl font-black text-slate-900 tracking-tight">@{user.name}</h2>
                            )}
                            <p className="text-base text-slate-500 font-bold">{user.joinDate}</p>
                        </div>
                    </div>
                </div>

            {/* Languages */}
            <div className="flex flex-wrap gap-10 mt-8 ml-4 text-sm font-black text-slate-900">
                <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4" />
                    <span>STUDYING</span>
                    <div className="flex gap-2 text-2xl">
                        {user.studying.map(lang => (
                            <span key={lang} title={lang}>
                                {lang === 'English' ? '🇺🇸' :
                                 lang === 'Korean' ? '🇰🇷' :
                                 lang === 'Japanese' ? '🇯🇵' :
                                 lang === 'Chinese' ? '🇨🇳' :
                                 lang === 'Spanish' ? '🇪🇸' :
                                 lang === 'French' ? '🇫🇷' :
                                 lang === 'German' ? '🇩🇪' : '🌍'}
                            </span>
                        ))}
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4" />
                    <span>NATIVE IN</span>
                    <div className="flex gap-2 text-2xl">
                        {user.native.map(lang => (
                            <span key={lang} title={lang}>
                                {lang === 'English' ? '🇺🇸' :
                                 lang === 'Korean' ? '🇰🇷' :
                                 lang === 'Japanese' ? '🇯🇵' :
                                 lang === 'Chinese' ? '🇨🇳' :
                                 lang === 'Spanish' ? '🇪🇸' :
                                 lang === 'French' ? '🇫🇷' :
                                 lang === 'German' ? '🇩🇪' : '🌍'}
                            </span>
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
                        {isCurrentUser && (
                            <button
                                onClick={() => {
                                    setTempBio(user.bio);
                                    setIsEditingBio(true);
                                }}
                                className="absolute top-2 right-2 p-1.5 bg-white/50 hover:bg-white rounded-full text-pink-600 opacity-0 group-hover:opacity-100 transition-all"
                                title="자기소개 수정"
                            >
                                <Pencil size={14} />
                            </button>
                        )}
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
                        // If viewing our own profile
                        if (isCurrentUser) {
                            return post.authorId === currentUser?.uid || post.authorId === 'current_user' || post.authorId === 'anonymous'; // Include 'anonymous' for immediate feedback if id missing
                        }

                        // If viewing user1 (mock), encompass user1 and current_user posts for demo if needed, 
                        // but strictly we should filter by authorId
                        if (selectedUser.id === 'user1') {
                            return post.authorId === 'user1';
                        }

                        return post.authorId === selectedUser.id;
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

    );
}

