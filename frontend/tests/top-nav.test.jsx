import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import TopNav from '../components/TopNav';

vi.mock('next/link', () => ({
    default: ({ children, ...props }) => <a {...props}>{children}</a>,
}));

describe('TopNav', () => {
    it('opens the mobile menu and closes it after choosing a destination', async () => {
        const user = userEvent.setup();
        render(<TopNav />);

        const menuButton = screen.getByRole('button', { name: /open navigation menu/i });
        expect(screen.queryByText('Direct contact')).not.toBeInTheDocument();

        await user.click(menuButton);

        const closeButton = screen.getByRole('button', { name: /close navigation menu/i });
        expect(closeButton).toHaveAttribute('aria-expanded', 'true');
        expect(screen.getByRole('link', { name: 'Get an Estimate' })).toHaveFocus();
        expect(screen.getByText('Direct contact')).toBeInTheDocument();

        await user.keyboard('{Shift>}{Tab}{/Shift}');
        const languageLinks = screen.getAllByRole('link', { name: /cambiar a español/i });
        expect(languageLinks[languageLinks.length - 1]).toHaveFocus();

        const materialLinks = screen.getAllByRole('link', { name: 'Materials' }).filter((link) => link.getAttribute('href') === '#suppliers');
        await user.click(materialLinks[materialLinks.length - 1]);

        expect(screen.getByRole('button', { name: /open navigation menu/i })).toHaveAttribute('aria-expanded', 'false');
        expect(menuButton).toHaveFocus();
        expect(screen.queryByText('Direct contact')).not.toBeInTheDocument();
    });
});