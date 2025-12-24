import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Upload, Image as ImageIcon } from 'lucide-react';
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";

import { User } from 'firebase/auth';
import { toast } from "../../services/toast";
import { createPost } from '../../services/firestore';

export interface CreatePostPageProps {
    onSubmit: (data: { title: string; image: string; content: string }) => void;
    user: User | null;
}

export function CreatePostPage({ onSubmit, user }: CreatePostPageProps) {
    const navigate = useNavigate();
    const [title, setTitle] = useState('');
    const [imageUrl, setImageUrl] = useState('');
    const [content, setContent] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        console.log('Submitting post...', { content, user });
        if (!content.trim()) {
            console.log('Content missing');
            return;
        }

        // Auto-generate title from content
        const generatedTitle = content.length > 20 ? content.substring(0, 20) + "..." : content;

        // Show loading state
        const loadingToast = toast.loading("게시글을 업로드하고 있습니다...");

        try {
            // Resolve User Info
            const currentUid = user?.uid || 'anonymous';
            if (currentUid === 'anonymous') {
                // Warn if likely to fail permissions
                console.warn("User is anonymous. Write might fail if Firestore rules require auth.");
            }

            const localName = localStorage.getItem(`user_name_${currentUid}`);
            const localAvatar = localStorage.getItem(`user_avatar_${currentUid}`);
            const avatarToSave = (localAvatar && localAvatar.length > 200)
                ? "stored_locally"
                : (localAvatar || user?.photoURL || "https://github.com/shadcn.png");

            const postData = {
                authorId: currentUid,
                content: content,
                user: {
                    name: localName || user?.displayName || "Anonymous",
                    avatar: avatarToSave,
                    location: "Korea, Seoul",
                    flag: "🇰🇷",
                    targetLang: "EN"
                },
                image: imageUrl
            };

            // Save to Firestore (Uploads image if needed)
            await createPost(postData, imageUrl);

            // Call onSubmit callback
            onSubmit({
                title: generatedTitle,
                image: imageUrl,
                content: content
            });

            toast.dismiss(loadingToast);
            toast.success("게시글이 퍼블릭 커뮤니티에 공유되었습니다!");

            // Reset and navigate back
            setTitle('');
            setImageUrl('');
            setContent('');
            navigate('/community');
        } catch (error: any) {
            console.error("게시글 저장 실패:", error);
            toast.dismiss(loadingToast);
            toast.error(`업로드 실패: ${error.message}`);
            // Explicit Alert for the user to see the exact error
            alert(`게시글 업로드 중 오류가 발생했습니다.\n\n원인: ${error.message}\n\nFirebase 설정이나 권한을 확인해주세요.`);
        }
    };

    const handleCancel = () => {
        setTitle('');
        setImageUrl('');
        setContent('');
        navigate('/community');
    };

    return (
        <div className="flex-1 h-full bg-white flex flex-col">
            {/* Header */}
            {/* Header */}
            <div className="border-b border-slate-200">
                <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleCancel}
                            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5 text-slate-600" />
                        </button>
                        <h1 className="text-xl font-bold text-slate-900">새 게시글 작성</h1>
                    </div>

                    <Button
                        onClick={handleSubmit}
                        disabled={!content.trim()}
                        className={`bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 ${(!content.trim()) ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        게시하기
                    </Button>
                </div>
            </div>

            {/* Form Content */}
            <div className="flex-1 overflow-y-auto">
                <form onSubmit={handleSubmit} className="max-w-3xl mx-auto p-6 space-y-6">
                    {/* Title Input Removed - Auto-generated from content */}

                    {/* Image URL or File Upload */}
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                            <ImageIcon className="w-4 h-4" />
                            사진 추가
                        </label>

                        {/* Tab-like buttons for choosing method */}
                        <div className="flex gap-2 mb-2">
                            <button
                                type="button"
                                onClick={() => setImageUrl('')}
                                className={`flex-1 px-4 py-2 text-sm rounded-lg border transition-colors ${!imageUrl || imageUrl.startsWith('data:')
                                    ? 'bg-blue-50 border-blue-500 text-blue-700'
                                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                                    }`}
                            >
                                파일 업로드
                            </button>
                            <button
                                type="button"
                                onClick={() => setImageUrl('')}
                                className={`flex-1 px-4 py-2 text-sm rounded-lg border transition-colors ${imageUrl && !imageUrl.startsWith('data:')
                                    ? 'bg-blue-50 border-blue-500 text-blue-700'
                                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                                    }`}
                            >
                                URL 입력
                            </button>
                        </div>

                        {/* File Upload */}
                        {(!imageUrl || imageUrl.startsWith('data:')) && (
                            <div className="space-y-2">
                                <div className="flex items-center justify-center w-full">
                                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-slate-300 border-dashed rounded-lg cursor-pointer bg-slate-50 hover:bg-slate-100 transition-colors">
                                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                            <Upload className="w-8 h-8 mb-2 text-slate-500" />
                                            <p className="mb-2 text-sm text-slate-500">
                                                <span className="font-semibold">클릭하여 업로드</span> 또는 드래그 앤 드롭
                                            </p>
                                            <p className="text-xs text-slate-500">PNG, JPG, GIF (최대 5MB)</p>
                                        </div>
                                        <input
                                            type="file"
                                            className="hidden"
                                            accept="image/*"
                                            onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (file) {
                                                    if (file.size > 5 * 1024 * 1024) {
                                                        alert('파일 크기는 5MB 이하여야 합니다.');
                                                        return;
                                                    }
                                                    const reader = new FileReader();
                                                    reader.onloadend = () => {
                                                        setImageUrl(reader.result as string);
                                                    };
                                                    reader.readAsDataURL(file);
                                                }
                                            }}
                                        />
                                    </label>
                                </div>
                            </div>
                        )}

                        {/* URL Input */}
                        {imageUrl && !imageUrl.startsWith('data:') && (
                            <div className="space-y-2">
                                <Input
                                    id="imageUrl"
                                    type="url"
                                    value={imageUrl}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setImageUrl(e.target.value)}
                                    placeholder="https://images.unsplash.com/..."
                                />
                                <p className="text-xs text-slate-500">
                                    이미지 URL을 입력하세요 (Unsplash, Imgur 등)
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Image Preview */}
                    {imageUrl && (
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-700">미리보기</label>
                            <div className="rounded-lg overflow-hidden border border-slate-200 bg-slate-50">
                                <img
                                    src={imageUrl}
                                    alt="Preview"
                                    className="w-full h-96 object-cover"
                                    onError={(e) => {
                                        e.currentTarget.src = 'https://via.placeholder.com/800x600?text=이미지를+불러올+수+없습니다';
                                    }}
                                />
                            </div>
                        </div>
                    )}

                    {/* Content */}
                    <div className="space-y-2">
                        <label htmlFor="content" className="text-sm font-semibold text-slate-700">
                            게시글 내용 *
                        </label>
                        <Textarea
                            id="content"
                            value={content}
                            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setContent(e.target.value)}
                            placeholder="게시글 내용을 입력하세요...&#10;&#10;여러 줄로 작성할 수 있습니다."
                            className="min-h-[200px] resize-none text-slate-900"
                            required
                        />
                        <p className="text-xs text-slate-500">
                            {content.length} 자
                        </p>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3 pt-4 border-t">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleCancel}
                            className="flex-1"
                        >
                            취소
                        </Button>
                        <Button
                            type="submit"
                            className={`flex-1 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 ${(!content.trim()) ? 'opacity-50 cursor-not-allowed' : ''}`}
                            disabled={!content.trim()}
                        >
                            게시하기
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
