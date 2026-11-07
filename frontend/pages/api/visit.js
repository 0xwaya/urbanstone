import { researchVisit } from '../../lib/visit-research';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const visit = req.body?.visit && typeof req.body.visit === 'object' ? req.body.visit : {};
    const research = researchVisit({ headers: req.headers || {}, visit });
    return res.status(200).json({ ok: true, research });
}
