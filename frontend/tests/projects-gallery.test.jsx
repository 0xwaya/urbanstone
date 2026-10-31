import { act, fireEvent, render, screen, within } from '@testing-library/react';

import ProjectsGallery from '../components/ProjectsGallery';
import ProjectsPage from '../components/projects/ProjectsPage';
import { getFeaturedProjects, getProjects } from '../data/projects';

vi.mock('next/head', () => ({ default: ({ children }) => <>{children}</> }));
vi.mock('next/image', () => ({
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    default: ({ alt, priority, fill, ...props }) => <img alt={alt} {...props} />,
}));
vi.mock('../components/ChatWidget', () => ({ default: () => null }));

function mockReducedMotion(reduce) {
    Object.defineProperty(window, 'matchMedia', {
        writable: true,
        configurable: true,
        value: vi.fn().mockImplementation((query) => ({
            matches: reduce && query.includes('reduce'),
            media: query,
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            addListener: vi.fn(),
            removeListener: vi.fn(),
        })),
    });
}

const featured = getFeaturedProjects('en');
const current = () => screen.getAllByRole('group').find((g) => g.getAttribute('aria-hidden') === 'false');

describe('ProjectsGallery carousel', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        mockReducedMotion(false);
    });
    afterEach(() => vi.useRealTimers());

    it('renders the featured set with accessible controls and a see-all link', () => {
        render(<ProjectsGallery />);
        expect(screen.getByRole('heading', { name: /recent projects around cincinnati/i })).toBeInTheDocument();
        expect(screen.getByRole('region', { name: /featured projects/i })).toHaveAttribute('aria-roledescription', 'carousel');
        expect(screen.getAllByRole('group', { hidden: true })).toHaveLength(featured.length);
        expect(current()).toHaveAttribute('aria-label', `1 of ${featured.length}: ${featured[0].title}`);
        expect(screen.getByRole('button', { name: /next project/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /pause rotation/i })).toBeInTheDocument();
        expect(screen.getAllByRole('link', { name: /see all projects/i })[0]).toHaveAttribute('href', '/projects');
        expect(screen.getAllByText('Over-the-Rhine, Cincinnati').length).toBeGreaterThan(0);
        expect(screen.queryAllByRole('link', { name: /zillow/i, hidden: true })).toHaveLength(0);
    });

    it('lazy-renders only the current slide and its neighbours', () => {
        render(<ProjectsGallery />);
        const imgs = document.querySelectorAll('img');
        expect(imgs.length).toBeLessThan(featured.length);
    });

    it('auto-advances, pauses on hover and on the pause button', () => {
        render(<ProjectsGallery intervalMs={1000} />);
        act(() => { vi.advanceTimersByTime(1000); });
        expect(current()).toHaveAttribute('aria-label', expect.stringMatching(/^2 of/));

        const region = screen.getByRole('region', { name: /featured projects/i });
        fireEvent.mouseEnter(region);
        act(() => { vi.advanceTimersByTime(3000); });
        expect(current()).toHaveAttribute('aria-label', expect.stringMatching(/^2 of/));
        fireEvent.mouseLeave(region);

        fireEvent.click(screen.getByRole('button', { name: /pause rotation/i }));
        act(() => { vi.advanceTimersByTime(3000); });
        expect(current()).toHaveAttribute('aria-label', expect.stringMatching(/^2 of/));
        expect(screen.getByRole('button', { name: /play rotation/i })).toBeInTheDocument();
    });

    it('does not auto-advance with prefers-reduced-motion', () => {
        mockReducedMotion(true);
        render(<ProjectsGallery intervalMs={1000} />);
        act(() => { vi.advanceTimersByTime(5000); });
        expect(current()).toHaveAttribute('aria-label', expect.stringMatching(/^1 of/));
        expect(screen.queryByRole('button', { name: /pause rotation/i })).not.toBeInTheDocument();
    });

    it('supports swipe, dots and arrow keys', () => {
        render(<ProjectsGallery />);
        const track = current().parentElement.parentElement;
        fireEvent.touchStart(track, { touches: [{ clientX: 300 }] });
        fireEvent.touchEnd(track, { changedTouches: [{ clientX: 100 }] });
        expect(current()).toHaveAttribute('aria-label', expect.stringMatching(/^2 of/));
        fireEvent.click(screen.getByRole('button', { name: 'Show project 1' }));
        expect(current()).toHaveAttribute('aria-label', expect.stringMatching(/^1 of/));
        fireEvent.keyDown(screen.getByRole('region', { name: /featured projects/i }), { key: 'ArrowLeft' });
        expect(current()).toHaveAttribute('aria-label', expect.stringMatching(new RegExp(`^${featured.length} of`)));
    });

    it('opens the lightbox from a slide', () => {
        render(<ProjectsGallery />);
        fireEvent.click(within(current()).getByRole('button', { name: /^view 3 photos$/i }));
        const dialog = screen.getByRole('dialog');
        expect(within(dialog).getByText(/1 of 3/)).toBeInTheDocument();
        fireEvent.keyDown(document, { key: 'Escape' });
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('renders Spanish copy', () => {
        render(<ProjectsGallery language="es" />);
        expect(screen.getByRole('heading', { name: /proyectos recientes/i })).toBeInTheDocument();
        expect(screen.getAllByRole('link', { name: /ver todos los proyectos/i })[0]).toHaveAttribute('href', '/es/projects');
    });
});

describe('ProjectsPage', () => {
    beforeAll(() => mockReducedMotion(false));

    it('lists every project grouped by job, without listing links', () => {
        render(<ProjectsPage />);
        expect(screen.getByRole('heading', { level: 1, name: /our projects/i })).toBeInTheDocument();
        expect(screen.getByRole('heading', { level: 2, name: /over-the-rhine loft/i })).toBeInTheDocument();
        expect(screen.getAllByRole('heading', { level: 3 }).length).toBeGreaterThanOrEqual(getProjects('en').length);
        expect(screen.queryByRole('link', { name: /zillow/i })).toBeNull();
        expect(document.body.textContent).not.toMatch(/for sale/i);
    });
});
