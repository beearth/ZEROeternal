import React from 'react';
import { Search } from 'lucide-react';

interface EternalLogoProps {
    className?: string; // For container styling
    textClassName?: string; // For text styling overrides
    dotClassName?: string; // For dot styling overrides
    compact?: boolean; // If true, only shows the icon
    onlyDot?: boolean; // If true, only shows the red dot (no icon)
}

export function EternalLogo({ className = "", textClassName = "", dotClassName = "", compact = false, onlyDot = false }: EternalLogoProps) {
    return (
        <div className={`flex items-center gap-3 select-none ${className}`}>
            <div className="relative flex items-center justify-center w-6 h-6 text-zinc-400">
                {!onlyDot && <Search className="w-6 h-6" />}
                <div 
                    className={`absolute w-1.5 h-1.5 bg-red-600 rounded-full ${dotClassName}`}
                    style={{
                        top: onlyDot ? '50%' : '11px', // onlyDot이면 컨테이너 정중앙, 아니면 돋보기 중심
                        left: onlyDot ? '50%' : '11px',
                        transform: 'translate(-50%, -50%)',
                        boxShadow: '0 0 8px rgba(220, 38, 38, 0.8)'
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
