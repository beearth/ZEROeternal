
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Mail, Globe, Camera, Pencil, Check, X } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from "../../components/ui/avatar";
import { Button } from "../../components/ui/button";
import { PostCard, Comment } from './PostCard';
import { User, updateProfile } from 'firebase/auth';
import { toast } from "sonner";
import { supabase } from '../../supabase';
import { subscribeToPosts, toggleLike, addCommentToPost, deletePost, toggleRepost, deleteCommentFromPost } from '../../services/firestore';

// Helper to convert Data URL to Blob
const dataURLtoBlob = (dataurl: string) => {
    const arr = dataurl.split(',');
    const match = arr[0].match(/:(.*?);/);
    const mime = match ? match[1] : 'image/jpeg';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
};

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
        name: 'Guest_User',
        avatar: 'https://via.placeholder.com/200',
        joinDate: 'Joined recently',
        followers: 0,
        following: 0,
        studying: ['English'],
        native: ['Korean'],
        bio: 'Welcome!',
        location: 'Seoul, Korea',
        flag: '🇰🇷'
    }
};

const LANGUAGE_FLAGS: Record<string, string> = {
    'Korean': '🇰🇷', 'English': '🇺🇸', 'Japanese': '🇯🇵', 'Chinese': '🇨🇳',
    'Spanish': '🇪🇸', 'French': '🇫🇷', 'German': '🇩🇪', 'Russian': '🇷🇺', 'Italian': '🇮🇹'
};

export function UserProfilePage({ user: currentUser }: UserProfilePageProps) {
    const { userId } = useParams<{ userId: string }>();
    const navigate = useNavigate();
    const location = useLocation();
    const [isFollowing, setIsFollowing] = useState(false);

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
        studying: ['English'],
        native: ['Korean'], // Default or fetch
        bio: 'Hello! I am learning languages.',
        location: 'Earth',
        flag: '🌍'
    } : undefined;

    // effectiveUserId for fallback
    const effectiveTargetId = (isCurrentUser && currentUser) ? currentUser.uid : (userId || 'user1');

    // Retrieve state passed from navigation (e.g. from Chat or PostCard)
    const stateUser = location.state as {
        userName?: string;
        userAvatar?: string;
        userFlag?: string;
        userLocation?: string;
        name?: string; // support both
        avatar?: string;
        flag?: string;
        location?: string;
    } | null;

    // Construct profile from state if available
    const stateUserProfile: UserProfile | undefined = stateUser ? {
        id: userId || 'unknown',
        name: stateUser.userName || stateUser.name || 'Unknown',
        avatar: stateUser.userAvatar || stateUser.avatar || 'https://via.placeholder.com/200',
        joinDate: 'Signal User',
        followers: 0,
        following: 0,
        studying: [],
        native: [],
        bio: 'Hello!', // Default bio for visited users
        location: stateUser.userLocation || stateUser.location || 'Unknown',
        flag: stateUser.userFlag || stateUser.flag || '🏳️'
    } : undefined;

    // Select user based on ID, priority: CurrentUser -> State -> Mock
    const selectedUser = isCurrentUser && currentUserProfile
        ? currentUserProfile
        : (stateUserProfile || MOCK_USERS[userId || 'user1'] || MOCK_USERS['user1']);

    // State for Posts from Firestore
    const [posts, setPosts] = useState<any[]>([]);

    // Subscribe to Firestore Posts
    useEffect(() => {
        const unsubscribe = subscribeToPosts((updatedPosts) => {
            setPosts(updatedPosts);
        });
        return () => unsubscribe();
    }, []);

    // Filter posts for this profile
    const userPosts = posts.filter(post => {
        if (isCurrentUser) {
            return post.authorId === currentUser?.uid || post.authorId === 'current_user' || post.authorId === 'anonymous';
        }
        if (userId === 'user1' || !userId) {
            return post.authorId === 'user1';
        }
        return post.authorId === userId;
    });


    // Bio Editing State
    const [isEditingBio, setIsEditingBio] = useState(false);
    const [bio, setBio] = useState(() => {
        const savedBio = localStorage.getItem(`user_bio_${effectiveTargetId}`);
        return savedBio || selectedUser.bio;
    });
    const [tempBio, setTempBio] = useState(bio);

    // Update bio state when userId changes
    // Update bio state when userId changes
    useEffect(() => {
        const savedBio = localStorage.getItem(`user_bio_${effectiveTargetId}`);
        const savedName = localStorage.getItem(`user_name_${effectiveTargetId}`);
        const savedAvatar = localStorage.getItem(`user_avatar_${effectiveTargetId}`);

        setBio(savedBio || selectedUser.bio);
        setTempBio(savedBio || selectedUser.bio);

        if (savedName) setEditName(savedName);
        if (savedAvatar) setEditAvatar(savedAvatar);

        setIsEditingProfile(false);
    }, [effectiveTargetId]);

    // Profile Editing State
    const [isEditingProfile, setIsEditingProfile] = useState(false);
    const [editName, setEditName] = useState(selectedUser.name);
    const [editAvatar, setEditAvatar] = useState(selectedUser.avatar);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setEditAvatar(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSaveProfile = async () => {
        if (isCurrentUser && currentUser) {
            try {
                let finalAvatarUrl = editAvatar;

                // 1. If Avatar is Base64, upload to Supabase Storage first
                if (editAvatar && editAvatar.startsWith('data:')) {
                    const toastId = toast.loading("이미지 업로드 중...");
                    const blob = dataURLtoBlob(editAvatar);
                    const fileName = `avatars/${currentUser.uid}_${Date.now()}.jpg`;

                    // Upload
                    const { error: uploadError } = await supabase.storage
                        .from('images')
                        .upload(fileName, blob, { upsert: true });

                    if (uploadError) {
                        console.error("Avatar upload failed:", uploadError);
                        toast.dismiss(toastId);
                        throw new Error("이미지 업로드 실패");
                    }

                    // Get Public URL
                    const { data: { publicUrl } } = supabase.storage
                        .from('images')
                        .getPublicUrl(fileName);

                    finalAvatarUrl = publicUrl;
                    setEditAvatar(publicUrl); // Update state for UI
                    toast.dismiss(toastId);
                }

                // 2. Firebase Auth Update (Global)
                const updates: { displayName?: string; photoURL?: string } = {
                    displayName: editName,
                    photoURL: finalAvatarUrl
                };

                await updateProfile(currentUser, updates);

                // 3. Save to LocalStorage
                localStorage.setItem(`user_name_${currentUser.uid}`, editName);
                localStorage.setItem(`user_avatar_${currentUser.uid}`, finalAvatarUrl);

                toast.success("프로필이 성공적으로 업데이트되었습니다!");
            } catch (error) {
                console.error("Profile update failed:", error);
                toast.error("프로필 업데이트 실패: 잠시 후 다시 시도해주세요.");
            }
        } else {
            // Fallback for non-auth users (Mock mode) - store locally
            try {
                localStorage.setItem(`user_name_${effectiveTargetId}`, editName);
                localStorage.setItem(`user_avatar_${effectiveTargetId}`, editAvatar);
                toast.success("프로필이 (로컬에) 저장되었습니다.");
            } catch (e) {
                toast.error("저장 실패: 브라우저 용량이 부족합니다.");
            }
        }
        setIsEditingProfile(false);
    };

    const currentUserId = currentUser?.uid || 'anonymous';
    const postUser = { ...selectedUser, bio, name: editName, avatar: editAvatar };

    const handleSaveBio = () => {
        setBio(tempBio);
        localStorage.setItem(`user_bio_${effectiveTargetId}`, tempBio);
        setIsEditingBio(false);
    };

    const handleCancelBio = () => {
        setTempBio(bio);
        setIsEditingBio(false);
    };

    // Interaction Handlers
    const onLikePost = async (post: any) => {
        const isLiked = (post.likedBy || []).includes(currentUserId);
        await toggleLike(post.id, currentUserId, isLiked);
    };

    const onDeletePost = async (postId: string) => {
        if (window.confirm("정말 이 게시글을 삭제하시겠습니까?")) {
            await deletePost(postId);
            toast.success("게시글이 삭제되었습니다.");
        }
    };

    const handleDeleteComment = async (postId: string, commentId: string) => {
        await deleteCommentFromPost(postId, commentId);
        toast.success("댓글이 삭제되었습니다.");
    };

    const onAddComment = async (postId: string, text: string) => {
        const newComment: Comment = {
            id: Date.now().toString(),
            authorId: currentUserId,
            authorName: currentUser?.displayName || '익명',
            content: text,
            createdAt: '방금 전'
        };
        await addCommentToPost(postId, newComment);
    };

    const onRepost = async (post: any) => {
        const isReposted = (post.repostedBy || []).includes(currentUserId);
        await toggleRepost(post.id, currentUserId, isReposted);
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
                {/* Banner Area */}
                <div className="h-32 bg-[#d8b4fe] w-full rounded-2xl border-2 border-[#9333ea] mt-6 relative"></div>

                <div className="px-2 relative">
                    <div className="flex justify-between items-start min-h-[80px]">
                        {/* Avatar - Overlapping Banner */}
                        <div className="-mt-20 ml-4 relative z-10 group/avatar">
                            <div className="rounded-full p-1.5 bg-[#a7f3d0] border-[3px] border-black w-36 h-36 flex items-center justify-center overflow-hidden shadow-sm relative">
                                <Avatar className="w-full h-full bg-transparent rounded-full">
                                    <AvatarImage src={postUser.avatar} className="object-cover w-full h-full" />
                                    <AvatarFallback className="bg-transparent text-4xl font-bold rounded-full">{postUser.name[0]}</AvatarFallback>
                                </Avatar>
                                {isCurrentUser && isEditingProfile && (
                                    <div
                                        className="absolute inset-0 bg-black/40 flex items-center justify-center cursor-pointer"
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        <Camera className="w-8 h-8 text-white" />
                                        <input
                                            type="file"
                                            ref={fileInputRef}
                                            className="hidden"
                                            accept="image/*"
                                            onChange={handleImageChange}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Action Buttons & Stats */}
                        <div className="flex flex-col items-end mt-6 gap-4">
                            <div className="flex gap-3">
                                {!isCurrentUser && (
                                    <Button
                                        onClick={() => setIsFollowing(!isFollowing)}
                                        className={`h-11 px-8 font-black text-lg border-[3px] border-[#ff4d4d] shadow-sm transition-all rounded-xl ${isFollowing
                                            ? 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                                            : 'bg-[#ffb3b3] hover:bg-[#ff9999] text-[#1a1a1a]'
                                            }`}
                                    >
                                        {isFollowing ? 'FOLLOWING' : 'FOLLOW'}
                                    </Button>
                                )}
                                {!isCurrentUser && (
                                    <Button
                                        onClick={() => navigate(`/chat/${userId}`, {
                                            state: {
                                                userName: postUser.name,
                                                userAvatar: postUser.avatar,
                                                userFlag: postUser.flag,
                                                userLocation: postUser.location
                                            }
                                        })}
                                        className="w-11 h-11 p-0 rounded-full border-[3px] border-[#ff4d4d] bg-[#ffb3b3] hover:bg-[#ff9999] text-[#1a1a1a] shadow-sm flex items-center justify-center"
                                    >
                                        <Mail className="w-6 h-6 stroke-[2.5]" />
                                    </Button>
                                )}
                            </div>
                            <div className="flex gap-6 pr-2">
                                <div className="flex items-center gap-1.5">
                                    <span className="font-black text-slate-900 text-base">
                                        {postUser.followers + (isFollowing ? 1 : 0)}
                                    </span>
                                    <span className="font-bold text-slate-600 text-sm">followers</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <span className="font-black text-slate-900 text-base">{postUser.following}</span>
                                    <span className="font-bold text-slate-600 text-sm">following</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* User Info */}
            <div className="mt-6 ml-4 space-y-1">
                {isEditingProfile ? (
                    <div className="flex items-center gap-2">
                        <input
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="text-2xl font-black text-slate-900 border-b-2 border-slate-300 focus:border-blue-500 focus:outline-none bg-transparent w-48"
                        />
                        <button onClick={handleSaveProfile} className="p-1 hover:bg-green-100 rounded-full text-green-600">
                            <Check className="w-5 h-5" />
                        </button>
                    </div>
                ) : (
                    <div className="flex items-center gap-2">
                        <h2 className="text-3xl font-black text-slate-900 tracking-tight">@{postUser.name}</h2>
                        {isCurrentUser && (
                            <button
                                onClick={() => { setIsEditingProfile(true); setEditName(postUser.name); }}
                                className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-full transition-colors"
                            >
                                <Pencil className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                )}
                <p className="text-base text-slate-500 font-bold">{postUser.joinDate}</p>
            </div>

            {/* Languages */}
            <div className="flex flex-wrap gap-10 mt-8 ml-4 text-sm font-black text-slate-900">
                <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4" />
                    <span>STUDYING</span>
                    <div className="flex gap-2">
                        {postUser.studying.map(lang => (
                            <span key={lang} className="text-2xl filter drop-shadow-sm hover:scale-110 transition-transform cursor-default" title={lang}>
                                {LANGUAGE_FLAGS[lang] || '🏳️'}
                            </span>
                        ))}
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4" />
                    <span>NATIVE IN</span>
                    <div className="flex gap-2">
                        {postUser.native.map(lang => (
                            <span key={lang} className="text-2xl filter drop-shadow-sm hover:scale-110 transition-transform cursor-default" title={lang}>
                                {LANGUAGE_FLAGS[lang] || '🏳️'}
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
                            {postUser.bio}
                        </p>
                        {isCurrentUser && (
                            <button
                                onClick={() => {
                                    setTempBio(postUser.bio);
                                    setIsEditingBio(true);
                                }}
                                className="absolute top-2 right-2 p-1.5 bg-white/50 hover:bg-white rounded-full text-pink-600 opacity-0 group-hover:opacity-100 transition-all"
                                title="자기소개 수정"
                            >
                                <Pencil className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </>
                )}
            </div>

            {/* Divider */}
            <div className="border-b border-slate-200"></div>

            {/* User Feed */}
            <div className="space-y-6">
                {userPosts.length === 0 ? (
                    <div className="text-center py-10 text-slate-500">
                        게시물이 없습니다.
                    </div>
                ) : (
                    userPosts.map((post) => (
                        <PostCard
                            key={post.id}
                            {...post}
                            comments={post.comments}
                            onLike={() => onLikePost(post)}
                            onAddComment={(text) => onAddComment(post.id, text)}
                            onDelete={() => onDeletePost(post.id)}
                            onRepost={() => onRepost(post)}
                            isLiked={(post.likedBy || []).includes(currentUserId)}
                            isReposted={(post.repostedBy || []).includes(currentUserId)}
                            // Fix ownership check
                            isOwner={isCurrentUser || post.authorId === currentUserId}
                            onEdit={() => navigate(`/edit-post/${post.id}`)}
                            onClickProfile={() => navigate(`/profile/${post.authorId}`)}
                            user={post.user || { name: 'Unknown', avatar: '', flag: '🏳️', location: 'Unknown' }}
                            currentUserId={currentUserId}
                            onDeleteComment={(commentId) => handleDeleteComment(post.id, commentId)}
                        />
                    ))
                )}
            </div>
        </div>
    </div>;
}
