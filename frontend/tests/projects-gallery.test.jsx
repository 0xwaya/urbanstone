import { fireEvent, render, screen, within } from '@testing-library/react';

import ProjectsGallery from '../components/ProjectsGallery';
import { projectsContent } from '../data/projects-content';

vi.mock('next/image', () => ({
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    default: ({ alt, priority, fill, ...props }) => <img alt={alt} {...props} />,
}));

describe('ProjectsGallery', () => {
    it('lists the real projects with descriptive alt text', () => {
        render(<ProjectsGallery />);
        expect(screen.getByRole('heading', { name: /recent projects in cincinnati/i })).toBeInTheDocument();
        expect(screen.getAllByRole('heading', { level: 4 })).toHaveLength(4);
        expect(screen.getByRole('heading', { level: 3, name: /over-the-rhine loft/i })).toBeInTheDocument();
        expect(screen.getAllByText('Over-the-Rhine, Cincinnati').length).toBeGreaterThan(0);
        const listing = screen.getByRole('link', { name: /view the listing on zillow/i });
        expect(listing).toHaveAttribute('href', 'https://www.zillow.com/homedetails/214-E-14th-St-Unit-2A-Cincinnati-OH-45202/2058257360_zpid/');
        expect(listing).toHaveAttribute('target', '_blank');
        expect(listing).toHaveAttribute('rel', 'noopener noreferrer nofollow');
        expect(screen.getByText(/available for rent/i)).toBeInTheDocument();
        expect(document.body.textContent).not.toMatch(/for sale|en venta/i);
        for (const project of projectsContent.en.jobs.flatMap((job) => job.projects)) {
            for (const photo of project.photos) {
                expect(photo.alt.length).toBeGreaterThan(30);
                expect(photo.src).toMatch(/^\/projects\/.+\.jpg$/);
            }
        }
        expect(screen.getByRole('link', { name: /start your project/i })).toHaveAttribute('href', '#quote');
    });

    it('opens a lightbox, pages through photos and closes on Escape', () => {
        render(<ProjectsGallery />);
        fireEvent.click(screen.getByRole('button', { name: /view photos: custom bathroom, over-the-rhine, cincinnati \(3 photos\)/i }));
        const dialog = screen.getByRole('dialog');
        expect(within(dialog).getByText(/1 of 3/)).toBeInTheDocument();
        fireEvent.click(within(dialog).getByRole('button', { name: /next photo/i }));
        expect(within(dialog).getByText(/2 of 3/)).toBeInTheDocument();
        fireEvent.keyDown(document, { key: 'Escape' });
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('renders Spanish copy', () => {
        render(<ProjectsGallery language="es" />);
        expect(screen.getByRole('heading', { name: /proyectos recientes en cincinnati/i })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /empieza tu proyecto/i })).toHaveAttribute('href', '#quote');
        expect(screen.getByText(/disponible para renta/i)).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /ver el anuncio en zillow/i })).toHaveAttribute('rel', 'noopener noreferrer nofollow');
    });
});
