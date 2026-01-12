import React from 'react';
import { Search } from 'lucide-react';

interface EternalLogoProps {
    className?: string; // For container styling
    textClassName?: string; // For text styling overrides
    dotClassName?: string; // For dot styling overrides
    compact?: boolean; // If true, only shows the icon
    onlyDot?: boolean; // If true, only shows the red dot (no icon)
    status?: 'idle' | 'loading' | 'complete'; // Loading status for animation
}

export function EternalLogo({ className = "", textClassName = "", dotClassName = "", compact = false, onlyDot = false, status = 'idle' }: EternalLogoProps) {
    // Color based on status
    const getStatusColor = () => {
        switch (status) {
            case 'loading': return '#eab308'; // yellow
            case 'complete': return '#22c55e'; // green
            default: return '#dc2626'; // red
        }
    };

    const getStatusGlow = () => {
        switch (status) {
            case 'loading': return '0 0 8px rgba(234, 179, 8, 0.8)';
            case 'complete': return '0 0 12px rgba(34, 197, 94, 0.9)';
            default: return '0 0 8px rgba(220, 38, 38, 0.8)';
        }
    };

    return (
        <div className={`flex items-center gap-3 select-none ${className}`}>
            <div className="relative flex items-center justify-center w-6 h-6 text-zinc-400">
                {!onlyDot && <Search className="w-6 h-6" />}
                <div
                    className={`absolute rounded-full transition-all duration-500 ease-in-out ${dotClassName} ${status === 'loading' ? 'animate-pulse' : ''}`}
                    style={{
                        width: onlyDot ? (dotClassName.includes('w-') ? undefined : '10px') : '6px',
                        height: onlyDot ? (dotClassName.includes('h-') ? undefined : '10px') : '6px',
                        top: onlyDot ? '50%' : '11px',
                        left: onlyDot ? '50%' : '11px',
                        transform: `translate(-50%, -50%) ${status === 'complete' ? 'scale(1.3)' : 'scale(1)'}`,
                        backgroundColor: getStatusColor(),
                        boxShadow: getStatusGlow(),
                    }}
                ></div>
            </div>

            {!compact && !onlyDot && (
                <span
                    className={`text-lg font-bold tracking-widest ${textClassName}`}
                    style={{ color: '#e4e4e7' }}
                >
                    ETERNAL
                </span>
            )}
        </div>
    );
}
