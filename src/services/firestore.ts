import { db } from '../firebase';
import { 
    collection, 
    addDoc, 
    query, 
    orderBy, 
    onSnapshot, 
    serverTimestamp, 
    deleteDoc, 
    doc, 
    updateDoc,
    arrayUnion,
    arrayRemove,
    getDoc,
    Timestamp,
    getDocs
} from "firebase/firestore";

// Type definition matching our Firestore structure
export interface Post {
    id?: string;
    authorId: string;
    content: string;
    image?: string;
    user: {
        name: string;
        avatar: string;
        location: string;
        flag: string;
        targetLang?: string;
    };
    likes: number;
    reposts: number;
    likedBy: string[];
    repostedBy: string[];
    comments: any[];
    createdAt?: any;
}

// Alias for backward compatibility
export type FirestorePost = Post;

const COLLECTION_NAME = 'posts';

// 1. Create Post
export const createPost = async (postData: any, imageFileOrBase64?: File | string) => {
    try {
        // Note: For now, we use the imageUrl directly as passed in postData.image
        // Storage upload logic can be added later if needed via firebase/storage
        
        const docRef = await addDoc(collection(db, COLLECTION_NAME), {
            authorId: postData.authorId,
            content: postData.content,
            image: postData.image || '',
            user: postData.user,
            likes: 0,
            reposts: 0,
            likedBy: [],
            repostedBy: [],
            comments: [],
            createdAt: serverTimestamp()
        });
        
        console.log("Post created in Firestore with ID:", docRef.id);
        return docRef.id;
    } catch (error) {
        console.error("Error creating post (Firestore):", error);
        throw error;
    }
};

// 2. Real-time Subscription
export const subscribeToPosts = (callback: (posts: any[]) => void) => {
    const q = query(
        collection(db, COLLECTION_NAME),
        orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
        const posts = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                authorId: data.authorId,
                content: data.content,
                image: data.image,
                user: data.user,
                likes: data.likes || 0,
                reposts: data.reposts || 0,
                likedBy: data.likedBy || [],
                repostedBy: data.repostedBy || [],
                comments: data.comments || [],
                createdAt: data.createdAt instanceof Timestamp 
                    ? data.createdAt.toDate().toISOString() 
                    : new Date().toISOString()
            };
        });
        callback(posts);
    }, (error) => {
        console.error("Firestore subscription error:", error);
        // Fallback for missing index error
        if (error.message.includes("index")) {
            console.warn("Firestore index missing. Retrying without orderBy.");
            const fallbackQ = query(collection(db, COLLECTION_NAME));
            onSnapshot(fallbackQ, (snapshot) => {
                const posts = snapshot.docs.map(doc => {
                    const data = doc.data();
                    return {
                        id: doc.id,
                        ...data,
                        createdAt: data.createdAt instanceof Timestamp 
                            ? data.createdAt.toDate().toISOString() 
                            : new Date().toISOString()
                    } as any;
                });
                callback(posts);
            });
        }
    });

    return unsubscribe;
};

// 3. Delete Post
export const deletePost = async (postId: string) => {
    await deleteDoc(doc(db, COLLECTION_NAME, postId));
};

// 4. Toggle Like
export const toggleLike = async (postId: string, userId: string, isLiked: boolean) => {
    const postRef = doc(db, COLLECTION_NAME, postId);
    
    if (isLiked) {
        // Unlike
        await updateDoc(postRef, {
            likedBy: arrayRemove(userId),
            likes: (await getDoc(postRef)).data()?.likes - 1 || 0
        });
    } else {
        // Like
        await updateDoc(postRef, {
            likedBy: arrayUnion(userId),
            likes: (await getDoc(postRef)).data()?.likes + 1 || 1
        });
    }
};

// 5. Add Comment
export const addCommentToPost = async (postId: string, comment: any) => {
    const postRef = doc(db, COLLECTION_NAME, postId);
    await updateDoc(postRef, {
        comments: arrayUnion(comment)
    });
};

// 6. Toggle Repost
export const toggleRepost = async (postId: string, userId: string, isReposted: boolean) => {
    const postRef = doc(db, COLLECTION_NAME, postId);
    
    if (isReposted) {
        await updateDoc(postRef, {
            repostedBy: arrayRemove(userId),
            reposts: (await getDoc(postRef)).data()?.reposts - 1 || 0
        });
    } else {
        await updateDoc(postRef, {
            repostedBy: arrayUnion(userId),
            reposts: (await getDoc(postRef)).data()?.reposts + 1 || 1
        });
    }
};

// 7. Delete Comment
export const deleteCommentFromPost = async (postId: string, commentId: string) => {
    const postRef = doc(db, COLLECTION_NAME, postId);
    const postDoc = await getDoc(postRef);
    if (!postDoc.exists()) return;

    const comments = postDoc.data().comments || [];
    const updatedComments = comments.filter((c: any) => c.id !== commentId);

    await updateDoc(postRef, {
        comments: updatedComments
    });
};
