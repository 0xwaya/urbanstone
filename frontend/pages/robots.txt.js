import { getSiteUrl } from '../lib/site';

export async function getServerSideProps({ res }) {
    const siteUrl = getSiteUrl();

    // AI assistants and answer engines (ChatGPT, Claude, Perplexity, Google AI
    // Overviews, Amazon, ByteDance) are explicitly welcomed alongside standard
    // search crawlers so this site can be cited in AI-generated local answers.
    const aiCrawlerUserAgents = [
        'GPTBot',
        'ChatGPT-User',
        'OAI-SearchBot',
        'ClaudeBot',
        'Claude-Web',
        'PerplexityBot',
        'Google-Extended',
        'Applebot-Extended',
        'Amazonbot',
        'Bytespider',
        'CCBot',
    ];

    const aiCrawlerRules = aiCrawlerUserAgents
        .map((userAgent) => `User-agent: ${userAgent}\nAllow: /\n`)
        .join('\n');

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.write(
        `User-agent: *\nAllow: /\nAllow: /api/og-image\nDisallow: /api/\nDisallow: /contractors/login\nDisallow: /*?*\n\n${aiCrawlerRules}\nHost: ${siteUrl}\nSitemap: ${siteUrl}/sitemap.xml\n`
    );
    res.end();

    return {
        props: {},
    };
}

export default function RobotsTxt() {
    return null;
}
