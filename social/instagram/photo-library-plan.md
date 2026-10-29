# Plan: Edward's Install Photo Library → Instagram Automation (and Quotes)

Status: **plan only — nothing built yet.** Drafted Oct 29, 2026.
Scope: bring Edward's phone library (thousands of installed-job photos, plus cabinet-only photos) into the
Urban Stone Collective posting pipeline in `/workspace/us-instagram`, so real work replaces most AI-generated
scenes, and reuse the same tagged library as proof in customer quotes.

---

## 1. Getting photos off the phone

Goal: a one-way, low-effort feed from Edward's phone into an "inbox" folder the automation can read. Edward should
never have to rename, sort or caption anything.

| Option | How it works | Pros | Cons |
|---|---|---|---|
| **A. Shared cloud album/folder (recommended)** | Edward makes one album (e.g. "USC Jobs") in Google Photos or a Google Drive / iCloud Drive folder and adds photos to it from the phone. The automation pulls new files from that folder on a schedule via the Google Drive connector (or a Drive folder Edward shares). | Works from the phone's share sheet; can backfill thousands at once; no app to install | Needs a one-time connector sign-in by Edward |
| B. Upload page on urbanstone.co | A private, password-protected `/upload` page on the site that drops photos into storage. | Fully ours, branded | More to build and secure; still manual per batch |
| C. Email-in | Edward emails photos to a dedicated inbox; the automation saves attachments. | Zero setup | Phones shrink/limit attachments; clumsy for thousands |
| D. Manual chat upload | Edward sends batches in this chat. | Works today | Doesn't scale |

**Pipeline side (same for any option):**
- Inbox: `social/library/inbox/` (git-ignored; photos never go into the public repo or website except the ones that get posted).
- Ingest job: copy new files, de-duplicate by content hash (phones produce lots of near-duplicates; also use a perceptual hash to catch burst shots), keep the original, make a 2048px working copy.
- **Strip GPS/EXIF location before anything is published** (customer home addresses are in photo metadata). Keep the capture date for sorting.
- Library index: `social/library/library.db` (SQLite, same style as the analytics DB) with one row per photo.

## 2. Auto-tagging (same tags as the post log)

Each photo gets the same tags the post log uses, so posts and analytics line up:

- **Material:** quartzite, quartz, marble, granite (+ stone name when it can be identified or Edward confirms it).
- **Finish:** polished, leathered, live edge. **Live edge is granite only**; leathered is granite, marble or quartzite; quartz is polished.
- **Application:** kitchen island, backsplash, outdoor kitchen/grill area, vanity, fireplace (extendable: laundry, bar, shower, etc.).
- **Photo kind:** finished install, in-progress/template/fabrication, before (old surface), cabinets-only (no top yet), remnant/slab.
- **Quality flags:** blurry, dark, cluttered, people/faces visible, house numbers/addresses or customer items visible.

How:
1. A vision model proposes tags + a confidence score for each photo, using the stone list in `data/design_space.json` and the supplier catalog as the vocabulary.
2. **The same rule checker used for posts (`scripts/rules.py`) validates every tag set** — e.g. a "marble + live edge" or "outdoor + quartzite" guess is rejected and sent to review instead of saved.
3. Low-confidence or rule-failing photos go to a **review queue**: a simple page (or a weekly batch in chat) where Edward taps to confirm/correct material, stone name and finish. Material is the hardest to auto-detect (quartz vs. quartzite vs. marble look alike in photos), so expect Edward to confirm stone names on a sample until accuracy is known.
4. Before/after pairing: photos from the same job (same day/location cluster) where one is "before" and one is "finished" are suggested as before-and-after pairs (fits the outdoor/vanity/fireplace before-and-after format).

## 3. Using real photos in posts

New post sources (the routine picks one per slot):

| Format | Source | Notes |
|---|---|---|
| **Real install** (default once the library is ready) | Finished-install photo | Same bright tone pass and seal stamp as today; crop to 1:1 / 4:5 / 9:16 around the countertop; caption style still varies by material/finish/application. No "AI-rendered" label — instead "Installed by Urban Stone Collective." |
| **Real before-and-after** | Paired before + finished photos from one job | Replaces generated pairs for outdoor, vanity and fireplace whenever a real pair exists. |
| **Design preview** | Cabinets-only photo + AI-rendered new top | Keeps Edward's real cabinets/room and renders a different stone/finish on top. Must be labeled clearly ("Design preview: AI-rendered countertop on a real Urban Stone job"). Same finish/outdoor rules apply. |
| **Generated scene** (today) | Fully AI | Fallback when the library has nothing fresh that fits the rotation. |

Selection rules: don't repeat a job within N weeks, rotate material/application as today, prefer the best-quality photos, skip any photo with faces, house numbers or personal items unless Edward approved it.

Customer permission: posting a customer's home should follow whatever consent Edward already uses; add a "cleared to post" flag per job (default: not cleared for anything showing the exterior or identifiable details).

## 4. Keeping the post log and analytics clean

- Post log entries keep the same fields and tags (date, slot, Material, Finish, Application, caption, post URL) and add:
  - **Source:** `real-install` | `real-before-after` | `design-preview` | `generated`
  - **Library photo ID(s)** (and job ID) so Insights can be traced back to the exact photo.
- The analytics DB gets the same `source` dimension, so we can compare real vs. generated vs. design-preview performance by material, finish and application.
- One vocabulary for all tags (a shared `tags.json`), validated by `rules.py`, so the log never contains "Leathered", "leather" and "leathered finish" as three different values.
- Never back-edit old log entries; generated posts made before the switch simply keep `source: generated`.

## 5. Cross-use: the same photos as proof in quotes

The tagged library is just as useful for **sales** as for Instagram. When a customer is deciding on, say, leathered granite for an island, the quote can include **real finished kitchens Urban Stone installed in that same material and finish**, before they sign.

- **Lookup:** "show me our installs in Taj Mahal, leathered, kitchen island" is a simple query on the same `library.db` tags (Material + Finish + Application, optionally stone name).
- **Delivery options (later):** a short "Your material, installed" section added to the estimate email or PDF (3–6 photos), or a private gallery link per quote.
- **Privacy:** same rules as posting — GPS stripped, no customer names/addresses, no house numbers or identifiable exteriors.
- **Pays off twice:** every photo tagged once (Material, Finish, Application) serves both the Instagram rotation and quote support; no separate sorting for sales. Tracking which photos appear in quotes that close can also show which installs sell best.

## 6. Suggested order (what to build first)

1. **Pick the transfer method** with Edward (recommend a shared Google Photos album or Drive folder) and connect it. *Small, unblocks everything.*
2. **Ingest + library DB:** dedupe, EXIF/GPS strip, working copies, `library.db`. Start with a 200–300 photo sample, not all thousands.
3. **Auto-tagger + review queue**, wired to `rules.py`. Measure accuracy on the sample with Edward's corrections before trusting it on the full library.
4. **Real-install post format** in the routine (tone, crop, seal, captions without the AI label), with `source` + photo ID added to the post log and analytics. Run it alongside generated posts for 1–2 weeks to compare performance.
5. **Real before-and-after pairing** for outdoor, vanity and fireplace.
6. **Design-preview format** (cabinet photo + rendered top) — last, since it needs the most image-quality checking.
7. **Quote support:** tag-based lookup and a "your material, installed" section for estimates.
8. Backfill the rest of the library in batches once accuracy is acceptable.

## Open questions for Edward

- Which photo app/cloud does the phone use today (iCloud Photos or Google Photos)?
- Is there a customer consent practice for posting install photos, or should we default to interiors only with no identifying details?
- Roughly how many photos have a known stone name (from invoices/job records) that could seed the tagger?
