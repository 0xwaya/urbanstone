import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import ChatWidget from '../components/ChatWidget';

vi.mock('../components/StoneHavenChat', () => ({
    default: () => <div>Mock Onyx chat</div>,
}));

describe('ChatWidget', () => {
    it('opens, hands off to the quote form, and closes with Escape', async () => {
        const user = userEvent.setup();
        const quoteListener = vi.fn();
        document.addEventListener('urbanstone:quote-opened', quoteListener);

        render(<ChatWidget />);

        await waitFor(() => expect(screen.getByRole('button', { name: /chat with onyx/i })).toBeInTheDocument());
        await user.click(screen.getByRole('button', { name: /chat with onyx/i }));

        expect(screen.getByText('Mock Onyx chat')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /close chat/i })).toHaveFocus();
        await user.click(screen.getByRole('button', { name: /open estimate form/i }));
        expect(quoteListener).toHaveBeenCalledTimes(1);

        await user.keyboard('{Escape}');
        expect(screen.queryByText('Mock Onyx chat')).not.toBeInTheDocument();

        document.removeEventListener('urbanstone:quote-opened', quoteListener);
    });
});