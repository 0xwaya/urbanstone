# SEO/CRO Structure

This document covers how the frontend is organized for local SEO discovery, internal linking, and quote-conversion flow.

## Core Layers

### Routes

- `pages/index.jsx`: homepage and primary Cincinnati landing page
- `pages/coverage/index.jsx`: crawlable hub for city pages and material pages
- `pages/service-areas/[slug].jsx`: city-level landing pages
- `pages/materials/[slug].jsx`: material-by-city landing pages
- `pages/robots.txt.js`: crawl directives
- `pages/sitemap.xml.js`: sitemap assembled from shared data arrays
- `pages/api/lead.js`: quote-request intake endpoint

### Shared Data Layer

- `data/service-areas.js`: city metadata, nearby areas, related areas, project types, competitor cities, and page-level FAQs
- `data/material-pages.js`: material metadata, best-fit use cases, project types, competitor cities, related material pages, and page-level FAQs
- `lib/site.js`: canonical URL and production-origin helper

### Shared Components

- `TopNav`: top-level navigation and brand pathing
- `Hero`: primary promise, service footprint, and first CTA layer
- `FeaturesBar`: compact announcement strip used for current business updates and quick trust compression
- `ServiceAreasSection`: internal-link hub into city pages
- `SuppliersSection`: material browsing surface and slab exploration
- `LeadForm`: main CRO capture surface with route-specific copy overrides
- `FAQSection`: homepage FAQ block and FAQ schema source
- `RelatedPages`: reusable internal-link block used by city and material templates
- `Footer`: persistent coverage-hub and deep-link cluster
- `ChatWidget`: floating contact support path

## SEO Model

The current structure uses a hub-and-spoke model:

1. Homepage targets Cincinnati + broad countertop intent.
2. Coverage hub aggregates city and material landing pages.
3. City pages target location intent.
4. Material pages target higher-intent location + material combinations.
5. Footer, city template, and material template all reinforce the internal-link graph.
6. Sitemap and canonical URLs are generated from the same shared data contracts.

## CRO Model

The homepage and landing pages use a staged conversion flow:

1. `Hero` captures core service intent and introduces the main CTA.
2. `FeaturesBar` compresses the current business announcement and quick trust signals into a minimal strip.
3. `ServiceAreasSection` routes users deeper if they want location specificity.
4. `SuppliersSection` answers material curiosity and keeps users on-site.
5. `LeadForm` captures the quote request once intent is established.
6. `FAQSection` resolves final objections.
7. `Footer` gives one more navigation and conversion path.

## Data Contract Notes

### Service Areas

Each city object should include:

- `slug`
- `city`
- `state`
- `headline`
- `metaDescription`
- `intro`
- `nearbyAreas`
- `relatedAreas`
- `projectTypes`
- `competitorCities`
- `faqItems`

### Material Pages

Each material object should include:

- `slug`
- `city`
- `state`
- `material`
- `materialLabel`
- `headline`
- `metaDescription`
- `intro`
- `bestFor`
- `nearbyAreas`
- `serviceAreaSlug`
- `relatedPageSlugs`
- `projectTypes`
- `competitorCities`
- `faqItems`

## Structural Diagram

```mermaid
flowchart TD
    A[frontend] --> B[pages]
    A --> C[components]
    A --> D[data]
    A --> E[lib/site.js]

    B --> B1[index.jsx]
    B --> B2[coverage/index.jsx]
    B --> B3[service-areas/[slug].jsx]
    B --> B4[materials/[slug].jsx]
    B --> B5[robots.txt.js]
    B --> B6[sitemap.xml.js]
    B --> B7[api/lead.js]

    D --> D1[service-areas.js]
    D --> D2[material-pages.js]
    D --> D3[featured-stones.json]
    D --> D4[supplier-summaries.json]

    C --> C1[TopNav]
    C --> C2[Hero]
    C --> C3[FeaturesBar]
    C --> C4[ServiceAreasSection]
    C --> C5[SuppliersSection]
    C --> C6[LeadForm]
    C --> C7[FAQSection]
    C --> C8[RelatedPages]
    C --> C9[Footer]
    C --> C10[ChatWidget]

    B1 --> C1
    B1 --> C2
    B1 --> C3
    B1 --> C4
    B1 --> C5
    B1 --> C6
    B1 --> C7
    B1 --> C9
    B1 --> C10

    B2 --> C1
    B2 --> C9
    B2 --> C10

    B3 --> C1
    B3 --> C6
    B3 --> C8
    B3 --> C9
    B3 --> C10

    B4 --> C1
    B4 --> C6
    B4 --> C8
    B4 --> C9
    B4 --> C10

    B1 --> D1
    B2 --> D1
    B2 --> D2
    B3 --> D1
    B3 --> D2
    B4 --> D1
    B4 --> D2
    B6 --> D1
    B6 --> D2
    B1 --> E
    B2 --> E
    B3 --> E
    B4 --> E
    B5 --> E
    B6 --> E
```

## Detailed Diagram: FeaturesBar Area

This is the more detailed structural map around `components/FeaturesBar.jsx`.

```mermaid
flowchart TD
    H[index.jsx] --> N[TopNav]
    H --> HR[Hero]
    H --> FB[FeaturesBar]
    H --> SA[ServiceAreasSection]
    H --> SG[SuppliersSection]
    H --> LF[LeadForm]
    H --> FQ[FAQSection]
    H --> FT[Footer]
    H --> CW[ChatWidget]

    FB --> FB1[Lead time card\n3-5 day turnaround]
    FB --> FB2[Suppliers card\n5 curated partners]
    FB --> FB3[Material format card\n3cm slabs]
    FB --> FB4[Service footprint card\n50-mile radius]

    HR -. primes intent for .-> FB
    FB -. compresses trust before .-> SA
    FB -. supports material curiosity before .-> SG
    FB -. reduces risk before .-> LF

    FB1 -. schedule confidence .-> LF
    FB2 -. sourcing confidence .-> SG
    FB3 -. fabrication specificity .-> SG
    FB4 -. local coverage confidence .-> SA

    SA -. deeper location discovery .-> B3[service-areas/[slug].jsx]
    SG -. material exploration .-> B4[materials/[slug].jsx]
    LF -. quote capture .-> API[api/lead.js]
    FQ -. objection handling .-> LF
    FT -. persistent deep links .-> B2[coverage/index.jsx]
```

## Next Improvement Levers

- Homepage FAQ content already lives in a dedicated data module; keep extending that module instead of embedding homepage FAQ copy directly in components.
- `LeadForm` already accepts route-specific copy; extend those content objects instead of editing the component for each landing page.
- Add optional schema fields into the data layer if individual pages need richer JSON-LD beyond current business + FAQ coverage.
- If the page count grows substantially, consider separating SEO content data from routing data so editors can update copy without touching template logic.
