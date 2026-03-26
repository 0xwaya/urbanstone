# Supplier Scraper Module

## Purpose
This module will scrape gallery stone slab images, descriptions, and pricing tiers from the websites of suppliers such as Daltile Stone Center, Quart America, Avani, MSI, Stonemart, and Citi Quartz.

## Approach
- Use Node.js with libraries like Axios and Cheerio for HTTP requests and HTML parsing.
- Design scraping functions per supplier due to site structure differences.
- Cache or store scraped data in a local database or JSON files.
- Schedule scraper runs regularly or triggered by webhooks.
- Provide an API for the frontend to fetch latest stone slab galleries and prices.

## Featured Stone Scraper (MVP)

### What it does
- Scrapes 4–5 trending/best-selling stones per supplier from configured product pages.
- Extracts a primary image URL (OG image by default).
- Writes output to `featured-stones.output.json` for frontend use.

### Files
- `sources/featured-sources.json` — supplier list + product page selectors.
- `scrape_featured_stones.js` — scraper script.

### Run
```bash
cd supplier-scraper
npm install cheerio
node scrape_featured_stones.js
```

### Output
- `featured-stones.output.json` (copy to `frontend/data/featured-stones.json` after verification)

### Notes
- Verify image accuracy before publishing.
- Update `imageSelector`/`imageAttr` per supplier as needed.

## Next Steps
- Investigate supplier website structures and update scraping rules.
- Build and test scrapers for each supplier.
- Integrate scraped data into backend API endpoints.
- Automate scraping and ensure compliance with terms of service.
