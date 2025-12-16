/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: ["class"],
    content: ["./index.html", "./src/**/*.{ts,tsx,js,jsx}"],
    theme: {
        extend: {
            fontFamily: {
                sans: ['Pretendard', 'Inter', 'sans-serif'],
                brand: ['Space Grotesk', 'sans-serif'],
                mono: ['JetBrains Mono', 'monospace']
            },
            colors: {
                background: '#09090b', // zinc-950
                foreground: '#e4e4e7', // zinc-200
                card: {
                    DEFAULT: '#18181b', // zinc-900
                    foreground: '#f4f4f5'
                },
                popover: {
                    DEFAULT: '#18181b',
                    foreground: '#f4f4f5'
                },
                primary: {
                    DEFAULT: '#8b5cf6', // violet-500
                    foreground: '#ffffff'
                },
                secondary: {
                    DEFAULT: '#27272a', // zinc-800
                    foreground: '#fafafa'
                },
                muted: {
                    DEFAULT: '#27272a',
                    foreground: '#a1a1aa' // zinc-400
                },
                accent: {
                    DEFAULT: '#27272a',
                    foreground: '#fafafa'
                },
                destructive: {
                    DEFAULT: '#ef4444',
                    foreground: '#fafafa'
                },
                border: '#27272a', // zinc-800
                input: '#27272a',
                ring: '#a1a1aa',
                chart: {
                    '1': '#f43f5e', // Rose
                    '2': '#fbbf24', // Amber
                    '3': '#10b981', // Emerald
                    '4': '#8b5cf6', // Violet
                    '5': '#3b82f6'  // Blue
                }
            },
            borderRadius: {
                lg: 'var(--radius)',
                md: 'calc(var(--radius) - 2px)',
                sm: 'calc(var(--radius) - 4px)'
            }
        }
    },
    plugins: [require("tailwindcss-animate")],
}
