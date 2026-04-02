import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import ThemeToggle from '../components/ThemeToggle';

describe('ThemeToggle', () => {
    beforeEach(() => {
        document.documentElement.dataset.theme = '';
        document.documentElement.style.colorScheme = '';
        window.localStorage.clear();

        Object.defineProperty(window, 'matchMedia', {
            writable: true,
            value: vi.fn().mockImplementation(() => ({
                matches: false,
                media: '',
                onchange: null,
                addListener: vi.fn(),
                removeListener: vi.fn(),
                addEventListener: vi.fn(),
                removeEventListener: vi.fn(),
                dispatchEvent: vi.fn(),
            })),
        });
    });

    it('uses stored theme on mount', () => {
        window.localStorage.setItem('urban-stone-theme', 'light');

        render(<ThemeToggle />);

        expect(document.documentElement.dataset.theme).toBe('light');
        expect(document.documentElement.style.colorScheme).toBe('light');
        expect(screen.getByRole('button', { name: /switch to dark mode/i })).toBeInTheDocument();
    });

    it('toggles theme and persists selection', async () => {
        const user = userEvent.setup();
        render(<ThemeToggle />);

        const button = screen.getByRole('button', { name: /switch to light mode/i });
        await user.click(button);

        expect(document.documentElement.dataset.theme).toBe('light');
        expect(document.documentElement.style.colorScheme).toBe('light');
        expect(window.localStorage.getItem('urban-stone-theme')).toBe('light');
        expect(screen.getByRole('button', { name: /switch to dark mode/i })).toBeInTheDocument();
    });
});