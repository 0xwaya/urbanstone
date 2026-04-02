import { render, screen } from '@testing-library/react';

import Home from '../pages/index';

vi.mock('next/head', () => ({
    default: ({ children }) => <>{children}</>,
}));

vi.mock('next/image', () => ({
    default: ({ alt, priority, ...props }) => <img alt={alt} {...props} />,
}));

describe('Home page', () => {
    const supplierNames = ['Avani', 'Citi Quartz', 'Daltile Stone Center', 'MSI Surfaces', 'Quartz America'];

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
        expect(screen.getByRole('heading', { name: /need help narrowing the shortlist/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /start/i })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /send estimate request/i })).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: /switch to light mode/i })).toBeInTheDocument();
        expect(screen.getAllByRole('button', { name: /curated slabs/i })).toHaveLength(5);
        expect(
            screen
                .getAllByRole('heading', { level: 3 })
                .map((heading) => heading.textContent)
                .filter((heading) => supplierNames.includes(heading))
        ).toEqual(supplierNames);
        expect(screen.getByText(/new name, refined presentation, and the same fast-turn countertop process/i)).toBeInTheDocument();
        expect(screen.queryByText(/3 curated slabs ready to preview/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/\(513\) 712-5300/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/calacatta laza/i)).not.toBeInTheDocument();
    });
});