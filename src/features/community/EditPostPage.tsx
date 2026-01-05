import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Image as ImageIcon, Upload } from 'lucide-react';
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";

export function EditPostPage() {
    const navigate = useNavigate();
    const { postId } = useParams<{ postId: string }>();
    const [title, setTitle] = useState('');
    const [imageUrl, setImageUrl] = useState('');
    const [content, setContent] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Load post data from localStorage
        const savedPosts = localStorage.getItem('communityPosts');
        if (savedPosts && postId) {
            const posts = JSON.parse(savedPosts);
            const post = posts.find((p: any) => p.id === postId);
            if (post) {
                setTitle(post.title || '');
                setImageUrl(post.image || '');
                setContent(post.content || '');
            }
        }
        setLoading(false);
    }, [postId]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim() || !imageUrl.trim() || !content.trim()) return;

        // Load existing posts
        const savedPosts = localStorage.getItem('communityPosts');
        if (savedPosts && postId) {
            const posts = JSON.parse(savedPosts);
            const updatedPosts = posts.map((post: any) =>
                post.id === postId
                    ? { ...post, title, image: imageUrl, content }
                    : post
            );

            // Save to localStorage
            localStorage.setItem('communityPosts', JSON.stringify(updatedPosts));
        }

        // Navigate back
        navigate('/community');
    };

    const handleCancel = () => {
        navigate('/community');
    };

    if (loading) {
        return <div className="flex items-center justify-center h-full">로딩 중...</div>;
    }

    return (
        <div className="flex-1 h-full bg-[#09090b] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-4 border-b border-zinc-800">
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleCancel}
                        className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5 text-zinc-400" />
                    </button>
                    <h1 className="text-xl font-bold text-white">게시글 수정</h1>
                </div>

                <Button
                    onClick={handleSubmit}
                    disabled={!title.trim() || !imageUrl.trim() || !content.trim()}
                    className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                >
                    수정 완료
                </Button>
            </div>

            {/* Form Content */}
            <div className="flex-1 overflow-y-auto">
                <form onSubmit={handleSubmit} className="max-w-3xl mx-auto p-6 space-y-6">
                    {/* Title */}
                    <div className="space-y-2">
                        <label htmlFor="title" className="text-sm font-semibold text-zinc-300">
                            제목 *
                        </label>
                        <Input
                            id="title"
                            type="text"
                            value={title}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)}
                            placeholder="게시글 제목을 입력하세요"
                            className="text-lg bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
                            required
                        />
                    </div>

                    {/* Image URL */}
                    <div className="space-y-2">
                        <label htmlFor="imageUrl" className="text-sm font-semibold text-zinc-300 flex items-center gap-2">
                            <ImageIcon className="w-4 h-4" />
                            사진 *
                        </label>

                        {/* File Upload or URL */}
                        <div className="space-y-2">
                            <Input
                                id="imageUrl"
                                type="text"
                                value={imageUrl}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setImageUrl(e.target.value)}
                                placeholder="이미지 URL을 입력하거나 파일을 업로드하세요"
                                className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
                            />

                            {/* File Upload Button */}
                            <div className="flex items-center gap-2">
                                <label className="cursor-pointer">
                                    <div className="flex items-center gap-2 px-4 py-2 border border-zinc-700 rounded-md hover:bg-zinc-800 transition-colors text-zinc-300">
                                        <Upload className="w-4 h-4" />
                                        <span className="text-sm">파일 업로드</span>
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
                    </div>

                    {/* Image Preview */}
                    {imageUrl && (
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-zinc-300">미리보기</label>
                            <div className="rounded-lg overflow-hidden border border-zinc-700 bg-zinc-800">
                                <img
                                    src={imageUrl}
                                    alt="Preview"
                                    className="w-full h-96 object-cover"
                                    onError={(e) => {
                                        // Placeholder removed
                                        e.currentTarget.style.display = 'none';
                                    }}
                                />
                            </div>
                        </div>
                    )}

                    {/* Content */}
                    <div className="space-y-2">
                        <label htmlFor="content" className="text-sm font-semibold text-zinc-300">
                            게시글 내용 *
                        </label>
                        <Textarea
                            id="content"
                            value={content}
                            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setContent(e.target.value)}
                            placeholder="게시글 내용을 입력하세요..."
                            className="min-h-[200px] resize-none bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
                            required
                        />
                        <p className="text-xs text-zinc-500">
                            {content.length} 자
                        </p>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3 pt-4 border-t border-zinc-800">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleCancel}
                            className="flex-1 border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                        >
                            취소
                        </Button>
                        <Button
                            type="submit"
                            className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                            disabled={!title.trim() || !imageUrl.trim() || !content.trim()}
                        >
                            수정 완료
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
