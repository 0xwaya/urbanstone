#!/usr/bin/env python3
"""TikTok adapter: publish queue posts (Content Posting API) and collect metrics (Display API).

Shares the Instagram queue (social/instagram/queue/<id>/), the 06:00 / 16:00 ET schedule
(social/instagram/config.json) and the analytics DB (platform='tiktok').

Credentials (env/secrets only, never printed):
  TIKTOK_CLIENT_KEY, TIKTOK_CLIENT_SECRET, TIKTOK_REFRESH_TOKEN  (preferred: refreshed each run)
  TIKTOK_ACCESS_TOKEN                                             (optional short-lived override)
Without credentials everything dry-runs and prints "TikTok not connected".

Usage:
  python3 social/tiktok/tiktok_publish.py publish [--dry-run] [--queue-id ID]
  python3 social/tiktok/tiktok_publish.py video --queue-id ID     # build the Ken Burns MP4 only
  python3 social/tiktok/tiktok_publish.py status --queue-id ID    # poll a publish_id, store video id
"""
import argparse
import json
import os
import subprocess
import sys
import time
from datetime import datetime, timezone

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "instagram", "scripts"))
import http_client  # noqa: E402
from common import QUEUE, load_json, now, save_json  # noqa: E402


def cfg():
    with open(os.path.join(HERE, "config.json")) as f:
        return json.load(f)


def api(p):
    return cfg()["api_base"].rstrip("/") + p


def access_token():
    """Return a fresh access token, or None when TikTok is not connected."""
    if os.environ.get("TIKTOK_ACCESS_TOKEN"):
        return os.environ["TIKTOK_ACCESS_TOKEN"]
    key, secret, refresh = (os.environ.get(k) for k in ("TIKTOK_CLIENT_KEY", "TIKTOK_CLIENT_SECRET", "TIKTOK_REFRESH_TOKEN"))
    if not (key and secret and refresh):
        return None
    r = http_client.send("POST", api("/oauth/token/"), {
        "client_key": key, "client_secret": secret, "grant_type": "refresh_token", "refresh_token": refresh})
    if r.get("refresh_token") and r["refresh_token"] != refresh:
        print("note: TikTok issued a new refresh token; update the TIKTOK_REFRESH_TOKEN secret "
              "(value not printed)", file=sys.stderr)
    return r.get("access_token")


def bearer(tok):
    return {"Authorization": f"Bearer {tok}"}


def check(resp):
    err = resp.get("error", {})
    if err.get("code") not in (None, "ok"):
        raise http_client.ApiError(f"TikTok {err.get('code')}: {err.get('message')}")
    return resp.get("data", {})


def public_url(meta, filename):
    base = cfg().get("image_base_url") or os.environ.get("TIKTOK_MEDIA_BASE_URL", "")
    return f"{base.rstrip('/')}/{meta['queue_id']}/{filename}" if base else None


def build_video(folder, c=None):
    """Slow Ken Burns zoom on post_9x16.jpg -> tiktok.mp4 (1080x1920, H.264, silent)."""
    c = c or cfg()["video"]
    src, out = os.path.join(folder, "post_9x16.jpg"), os.path.join(folder, "tiktok.mp4")
    frames = int(c["seconds"] * c["fps"])
    step = (c["zoom_to"] - 1.0) / frames
    vf = (f"scale=2160:3840,zoompan=z='min(zoom+{step:.6f},{c['zoom_to']})':d={frames}:"
          f"x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1080x1920:fps={c['fps']},format=yuv420p")
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-loop", "1", "-i", src, "-vf", vf,
                    "-frames:v", str(frames), "-c:v", "libx264", "-preset", "medium", "-crf", "20",
                    "-movflags", "+faststart", out], check=True)
    return out


def caption(folder):
    p = os.path.join(folder, "tiktok_caption.txt")
    if not os.path.exists(p):
        return ""
    with open(p, encoding="utf-8") as f:
        return f.read().strip()


def publish_one(meta, folder, tok, mode):
    c = cfg()
    info = check(http_client.send("POST", api("/post/publish/creator_info/query/"), json_body={}, headers=bearer(tok)))
    options = info.get("privacy_level_options", [])
    if options and c["privacy_level"] not in options:
        raise http_client.ApiError(f"privacy_level {c['privacy_level']} not allowed; creator options: {options}")
    text = caption(folder)
    if mode == "video":
        url = public_url(meta, "tiktok.mp4")
        body = {"post_info": {"title": text[:2200], "privacy_level": c["privacy_level"],
                              "disable_comment": c["disable_comment"]},
                "source_info": {"source": "PULL_FROM_URL", "video_url": url}}
        data = check(http_client.send("POST", api("/post/publish/video/init/"), json_body=body, headers=bearer(tok)))
    else:
        url = public_url(meta, meta["files"]["9x16"]["jpg"])
        body = {"post_info": {"title": text.splitlines()[0][:90], "description": text[:4000],
                              "privacy_level": c["privacy_level"], "disable_comment": c["disable_comment"],
                              "auto_add_music": c["auto_add_music"]},
                "source_info": {"source": "PULL_FROM_URL", "photo_cover_index": 0, "photo_images": [url]},
                "post_mode": "DIRECT_POST", "media_type": "PHOTO"}
        data = check(http_client.send("POST", api("/post/publish/content/init/"), json_body=body, headers=bearer(tok)))
    return {"status": "processing", "publish_id": data["publish_id"], "mode": mode,
            "privacy_level": c["privacy_level"], "published_at_utc": now().astimezone(timezone.utc).isoformat()}


def fetch_status(entry, tok):
    data = check(http_client.send("POST", api("/post/publish/status/fetch/"),
                                  json_body={"publish_id": entry["publish_id"]}, headers=bearer(tok)))
    entry["tiktok_status"] = data.get("status")
    ids = data.get("publicaly_available_post_id") or data.get("publicly_available_post_id") or []
    if ids:
        entry["video_id"] = str(ids[0])
    if data.get("status") == "PUBLISH_COMPLETE":
        entry["status"] = "published"
    elif data.get("status") == "FAILED":
        entry["status"] = "failed"
        entry["last_error"] = data.get("fail_reason")
    return entry


def due(queue_id=None):
    for name in sorted(os.listdir(QUEUE)) if os.path.isdir(QUEUE) else []:
        mp = os.path.join(QUEUE, name, "meta.json")
        meta = load_json(mp)
        if not meta or (queue_id and name != queue_id):
            continue
        tk = meta.setdefault("platforms", {}).setdefault("tiktok", {"status": "queued"})
        if tk.get("status") != "queued":
            continue
        if not queue_id and datetime.fromisoformat(meta["scheduled_at_utc"]) > now().astimezone(timezone.utc):
            continue
        yield mp, meta


def cmd_publish(a):
    c = cfg()
    if not c.get("enabled", True):
        print("TikTok publishing disabled in social/tiktok/config.json")
        return 0
    tok = None if a.dry_run else access_token()
    if not tok:
        print("TikTok not connected: TIKTOK_CLIENT_KEY / TIKTOK_CLIENT_SECRET / TIKTOK_REFRESH_TOKEN not set. "
              "Dry-run only; posts stay queued.")
    ig_cfg = load_json("config.json")
    rc = 0
    for mp, meta in due(a.queue_id):
        folder = os.path.dirname(mp)
        if ig_cfg.get("require_approval") and not meta.get("approved"):
            print(f"{meta['queue_id']}: waiting for approval")
            continue
        mode = c["mode"]
        if mode == "video" and not os.path.exists(os.path.join(folder, "tiktok.mp4")):
            build_video(folder)
        fname = "tiktok.mp4" if mode == "video" else meta["files"]["9x16"]["jpg"]
        url = public_url(meta, fname)
        if not url:
            print(f"{meta['queue_id']}: no public media URL (set image_base_url in social/tiktok/config.json)")
            rc = 1
            continue
        if not tok:
            print(f"[dry-run] would post {mode} {meta['queue_id']} url={url} privacy={c['privacy_level']}")
            continue
        try:
            meta["platforms"]["tiktok"] = publish_one(meta, folder, tok, mode)
            print(f"tiktok publish started {meta['queue_id']} publish_id={meta['platforms']['tiktok']['publish_id']}")
        except http_client.ApiError as e:
            meta["platforms"]["tiktok"]["last_error"] = str(e)
            print(f"{meta['queue_id']}: tiktok publish failed: {e}", file=sys.stderr)
            rc = 1
        save_json(mp, meta)
    return rc


def cmd_status(a, sleep=time.sleep):
    tok = access_token()
    if not tok:
        print("TikTok not connected.")
        return 0
    mp = os.path.join(QUEUE, a.queue_id, "meta.json")
    meta = load_json(mp)
    entry = fetch_status(meta["platforms"]["tiktok"], tok)
    save_json(mp, meta)
    import analytics
    analytics.register_post(meta, "tiktok")
    print(json.dumps({k: entry.get(k) for k in ("status", "tiktok_status", "video_id")}))
    return 0


def collect(con):
    """Called by analytics.collect: refresh pending publish ids, then video + follower metrics."""
    import analytics
    run = analytics.start_run(con, "tiktok")
    tok = access_token() if any(os.environ.get(k) for k in ("TIKTOK_ACCESS_TOKEN", "TIKTOK_REFRESH_TOKEN")) else None
    if not tok:
        return analytics.finish_run(con, run, "not_connected",
                                    error="TikTok not connected (TIKTOK_CLIENT_KEY / TIKTOK_CLIENT_SECRET / TIKTOK_REFRESH_TOKEN not set)")
    errors, written, snaps = [], 0, 0
    # pending publishes -> video ids
    for name in sorted(os.listdir(QUEUE)) if os.path.isdir(QUEUE) else []:
        mp = os.path.join(QUEUE, name, "meta.json")
        meta = load_json(mp) or {}
        tk = meta.get("platforms", {}).get("tiktok", {})
        if tk.get("publish_id") and not tk.get("video_id"):
            try:
                fetch_status(tk, tok)
                save_json(mp, meta)
            except http_client.ApiError as e:
                errors.append(f"status {name}: {e}")
        if tk.get("video_id"):
            analytics.register_post(meta, "tiktok", con)
    rows = con.execute("SELECT post_id, published_at_utc FROM posts WHERE platform='tiktok'").fetchall()
    ids = [r["post_id"] for r in rows]
    pub = {r["post_id"]: r["published_at_utc"] for r in rows}
    for i in range(0, len(ids), 20):
        try:
            data = check(http_client.send(
                "POST", api("/video/query/?fields=id,create_time,view_count,like_count,comment_count,share_count"),
                json_body={"filters": {"video_ids": ids[i:i + 20]}}, headers=bearer(tok)))
            for v in data.get("videos", []):
                vals = {"views": v.get("view_count"), "likes": v.get("like_count"),
                        "comments": v.get("comment_count"), "shares": v.get("share_count")}
                age_h = (analytics.utcnow() - datetime.fromisoformat(pub[v["id"]])).total_seconds() / 3600 \
                    if pub.get(v["id"]) else 0
                for bucket in analytics.buckets_due(con, "tiktok", v["id"], age_h):
                    analytics.store_metrics(con, "tiktok", v["id"], bucket, age_h, vals, v)
                    written += 1
        except http_client.ApiError as e:
            errors.append(f"video/query: {e}")
    try:
        u = check(http_client.send("GET", api("/user/info/"), {"fields": "follower_count,likes_count,video_count"},
                                   headers=bearer(tok))).get("user", {})
        snaps += analytics.write_snapshot(con, "tiktok", u.get("follower_count"), raw=u)
    except http_client.ApiError as e:
        errors.append(f"user/info: {e}")
    status = "ok" if not errors else ("partial" if written or snaps else "error")
    return analytics.finish_run(con, run, status, len(ids), written, snaps, "; ".join(errors)[:1000] or None)


def main(argv=None):
    ap = argparse.ArgumentParser()
    sub = ap.add_subparsers(dest="cmd", required=True)
    p = sub.add_parser("publish")
    p.add_argument("--dry-run", action="store_true")
    p.add_argument("--queue-id")
    v = sub.add_parser("video")
    v.add_argument("--queue-id", required=True)
    s = sub.add_parser("status")
    s.add_argument("--queue-id", required=True)
    a = ap.parse_args(argv)
    if a.cmd == "publish":
        return cmd_publish(a)
    if a.cmd == "video":
        print(build_video(os.path.join(QUEUE, a.queue_id)))
        return 0
    return cmd_status(a)


if __name__ == "__main__":
    sys.exit(main())
