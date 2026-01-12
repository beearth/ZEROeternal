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
    const q = query(
        collection(db, COLLECTION_NAME),
        // orderBy("created_at", "asc"), // Temporarily disabled to check if data exists without index
        limit(50)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
        console.log(`Global Chat: Received ${snapshot.docs.length} messages`);
        const messages = snapshot.docs.map(docSnap => {
            const data = docSnap.data();
            const ts = data.created_at || data.createdAt;
            
            return {
                id: docSnap.id,
                text: data.content,
                translatedText: data.translated_text,
                senderId: data.sender_id || data.senderId,
                senderName: data.sender_name || data.senderName,
                senderAvatar: data.sender_avatar || data.senderAvatar,
                timestamp: ts instanceof Timestamp
                    ? ts.toDate().toISOString()
                    : new Date().toISOString(),
                originalLang: data.original_lang || data.originalLang,
                targetLang: data.target_lang || data.targetLang
            };
        });

        // Client-side Sort
        messages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

        callback(messages);
    }, (error) => {
        console.error("Global Chat subscription error:", error);
        if (error.code === 'permission-denied') {
            console.warn("Global Chat: Permission denied. Check firestore.rules deployment.");
        }
    });

    return unsubscribe;
};

