# Changelog

## [2.0.0] - 2026-09-20

- Added conversion-critical component coverage for `LeadForm`, `TopNav`, and `ChatWidget`.
- Centralized lead-form options and validation for web, mobile, and server consumers.
- Upgraded the frontend runtime from React 18 to React 19.1.0.
- Added keyboard focus trapping, dialog semantics, Escape handling, and focus restoration to chat and mobile navigation.
- Converted the residential estimate form into a validated three-step flow.

## [2.0.1] - 2026-09-20

- Localization: Added a full Spanish customer portal at `/es` with translated hero, materials, estimate, FAQ, contractor, footer, and language-aware navigation sections.
- SEO: Added reciprocal `hreflang` metadata, Spanish local-business and breadcrumb schema, `/es` sitemap discovery, and bilingual guidance in `/llms.txt`.
- Contact: Added one-tap SMS links with prefilled context messages targeting `+15133075840` across navigation, estimate, chat, and contractor access surfaces.
- Chat: Renamed the customer-facing assistant from Haven/Stone Haven to **Onyx**, with **Onyx AI Assistant** as the descriptive label.

## [2.0.2] - 2026-09-20

- SEO: Added a dedicated `/materials/cincinnati-quartz-countertops` landing page targeting Cincinnati quartz countertop intent with localized FAQs, pricing guidance, slab selection content, and estimate conversion paths.
- SEO: Added separate Cincinnati quartzite and granite landing pages and focused material schema so quartz, quartzite, and granite intent is targeted on individual pages.
- UX: Added a premium positioning and reviews section emphasizing curated materials, fast target installs, and personalized support.
- Reviews: Added opt-in, clearly labeled staging-only demo cards controlled by `NEXT_PUBLIC_REVIEW_DEMO_MODE`; production defaults to authentic Google review collection.
- SEO: Added shared `buildLocalBusinessSchema` helper (`lib/seo.js`) with `priceRange`, service-hub `geo` coordinates, `GeoCircle` service radius, and a `hasOfferCatalog` of quartz/granite/quartzite services; applied across homepage, service-area, and material pages
- SEO: Added homepage breadcrumb JSON-LD and a new local-intent FAQ entry targeting "countertop company near me" style searches
- AI discoverability: `robots.txt` now explicitly allows GPTBot, ChatGPT-User, OAI-SearchBot, ClaudeBot, Claude-Web, PerplexityBot, Google-Extended, Applebot-Extended, Amazonbot, Bytespider, and CCBot
- AI discoverability: Added `/llms.txt` route with a business summary, contact info, service area, and full page link map for AI assistants and answer engines
- SEO: Hardened canonical origin resolution so production metadata cannot fall back to localhost-style origins
- SEO: Upgraded dynamic sitemap output with `lastmod` timestamps and XML escaping for safer indexing
- SEO: Tightened robots directives (`/contractors/login` and querystring crawl suppression) and kept sitemap/host hints explicit
- SEO: Added `X-Robots-Tag` noindex headers for API routes and contractor login endpoint
- SEO: Added font preconnect hints and explicit `en-US` document language for cleaner crawl/render signals
- SEO: Added homepage `WebSite` JSON-LD schema and expanded Open Graph locale metadata
- Contractor portal: Rebuilt `/contractors` after a broken JSX merge left the page with an unexpected EOF build failure
- Homepage UX: Reworked the hero into a stronger two-column layout with proof points and a clearer next-step briefing while keeping the existing brand system
- Homepage UX: Restored the contractor portal teaser on the homepage as a secondary conversion block instead of exposing contractor pricing publicly
- Quality: Fixed `LeadForm` quote-open hook dependencies, escaped chat copy for lint cleanliness, and aligned CSS import order for local builds
- Testing: Mocked `ChatWidget` in the homepage unit test so local rendering checks stay fast and deterministic
- Bot UX: Replaced the duplicated chat popup implementation with a single stable widget path and a shared local Stone Haven chat client instead of a blocked localhost iframe fallback
- Bot backend: Changed MemPalace lookups to use the supported `search` command and short-circuited `/api/chat` to the internal knowledge base when `ollama` is unavailable
- Bot UX: Added a default Stone Haven welcome greeting so chat starts with customer-facing context instead of a blank panel
- Bot intake: Tightened estimate-intake state detection and submission confirmation to reduce accidental or scripted lead pushes
- Bot payloads: Aligned chat-estimate relay payloads with lead webhook contract fields (`requestId`, `dedupeKey`, and `metadata`)
- Bot knowledge: Expanded Stone Haven owner/history/service/quote policy references in local chatbot knowledge config
- Bot tuning: Added curated recommendation routing for residential/contractor/builder asks, suppressed chat price ranges by default, and reduced repetitive residential guidance wording
- Bot tuning: Prevented location-specific reply drift for generic countertop asks and shifted follow-up prompts toward curated material/look discovery
- Bot intake: Fixed name-capture loop by accepting plain full-name replies after explicit full-name prompt while rejecting non-name probe text
- Bot UX: Added branded header logo, removed duplicate embedded header inside the popup, and aligned footer button colors with established theme tokens
- Bot UX: Added visible in-panel chat scroll rail indicator so users can see scroll state in long conversations
- Bot UX: Replaced the custom drag-scroll rail with stable native chat scrollbars for consistent Opera/Chromium behavior and easier message navigation
- Bot UX: Replaced remaining blue chat accents with branded gold gradients (launcher button, popup header, scrollbar thumb, user bubble accents, and in-chat link tint) while preserving shading and depth
- Bot UX: Updated chat footer action hover colors to gold-theme tones for consistent readability against dark surfaces
- Bot logic: Prevented duplicate self-introduction greetings within the same conversation history
- Bot tuning: Added strict policy/disclosure gating, retrieval re-ranking for chat intent, confidence-based field clarification, smart re-ask prompts, and intake memory-card persistence hooks
- Frontend design: Standardized section/card surfaces with new shared `brand-section` and `brand-card` classes and applied them across homepage, coverage, service-area, material, and contractor pages
- Frontend design: Refined chat popup contrast and footer controls to stay inside Urban Stone theme tokens and improve button readability
- Quality: Ran full frontend lint and test suite after styling and chatbot upgrades (`70/70` tests passing)
- Testing: Increased the homepage render test timeout to reduce local flake under heavy CPU and low-disk conditions
- Rebrand: All HavenBot references replaced with Stone Haven (UI, avatar, chatbot labels)
- Contact: Fallback email updated to <stonehaven@urbanstone.co>
- UI: Fixed missing styling/scripts and static asset issues in browser
- Chat: 'Dismiss' button replaced with 'Chat', modern popup chat window added
- Branding: 'wayalabs' in footer now all lowercase
- Chat UX: Only one popup at a time, draggable header, resets position on close, improved accessibility
- Infra: Added .gitignore to prevent chatbot source/config from being pushed until fully trained
- Troubleshooting: Documented port/static asset issues and fixes
- Backend: Noted chatbot backend requires `ollama` binary for LLM inference
