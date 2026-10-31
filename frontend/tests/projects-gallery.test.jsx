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
        expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(4);
        for (const project of projectsContent.en.projects) {
            for (const photo of project.photos) {
                expect(photo.alt.length).toBeGreaterThan(30);
                expect(photo.src).toMatch(/^\/projects\/.+\.jpg$/);
            }
        }
        expect(screen.getByRole('link', { name: /start your project/i })).toHaveAttribute('href', '#quote');
    });

    it('opens a lightbox, pages through photos and closes on Escape', () => {
        render(<ProjectsGallery />);
        fireEvent.click(screen.getByRole('button', { name: /view photos: custom bathroom \(3 photos\)/i }));
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
    });
});
