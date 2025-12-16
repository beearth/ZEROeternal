import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Bookmark, Sparkles, X } from 'lucide-react';
import { toast } from 'sonner';

interface SignalCaptureProps {
    onSave?: (text: string) => void;
    onAsk?: (text: string) => void;
}

export function SignalCapture({ onSave, onAsk }: SignalCaptureProps) {
    const [visible, setVisible] = useState(false);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [selectedText, setSelectedText] = useState("");
    const popoverRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleMouseUp = (e: MouseEvent) => {
            // Ignore clicks inside the popover itself
            if (popoverRef.current && popoverRef.current.contains(e.target as Node)) {
                return;
            }

            const selection = window.getSelection();
            const text = selection?.toString().trim();

            if (text && text.length > 0) {
                // Get range rect
                const range = selection?.getRangeAt(0);
                const rect = range?.getBoundingClientRect();

                if (rect) {
                    // Calculate position (centered above selection)
                    const scrollX = window.scrollX;
                    const scrollY = window.scrollY;

                    setPosition({
                        x: rect.left + scrollX + rect.width / 2,
                        y: rect.top + scrollY - 60, // 60px above
                    });
                    setSelectedText(text);
                    setVisible(true);
                }
            } else {
                setVisible(false);
            }
        };

        document.addEventListener('mouseup', handleMouseUp);
        return () => document.removeEventListener('mouseup', handleMouseUp);
    }, []);

    const handleKeep = () => {
        if (onSave) {
            onSave(selectedText);
        } else {
            // Default behavior if no handler
            toast.success("Saved to Red Signal");
        }
        setVisible(false);
        window.getSelection()?.removeAllRanges();
    };

    const handleAsk = () => {
        if (onAsk) {
            onAsk(selectedText);
        } else {
            // Default behavior requires routing context (can't navigate here easily without hook)
            // We'll let the parent handle it or dispatch custom event
            window.dispatchEvent(new CustomEvent('signal-ask', { detail: selectedText }));
        }
        setVisible(false);
        window.getSelection()?.removeAllRanges();
    };

    if (!visible) return null;

    return createPortal(
        <div
            ref={popoverRef}
            style={{
                top: position.y,
                left: position.x,
                transform: 'translate(-50%, 0)'
            }}
            className="fixed z-[9999] flex items-center gap-2 p-1.5 rounded-full bg-zinc-900/90 backdrop-blur-xl border border-white/20 shadow-[0_0_20px_rgba(139,92,246,0.3)] animate-in fade-in zoom-in-95 duration-200"
        >
            <button
                onClick={handleKeep}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 hover:text-rose-300 transition-colors text-xs font-bold uppercase tracking-wide"
            >
                <Bookmark className="w-3 h-3" />
                Keep
            </button>

            <div className="w-px h-4 bg-white/10" />

            <button
                onClick={handleAsk}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/20 text-violet-400 hover:text-violet-300 transition-colors text-xs font-bold uppercase tracking-wide"
            >
                <Sparkles className="w-3 h-3" />
                Ask
            </button>

            <button
                onClick={() => setVisible(false)}
                className="ml-1 p-1 rounded-full hover:bg-white/10 text-zinc-500 hover:text-white transition-colors"
            >
                <X className="w-3 h-3" />
            </button>
        </div>,
        document.body
    );
}
