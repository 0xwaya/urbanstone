# Changelog

## [Unreleased]

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
