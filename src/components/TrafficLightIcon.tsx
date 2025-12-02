import React from 'react';

export function TrafficLightIcon({ className = "" }: { className?: string }) {
    return (
        <svg
            width="24"
            height="56"
            viewBox="0 0 24 56"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
        >
            {/* Frame */}
            <rect
                x="2"
                y="2"
                width="20"
                height="52"
                rx="6"
                stroke="currentColor"
                strokeWidth="1.5"
                fill="none"
            />

            {/* Red Light */}
            <circle cx="12" cy="12" r="6" fill="#ef4444" />

            {/* Yellow Light */}
            <circle cx="12" cy="28" r="6" fill="#eab308" />

            {/* Green Light */}
            <circle cx="12" cy="44" r="6" fill="#22c55e" />
        </svg>
    );
}
