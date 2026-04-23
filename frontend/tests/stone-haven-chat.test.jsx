import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import StoneHavenChat from '../components/StoneHavenChat';

describe('StoneHavenChat keyboard behavior', () => {
    const originalFetch = global.fetch;

    beforeEach(() => {
        global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({
                reply: 'Test reply',
                sources: [],
                contact: null,
            }),
        });
    });

    afterEach(() => {
        global.fetch = originalFetch;
    });

    it('sends message when pressing Enter without Shift', async () => {
        render(<StoneHavenChat embedded />);

        const input = screen.getByLabelText(/message stone haven/i);
        fireEvent.change(input, { target: { value: 'Need a kitchen quote in Mason' } });
        fireEvent.keyDown(input, { key: 'Enter', code: 'Enter', shiftKey: false });

        await waitFor(() => {
            expect(global.fetch).toHaveBeenCalledTimes(1);
        });
    });

    it('does not send on Shift+Enter', async () => {
        render(<StoneHavenChat embedded />);

        const input = screen.getByLabelText(/message stone haven/i);
        fireEvent.change(input, { target: { value: 'Need a kitchen quote in Mason' } });
        fireEvent.keyDown(input, { key: 'Enter', code: 'Enter', shiftKey: true });

        await new Promise((resolve) => setTimeout(resolve, 50));
        expect(global.fetch).toHaveBeenCalledTimes(0);
    });

    it('shows an assistant welcome message on initial render', () => {
        render(<StoneHavenChat embedded />);
        expect(screen.getByText(/what project can i help you scope today/i)).toBeInTheDocument();
    });

    it('renders URLs in assistant replies as clickable links', async () => {
        global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({
                reply: 'Start here: https://urbanstone.co/#quote',
                sources: [],
                contact: null,
            }),
        });

        render(<StoneHavenChat embedded />);

        const input = screen.getByLabelText(/message stone haven/i);
        fireEvent.change(input, { target: { value: 'Need help with estimate' } });
        fireEvent.keyDown(input, { key: 'Enter', code: 'Enter', shiftKey: false });

        const link = await screen.findByRole('link', { name: /https:\/\/urbanstone\.co\/#quote/i });
        expect(link).toHaveAttribute('href', 'https://urbanstone.co/#quote');
    });
});
