import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../components/ui/dialog";

export interface PostFormData {
    title: string;
    image: string;
    content: string;
}

interface CreatePostModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: PostFormData) => void;
    initialData?: PostFormData;
    isEditing?: boolean;
}

export function CreatePostModal({ isOpen, onClose, onSubmit, initialData, isEditing = false }: CreatePostModalProps) {
    const [title, setTitle] = useState('');
    const [imageUrl, setImageUrl] = useState('');
    const [content, setContent] = useState('');

    useEffect(() => {
        if (initialData) {
            setTitle(initialData.title || '');
            setImageUrl(initialData.image);
            setContent(initialData.content);
        } else {
            setTitle('');
            setImageUrl('');
            setContent('');
        }
    }, [initialData, isOpen]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Allow image to be empty if only text post is desired (or keep it required if strictly Instagram-like, but user said "Threads" which allows text-only)
        // User's previous CreatePostPage code allowed empty image but forced content.
        // Here, the checks were strict on image. I'll relax image check if content exists, or keep it strict if that was the design.
        // Actually, user just complained about Title. I will keep Image required ONLY IF it was key. 
        // But seeing "Threads" comparison, text-only is common.
        // For now, I will stick to removing Title requirement.

        if (!content.trim()) return;

        // Auto-generate title for backend compatibility
        const generatedTitle = content.trim().slice(0, 30) + (content.length > 30 ? '...' : '');

        onSubmit({
            title: title || generatedTitle, // Use existing title if editing, or generate
            image: imageUrl,
            content: content
        });

        // Reset form
        setTitle('');
        setImageUrl('');
        setContent('');
        onClose();
    };

    const handleClose = () => {
        setTitle('');
        setImageUrl('');
        setContent('');
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-xl">{isEditing ? '게시글 수정' : '새 게시글 작성'}</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                    {/* Title Field Removed as per user request (Threads styling) */}

                    {/* Image URL Field */}
                    <div className="space-y-2">
                        <label htmlFor="imageUrl" className="text-sm font-medium text-slate-700">
                            사진 추가 (URL) *
                        </label>
                        <Input
                            id="imageUrl"
                            type="url"
                            value={imageUrl}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setImageUrl(e.target.value)}
                            placeholder="https://example.com/image.jpg"
                            className="w-full"
                            required
                        />
                        <p className="text-xs text-slate-500">이미지 URL을 입력하세요 (예: Unsplash, Imgur)</p>
                    </div>

                    {/* Image Preview */}
                    {imageUrl && (
                        <div className="rounded-lg overflow-hidden border border-slate-200 bg-slate-50">
                            <img
                                src={imageUrl}
                                alt="Preview"
                                className="w-full h-64 object-cover"
                                onError={(e) => {
                                    e.currentTarget.src = 'https://via.placeholder.com/600x400?text=이미지를+불러올+수+없습니다';
                                }}
                            />
                        </div>
                    )}

                    {/* Content Field */}
                    <div className="space-y-2">
                        <label htmlFor="content" className="text-sm font-medium text-slate-700">
                            게시글 내용 *
                        </label>
                        <Textarea
                            id="content"
                            value={content}
                            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setContent(e.target.value)}
                            placeholder="게시글 내용을 입력하세요...&#10;&#10;여러 줄로 작성할 수 있습니다."
                            className="w-full min-h-[150px] resize-none"
                            required
                        />
                    </div>

                    {/* Buttons */}
                    <div className="flex gap-2 justify-end pt-4 border-t">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleClose}
                        >
                            취소
                        </Button>
                        <Button
                            type="submit"
                            className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                            disabled={!imageUrl.trim() || !content.trim()}
                        >
                            {isEditing ? '수정 완료' : '게시글 작성'}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
