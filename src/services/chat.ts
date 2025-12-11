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
        orderBy("created_at", "asc"),
        limit(100)
    );
};

