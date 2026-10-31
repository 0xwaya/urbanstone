import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import ReviewInvitePage from '../pages/reviews/invite';

vi.mock('next/head', () => ({ default: ({ children }) => <>{children}</> }));

const TOKEN = 'T'.repeat(43);

describe('ReviewInvitePage (token-verified, no Google sign-in)', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
        window.sessionStorage.clear();
    });

    it('asks for an invitation when there is no token', async () => {
        window.history.replaceState(null, '', '/reviews/invite');
        render(<ReviewInvitePage />);
        expect(await screen.findByText(/personal invitation link is required/i)).toBeInTheDocument();
    });

    it('prefills from the invite, hides the token from the URL, and submits', async () => {
        window.history.replaceState(null, '', `/reviews/invite#invite=${TOKEN}`);
        const fetchMock = vi.fn()
            .mockResolvedValueOnce({ ok: true, json: async () => ({ invite: { first_name: 'Pat', display_name: 'Pat E.', email: 'pat@example.com', job_label: 'Kitchen countertops' } }) })
            .mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true, message: 'Thank you! Your review was received.' }) });
        vi.stubGlobal('fetch', fetchMock);
        render(<ReviewInvitePage />);

        expect(await screen.findByRole('heading', { name: /thank you, pat/i })).toBeInTheDocument();
        expect(window.location.hash).toBe('');
        expect(screen.getByDisplayValue('Pat E.')).toBeInTheDocument();
        expect(screen.getByText('pat@example.com')).toBeInTheDocument();

        fireEvent.click(screen.getByLabelText('5 stars'));
        fireEvent.change(screen.getByLabelText('Your review'), { target: { value: 'Beautiful work and a very smooth install.' } });
        fireEvent.click(screen.getByRole('button', { name: /submit review/i }));

        await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(/thank you/i));
        const body = JSON.parse(fetchMock.mock.calls[1][1].body);
        expect(body).toMatchObject({ inviteToken: TOKEN, displayName: 'Pat E.', rating: 5 });
        expect(fetchMock.mock.calls[1][1].headers.Authorization).toBeUndefined();
    });
});
