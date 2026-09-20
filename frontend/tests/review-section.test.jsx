import { render, screen } from '@testing-library/react';

import ReviewSection from '../components/ReviewSection';

describe('ReviewSection', () => {
    afterEach(() => {
        vi.unstubAllEnvs();
    });

    it('shows the Google review handoff without inventing customer quotes', () => {
        render(<ReviewSection />);

        expect(screen.getByRole('heading', { name: /your experience helps/i })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /leave a google review/i })).toHaveAttribute('target', '_blank');
        expect(screen.getByText(/building this review wall from verified customer feedback/i)).toBeInTheDocument();
    });

    it('shows clearly labeled placeholders only when demo mode is enabled', () => {
        vi.stubEnv('NEXT_PUBLIC_REVIEW_DEMO_MODE', 'true');
        render(<ReviewSection />);

        expect(screen.getByText(/demo content - staging only/i)).toBeInTheDocument();
        expect(screen.getByText(/replace this clearly labeled placeholder/i)).toBeInTheDocument();
    });
});