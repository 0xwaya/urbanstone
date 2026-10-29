# Urban Stone Collective: Instagram (+ TikTok) post automation

Self-contained in `social/` (Python 3.10+, Pillow, numpy; ffmpeg only for the optional TikTok video).
Nothing here posts anything until Edward supplies credentials **and** approves the post.

## Layout
```
social/instagram/
  config.json              schedule (06:00 + 16:00 America/New_York), brand, formats, logo stamp, hashtag mix, approval, Graph API version
  brand/                   logo.tex (TikZ source), logo.pdf, render_logo.sh -> logo.png/svg, logo-icon.png (stamp), colors.txt
  fonts/                   Cormorant Garamond + Manrope (Google Fonts, OFL) - kept for future text graphics
  data/design_space.json   stones (repo catalog + labeled inspiration looks), cabinets, styles, lighting, layouts, hardware
  data/talking_points.json every caption fact, each with its repo source (Hero.jsx, homepage-content.js ...)
  data/hashtags.json       tiered pools (high / mid / niche by material / local) with sourced post-count estimates
  data/analytics.db        SQLite analytics (git-ignored, created on first run)
  data/weights.json        optional output of `analytics.py winners` (not read by the generator yet)
  state/history.json       every combo used (stone|cabinets|style|lighting|layout), CTA, hashtag set -> no repeats
  state/pending_scene.json the scene chosen by prompt_builder, waiting for its image
  queue/YYYY-MM-DD-HHMM/   post_1x1/4x5/9x16 .png+.jpg, scene.jpg, caption.txt, tiktok_caption.txt, meta.json
  scripts/                 prompt_builder, compose, captions, hashtags, make_post, publish, stage_media, analytics
social/tiktok/             config.json, tiktok_caption.py, tiktok_publish.py (publish + metrics)
social/tests/              fixture tests with mocked Graph / TikTok / Resend APIs
```

## Daily flow (the commands a scheduler runs)
Run from the repo root.
```bash
# 1) pick the next unique combo and print the image prompt (writes state/pending_scene.json)
python3 social/instagram/scripts/prompt_builder.py            # --json for the full scene record
# 2) generate the scene image from that prompt: photoreal, bright, 9:16 portrait (tallest format)
# 3) render 1:1 / 4:5 / 9:16 + caption + hashtags and queue it for the next slot (or --slot)
python3 social/instagram/scripts/make_post.py --scene /path/scene.jpg [--slot "2026-10-30 06:00"] [--focus-y 0.6] [--post-type kitchen]
# 4) after Edward's OK
python3 social/instagram/scripts/publish.py --approve 2026-10-30-0600
# 5) at/after the slot time: publish due + approved posts (dry-run until credentials exist)
python3 social/instagram/scripts/publish.py
python3 social/tiktok/tiktok_publish.py publish
# 6) analytics (daily, or after each slot)
python3 social/instagram/scripts/analytics.py collect
python3 social/instagram/scripts/analytics.py digest [--email [--send]]
python3 social/instagram/scripts/analytics.py winners [--min-sample 3]
# tests
python3 -m unittest discover -s social/tests -v
```
`--focus-y` is the countertop's vertical position in the scene (0 top, 1 bottom; default 0.6). Crops for
4:5 and 1:1 centre on it. `--replace` re-renders an existing slot with its original combo.

## Schedule
`config.json -> schedule_slots: ["06:00", "16:00"]`, `timezone: America/New_York`. `make_post.py` without
`--slot` queues into the next slot. TikTok uses the same slots and queue. The scheduler itself lives
outside this repo (Grok Bot routine).

## Design standard (Edward, Oct 29 2026)
- Bright, airy, full-bleed photo edge to edge. No bands, panels or text on the image. Tagline and
  contact live in the caption.
- Branding = a small translucent stamp of the chevron + three towers (`brand/logo-icon.png`, cut from the
  logo rendered from `brand/logo.tex`): 12% of width, 65% opacity, very soft navy shadow
  (`config.json -> logo_stamp`).
- Corner is chosen automatically: each corner's busyness (pixel std + mean gradient) is measured, bottom
  corners are penalised (top preferred), and any corner overlapping the countertop band
  (`focus_y ± counter_band`) is rejected. 9:16 keeps the stamp inside Story/Reel safe zones (130 px sides,
  260 px top, 360 px bottom).
- Three outputs per scene: `post_1x1` 1080x1080 (grid), `post_4x5` 1080x1350 (feed, default publish
  format: `feed_format`), `post_9x16` 1080x1920 (Stories/Reels/TikTok). Each is a crop of the 9:16 scene,
  never letterboxed or stretched. JPEGs are written too because the Graph API only accepts JPEG.
- The scene is AI-generated, so the caption says "Image: AI-rendered design concept." (`label_ai_images`),
  per the brand standard. Stones not in the site's slab list (`catalog: false`) get "Ask us which slabs we
  can source to match it" instead of implying stock.
- Note: the image model returns ~720x1280, so outputs are upscaled about 1.5x (Lanczos + light sharpen).
  Good on phones; a higher-res image model would make them crisper.

## Captions and hashtags
- Facts come only from `data/talking_points.json`, copied from the site code: tagline (Hero.jsx), 3-5 day
  turnaround phrased as a *target on qualifying projects*, the **1-Year Workmanship Warranty** (Hero.jsx),
  curated suppliers, measure/fabricate/install, material facts from the homepage FAQ.
- Promo (homepage-content.js): complimentary 18-gauge stainless steel sink on kitchen projects 50 sq ft+,
  "Offer good October 15 - December 15, 2026." The caption line is added only when the slot date falls in
  that window, so it stops automatically after Dec 15.
- CTA rotates DM -> link in bio -> call (513) 307-5840.
- Hashtags: 3 high + 6 mid + 5 niche (material-specific, stone-aware) + 4 local = 18, rotating so each set
  differs from the last 6 posts by 6+ tags. Counts in `hashtags.json` are third-party estimates
  (best-hashtags.com, iqhashtags.com, displaypurposes.com, Oct 29 2026); `posts: null` = unverified tier.
- Note: the older brand standard (brand/social-media-standard.md) asked for 3-5 hashtags; Edward's
  Instagram brief asked for a high/niche mix, so 18 is used. Change `hashtags_per_post` to trim.

## Approval gate
`require_approval: true` (from the brand standard: nothing publishes without Edward's OK). Approve per post
with `publish.py --approve <queue_id>`, or set it to `false` to let due posts publish automatically.

## What Edward must provide: Instagram
Credential check, Oct 29 2026 (names only): no Instagram/Meta/TikTok credentials exist in the box env,
GitHub secrets/variables of 0xwaya/urbanstone, the Vercel project env, or /workspace/.secrets.
1. **Instagram professional account** (@urbanstonec as Business or Creator) **linked to the Urban Stone
   Facebook Page** (Instagram app > Settings > Account type and tools; then Page > Linked accounts).
2. **Meta developer app** (developers.facebook.com > Create app > Business) with the Instagram product
   ("Instagram API with Facebook Login"). Permissions: `instagram_basic`, `instagram_content_publish`,
   `instagram_manage_insights`, `pages_show_list`, `pages_read_engagement` (and `business_management` if the
   Page is in Business Manager). Own-account use in Development mode works without App Review because
   Edward is an app admin.
3. **Long-lived token**: Graph API Explorer > user token with the permissions above > exchange for a
   long-lived (60-day) token, or better a System User token from Business Settings (does not expire).
4. **IG user id**: `GET /me/accounts` -> Page id -> `GET /{page-id}?fields=instagram_business_account`.
5. Store them as secrets named **`IG_ACCESS_TOKEN`** and **`IG_USER_ID`** (GitHub Actions secrets or the
   scheduler's secret store). Never in the repo.
6. **Public image URL** (the API pulls the JPEG from a URL). Recommended free option: serve from the site.
   `stage_media.py --queue-id <id>` copies the JPEGs to `frontend/public/social/<id>/`; committing that
   triggers the Vercel deploy and the files appear at `https://urbanstone.co/social/<id>/post_4x5.jpg`. Then
   set `"image_base_url": "https://urbanstone.co/social"` in both config files. This also satisfies TikTok's
   verified-domain rule. (raw.githubusercontent.com would work for Instagram only; Vercel Blob needs a token.)

## What Edward must provide: TikTok
1. A TikTok **Business or Creator** account for Urban Stone.
2. A **TikTok for Developers** app (developers.tiktok.com) with **Login Kit**, **Content Posting API**
   (Direct Post enabled) and **Display API**. Scopes: `user.info.basic`, `user.info.stats`, `video.list`,
   `video.publish`, `video.upload`.
3. **Domain / URL-prefix verification** for `https://urbanstone.co/social/` (PULL_FROM_URL only accepts
   verified domains).
4. An **OAuth redirect URI** registered in the app (e.g. `https://urbanstone.co/api/tiktok/callback`, or any
   HTTPS page Edward controls) and one OAuth login to get the first tokens.
5. Secrets: **`TIKTOK_CLIENT_KEY`**, **`TIKTOK_CLIENT_SECRET`**, **`TIKTOK_REFRESH_TOKEN`** (optional
   `TIKTOK_ACCESS_TOKEN`). The publisher refreshes an access token each run. If TikTok rotates the refresh
   token it prints a notice (no value) so the secret can be updated.
6. **App audit**: until TikTok approves the app, posts can only be private, so `privacy_level` is
   `SELF_ONLY`. After approval set `PUBLIC_TO_EVERYONE` in `social/tiktok/config.json`. The publisher
   refuses any level not in the creator's `privacy_level_options`.
- Modes (`social/tiktok/config.json -> mode`): `photo` (default; PHOTO post of `post_9x16.jpg`, PULL_FROM_URL)
  or `video` (7 s slow Ken Burns zoom MP4 built by ffmpeg: `tiktok_publish.py video --queue-id <id>`).
- TikTok caption: hook + promo (in window) + CTA + AI note + 5 tags (#kitchentok #countertops
  #<material> #cincinnati #kitchenremodel).

## Analytics
SQLite at `social/instagram/data/analytics.db` (git-ignored: it is runtime data; the repo stores no other
DBs). Timestamps are UTC ISO-8601; reports show ET. Every table has a `platform` column
(`instagram` | `tiktok`).
- `posts(platform, post_id, queue_id, permalink, published_at_utc, scheduled_at_utc, post_type, material,
  stone, style, cabinets, lighting, layout, cta, hashtag_set_id, slot, promo)`, PK (platform, post_id)
- `post_metrics(platform, post_id, age_bucket[24h|72h|7d|latest], collected_at_utc, age_hours, reach, views,
  impressions, likes, comments, saved, shares, profile_visits, profile_activity, website_clicks, follows,
  total_interactions, raw_json)`
- `follower_snapshots(platform, snapshot_date_et, collected_at_utc, followers_count,
  follower_count_insight, website_clicks, profile_views, raw_json)`
- `collector_runs(id, platform, started_at_utc, finished_at_utc, status[ok|partial|error|not_connected],
  posts_checked, metrics_written, snapshots_written, error)`

How it works:
- `publish.py` writes `ig_media_id`, `permalink`, `published_at_utc` back into meta.json and registers the
  post (with its design dimensions) in the DB. TikTok posts are registered once the publish status returns
  the public video id.
- `collect` takes a snapshot for each age bucket the post has reached (24 h / 72 h / 7 d, stored once) plus a
  rolling `latest`. Run it at least daily.
- Instagram media metrics: `reach, views, likes, comments, saved, shares, profile_visits, profile_activity,
  follows, total_interactions` (Graph API v23.0, configurable). **`impressions` is deprecated** for media
  created after 2024-07-02 (errors since 2025-04-21), so it is not requested; `views` replaces it. If a batch
  call fails, each metric is retried alone and unsupported ones are skipped. Website clicks come from
  `profile_activity` (bio_link_clicked) per post and `website_clicks` at account level when available.
- Followers: `followers_count` from the IG user plus the `follower_count` insight (only for 100+ followers).
- TikTok: Display API `video/query` (`view_count, like_count, comment_count, share_count`) and `user/info`
  (`follower_count`). TikTok has no reach: views are stored in `views`.
- Engagement rate: Instagram (likes+comments+saved+shares)/reach; TikTok (likes+comments+shares)/views.
- `winners` ranks every dimension (post_type, material, stone, style, cabinets, lighting, layout, cta,
  hashtag_set_id, slot, promo) by mean engagement rate using each post's most mature snapshot, only for
  values with at least `--min-sample` (3) posts, and writes `data/weights.json`.
- `digest` prints, per platform: yesterday's top post (reach/views + ER), overall ER, followers with
  day-over-day and 7-day change, best post type so far, and collector errors in the last 24 h, or
  "Not connected yet". `--email` builds a Resend email to sales@urbanstone.co (from
  `Urban Stone <sales@urbanstone.co>`, same pattern as lead-sourcer/src/relay.js); it sends only with
  `--send` and `RESEND_API_KEY`.

### Using weights.json later (not wired in)
`prompt_builder.choose()` currently samples uniformly from unused combos. To use the data, load
`data/weights.json` there and replace `rng.choice(space[...])` with
`rng.choices(options, weights=[w.get(dim, {}).get(o, 1.0) for o in options])` per dimension (keep the
no-repeat check). Only do it once there are ~30+ posts with metrics.
