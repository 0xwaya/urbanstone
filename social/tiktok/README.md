# TikTok adapter
See `social/instagram/README.md` ("What Edward must provide: TikTok" and "Analytics"). Commands:
```bash
python3 social/tiktok/tiktok_publish.py publish [--dry-run] [--queue-id ID]   # same queue + 06:00/16:00 ET slots
python3 social/tiktok/tiktok_publish.py video --queue-id ID                    # optional Ken Burns MP4 (mode=video)
python3 social/tiktok/tiktok_publish.py status --queue-id ID                   # fetch publish status -> video id
```
Not connected yet: no TIKTOK_* credentials exist, so publishing dry-runs. `privacy_level` stays SELF_ONLY
until TikTok approves the app audit.
