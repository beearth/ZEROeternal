import { db } from "../firebase";
import {
    collection,
    addDoc,
    query,
    orderBy,
    onSnapshot,
    serverTimestamp,
    Timestamp
} from "firebase/firestore";

export interface ChatMessage {
    id: string;
    content: string;
    senderId: string;
    timestamp: Date;
}

export const subscribeToChat = (chatId: string, callback: (messages: ChatMessage[]) => void) => {
    // Reference to the messages sub-collection
    const messagesRef = collection(db, "chats", chatId, "messages");

    // Order by timestamp
    // Order by timestamp removed to avoid index error
    const q = query(messagesRef);

    // Real-time listener
    const unsubscribe = onSnapshot(q, (snapshot) => {
        const messages = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                content: data.content,
                senderId: data.senderId,
                // Convert Firestore Timestamp to JS Date
                timestamp: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date()
            };
        });

        // Client-side Sort
        messages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

        callback(messages);
    });

    return unsubscribe;
};

export const sendMessage = async (chatId: string, senderId: string, content: string) => {
    const messagesRef = collection(db, "chats", chatId, "messages");
    await addDoc(messagesRef, {
        content,
        senderId,
        createdAt: serverTimestamp()
    });
};
