import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import PublicPhoneApp from '../pages/app';

vi.mock('next/head', () => ({
    default: ({ children }) => <>{children}</>,
}));

vi.mock('next/link', () => ({
    default: ({ href, children, ...props }) => <a href={href} {...props}>{children}</a>,
}));

vi.mock('../components/StoneHavenChat', () => ({
    default: () => <div>Onyx thread</div>,
}));

function mockMatchMedia(matches) {
    Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation(() => ({
            matches,
            media: '',
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
        })),
    });
}

describe('phone app page', () => {
    beforeEach(() => {
        mockMatchMedia(false);
        window.navigator.standalone = false;
        delete window.navigator.share;
        window.navigator.serviceWorker = {
            getRegistrations: vi.fn().mockResolvedValue([]),
        };
    });

    it('does not open the share sheet on iPhone', async () => {
        const share = vi.fn();
        window.navigator.share = share;
        render(<PublicPhoneApp />);

        expect(screen.queryByRole('button', { name: 'Add to Home Screen' })).not.toBeInTheDocument();
        expect(screen.getByRole('img', { name: 'Urban Stone Collective brand icon' })).toBeInTheDocument();
        expect(screen.getByText(/tap Share at the bottom of the screen/i)).toBeInTheDocument();
        expect(share).not.toHaveBeenCalled();
    });

    it('installs in one tap only when the browser offers an install prompt', async () => {
        const prompt = vi.fn().mockResolvedValue(undefined);
        const share = vi.fn();
        window.navigator.share = share;
        const user = userEvent.setup();
        render(<PublicPhoneApp />);
        await act(async () => {
            window.dispatchEvent(Object.assign(new Event('beforeinstallprompt'), { prompt }));
        });

        await user.click(screen.getByRole('button', { name: 'Add to Home Screen' }));

        expect(prompt).toHaveBeenCalledTimes(1);
        expect(share).not.toHaveBeenCalled();
    });

    it('opens the app home, not the installer, when launched from the Home Screen', () => {
        mockMatchMedia(true);
        render(<PublicPhoneApp />);

        expect(screen.queryByRole('button', { name: 'Add to Home Screen' })).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Chat' })).toBeInTheDocument();
        expect(screen.getByRole('img', { name: 'Urban Stone Collective brand icon' })).toBeInTheDocument();
    });
});
