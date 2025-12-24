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
export interface Message {
    id: string;
    role: "user" | "assistant";
    content: string;
    timestamp: Date;
    images?: string[];
}

export interface Conversation {
    id: string;
    title: string;
    messages: Message[];
    timestamp: Date;
}

export interface PersonaInstruction {
    id: string;
    content: string;
    isActive: boolean;
}
