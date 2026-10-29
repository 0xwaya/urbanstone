#!/usr/bin/env python3
"""Publish due queue posts to Instagram via the Graph API (content publishing).

Flow per post: POST /{ig-user-id}/media (image_url = public JPEG URL, caption)
-> poll the container status_code until FINISHED -> POST /{ig-user-id}/media_publish
-> write ig_media_id / permalink / published_at back into meta.json.

Credentials (env only, never printed): IG_USER_ID, IG_ACCESS_TOKEN.
Without them, or with --dry-run, it only prints what it would do.

Usage:
  python3 publish.py                 # publish every due, approved post (dry-run if not connected)
  python3 publish.py --dry-run
  python3 publish.py --approve 2026-10-29-1600     # mark a queued post approved (Edward's OK)
  python3 publish.py --queue-id 2026-10-29-1600 --image-url https://...jpg
"""
import argparse
import os
import sys
import time
from datetime import datetime, timezone

import http_client
from common import QUEUE, config, load_json, now, save_json


def creds():
    uid, tok = os.environ.get("IG_USER_ID"), os.environ.get("IG_ACCESS_TOKEN")
    return (uid, tok) if uid and tok else None


def graph_url(*parts):
    g = config()["graph_api"]
    return "/".join([g["host"].rstrip("/"), g["version"]] + [str(p) for p in parts])


def image_url_for(meta, override=None):
    if override:
        return override
    base = config().get("image_base_url") or os.environ.get("IG_IMAGE_BASE_URL", "")
    if not base:
        return None
    fmt = meta.get("feed_format") or config()["feed_format"]
    return f"{base.rstrip('/')}/{meta['queue_id']}/{meta['files'][fmt]['jpg']}"


def due_posts(queue_id=None):
    out = []
    for name in sorted(os.listdir(QUEUE)) if os.path.isdir(QUEUE) else []:
        mp = os.path.join(QUEUE, name, "meta.json")
        meta = load_json(mp)
        if not meta or (queue_id and name != queue_id):
            continue
        if meta["platforms"]["instagram"]["status"] != "queued":
            continue
        if not queue_id and datetime.fromisoformat(meta["scheduled_at_utc"]) > now().astimezone(timezone.utc):
            continue
        out.append((mp, meta))
    return out


def publish_one(meta, uid, tok, url, sleep=time.sleep):
    caption = open(os.path.join(QUEUE, meta["queue_id"], "caption.txt"), encoding="utf-8").read().strip()
    c = http_client.send("POST", graph_url(uid, "media"),
                         {"image_url": url, "caption": caption, "access_token": tok})
    cid = c["id"]
    for _ in range(30):
        st = http_client.send("GET", graph_url(cid), {"fields": "status_code", "access_token": tok})
        if st.get("status_code") == "FINISHED":
            break
        if st.get("status_code") in ("ERROR", "EXPIRED"):
            raise http_client.ApiError(f"container {cid} status {st.get('status_code')}")
        sleep(5)
    pub = http_client.send("POST", graph_url(uid, "media_publish"), {"creation_id": cid, "access_token": tok})
    media_id = pub["id"]
    info = http_client.send("GET", graph_url(media_id), {"fields": "permalink,timestamp", "access_token": tok})
    return {"status": "published", "ig_media_id": media_id, "container_id": cid,
            "permalink": info.get("permalink"), "published_at_utc": now().astimezone(timezone.utc).isoformat()}


def main(argv=None, sleep=time.sleep):
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--approve")
    ap.add_argument("--queue-id")
    ap.add_argument("--image-url")
    a = ap.parse_args(argv)

    if a.approve:
        mp = os.path.join(QUEUE, a.approve, "meta.json")
        meta = load_json(mp)
        meta["approved"] = True
        save_json(mp, meta)
        print(f"approved {a.approve}")
        return 0

    c = creds()
    dry = a.dry_run or not c
    if not c:
        print("Instagram not connected: IG_USER_ID / IG_ACCESS_TOKEN not set. Dry-run only; posts stay queued.")
    rc = 0
    for mp, meta in due_posts(a.queue_id):
        if config()["require_approval"] and not meta.get("approved"):
            print(f"{meta['queue_id']}: waiting for approval (publish.py --approve {meta['queue_id']})")
            continue
        url = image_url_for(meta, a.image_url)
        if not url:
            print(f"{meta['queue_id']}: no public image URL (set image_base_url in config.json or IG_IMAGE_BASE_URL)")
            rc = 1
            continue
        if dry:
            print(f"[dry-run] would publish {meta['queue_id']} image={url}")
            continue
        try:
            meta["platforms"]["instagram"] = publish_one(meta, c[0], c[1], url, sleep)
            meta["ig_media_id"] = meta["platforms"]["instagram"]["ig_media_id"]
            meta["status"] = "published"
            print(f"published {meta['queue_id']} -> {meta['ig_media_id']}")
        except http_client.ApiError as e:
            meta["platforms"]["instagram"] = {"status": "queued", "last_error": str(e),
                                              "last_attempt_utc": now().astimezone(timezone.utc).isoformat()}
            print(f"{meta['queue_id']}: publish failed: {e}", file=sys.stderr)
            rc = 1
        save_json(mp, meta)
        try:
            import analytics
            analytics.register_post(meta)
        except Exception as e:  # analytics must never block publishing
            print(f"analytics register failed: {e}", file=sys.stderr)
    return rc


if __name__ == "__main__":
    sys.exit(main())
