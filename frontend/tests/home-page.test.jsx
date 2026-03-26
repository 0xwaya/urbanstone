import { render, screen } from '@testing-library/react';

import Home from '../pages/index';

vi.mock('next/head', () => ({
    default: ({ children }) => <>{children}</>,
}));

vi.mock('next/image', () => ({
    default: ({ alt, priority, ...props }) => <img alt={alt} {...props} />,
}));

describe('Home page', () => {
    beforeAll(() => {
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

    it('renders the restored marketing surface', () => {
        render(<Home />);

        expect(screen.getByRole('heading', { name: /premium countertops\. fast install\. built for cincinnati\./i })).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: /curated countertop materials/i })).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: /start with a fast estimate/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /send estimate request/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /switch to light mode/i })).toBeInTheDocument();
        expect(screen.getByText(/calacatta laza/i)).toBeInTheDocument();
        expect(screen.getAllByRole('button', { name: /load 5 materials/i })).toHaveLength(5);
        expect(screen.getAllByRole('button', { name: /preview .* material/i }).length).toBeGreaterThanOrEqual(5);
    });
});