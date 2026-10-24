import { render, screen, waitFor } from '@testing-library/react';

import ReviewSection from '../components/ReviewSection';

describe('ReviewSection', () => {
    afterEach(() => {
        vi.unstubAllEnvs();
        vi.unstubAllGlobals();
    });

    it('shows the invite-only first-party review flow without implying Google Maps posting', () => {
        const { container } = render(<ReviewSection />);

        expect(screen.getByRole('heading', { name: /your experience helps/i })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /have an invitation\? write a review/i }))
            .toHaveAttribute('href', '/reviews/invite');
        expect(screen.getByText(/google sign-in verifies identity; nothing is forwarded to google or google maps/i)).toBeInTheDocument();
        expect(container.querySelector('[aria-label="Google reviews"]')).not.toBeInTheDocument();
    });

    it('renders only approved reviews returned by the published-review endpoint', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({ reviews: [{ id: 'r-1', display_name: 'Jordan', rating: 4, review_text: 'The installation was careful and the result looks great.' }] }),
        }));
        render(<ReviewSection />);

        expect(await screen.findByText(/the installation was careful/i)).toBeInTheDocument();
        expect(screen.getByText('Jordan')).toBeInTheDocument();
        expect(screen.getByLabelText('4 out of 5 stars')).toBeInTheDocument();
    });

    it('never shows placeholder reviews, even if the retired demo flag is set', () => {
        vi.stubEnv('NEXT_PUBLIC_REVIEW_DEMO_MODE', 'true');
        render(<ReviewSection />);

        expect(screen.queryByText(/demo content - staging only/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/replace this clearly labeled placeholder/i)).not.toBeInTheDocument();
    });
});