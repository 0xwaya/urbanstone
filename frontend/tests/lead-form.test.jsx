import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import LeadForm from '../components/LeadForm';

describe('LeadForm', () => {
    beforeEach(() => {
        vi.stubGlobal('fetch', vi.fn());
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('submits the contact details and shows the success response', async () => {
        const user = userEvent.setup();
        fetch.mockResolvedValue({
            ok: true,
            json: async () => ({ message: 'Estimate request received.' }),
        });

        render(<LeadForm />);

        await user.type(screen.getByRole('textbox', { name: 'Full name' }), 'Alex Stone');
        await user.type(screen.getByRole('textbox', { name: 'Email' }), 'alex@example.com');
        await user.type(screen.getByRole('textbox', { name: 'Phone' }), '513-555-0100');
        await user.type(screen.getByRole('spinbutton', { name: 'Total square footage' }), '54');
        await user.click(screen.getByRole('button', { name: 'Continue' }));
        await user.click(screen.getByRole('button', { name: 'No removal needed' }));
        await user.click(screen.getByRole('button', { name: 'Single bowl' }));
        await user.click(screen.getByRole('button', { name: 'Undermount' }));
        await user.click(screen.getByRole('button', { name: 'Stainless steel' }));
        await user.click(screen.getByRole('button', { name: 'Continue' }));
        await user.click(screen.getByRole('button', { name: '4 in backsplash' }));
        await user.click(screen.getByRole('button', { name: '1 week' }));
        await user.click(screen.getByRole('button', { name: /Kodiak from Daltile/i }));
        await user.click(screen.getByRole('button', { name: /send estimate request/i }));

        await waitFor(() => expect(fetch).toHaveBeenCalledWith('/api/lead', expect.objectContaining({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: expect.stringContaining('Alex Stone'),
        })));
        expect(await screen.findByText('Estimate request received.')).toBeInTheDocument();
    }, 15000);
});