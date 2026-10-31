import { getServerSideProps as llms } from '../pages/llms.txt.js';
import { getServerSideProps as sitemap } from '../pages/sitemap.xml.js';

function capture(handler) {
    let body = '';
    const res = { setHeader: () => {}, write: (chunk) => { body += chunk; }, end: () => {} };
    return handler({ res }).then(() => body);
}

describe('projects SEO surfaces', () => {
    it('sitemap lists /projects and /es/projects', async () => {
        const xml = await capture(sitemap);
        expect(xml).toMatch(/<loc>[^<]*\/projects<\/loc>/);
        expect(xml).toMatch(/<loc>[^<]*\/es\/projects<\/loc>/);
    });

    it('llms.txt links the projects gallery and lists projects without listing links', async () => {
        const text = await capture(llms);
        expect(text).toMatch(/\[Projects gallery\]\([^)]*\/projects\)/);
        expect(text).toContain('## Recent Projects');
        expect(text).toContain('Over-the-Rhine, Cincinnati');
        expect(text).not.toMatch(/zillow|for rent|for sale/i);
    });
});
