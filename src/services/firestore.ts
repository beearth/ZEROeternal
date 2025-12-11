import { supabase } from '../supabase';

// Type definition matching our Supabase table structure
export interface Post {
    id?: string;
    author_id: string;
    content: string;
    image_url?: string;
    user_info: {
        name: string;
        avatar: string;
        location: string;
        flag: string;
        targetLang?: string;
    };
    likes_count: number;
    reposts_count: number;
    liked_by: string[];
    reposted_by: string[];
    comments: any[];
    created_at?: string;
}

// Alias for backward compatibility
export type FirestorePost = Post;

// 1. Create Post (with seamless Image Upload)
export const createPost = async (postData: any, imageFileOrBase64?: File | string) => {
    try {
        let finalImageUrl = '';

        // Handle Image Upload
        if (imageFileOrBase64 instanceof File) {
            // Unique file name
            const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}`;
            const filePath = `posts/${fileName}`;

            // Upload to Supabase Storage ('images' bucket)
            const { data, error } = await supabase.storage
                .from('images')
                .upload(filePath, imageFileOrBase64);

            if (error) throw error;

            // Get Public URL
            const { data: { publicUrl } } = supabase.storage
                .from('images')
                .getPublicUrl(filePath);

            finalImageUrl = publicUrl;

        } else if (typeof imageFileOrBase64 === 'string' && imageFileOrBase64.startsWith('data:')) {
            // If base64 comes in (rare in Supabase, but handle it), upload as file
            // Convert Base64 to Blob
            const res = await fetch(imageFileOrBase64);
            const blob = await res.blob();
            const fileName = `${Date.now()}_base64.jpg`;

            const { error } = await supabase.storage
                .from('images')
                .upload(`posts/${fileName}`, blob);

            if (error) throw error;

            const { data: { publicUrl } } = supabase.storage
                .from('images')
                .getPublicUrl(`posts/${fileName}`);

            finalImageUrl = publicUrl;
        } else if (postData.image && postData.image.startsWith('http')) {
            finalImageUrl = postData.image;
        }

        // Insert into DB
        const { error: dbError } = await supabase
            .from('posts')
            .insert({
                author_id: postData.authorId,
                content: postData.content,
                image_url: finalImageUrl,
                user_info: postData.user, // Store JSON
                likes_count: 0,
                reposts_count: 0,
                liked_by: [],
                reposted_by: [],
                comments: []
            });

        if (dbError) throw dbError;
        console.log("Post created in Supabase!");

    } catch (error) {
        console.error("Error creating post (Supabase):", error);
        throw error;
    }
};

// 2. Real-time Subscription
export const subscribeToPosts = (callback: (posts: any[]) => void) => {
    // 1. Initial Fetch
    const fetchPosts = async () => {
        const { data, error } = await supabase
            .from('posts')
            .select('*')
            .order('created_at', { ascending: false });

        if (data) {
            const formattedPosts = data.map(formatPostForUI);
            callback(formattedPosts);
        }
    };

    fetchPosts();

    // 2. Real-time Listener (Postgres Changes)
    const channel = supabase
        .channel('public:posts')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, (payload) => {
            console.log('Change received!', payload);
            fetchPosts(); // Simply re-fetch for simplicity (MVP)
        })
        .subscribe();

    return () => {
        supabase.removeChannel(channel);
    };
};

// Helper to format Supabase DB row to UI Post object
const formatPostForUI = (row: any) => ({
    id: row.id,
    authorId: row.author_id,
    content: row.content,
    image: row.image_url, // Changed from imageUrl to image
    user: row.user_info,
    likes: row.likes_count,
    reposts: row.reposts_count,
    likedBy: row.liked_by || [],
    repostedBy: row.reposted_by || [],
    comments: row.comments || [],
    createdAt: row.created_at
});

// 3. Delete Post
export const deletePost = async (postId: string) => {
    const { error } = await supabase.from('posts').delete().eq('id', postId);
    if (error) throw error;
};

// 4. Toggle Like
export const toggleLike = async (postId: string, userId: string, isLiked: boolean) => {
    // We need to fetch current array first or use a Postgres function
    // For MVP, simple fetch-update strategy (Optimistic UI handled in component)

    // Actually, let's just use RPC or simple update if we can
    // Supabase doesn't have array_union/remove seamlessly in JS client without raw SQL call often
    // Let's do: Fetch -> Modify -> Update

    const { data: post } = await supabase.from('posts').select('liked_by, likes_count').eq('id', postId).single();
    if (!post) return;

    let newLikedBy = post.liked_by || [];
    let newCount = post.likes_count;

    if (isLiked) {
        // Unlike
        newLikedBy = newLikedBy.filter((id: string) => id !== userId);
        newCount = Math.max(0, newCount - 1);
    } else {
        // Like
        if (!newLikedBy.includes(userId)) {
            newLikedBy.push(userId);
            newCount++;
        }
    }

    await supabase
        .from('posts')
        .update({ liked_by: newLikedBy, likes_count: newCount })
        .eq('id', postId);
};

// 5. Add Comment
export const addCommentToPost = async (postId: string, comment: any) => {
    const { data: post } = await supabase.from('posts').select('comments').eq('id', postId).single();
    if (!post) return;

    const newComments = [...(post.comments || []), comment];

    await supabase
        .from('posts')
        .update({ comments: newComments })
        .eq('id', postId);
};

// 6. Toggle Repost
export const toggleRepost = async (postId: string, userId: string, isReposted: boolean) => {
    const { data: post } = await supabase.from('posts').select('reposted_by, reposts_count').eq('id', postId).single();
    if (!post) return;

    let newRepostedBy = post.reposted_by || [];
    let newCount = post.reposts_count;

    if (isReposted) {
        newRepostedBy = newRepostedBy.filter((id: string) => id !== userId);
        newCount = Math.max(0, newCount - 1);
    } else {
        if (!newRepostedBy.includes(userId)) {
            newRepostedBy.push(userId);
            newCount++;
        }
    }

    await supabase
        .from('posts')
        .update({ reposted_by: newRepostedBy, reposts_count: newCount })
        .eq('id', postId);
};

// 7. Delete Comment
export const deleteCommentFromPost = async (postId: string, commentId: string) => {
    const { data: post } = await supabase.from('posts').select('comments').eq('id', postId).single();
    if (!post) return;

    const newComments = (post.comments || []).filter((c: any) => c.id !== commentId);

    await supabase
        .from('posts')
        .update({ comments: newComments })
        .eq('id', postId);
};
