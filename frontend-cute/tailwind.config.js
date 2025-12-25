/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                // Cute pastel backgrounds
                background: '#fef7f7',
                surface: {
                    1: '#fff5f5',
                    2: '#fff0f3',
                    3: '#ffe4ec',
                },
                // Adorable brand colors
                primary: {
                    DEFAULT: '#f472b6',
                    hover: '#ec4899',
                    light: '#fbcfe8',
                    muted: 'rgba(244, 114, 182, 0.15)',
                },
                secondary: {
                    DEFAULT: '#a78bfa',
                    hover: '#8b5cf6',
                    light: '#ddd6fe',
                    muted: 'rgba(167, 139, 250, 0.15)',
                },
                accent: {
                    DEFAULT: '#34d399',
                    light: '#a7f3d0',
                    muted: 'rgba(52, 211, 153, 0.15)',
                },
                coral: {
                    DEFAULT: '#fb7185',
                    light: '#fecdd3',
                },
                peach: {
                    DEFAULT: '#fdba74',
                    light: '#fed7aa',
                },
                mint: {
                    DEFAULT: '#6ee7b7',
                    light: '#a7f3d0',
                },
                sky: {
                    DEFAULT: '#7dd3fc',
                    light: '#bae6fd',
                },
                lavender: {
                    DEFAULT: '#c4b5fd',
                    light: '#e9d5ff',
                },
                // Semantic colors
                success: {
                    DEFAULT: '#34d399',
                    light: '#a7f3d0',
                    muted: 'rgba(52, 211, 153, 0.2)',
                },
                warning: {
                    DEFAULT: '#fbbf24',
                    light: '#fde68a',
                    muted: 'rgba(251, 191, 36, 0.2)',
                },
                danger: {
                    DEFAULT: '#fb7185',
                    light: '#fecdd3',
                    muted: 'rgba(251, 113, 133, 0.2)',
                },
                // Text colors
                'text-primary': '#4a3f51',
                'text-secondary': '#7c7289',
                'text-muted': '#a89cb3',
                // Border colors
                border: {
                    DEFAULT: 'rgba(244, 114, 182, 0.2)',
                    active: 'rgba(244, 114, 182, 0.4)',
                },
            },
            fontFamily: {
                sans: ['Nunito', 'Quicksand', 'system-ui', '-apple-system', 'sans-serif'],
                display: ['Quicksand', 'Nunito', 'system-ui', 'sans-serif'],
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
                'cute': '1.5rem',
            },
            boxShadow: {
                'cute': '0 4px 20px -2px rgba(244, 114, 182, 0.25)',
                'cute-lg': '0 8px 30px -4px rgba(244, 114, 182, 0.3)',
                'lavender': '0 4px 20px -2px rgba(167, 139, 250, 0.25)',
                'mint': '0 4px 20px -2px rgba(52, 211, 153, 0.25)',
                'glow-pink': '0 0 25px -5px rgba(244, 114, 182, 0.5)',
                'glow-lavender': '0 0 25px -5px rgba(167, 139, 250, 0.5)',
            },
            animation: {
                'bounce-slow': 'bounce 2s infinite',
                'wiggle': 'wiggle 0.5s ease-in-out',
                'float': 'float 3s ease-in-out infinite',
                'sparkle': 'sparkle 1.5s ease-in-out infinite',
                'pulse-cute': 'pulse-cute 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                'fade-in': 'fadeIn 0.3s ease-out',
                'slide-up': 'slideUp 0.3s ease-out',
                'scale-in': 'scaleIn 0.2s ease-out',
                'heart-beat': 'heartBeat 1.2s ease-in-out infinite',
            },
            keyframes: {
                wiggle: {
                    '0%, 100%': { transform: 'rotate(-3deg)' },
                    '50%': { transform: 'rotate(3deg)' },
                },
                float: {
                    '0%, 100%': { transform: 'translateY(0)' },
                    '50%': { transform: 'translateY(-10px)' },
                },
                sparkle: {
                    '0%, 100%': { opacity: '1', transform: 'scale(1)' },
                    '50%': { opacity: '0.7', transform: 'scale(1.1)' },
                },
                'pulse-cute': {
                    '0%, 100%': { opacity: '1' },
                    '50%': { opacity: '0.7' },
                },
                fadeIn: {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
                slideUp: {
                    '0%': { opacity: '0', transform: 'translateY(10px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                scaleIn: {
                    '0%': { opacity: '0', transform: 'scale(0.95)' },
                    '100%': { opacity: '1', transform: 'scale(1)' },
                },
                heartBeat: {
                    '0%': { transform: 'scale(1)' },
                    '14%': { transform: 'scale(1.15)' },
                    '28%': { transform: 'scale(1)' },
                    '42%': { transform: 'scale(1.15)' },
                    '70%': { transform: 'scale(1)' },
                },
            },
        },
    },
    plugins: [
        require('@tailwindcss/forms')({
            strategy: 'class',
        }),
    ],
}
