import { getCanonicalUrl } from '../lib/site';
import { materialPages } from '../data/material-pages';
import { serviceAreas } from '../data/service-areas';

function escapeXml(value) {
    return String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&apos;');
}

export async function getServerSideProps({ res }) {
    const lastmod = process.env.SITE_BUILD_DATE || new Date().toISOString().slice(0, 10);
    const urls = [
        {
            loc: getCanonicalUrl('/'),
            changefreq: 'weekly',
            priority: '1.0',
        },
        {
            loc: getCanonicalUrl('/es'),
            changefreq: 'weekly',
            priority: '0.9',
        },
        {
            loc: getCanonicalUrl('/projects'),
            changefreq: 'weekly',
            priority: '0.8',
        },
        {
            loc: getCanonicalUrl('/es/projects'),
            changefreq: 'weekly',
            priority: '0.7',
        },
        {
            loc: getCanonicalUrl('/coverage'),
            changefreq: 'weekly',
            priority: '0.9',
        },
        ...serviceAreas.map((area) => ({
            loc: getCanonicalUrl(`/service-areas/${area.slug}`),
            changefreq: 'weekly',
            priority: '0.8',
        })),
        ...materialPages.map((page) => ({
            loc: getCanonicalUrl(`/materials/${page.slug}`),
            changefreq: 'weekly',
            priority: '0.8',
        })),
    ];

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((entry) => `  <url>
    <loc>${escapeXml(entry.loc)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${entry.changefreq}</changefreq>
    <priority>${entry.priority}</priority>
  </url>`).join('\n')}
</urlset>`;

    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.write(xml);
    res.end();

    return {
        props: {},
    };
}

export default function SitemapXml() {
    return null;
}
