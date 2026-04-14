import { getChatReply } from '../../lib/chatbot';

export default function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { message } = req.body || {};

    if (!message || typeof message !== 'string') {
        return res.status(400).json({ error: 'Message is required.' });
    }

    const { reply, sources } = getChatReply(message);
    const phone = process.env.NEXT_PUBLIC_COMPANY_PHONE || '(513) 307-5840';
    const email = process.env.NEXT_PUBLIC_LEAD_EMAIL || 'sales@urbanstone.co';

    return res.status(200).json({
        reply,
        sources,
        contact: {
            phone,
            email,
        },
    });
}
