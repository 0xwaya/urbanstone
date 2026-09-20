import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import ChatWidget from '../components/ChatWidget';

vi.mock('../components/StoneHavenChat', () => ({
    default: () => <div>Mock Stone Haven chat</div>,
}));

describe('ChatWidget', () => {
    it('opens, hands off to the quote form, and closes with Escape', async () => {
        const user = userEvent.setup();
        const quoteListener = vi.fn();
        document.addEventListener('urbanstone:quote-opened', quoteListener);

        render(<ChatWidget />);

        await waitFor(() => expect(screen.getByRole('button', { name: /chat with stone haven/i })).toBeInTheDocument());
        await user.click(screen.getByRole('button', { name: /chat with stone haven/i }));

        expect(screen.getByText('Mock Stone Haven chat')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /close chat/i })).toHaveFocus();
        await user.click(screen.getByRole('button', { name: /open estimate form/i }));
        expect(quoteListener).toHaveBeenCalledTimes(1);

        await user.keyboard('{Escape}');
        expect(screen.queryByText('Mock Stone Haven chat')).not.toBeInTheDocument();

        document.removeEventListener('urbanstone:quote-opened', quoteListener);
    });
});