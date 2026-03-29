import { getSiteUrl } from '../lib/site';

export async function getServerSideProps({ res }) {
    const siteUrl = getSiteUrl();

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.write(`User-agent: *\nAllow: /\nDisallow: /api/\n\nHost: ${siteUrl}\nSitemap: ${siteUrl}/sitemap.xml\n`);
    res.end();

    return {
        props: {},
    };
}

export default function RobotsTxt() {
    return null;
}