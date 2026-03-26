/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        './components/**/*.{js,jsx}',
        './pages/**/*.{js,jsx}',
        './lib/**/*.{js,jsx}',
    ],
    theme: {
        extend: {
            colors: {
                bg: 'rgb(var(--bg) / <alpha-value>)',
                surface: 'rgb(var(--surface) / <alpha-value>)',
                panel: 'rgb(var(--panel) / <alpha-value>)',
                text: 'rgb(var(--text) / <alpha-value>)',
                muted: 'rgb(var(--muted) / <alpha-value>)',
                accent: 'rgb(var(--accent) / <alpha-value>)',
                accentDark: 'rgb(var(--accent-dark) / <alpha-value>)',
                border: 'rgb(var(--border) / <alpha-value>)',
            },
            boxShadow: {
                soft: '0 20px 45px -24px rgba(63, 45, 27, 0.32)',
            },
            fontFamily: {
                display: ['Cormorant Garamond', 'serif'],
                sans: ['Manrope', 'ui-sans-serif', 'system-ui', 'sans-serif'],
            },
        },
    },
    plugins: [],
};