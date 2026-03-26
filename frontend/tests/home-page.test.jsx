import { render, screen } from '@testing-library/react';

import Home from '../pages/index';

vi.mock('next/head', () => ({
    default: ({ children }) => <>{children}</>,
}));

vi.mock('next/image', () => ({
    default: ({ alt, priority, ...props }) => <img alt={alt} {...props} />,
}));

describe('Home page', () => {
    it('renders the restored marketing surface', () => {
        render(<Home />);

        expect(screen.getByRole('heading', { name: /premium countertops\. fast install\. built for cincinnati\./i })).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: /trending stone selections/i })).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: /start with a fast estimate/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /send estimate request/i })).toBeInTheDocument();
        expect(screen.getAllByRole('button', { name: /load 5 slabs/i })).toHaveLength(5);
        expect(screen.queryByText(/calacatta laza/i)).not.toBeInTheDocument();
    });
});