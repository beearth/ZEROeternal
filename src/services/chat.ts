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
        sender_avatar: user.photoURL,
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
        // orderBy("created_at", "asc"), // Removed to avoid Index Error
        limit(100)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
        const messages = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                text: data.content,
                translatedText: data.translated_text,
                senderId: data.sender_id,
                senderName: data.sender_name,
                senderAvatar: data.sender_avatar,
                timestamp: data.created_at instanceof Timestamp
                    ? data.created_at.toDate().toISOString()
                    : new Date().toISOString(),
                originalLang: data.original_lang,
                targetLang: data.target_lang
            };
        });

        // Client-side Sort
        messages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

        callback(messages);
    });

    return unsubscribe;
};

