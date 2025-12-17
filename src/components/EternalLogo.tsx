import React from 'react';

interface EternalLogoProps {
    className?: string; // For container styling
    textClassName?: string; // For text styling overrides
    dotClassName?: string; // For dot styling overrides
}

export function EternalLogo({ className = "", textClassName = "", dotClassName = "" }: EternalLogoProps) {
    return (
        <div className={`flex items-center gap-1.5 select-none ${className}`}>
            <div
                className={`rounded-full flex-shrink-0 neon-dot ${dotClassName}`}
                style={{
                    width: '0.75rem', // 3 equivalent
                    height: '0.75rem',
                    backgroundColor: '#dc2626',
                    boxShadow: '0 0 10px #dc2626, 0 0 20px #dc2626'
                }}
            ></div>
            <span
                className={`text-lg font-bold tracking-widest ${textClassName}`}
                style={{ color: '#e4e4e7' }}
            >ETERNAL</span>
        </div>
    );
}
