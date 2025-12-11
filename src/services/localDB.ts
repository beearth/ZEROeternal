const DB_NAME = 'SignalVocaDB';
const STORE_NAME = 'posts';
const DB_VERSION = 1;

export interface Post {
    id: string;
    userId: string;
    likeCount: number;
    repostCount: number;
    comments: any[];
    isLiked: boolean;
    isReposted: boolean;
    createdAt: string;
    // ... other fields from your PostCardProps
    user: {
        name: string;
        avatar: string;
        location: string;
        flag: string;
        targetLang?: string;
    };
    title?: string;
    image: string; // Base64 string
    content: string;
    timeAgo: string; // This is usually calculated, but storage might save raw timestamp
}

export const initDB = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = (event) => {
            console.error("IndexedDB error:", event);
            reject("IndexedDB failed to open");
        };

        request.onsuccess = (event) => {
            resolve((event.target as IDBOpenDBRequest).result);
        };

        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'id' });
            }
        };
    });
};

export const savePost = async (post: any): Promise<void> => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.add(post); // Use put to update/insert, add for insert

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
};

export const getAllPosts = async (): Promise<any[]> => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();

        request.onsuccess = () => {
            // Sort by createdAt desc if possible, currently just returning all
            const posts = request.result;
            // Manual sort by createdAt descending (newest first)
            posts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            resolve(posts);
        };
        request.onerror = () => reject(request.error);
    });
};

export const clearPosts = async (): Promise<void> => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
};

export const saveAllPosts = async (posts: any[]): Promise<void> => {
    await clearPosts();
    const db = await initDB();
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    // Promise.all is not ideal for transactions, better to do sequential or just fire and wait for completion
    return new Promise((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);

        posts.forEach(post => {
            store.add(post);
        });
    });
};
