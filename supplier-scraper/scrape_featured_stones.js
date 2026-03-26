import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as cheerio from 'cheerio';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sourcesPath = path.join(__dirname, 'sources', 'featured-sources.json');
const outputPath = path.join(__dirname, 'featured-stones.output.json');

async function fetchHtml(url) {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'AmazonGraniteScraper/1.0 (+https://amazongranite.com)'
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }

  return response.text();
}

function extractImageUrl(html, selector, attr) {
  const $ = cheerio.load(html);
  const node = $(selector).first();
  const value = attr ? node.attr(attr) : node.attr('content') || node.attr('src');
  return value || null;
}

function normalizeUrl(base, url) {
  if (!url) return null;
  try {
    return new URL(url, base).toString();
  } catch {
    return url;
  }
}

async function scrapeStone(stone) {
  const html = await fetchHtml(stone.pageUrl);
  const imageUrl = extractImageUrl(html, stone.imageSelector, stone.imageAttr);
  return {
    name: stone.name,
    pageUrl: stone.pageUrl,
    image: normalizeUrl(stone.pageUrl, imageUrl)
  };
}

async function run() {
  const sources = JSON.parse(fs.readFileSync(sourcesPath, 'utf-8'));
  const result = [];

  for (const supplier of sources.suppliers) {
    const slabs = [];
    for (const stone of supplier.stones) {
      try {
        const slab = await scrapeStone(stone);
        slabs.push({
          name: slab.name,
          notes: stone.notes || 'Trending selection',
          image: slab.image,
          imageLarge: slab.image
        });
      } catch (error) {
        slabs.push({
          name: stone.name,
          notes: 'Image needs manual verification',
          image: null,
          imageLarge: null,
          error: error.message
        });
      }
    }

    result.push({
      name: supplier.name,
      portal: supplier.portal,
      logo: supplier.logo,
      note: supplier.note,
      tiers: [
        {
          name: 'Featured Best Sellers',
          range: 'Top 4–5',
          slabs
        }
      ]
    });
  }

  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
  console.log(`Saved ${result.length} suppliers to ${outputPath}`);
}

run().catch((error) => {
  console.error('Scrape failed:', error.message);
  process.exit(1);
});
