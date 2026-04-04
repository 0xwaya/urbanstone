import fs from 'node:fs';
import path from 'node:path';

const OG_IMAGE_PATH = path.resolve(process.cwd(), 'public/brand/urban-stone-og.png');

export default function handler(req, res) {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
        res.status(405).end();
        return;
    }

    let stat;
    try {
        stat = fs.statSync(OG_IMAGE_PATH);
    } catch {
        res.status(404).end();
        return;
    }

    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Length', stat.size);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800');
    res.setHeader('X-Content-Type-Options', 'nosniff');

    if (req.method === 'HEAD') {
        res.status(200).end();
        return;
    }

    const stream = fs.createReadStream(OG_IMAGE_PATH);
    stream.on('error', () => res.status(500).end());
    stream.pipe(res);
}
