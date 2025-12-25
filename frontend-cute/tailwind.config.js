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
                background: 'rgb(var(--bg-page) / <alpha-value>)',
                surface: {
                    1: 'rgb(var(--bg-surface-1) / <alpha-value>)',
                    2: 'rgb(var(--bg-surface-2) / <alpha-value>)',
                    3: 'rgb(var(--bg-surface-2) / <alpha-value>)', // fallback
                },
                // Adorable brand colors
                primary: {
                    DEFAULT: 'rgb(var(--color-primary) / <alpha-value>)',
                    hover: 'rgb(var(--color-primary-hover) / <alpha-value>)',
                    light: 'rgb(var(--color-primary-light) / <alpha-value>)',
                    muted: 'rgb(var(--color-primary) / 0.15)',
                },
                secondary: {
                    DEFAULT: 'rgb(var(--color-secondary) / <alpha-value>)',
                    hover: 'rgb(var(--color-secondary-hover) / <alpha-value>)',
                    light: 'rgb(var(--color-secondary-light) / <alpha-value>)',
                    muted: 'rgb(var(--color-secondary) / 0.15)',
                },
                accent: {
                    DEFAULT: 'rgb(var(--color-accent) / <alpha-value>)',
                    light: 'rgb(var(--color-accent) / 0.3)', // derived
                    muted: 'rgb(var(--color-accent) / 0.15)',
                },
                // Static colors for specific uses
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
                'text-primary': 'rgb(var(--color-text-primary) / <alpha-value>)',
                'text-secondary': 'rgb(var(--color-text-secondary) / <alpha-value>)',
                'text-muted': 'rgb(var(--color-text-muted) / <alpha-value>)',
                // Border colors
                border: {
                    DEFAULT: 'rgb(var(--color-border) / 0.2)',
                    active: 'rgb(var(--color-border) / 0.4)',
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
