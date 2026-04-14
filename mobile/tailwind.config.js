/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        './app/**/*.{js,jsx,ts,tsx}',
        './components/**/*.{js,jsx,ts,tsx}',
    ],
    presets: [require('nativewind/preset')],
    theme: {
        extend: {
            colors: {
                bg: '#08080c',
                surface: '#0c1220',
                panel: '#101829',
                foreground: '#e7eef8',
                muted: '#a8afbf',
                accent: '#4a90e2',
                'accent-dark': '#374866',
                border: '#344866',
            },
        },
    },
    plugins: [],
};
