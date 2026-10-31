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

        expect(screen.getByText('Oferta de otoño')).toBeInTheDocument();
        expect(screen.getByText('Oferta válida del 15 de octubre al 15 de diciembre de 2026.')).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Fregaderos gratis' })).toHaveAttribute('href', '#quote');
        expect(screen.getByRole('heading', { level: 2, name: 'Fregadero de acero inoxidable gratis en proyectos seleccionados.' })).toBeInTheDocument();
        expect(screen.getByRole('img', { name: /fregadero de cocina de acero inoxidable calibre 18/i })).toHaveAttribute('src', '/promos/free-sink-18g.png');
        expect(screen.getByRole('heading', { name: /cubiertas premium/i })).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: /materiales seleccionados/i })).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: /preguntas frecuentes/i })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /switch to english/i })).toHaveAttribute('href', '/');
        expect(screen.getAllByText(/solicitar presupuesto/i).length).toBeGreaterThan(0);
    });
});
