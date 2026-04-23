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
