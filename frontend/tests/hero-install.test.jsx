import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import Hero from '../components/Hero';

describe('homepage app download guidance', () => {
    beforeEach(() => {
        Object.defineProperty(window.navigator, 'userAgent', {
            configurable: true,
            value: 'Mozilla/5.0 (Android 13; Mobile)',
        });
    });

    it('shows browser-neutral instructions when no install prompt is available', async () => {
        const user = userEvent.setup();
        render(<Hero />);

        await user.click(screen.getByRole('button', { name: 'Download the app' }));

        expect(screen.getByText(/Open your browser menu and choose Install app or Add to Home Screen/)).toBeInTheDocument();
        expect(screen.queryByText(/In Safari|On iPhone/)).not.toBeInTheDocument();
    });

    it('shows Safari instructions only on iPhone', async () => {
        Object.defineProperty(window.navigator, 'userAgent', {
            configurable: true,
            value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)',
        });
        const user = userEvent.setup();
        render(<Hero />);

        await user.click(screen.getByRole('button', { name: 'Download the app' }));

        expect(screen.getByText(/On iPhone, open this page in Safari/)).toBeInTheDocument();
    });

    it('does not show fallback guidance when an install prompt is pending', async () => {
        const prompt = vi.fn().mockResolvedValue(undefined);
        const user = userEvent.setup();
        render(<Hero />);
        await act(async () => {
            window.dispatchEvent(Object.assign(new Event('beforeinstallprompt'), { prompt }));
        });

        await user.click(screen.getByRole('button', { name: 'Download the app' }));

        expect(prompt).toHaveBeenCalledTimes(1);
        expect(screen.queryByText(/Open your browser menu|On iPhone/)).not.toBeInTheDocument();
    });
});
