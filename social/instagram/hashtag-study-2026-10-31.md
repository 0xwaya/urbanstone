# Hashtag study: Urban Stone Collective (@urbanstonec / TikTok @urbanstoneco), 2026-10-31

## TL;DR
- **Instagram now caps every post and Reel at 5 hashtags** (announced by Adam Mosseri on Dec 18, 2025; the
  Instagram Help Center now says "You can use up to 5 tags on a post"). Tags in the first comment count toward
  the same 5. Our pipeline was still generating **18 tags** per caption, so 13 of them were wasted at best, and
  the API or app may refuse or strip the extras.
- Instagram's own guidance: hashtags "don't increase your reach"; they help Instagram *classify* the post and
  help people find it in search. "A few specific tags actually perform better than a long list of generic ones."
- So the goal is now 5 accurate tags per post: **material + detail + application + #cincinnati + 1 rotating local tag.**
  Giant generic tags (#interiordesign, #homedecor, #kitchen, #kitchendesign ...) are gone.
- TikTok: TikTok also limits posts to 5 hashtags (reported since Aug 2025; TikTok's help center doesn't publish a number).
  New set: material + #countertops + application + #cincinnati + #kitchentok or #beforeandafter.

## What we used before (Oct 29-30 posts)
| Post | Instagram tags (18) |
|---|---|
| 2026-10-29 4 PM, Nero Marquina marble | #interiordesign #kitchendesign #homedesign #kitcheninspo #kitchensofinstagram #naturalstone #kitchenisland #kitchenideas #newkitchen #marble #stonefabrication #dreamkitchen #kitchencountertops #countertop #cincinnati #readingohio #cincinnatirealestate #cincy |
| 2026-10-30 6 AM, Calacatta Andromeda quartz | #kitchen #kitchendesign #renovation #remodel #kitchenisland #kitchendecor #newkitchen #homerenovation #countertops #quartz #calacattaquartz #dreamkitchen #kitchenrenovation #countertop #cincinnati #cincinnatirealestate #cincygram #cincinnatiohio |
| 2026-10-30 4 PM, Absolute Black granite | #interior #homedesign #homedecor #homerenovation #newkitchen #kitchenideas #remodel #countertops #homeimprovement #granite #countertop #granitecountertops #blackgranite #countertopinstall #cincinnati #cincyhomes #westchesterohio #northernkentucky |

TikTok (all three): #kitchentok #countertops #<material> #cincinnati #kitchenremodel.

**Engagement data:** none yet. The Graph API isn't connected, so `analytics.py` has no per-post reach or likes,
and with only 1-2 Instagram posts live there isn't enough data to rank hashtags by results. This study is based on
platform rules and tag size and relevance. Once Edward shares likes and reach (or the API is connected), compare
`hashtag_set_id` results with `analytics.py winners` after about 15-30 posts.

Problems with the old sets:
- **Over the cap:** 18 tags vs. a hard limit of 5.
- **Mostly giant generic tags:** #interiordesign (124M), #homedecor (97M), #interior (68M), #kitchen (27M), #homedesign (26M),
  #renovation (11M) and #kitchendesign (9.6M). A post from a small account drops out of these feeds within minutes, and
  they don't tell Instagram that we do countertops in Cincinnati.
- **Off-audience or ambiguous:** #cincinnatirealestate (realtors), #readingohio (Reading, PA confusion and tiny),
  #quartz (crystal/mineral community), #covington (also Covington GA/LA/WA), #cincygram (city photography).

## Research findings
1. **The 5-tag cap is enforced.** Instagram Help Center: "You can use up to 5 tags on a post. If you include more than
   5 tags on a single photo/video, your comment won't post." The Verge (Dec 18, 2025) and Social Media Today quote Instagram:
   "using fewer (up to 5) more targeted hashtags, rather than many generic ones, can improve both your content's
   performance and people's experience." Later (Apr 2026): the limit covers caption and comments together. Extra
   tags are blocked or removed.
2. **Hashtags classify; they don't drive reach.** Mosseri (2025 Q&A): "Hashtags are no longer a primary way to increase
   your reach... if you're using eight, nine or ten, it sounds like you're probably trying to hack ranking and it's
   not going to work." Saves, shares and watch time drive distribution. Hashtags help search and categorization.
   Following hashtags was removed in Dec 2024 (Later).
3. **Mid-size niche tags beat mega-tags.** Later's 2026 guide puts the sweet spot at roughly 10K-500K posts for niche
   tags and 100K-1M for topic tags. Over 1M should be used sparingly. Avoid billion-post tags. Don't repeat the exact same
   5 tags on every post. Location tags are "especially powerful" for local and product shots.
4. **Local businesses:** use your city and your trade in every post, and rotate the tags that describe the specific post
   (Owner's Playbook; Giinger). This matches our setup: #cincinnati plus our service area (Cincinnati, NKY, West Chester, Mason).
5. **TikTok:** 3-5 specific tags. Broad tags like #fyp and #viral did no better than a typical post (Postdom study,
   9,492 business posts, Oct 2026: #fyp 1.00x, #viral 1.01x). Hashtag count made little difference (0.99x-1.03x).
   Use city + trade + post-specific tags.

## Candidate tags: size and fit
Post counts are third-party estimates from best-hashtags.com tables (page update dates in brackets). Instagram does
not publish exact counts and sources disagree. "n/v" = not verified (I couldn't find a count; I won't guess).

| Tag | IG posts (est.) | Fit | Verdict |
|---|---|---|---|
| #countertops | 560.7K [2026-10-11] | trade, exact | **core detail tag** |
| #countertop | 272.1K [2026-10-11] | trade | rotate |
| #quartzcountertops | 294.7K [2024-10] | material, exact | **quartz primary** |
| #granitecountertops | 187.5K [2024-10] | material, exact | **granite primary** |
| #quartzitecountertops | 23.3K [2024-10] | material, exact, small | **quartzite primary** |
| #quartzite | 141.5K | material | quartzite detail |
| #marblecountertops | n/v (page exists) | material, exact | **marble primary** |
| #marble | 7.3M [2026-10-11] | broad but on-topic | marble detail, low weight |
| #granite | 1.6M | broad, on-topic | granite detail |
| #naturalstone | 2.0M [2024-10] | natural stone only | detail (not for quartz) |
| #blackgranite, #leatheredgranite, #calacattaquartz, #tajmahalquartzite, #carraramarble | n/v | stone/finish-specific | **detail when the stone/finish matches** |
| #whitekitchen | 627.9K [2025-12] | white quartz looks | detail for Calacatta/Carrara quartz |
| #kitchenremodel | 1.8M [2024-10] | service | kitchen application |
| #kitchenisland | 810.5K [2026-10-11] | what's shown | kitchen application |
| #dreamkitchen | 777.1K | aspirational | kitchen application |
| #kitchenremodeling | 119.6K [2025-12] | service, mid-size | kitchen application |
| #backsplash | 385.8K | what's shown | backsplash application |
| #outdoorkitchen | 438.8K [2024-10] | what's shown | **outdoor application** |
| #outdoorkitchens / #outdoorkitchendesign | 27.7K-62.9K / 10.3K | outdoor niche | outdoor rotation |
| #bathroomremodel | n/v (≈5.1K uses/week) | service | vanity application |
| #bathroomremodeling | 105.2K [2025-09] | service | vanity rotation |
| #bathroomvanity, #fireplacedesign, #fireplacemakeover | n/v | what's shown | vanity / fireplace |
| #cincinnati | 3.5M-4.0M | city | **every post** |
| #cincy | 548.6K [2025-11] | city slang | local rotation |
| #cincinnatiohio | 152.6K [2025-11] | city | local rotation |
| #nky | 119.9K [2024-10] | Northern Kentucky | local rotation |
| #northernkentucky, #westchesterohio, #masonohio, #cincinnatihomes | n/v | service area / homeowners | local rotation |
| #interiordesign, #homedecor, #interior, #kitchen, #homedesign, #kitchendesign, #renovation | 9.6M-124M | generic | **dropped** |
| #remodel, #homeimprovement, #homerenovation, #kitchendecor | 3.4M-4.1M | generic | **dropped** |
| #quartz | 5.0M | ambiguous (crystals) | **dropped** |
| #cincinnatirealestate, #readingohio, #covington, #cincygram, #cincyhomes | — | off-audience / ambiguous | **dropped** |

## Recommended sets (implemented)
**Instagram: exactly 5 tags.** One tag per slot, rotating within each slot so no two recent posts share the same set:

| Slot | Granite | Quartz | Quartzite | Marble |
|---|---|---|---|---|
| 1 Material | #granitecountertops | #quartzcountertops | #quartzitecountertops | #marblecountertops |
| 2 Detail | #blackgranite / #leatheredgranite (when they match), #granite, #naturalstone, #countertops, #countertop | #calacattaquartz / #whitekitchen (Calacatta, Carrara), #countertops, #countertop | #tajmahalquartzite (matching), #quartzite, #naturalstone, #countertops | #carraramarble / #calacattamarble (matching), #marble, #naturalstone, #marblekitchen, #countertops |

| Slot 3 Application | Tags |
|---|---|
| Kitchen island | #kitchenremodel, #kitchenisland, #dreamkitchen, #kitchenremodeling |
| Backsplash | #backsplash, #kitchenremodel |
| Outdoor kitchen / grill (granite only) | #outdoorkitchen, #outdoorkitchens, #outdoorkitchendesign |
| Vanity | #bathroomremodel, #bathroomremodeling, #bathroomvanity |
| Fireplace | #fireplacedesign, #fireplacemakeover |

Slots 4-5 Local: **#cincinnati** on every post, plus one of #cincinnatiohio, #cincy, #nky, #northernkentucky,
#westchesterohio, #cincinnatihomes, #masonohio.

**TikTok: 5 tags.** #<material>countertops (quartzite: #quartzite) + #countertops + application (#kitchenremodel,
#backsplash, #outdoorkitchen, #bathroomremodel, #fireplacemakeover) + #cincinnati + #kitchentok (or
#beforeandafter for before-and-after posts). TikTok post counts aren't public, so these weren't verified by size.

## Before / after (dry run, no images generated, nothing published)
| Scene | Before (old generator, 18 tags) | After (new, 5 tags) |
|---|---|---|
| Granite leathered kitchen island (Absolute Black) | #interior #homedesign #homedecor #homerenovation #newkitchen #kitchenideas #remodel #countertops #homeimprovement #granite #countertop #granitecountertops #blackgranite #countertopinstall #cincinnati #cincyhomes #westchesterohio #northernkentucky | #granitecountertops #countertops #kitchenremodel #cincinnati #cincinnatiohio |
| Quartz kitchen (Calacatta Andromeda) | #kitchen #kitchendesign #renovation #remodel #kitchenisland #kitchendecor #newkitchen #homerenovation #countertops #quartz #calacattaquartz #dreamkitchen #kitchenrenovation #countertop #cincinnati #cincinnatirealestate #cincygram #cincinnatiohio | #quartzcountertops #whitekitchen #kitchenremodeling #cincinnati #cincinnatihomes |
| Granite outdoor kitchen, before/after (Steel Grey, leathered) | (n/a; would have been 18 tags) | #granitecountertops #leatheredgranite #outdoorkitchendesign #cincinnati #cincinnatiohio |

TikTok after: #granitecountertops #countertops #kitchenremodel #cincinnati #kitchentok · #quartzcountertops #countertops
#kitchenremodel #cincinnati #kitchentok · #granitecountertops #countertops #outdoorkitchen #cincinnati #beforeandafter

## Next steps
- Track `hashtag_set_id` and per-slot tags against reach and saves. After about 15-30 posts, keep the application and local
  tags that bring non-follower reach and cut the rest. Instagram Insights shows "From hashtags" reach per post.
- Re-check the unverified tags in the Instagram app (search the tag and look at the post count and the top posts) and fill in the counts
  in `data/hashtags.json`.
- Consider a branded tag (e.g. #urbanstonecollective) in place of the rotating local tag on some posts, once customers start using it.

## Sources
- Instagram Help Center, "Use hashtags on Instagram": https://help.instagram.com/351460621611097
- The Verge, "Instagram wants to limit hashtag spam" (Dec 18, 2025): https://www.theverge.com/news/847739/instagram-hashtag-spam-limit
- Social Media Today, "Instagram Implements New Limits on Hashtag Use": https://www.socialmediatoday.com/news/instagram-implements-new-limits-on-hashtag-use/808309/
- Social Media Today, Mosseri creator Q&A (2025): https://www.socialmediatoday.com/news/instagram-chief-answers-creator-questions/744813/
- Kontentino, Mosseri Q&A Oct 2025: https://www.kontentino.com/q-and-a/adam-mosseri-instagram-october2025/
- Later, "Instagram hashtag strategy in 2026" (Apr 21, 2026): https://later.com/blog/ultimate-guide-to-using-instagram-hashtags/
- apidojo, TikTok hashtags (5-tag cap, Aug 2025): https://apidojo.io/blog/tiktok-trends/use-hashtags/
- Postdom, "Best Hashtags for TikTok: 9,492 business posts" (Oct 2026): https://postdom.com/research/best-hashtags-for-tiktok
- The Owner's Playbook, hashtag strategy for local businesses: https://the-owners-playbook.com/guides/hashtag-strategy-for-local-businesses
- best-hashtags.com tag pages (counts): /hashtag/countertops, /granitecountertops, /quartzite, /marblecountertops,
  /kitchenremodel, /outdoorkitchen, /bathroomremodel, /cincinnati, /northernkentucky, /westchesterohio
