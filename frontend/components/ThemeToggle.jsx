import { useEffect, useState } from 'react';

const STORAGE_KEY = 'amazon-granite-theme';

function getPreferredTheme() {
    const savedTheme = window.localStorage.getItem(STORAGE_KEY);
    if (savedTheme === 'light' || savedTheme === 'dark') {
        return savedTheme;
    }

    const supportsMatchMedia = typeof window.matchMedia === 'function';
    return supportsMatchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

function applyTheme(theme) {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
}

export default function ThemeToggle() {
    const [theme, setTheme] = useState('dark');

    useEffect(() => {
        const nextTheme = document.documentElement.dataset.theme || getPreferredTheme();

        setTheme(nextTheme);
        applyTheme(nextTheme);
    }, []);

    const nextTheme = theme === 'dark' ? 'light' : 'dark';

    const handleToggle = () => {
        setTheme((currentTheme) => {
            const updatedTheme = currentTheme === 'dark' ? 'light' : 'dark';
            applyTheme(updatedTheme);
            window.localStorage.setItem(STORAGE_KEY, updatedTheme);
            return updatedTheme;
        });
    };

    return (
        <button
            type="button"
            onClick={handleToggle}
            className="inline-flex items-center gap-2 rounded-full border border-border bg-panel/70 px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-text transition hover:border-accent hover:text-accent"
            aria-label={`Switch to ${nextTheme} mode`}
            aria-pressed={theme === 'dark'}
        >
            <span aria-hidden="true">{theme === 'dark' ? '☀' : '☾'}</span>
            <span>{theme === 'dark' ? 'Light' : 'Dark'}</span>
        </button>
    );
}