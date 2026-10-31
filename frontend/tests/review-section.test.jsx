import { render, screen } from '@testing-library/react';

import ReviewSection from '../components/ReviewSection';

const review = {
    id: 'r-1', display_name: 'Jordan P.', rating: 5, review_text: 'The installation was careful and the result looks great.',
    job_label: 'Kitchen countertops', location: 'Mason, OH', published_at: '2026-10-31T18:00:00Z',
};

describe('ReviewSection', () => {
    it('degrades gracefully with no published reviews (no error, no fake reviews)', () => {
        render(<ReviewSection />);
        expect(screen.getByRole('heading', { name: /your experience helps/i })).toBeInTheDocument();
        expect(screen.getByText(/inviting recent customers now/i)).toBeInTheDocument();
        expect(screen.queryByRole('list', { name: /published customer reviews/i })).not.toBeInTheDocument();
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
        expect(screen.getByRole('link', { name: /have an invitation\? write a review/i })).toHaveAttribute('href', '/reviews/invite');
    });

    it('renders published review cards with name, job, location, date and rating', () => {
        render(<ReviewSection reviews={[review]} />);
        expect(screen.getByText(/the installation was careful/i)).toBeInTheDocument();
        expect(screen.getByText('Jordan P.')).toBeInTheDocument();
        expect(screen.getByText(/verified customer · kitchen countertops · mason, oh/i)).toBeInTheDocument();
        expect(screen.getByText('October 2026')).toBeInTheDocument();
        expect(screen.getAllByLabelText('5 out of 5 stars').length).toBeGreaterThan(0);
        expect(screen.getByText('1 verified review')).toBeInTheDocument();
    });

    it('renders Spanish copy', () => {
        render(<ReviewSection language="es" reviews={[review]} />);
        expect(screen.getByText(/cliente verificado/i)).toBeInTheDocument();
        expect(screen.getByText('octubre de 2026')).toBeInTheDocument();
    });
});
