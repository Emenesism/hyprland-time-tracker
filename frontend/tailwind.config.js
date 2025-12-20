/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                // Background layers
                background: '#0a0a0f',
                surface: {
                    1: '#12121a',
                    2: '#1a1a27',
                    3: '#252535',
                },
                // Brand colors
                primary: {
                    DEFAULT: '#6366f1',
                    hover: '#818cf8',
                    muted: 'rgba(99, 102, 241, 0.15)',
                },
                accent: {
                    DEFAULT: '#22d3ee',
                    muted: 'rgba(34, 211, 238, 0.15)',
                },
                // Semantic colors
                success: {
                    DEFAULT: '#34d399',
                    muted: 'rgba(52, 211, 153, 0.15)',
                },
                warning: {
                    DEFAULT: '#fbbf24',
                    muted: 'rgba(251, 191, 36, 0.15)',
                },
                danger: {
                    DEFAULT: '#f87171',
                    muted: 'rgba(248, 113, 113, 0.15)',
                },
                // Text colors
                'text-primary': '#f8fafc',
                'text-secondary': '#94a3b8',
                'text-muted': '#64748b',
                // Border colors
                border: {
                    DEFAULT: 'rgba(255, 255, 255, 0.08)',
                    active: 'rgba(255, 255, 255, 0.16)',
                },
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
                mono: ['JetBrains Mono', 'Menlo', 'Monaco', 'monospace'],
            },
            fontSize: {
                '2xs': ['0.625rem', { lineHeight: '0.75rem' }],
            },
            spacing: {
                '4.5': '1.125rem',
                '13': '3.25rem',
                '15': '3.75rem',
                '18': '4.5rem',
                '22': '5.5rem',
            },
            borderRadius: {
                '4xl': '2rem',
            },
            boxShadow: {
                'glow-sm': '0 0 15px -3px rgba(99, 102, 241, 0.3)',
                'glow': '0 0 25px -5px rgba(99, 102, 241, 0.4)',
                'glow-lg': '0 0 40px -10px rgba(99, 102, 241, 0.5)',
                'glow-accent': '0 0 25px -5px rgba(34, 211, 238, 0.4)',
            },
            animation: {
                'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                'shimmer': 'shimmer 2s linear infinite',
                'fade-in': 'fadeIn 0.3s ease-out',
                'slide-up': 'slideUp 0.3s ease-out',
                'slide-down': 'slideDown 0.3s ease-out',
                'scale-in': 'scaleIn 0.2s ease-out',
            },
            keyframes: {
                shimmer: {
                    '0%': { backgroundPosition: '-200% 0' },
                    '100%': { backgroundPosition: '200% 0' },
                },
                fadeIn: {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
                slideUp: {
                    '0%': { opacity: '0', transform: 'translateY(10px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                slideDown: {
                    '0%': { opacity: '0', transform: 'translateY(-10px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                scaleIn: {
                    '0%': { opacity: '0', transform: 'scale(0.95)' },
                    '100%': { opacity: '1', transform: 'scale(1)' },
                },
            },
            backdropBlur: {
                xs: '2px',
            },
        },
    },
    plugins: [
        require('@tailwindcss/forms')({
            strategy: 'class',
        }),
    ],
}
