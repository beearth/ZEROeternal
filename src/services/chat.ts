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
    limit,
    Timestamp
} from "firebase/firestore";

export interface Message {
    id: string;
    content: string;
    translated_text: string;
    sender_id: string;
    sender_name: string;
    sender_avatar?: string;
    created_at: string;
    original_lang: string;
    target_lang: string;
}

const COLLECTION_NAME = 'global_messages';

export const sendMessage = async (
    text: string,
    translatedText: string,
    user: any,
    originalLang: string,
    targetLang: string
) => {
    await addDoc(collection(db, COLLECTION_NAME), {
        content: text,
        translated_text: translatedText,
        sender_id: user.uid,
        sender_name: user.displayName || 'Anonymous',
        sender_avatar: (user.photoURL || null) as any,
        original_lang: originalLang,
        target_lang: targetLang,
        created_at: serverTimestamp()
    });
};

export const deleteMessage = async (messageId: string) => {
    await deleteDoc(doc(db, COLLECTION_NAME, messageId));
};

export const subscribeToMessages = (callback: (messages: any[]) => void) => {
    // Try to use orderBy first
    const qWithOrder = query(
        collection(db, COLLECTION_NAME),
        orderBy("created_at", "asc"),
        limit(100)
    );

    const processSnapshot = (snapshot: any) => {
        console.log(`Global Chat: Received ${snapshot.docs.length} messages`);
        const messages = snapshot.docs.map((docSnap: any) => {
            const data = docSnap.data();
            const ts = data.created_at || data.createdAt;
            
            return {
                id: docSnap.id,
                text: data.content || data.text,
                translatedText: data.translated_text || data.translatedText,
                senderId: data.sender_id || data.senderId,
                senderName: data.sender_name || data.senderName,
                senderAvatar: data.sender_avatar || data.senderAvatar,
                timestamp: ts instanceof Timestamp
                    ? ts.toDate().toISOString()
                    : (typeof ts === 'string' ? ts : new Date().toISOString()),
                originalLang: data.original_lang || data.originalLang,
                targetLang: data.target_lang || data.targetLang
            };
        });

        // Ensure chronological sort even if index is missing
        messages.sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        callback(messages);
    };

    let unsubscribe = onSnapshot(qWithOrder, processSnapshot, (error) => {
        if (error.code === 'failed-precondition' || error.message.includes('index')) {
            console.warn("Global Chat: Index required. Falling back to unordered query.");
            const qFallback = query(collection(db, COLLECTION_NAME), limit(100));
            onSnapshot(qFallback, processSnapshot);
        } else {
            console.error("Global Chat subscription error:", error);
        }
    });

    return unsubscribe;
};

