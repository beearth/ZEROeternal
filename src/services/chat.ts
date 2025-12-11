import { supabase } from '../supabase';

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

export const sendMessage = async (
    text: string,
    translatedText: string,
    user: any,
    originalLang: string,
    targetLang: string
) => {
    const { error } = await supabase
        .from('messages')
        .insert({
            content: text,
            translated_text: translatedText,
            sender_id: user.uid,
            sender_name: user.displayName || 'Anonymous',
            sender_avatar: user.photoURL,
            original_lang: originalLang,
            target_lang: targetLang
        });

    if (error) throw error;
};

export const subscribeToMessages = (callback: (messages: any[]) => void) => {
    // 1. Initial Load
    const fetchMessages = async () => {
        const { data } = await supabase
            .from('messages')
            .select('*')
            .order('created_at', { ascending: true })
            .limit(100);

        if (data) {
            callback(data.map(mapMessage));
        }
    };

    fetchMessages();

    // 2. Real-time Subscription (Listen to ALL events including DELETE)
    const channel = supabase
        .channel('public:messages')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, (payload) => {
            // Simply re-fetch to ensure sync on Insert/Update/Delete
            fetchMessages();
        })
        .subscribe();

    return () => {
        supabase.removeChannel(channel);
    };
};

const mapMessage = (row: any) => ({
    id: row.id,
    text: row.content,
    translatedText: row.translated_text,
    senderId: row.sender_id,
    senderName: row.sender_name,
    senderAvatar: row.sender_avatar,
    timestamp: row.created_at, // string ISO
    originalLang: row.original_lang,
    targetLang: row.target_lang
});
