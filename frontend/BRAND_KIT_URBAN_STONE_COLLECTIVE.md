# Urban Stone Collective — CSS/Font Brand Kit + Logo Prompt Flow

> Snapshot date: **March 31, 2026 (UTC)**

## 1) Live domain review (`urbanstone.co`)

A direct review of `https://urbanstone.co` currently redirects to a parked domain experience (`ww25.urbanstone.co`), so there is no stable production stylesheet/typography system to extract as a source of truth from the live site at this moment.

Because of that, this sheet uses the **current in-repo Urban Stone Collective implementation** as the practical baseline for typography, color, and conversion flow.

---

## 2) Current CSS + Font baseline (from in-repo implementation)

### Typography

- **Display / wordmark direction:** `Cormorant Garamond` (serif)
- **Primary UI/body direction:** `Manrope` (sans-serif)
- **Fallbacks:** serif and system sans stacks

### Font import pattern

```css
@import url("https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600;700&family=Manrope:wght@400;500;600;700;800&display=swap");
```

### Brand token model (RGB tuple variables)

```css
:root {
  --bg: 8 12 24;
  --surface: 14 22 38;
  --panel: 19 30 52;
  --text: 231 238 248;
  --muted: 151 164 186;
  --accent: 74 144 226;
  --accent-dark: 41 98 177;
  --border: 52 72 102;
}

html[data-theme="light"] {
  --bg: 238 243 252;
  --surface: 248 250 255;
  --panel: 229 236 248;
  --text: 27 39 58;
  --muted: 92 110 138;
  --accent: 54 105 187;
  --accent-dark: 33 76 145;
  --border: 190 205 228;
}
```

### Tailwind mapping pattern

```js
colors: {
  bg: 'rgb(var(--bg) / <alpha-value>)',
  surface: 'rgb(var(--surface) / <alpha-value>)',
  panel: 'rgb(var(--panel) / <alpha-value>)',
  text: 'rgb(var(--text) / <alpha-value>)',
  muted: 'rgb(var(--muted) / <alpha-value>)',
  accent: 'rgb(var(--accent) / <alpha-value>)',
  accentDark: 'rgb(var(--accent-dark) / <alpha-value>)',
  border: 'rgb(var(--border) / <alpha-value>)',
},
fontFamily: {
  display: ['Cormorant Garamond', 'serif'],
  sans: ['Manrope', 'ui-sans-serif', 'system-ui', 'sans-serif'],
}
```

---

## 3) Urban Stone Collective brand-kit sheet (working spec)

Use this as a handoff-ready direction for web + logo exploration.

### Brand personality tags

- **Refined stone craftsmanship**
- **Modern-but-timeless**
- **Trustworthy local expert**
- **Fast, operationally sharp**

### Palette (starter)

- **Primary background:** `rgb(8 12 24)` / `#080C18`
- **Primary text:** `rgb(231 238 248)` / `#E7EEF8`
- **Brand accent:** `rgb(74 144 226)` / `#4A90E2`
- **Accent dark:** `rgb(41 98 177)` / `#2962B1`
- **Border/support:** `rgb(52 72 102)` / `#344866`
- **Warm neutral (wordmark metallic option):** `rgb(184 184 180)` / `#B8B8B4`

### Typography system

- **Wordmark / high-impact headlines:** Cormorant Garamond 600/700
- **Body / UI / forms / navigation:** Manrope 400/500/600/700/800
- **Recommended title case usage:**
  - Keep “Urban Stone Collective” in Title Case for formal lockups
  - Use all-caps only for micro-labels/chips/badges

### Brand mark direction (logo)

- Prefer a **typographic lockup** first (wordmark-led)
- Add a minimal icon option that can stand alone at favicon/social sizes:
  - monogram concepts: `USC`, `US`, or abstract chiseled-stone facet
- Avoid generic house/roofline symbols
- Favor line rhythm that can emboss well on stone-fabrication collateral

### Voice anchors for visual decisions

- “Premium without being flashy”
- “Architectural clarity”
- “Craft + speed”
- “Local and accountable”

---

## 4) Current flow to preserve while rebranding logo assets

The current conversion architecture should remain intact while logo exploration runs:

1. **Hero:** introduce promise + first CTA
2. **Features strip:** compress trust signals and rebrand/update info
3. **Service-area routing:** let users self-qualify geographically
4. **Supplier/material exploration:** maintain slab discovery momentum
5. **Lead form:** capture quote request after intent is warmed
6. **FAQ:** resolve objections
7. **Footer:** final navigation + conversion path

This protects lead capture while visual identity (logo system) evolves.

---

## 5) Ready-to-use prompt for a design agent (new logo)

Copy/paste and customize:

```text
You are a senior brand identity designer.

Project:
Create a new logo system for "Urban Stone Collective" (countertop fabrication/installation brand).

Business context:
- Legal entity remains Amazon Granite LLC.
- Public-facing brand is Urban Stone Collective.
- Positioning: premium stone craftsmanship, modern clarity, fast turnaround, local trust.

Design goals:
1) Build a primary wordmark for "Urban Stone Collective".
2) Build a secondary compact lockup for social/profile use.
3) Build a minimal icon/monogram that works at favicon size.
4) Ensure the logo feels architectural, refined, and durable.

Visual constraints:
- Avoid cliché roofline/home symbols.
- Avoid over-decorative script styles.
- Must feel premium but not luxury-fashion.
- Must render cleanly in single-color applications (vinyl, etching, invoice stamp).

Typography direction:
- Serif-led display influence similar to Cormorant Garamond for the wordmark feel.
- Sans companion influence similar to Manrope for supporting lockups.

Color direction:
- Primary dark base: #080C18
- Light text: #E7EEF8
- Accent blue: #4A90E2
- Deep accent: #2962B1
- Neutral metallic option: #B8B8B4

Deliverables:
- 3 distinct logo concepts (A/B/C), each with rationale.
- For each concept: horizontal lockup, stacked lockup, icon-only mark.
- One monochrome variant and one reversed variant per concept.
- Clear spacing/min-size guidance.
- Suggested pairings for website header, favicon, truck decal, and quote PDF.

Output format:
- Present concept boards in markdown with labeled sections.
- Include SVG-ready construction notes and a concise brand rationale for each concept.
```

---

## 6) Optional implementation starter (drop-in tokens)

```css
:root {
  --usc-bg: 8 12 24;
  --usc-text: 231 238 248;
  --usc-accent: 74 144 226;
  --usc-accent-dark: 41 98 177;
  --usc-neutral-metal: 184 184 180;
}

.usc-wordmark {
  font-family: "Cormorant Garamond", serif;
  letter-spacing: 0.01em;
  color: rgb(var(--usc-neutral-metal));
}

.usc-ui {
  font-family: "Manrope", ui-sans-serif, system-ui, sans-serif;
  color: rgb(var(--usc-text));
}
```

Use these tokens only as a baseline until final logo and color approvals are complete.
