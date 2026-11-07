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

    it('navigates to the app page when no install prompt is available', () => {
        render(<Hero />);

        expect(screen.getByRole('link', { name: 'Download the app' })).toHaveAttribute('href', '/app');
    });

    it('does not show fallback guidance when an install prompt is pending', async () => {
        const prompt = vi.fn().mockResolvedValue(undefined);
        const user = userEvent.setup();
        render(<Hero />);
        await act(async () => {
            window.dispatchEvent(Object.assign(new Event('beforeinstallprompt'), { prompt }));
        });

        await user.click(screen.getByRole('link', { name: 'Download the app' }));

        expect(prompt).toHaveBeenCalledTimes(1);
        expect(screen.queryByText(/Open your browser menu|On iPhone/)).not.toBeInTheDocument();
    });
});
