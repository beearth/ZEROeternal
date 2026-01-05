
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Mail, Globe, Camera, Pencil, Check, X } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from "../../components/ui/avatar";
import { Button } from "../../components/ui/button";
import { PostCard, Comment } from './PostCard';
import { User, updateProfile } from 'firebase/auth';
import { toast } from "../../services/toast";
import { supabase } from '../../supabase';
import {
    getUserProfile, updateUserProfileData, subscribeToUserProfile,
    toggleFollowUser
} from '../../services/userData';
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
    followers: string[];
    following: string[];
    studying: string[];
    native: string[];
    bio: string;
    location: string;
    flag: string;
}

const LANGUAGE_FLAGS: Record<string, string> = {
    'Korean': '🇰🇷', 'English': '🇺🇸', 'Japanese': '🇯🇵', 'Chinese': '🇨🇳',
    'Spanish': '🇪🇸', 'French': '🇫🇷', 'German': '🇩🇪', 'Russian': '🇷🇺', 'Italian': '🇮🇹'
};

export function UserProfilePage({ user: currentUser }: UserProfilePageProps) {
    const { userId } = useParams<{ userId: string }>();
    const navigate = useNavigate();
    const location = useLocation();
    const [isFollowing, setIsFollowing] = useState(false);

    // DEBUG: Check user prop
    useEffect(() => {
        console.log("UserProfilePage: currentUser prop", currentUser);
    }, [currentUser]);

    // Determine if we are viewing the current user's profile
    const isCurrentUser = currentUser && (userId === currentUser.uid || userId === 'current_user');

    // Create a profile object for the current user if available
    const currentUserProfile: UserProfile | undefined = currentUser ? {
        id: currentUser.uid,
        name: currentUser.displayName || 'Anonymous',
        avatar: currentUser.photoURL || '',
        joinDate: `Joined in ${new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`,
        followers: [],
        following: [],
        studying: ['English'],
        native: ['Korean'], // Default or fetch
        bio: '',
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
        avatar: stateUser.userAvatar || stateUser.avatar || '',
        joinDate: 'Signal User',
        followers: [],
        following: [],
        studying: ['English'], // Default for snapshot
        native: ['Korean'],    // Default for snapshot
        bio: '', // Default bio for visited users
        location: stateUser.userLocation || stateUser.location || 'Unknown',
        flag: stateUser.userFlag || stateUser.flag || '🏳️'
    } : undefined;

    // State for fetched profile (for other users)
    const [fetchedProfile, setFetchedProfile] = useState<UserProfile | null>(null);

    // Helper to map codes to names
    const getLangName = (code: string | string[]) => {
        if (Array.isArray(code)) code = code[0];
        const map: Record<string, string> = {
            'ko': 'Korean', 'en': 'English', 'ja': 'Japanese', 'zh': 'Chinese',
            'es': 'Spanish', 'fr': 'French', 'de': 'German', 'ru': 'Russian', 'it': 'Italian'
        };
        return map[code?.toLowerCase()] || code || 'English';
    };

    // Fetch Profile Data (Real-time Sync)
    useEffect(() => {
        const targetId = (userId === 'current_user' && currentUser) ? currentUser.uid : userId;

        if (!targetId) {
            console.log("UserProfilePage: No targetId found");
            return;
        }

        console.log("UserProfilePage: Fetching profile for", targetId);

        // Use Snapshot Listener for Real-Time Updates
        const unsubscribe = subscribeToUserProfile(targetId, (profile) => {
            console.log("UserProfilePage: Fetched profile RAW", JSON.stringify(profile, null, 2));
            if (profile) {
                setFetchedProfile({
                    id: profile.id || targetId,
                    name: profile.name || 'Unknown Name',
                    avatar: profile.avatar || '', 
                    joinDate: profile.joinDate || 'Joined recently',
                    followers: profile.followers || [],
                    following: profile.following || [],
                    studying: profile.targetLang
                        ? (Array.isArray(profile.targetLang) ? profile.targetLang.map(getLangName) : [getLangName(profile.targetLang)])
                        : ['English'],
                    native: profile.nativeLang ? [getLangName(profile.nativeLang)] : ['Korean'],
                    bio: profile.bio || '',
                    location: profile.location || 'Unknown',
                    flag: profile.flag || '🏳️'
                });
            }
        });

        return () => unsubscribe();
    }, [userId, currentUser]);

    // Check if fetched profile is "valid"
    // We trust the fetch result even if name is 'Unknown User', because we need the 'followers' array for logic.
    const isFetchedValid = !!fetchedProfile;

    // Intelligent Selection Logic
    // 1. Fetched Profile (Highest Priority - Real DB Data)
    // 2. Current User (Auth Data - Fast but might be stale on other devices)
    // 3. Snapshot (State - Fast transition)
    let displaySource = isFetchedValid ? fetchedProfile : (isCurrentUser ? currentUserProfile : stateUserProfile);

    // If absolutely nothing exists (direct URL visit to random ID with no fetch result yet), fallback
    if (!displaySource) {
        displaySource = {
            id: userId || 'unknown',
            name: 'User Not Found',
            avatar: '',
            joinDate: 'Joined recently',
            followers: [],
            following: [],
            studying: ['English'],
            native: ['Korean'],
            bio: 'This user profile could not be loaded.',
            location: 'Unknown',
            flag: '🏳️'
        };
    }

    const selectedUser = {
        ...displaySource,
        // Double Safety: Overlay State Data if the chosen source is missing critical fields
        avatar: (displaySource.avatar) ? displaySource.avatar : (stateUserProfile?.avatar || ''),
        flag: (displaySource.flag && displaySource.flag !== '🏳️') ? displaySource.flag : (stateUserProfile?.flag || '🏳️'),
        name: (displaySource.name && displaySource.name !== 'Unknown User') ? displaySource.name : (stateUserProfile?.name || 'Unknown User')
    };

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
    // tempBio is ONLY for the editing textarea.
    const [tempBio, setTempBio] = useState(selectedUser.bio);

    // Profile Editing State - Hoisted
    const [isEditingProfile, setIsEditingProfile] = useState(false);
    const [editName, setEditName] = useState(selectedUser.name);
    const [editAvatar, setEditAvatar] = useState(selectedUser.avatar);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    // Sync state with selectedUser when it changes (e.g. after fetch)
    useEffect(() => {
        if (!isEditingBio) {
            setTempBio(selectedUser.bio);
        }
    }, [selectedUser.bio, isEditingBio]);

    // Sync Follow Status with Real-time Data
    useEffect(() => {
        if (currentUser && selectedUser) {
            // Check if current user is in the target user's followers list
            const following = selectedUser.followers?.includes(currentUser.uid) || false;
            setIsFollowing(following);
        }
    }, [selectedUser, currentUser]);

    useEffect(() => {
        if (!isEditingProfile) {
            setEditName(selectedUser.name);
            setEditAvatar(selectedUser.avatar);
        }
    }, [selectedUser.name, selectedUser.avatar, isEditingProfile]);

    // Cleanup editing state on user switch
    useEffect(() => {
        setIsEditingProfile(false);
        setIsEditingBio(false);
    }, [effectiveTargetId]);


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

                // 3. Save to LocalStorage (Legacy support, but we rely on DB now)
                localStorage.setItem(`user_name_${currentUser.uid}`, editName);
                localStorage.setItem(`user_avatar_${currentUser.uid}`, finalAvatarUrl);

                // 4. [NEW] Save to Firestore (Users Collection) for others to see
                await updateUserProfileData(currentUser.uid, {
                    name: editName,
                    avatar: finalAvatarUrl,
                    location: selectedUser.location,
                    flag: selectedUser.flag
                });

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
    // Use selectedUser directly for display. logic: editing uses 'edit...' state, display uses selectedUser (which is synced via onSnapshot)
    const postUser = {
        ...selectedUser,
        name: isEditingProfile ? editName : selectedUser.name,
        avatar: isEditingProfile ? editAvatar : selectedUser.avatar,
        bio: selectedUser.bio // logic: display strictly from DB/Snapshot
    };

    const handleSaveBio = async () => {
        // [NEW] Save bio to Firestore if current user
        if (isCurrentUser && currentUser) {
            try {
                // Update Firestore - the onSnapshot listener will update the UI automatically
                await updateUserProfileData(currentUser.uid, { bio: tempBio });

                // Also save to localStorage for fallback, but UI is driven by DB
                localStorage.setItem(`user_bio_${effectiveTargetId}`, tempBio);

                toast.success("소개가 업데이트되었습니다.");
            } catch (error) {
                console.error("Failed to update bio:", error);
                toast.error("소개 업데이트 실패");
            }
        } else {
            localStorage.setItem(`user_bio_${effectiveTargetId}`, tempBio);
            toast.success("소개가 (로컬에) 저장되었습니다.");
        }
        setIsEditingBio(false);
    };

    const handleCancelBio = () => {
        setTempBio(selectedUser.bio);
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


    return <div className="flex-1 flex flex-col h-full bg-[#09090b] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-[#09090b]/80 backdrop-blur-md border-b border-zinc-800">
            <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
                <button
                    onClick={() => navigate(-1)}
                    className="p-2 hover:bg-zinc-800 rounded-full transition-colors"
                >
                    <ArrowLeft className="w-5 h-5 text-zinc-400" />
                </button>
                <h1 className="text-lg font-bold text-white">프로필</h1>
            </div>
        </div>

        <div className="p-4 max-w-3xl mx-auto w-full space-y-6">
            {/* Profile Card */}
            <div className="bg-zinc-800 rounded-[32px] overflow-hidden shadow-sm border border-zinc-700 p-6 pt-0 relative">
                {/* Banner Area */}
                <div className="h-32 bg-gradient-to-r from-purple-600 to-blue-600 w-full rounded-2xl border-2 border-purple-500 mt-6 relative"></div>

                <div className="px-2 relative">
                    <div className="flex justify-between items-start min-h-[80px]">
                        {/* Avatar - Overlapping Banner */}
                        <div className="-mt-20 ml-4 relative z-10 group/avatar">
                            <div className="rounded-full p-1.5 bg-zinc-700 border-[3px] border-zinc-600 w-36 h-36 flex items-center justify-center overflow-hidden shadow-sm relative">
                                <Avatar className="w-full h-full bg-transparent rounded-full">
                                    <AvatarImage src={postUser.avatar} className="object-cover w-full h-full" />
                                    <AvatarFallback className="bg-transparent text-4xl font-bold rounded-full text-white">{postUser.name?.[0] || 'U'}</AvatarFallback>
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
                                        onClick={async () => {
                                            if (!currentUser) {
                                                console.error("Follow failed: No currentUser");
                                                toast.error("로그인이 필요합니다.");
                                                return;
                                            }
                                            console.log(`Attempting follow/unfollow. Current: ${currentUser.uid}, Target: ${effectiveTargetId}`);
                                            
                                            // Optimistic Update
                                            const newStatus = !isFollowing;
                                            setIsFollowing(newStatus);
                                            try {
                                                await toggleFollowUser(currentUser.uid, effectiveTargetId);
                                                // Success: The onSnapshot listener will eventually confirm this
                                            } catch (error: any) {
                                                console.error("Follow failed", error);
                                                // Revert on error
                                                setIsFollowing(!newStatus);
                                                toast.error(`팔로우 실패: ${error.message || "알 수 없는 오류"}`);
                                            }
                                        }}
                                        className={`h-11 px-8 font-black text-lg border-[3px] border-blue-500 shadow-sm transition-all rounded-xl ${isFollowing
                                            ? 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'
                                            : 'bg-blue-600 hover:bg-blue-700 text-white'
                                            }`}
                                    >
                                        {isFollowing ? 'FOLLOWING' : 'FOLLOW'}
                                    </Button>
                                )}
                                {!isCurrentUser && (
                                    <Button
                                        onClick={() => {
                                            console.log("Chat button clicked, navigating to:", `/dm/${userId}`);
                                            navigate(`/dm/${userId}`, {
                                                state: {
                                                    userName: postUser.name,
                                                    userAvatar: postUser.avatar,
                                                    userFlag: postUser.flag,
                                                    userLocation: postUser.location
                                                }
                                            });
                                        }}
                                        className="w-11 h-11 p-0 rounded-full border-[3px] border-blue-500 bg-blue-600 hover:bg-blue-700 text-white shadow-sm flex items-center justify-center"
                                    >
                                        <Mail className="w-6 h-6 stroke-[2.5]" />
                                    </Button>
                                )}
                            </div>
                            <div className="flex gap-6 pr-2">
                                <div className="flex items-center gap-1.5">
                                    <span className="font-black text-white text-base">
                                        {postUser.followers ? postUser.followers.length : 0}
                                    </span>
                                    <span className="font-bold text-zinc-400 text-sm">followers</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <span className="font-black text-white text-base">{postUser.following ? postUser.following.length : 0}</span>
                                    <span className="font-bold text-zinc-400 text-sm">following</span>
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
                            className="text-2xl font-black text-white border-b-2 border-zinc-600 focus:border-blue-500 focus:outline-none bg-transparent w-48"
                        />
                        <button onClick={handleSaveProfile} className="p-1 hover:bg-green-900/30 rounded-full text-green-500">
                            <Check className="w-5 h-5" />
                        </button>
                    </div>
                ) : (
                    <div className="flex items-center gap-2">
                        <h2 className="text-3xl font-black text-white tracking-tight">@{postUser.name || 'Unknown User'}</h2>
                        {isCurrentUser && (
                            <button
                                onClick={() => { setIsEditingProfile(true); setEditName(postUser.name); }}
                                className="p-1.5 text-zinc-500 hover:text-blue-400 hover:bg-blue-500/10 rounded-full transition-colors"
                            >
                                <Pencil className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                )}
                <p className="text-base text-zinc-500 font-bold">{postUser.joinDate}</p>
            </div>

            {/* Languages */}
            <div className="flex flex-wrap gap-10 mt-8 ml-4 text-sm font-black text-white">
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
            <div className="bg-zinc-800 rounded-xl p-4 border-2 border-zinc-700 shadow-sm relative group">
                {isEditingBio ? (
                    <div className="space-y-3">
                        <textarea
                            value={tempBio}
                            onChange={(e) => setTempBio(e.target.value)}
                            className="w-full bg-zinc-900 rounded-lg p-3 text-sm text-zinc-200 border border-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px] resize-none"
                            placeholder="자기소개를 입력해주세요..."
                            autoFocus
                        />
                        <div className="flex justify-end gap-2">
                            <button
                                onClick={handleCancelBio}
                                className="px-3 py-1.5 text-xs font-bold bg-zinc-700 text-zinc-300 rounded-lg border border-zinc-600 hover:bg-zinc-600"
                            >
                                취소
                            </button>
                            <button
                                onClick={handleSaveBio}
                                className="px-3 py-1.5 text-xs font-bold bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                            >
                                저장
                            </button>
                        </div>
                    </div>
                ) : (
                    <>
                        <p className={`text-sm leading-relaxed font-medium whitespace-pre-wrap ${!postUser.bio ? 'text-zinc-600' : 'text-zinc-200'}`}>
                            {postUser.bio || "자기소개를 입력하세요"}
                        </p>
                        {isCurrentUser && (
                            <button
                                onClick={() => {
                                    setTempBio(postUser.bio);
                                    setIsEditingBio(true);
                                }}
                                className="absolute top-2 right-2 p-1.5 bg-zinc-700/50 hover:bg-zinc-600 rounded-full text-zinc-400 opacity-0 group-hover:opacity-100 transition-all"
                            >
                                <Pencil className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </>
                )}
            </div>

            {/* Divider */}
            <div className="border-b border-zinc-800"></div>

            {/* User Feed */}
            <div className="space-y-6">
                {userPosts.length === 0 ? (
                    <div className="text-center py-10 text-zinc-500">
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
