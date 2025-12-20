export interface VocabularyEntry {
    status: "red" | "yellow" | "green" | "white" | "orange";
    koreanMeaning: string;
    category?: string;
    word?: string;
    lastUpdated?: string;
    // Crystallized Entity (linked concepts)
    linkedConcept?: boolean;
    linkedFrom?: string[];
    linkedTo?: string;
}

export interface WordData {
    id: string;
    word: string;
    status: "red" | "yellow" | "green" | "white" | "orange";
    messageId: string;
    sentence: string;
    timestamp: Date;
    isInteractive?: boolean;
    koreanMeaning?: string;
    category?: string;
}
