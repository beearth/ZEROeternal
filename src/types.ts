export interface VocabularyEntry {
    status: "red" | "yellow" | "green" | "white";
    koreanMeaning: string;
    category?: string;
}

export interface WordData {
    id: string;
    word: string;
    status: "red" | "yellow" | "green" | "white";
    messageId: string;
    sentence: string;
    timestamp: Date;
    isInteractive?: boolean;
    koreanMeaning?: string;
}
