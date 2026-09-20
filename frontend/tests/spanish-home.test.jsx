import { render, screen } from '@testing-library/react';

import SpanishHome from '../pages/es/index';

vi.mock('next/head', () => ({
    default: ({ children }) => <>{children}</>,
}));

vi.mock('next/image', () => ({
    default: ({ alt, priority, ...props }) => <img alt={alt} {...props} />,
}));

vi.mock('../components/ChatWidget', () => ({
    default: () => null,
}));

describe('Spanish home portal', () => {
    it('renders the Spanish customer experience and English switcher', { timeout: 15000 }, () => {
        render(<SpanishHome />);

        expect(screen.getByRole('heading', { name: /cubiertas premium/i })).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: /materiales seleccionados/i })).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: /preguntas frecuentes/i })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /switch to english/i })).toHaveAttribute('href', '/');
        expect(screen.getAllByText(/solicitar presupuesto/i).length).toBeGreaterThan(0);
    });
});
