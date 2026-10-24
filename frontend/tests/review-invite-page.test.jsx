import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import ReviewInvitePage from '../pages/reviews/invite';
import { getSupabaseBrowserClient } from '../lib/supabase-browser';

vi.mock('next/head', () => ({ default: ({ children }) => <>{children}</> }));
vi.mock('next/link', () => ({ default: ({ href, children, ...props }) => <a href={href} {...props}>{children}</a> }));
vi.mock('../lib/supabase-browser', () => ({ getSupabaseBrowserClient: vi.fn() }));

const INVITE_TOKEN = 'A'.repeat(43);

function setInviteUrl() {
    window.history.replaceState(null, '', `/reviews/invite#invite=${INVITE_TOKEN}`);
}

function makeAuthClient(session = null) {
    return {
        auth: {
            onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
            getSession: vi.fn().mockResolvedValue({ data: { session }, error: null }),
            signInWithOAuth: vi.fn().mockResolvedValue({ error: null }),
            signOut: vi.fn().mockResolvedValue({ error: null }),
        },
    };
}

afterEach(() => {
    window.history.replaceState(null, '', '/');
    window.sessionStorage.clear();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
});

describe('ReviewInvitePage', () => {
    it('keeps the invitation in session storage, removes it from the URL, and starts Google OAuth', async () => {
        const user = userEvent.setup();
        const client = makeAuthClient();
        getSupabaseBrowserClient.mockReturnValue(client);
        setInviteUrl();

        render(<ReviewInvitePage />);
        expect(await screen.findByRole('button', { name: 'Continue with Google' })).toBeInTheDocument();
        expect(window.location.hash).toBe('');
        expect(window.sessionStorage.getItem('urbanstone:review-invite')).toBe(INVITE_TOKEN);

        await user.click(screen.getByRole('button', { name: 'Continue with Google' }));
        await waitFor(() => expect(client.auth.signInWithOAuth).toHaveBeenCalledWith({
            provider: 'google',
            options: { redirectTo: `${window.location.origin}/reviews/invite` },
        }));
    });

    it('submits an unbiased review using the signed-in access token and consumes the local invite after success', async () => {
        const user = userEvent.setup();
        const session = {
            access_token: 'test-access-token',
            user: { email: 'customer@example.com', app_metadata: { provider: 'google' } },
        };
        const client = makeAuthClient(session);
        getSupabaseBrowserClient.mockReturnValue(client);
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({ message: 'Review saved for moderation.' }),
        }));
        setInviteUrl();

        render(<ReviewInvitePage />);
        await screen.findByRole('textbox', { name: /name to display/i });
        await user.type(screen.getByRole('textbox', { name: /name to display/i }), 'Jordan');
        await user.click(screen.getByRole('radio', { name: '1' }));
        await user.type(screen.getByRole('textbox', { name: /honest feedback/i }), 'The project took longer than planned, but the team resolved my concerns.');
        await user.click(screen.getByRole('button', { name: 'Submit review' }));

        await waitFor(() => expect(fetch).toHaveBeenCalledWith('/api/reviews/submit', expect.objectContaining({
            method: 'POST',
            headers: expect.objectContaining({ Authorization: 'Bearer test-access-token' }),
            body: JSON.stringify({
                inviteToken: INVITE_TOKEN,
                displayName: 'Jordan',
                rating: '1',
                reviewText: 'The project took longer than planned, but the team resolved my concerns.',
            }),
        })));
        expect(await screen.findByRole('status')).toHaveTextContent('Review saved for moderation.');
        expect(window.sessionStorage.getItem('urbanstone:review-invite')).toBeNull();
    });
});
