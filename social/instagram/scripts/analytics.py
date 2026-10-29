#!/usr/bin/env python3
"""Instagram + TikTok analytics: SQLite store, collectors, winners report, daily digest.

DB: social/instagram/data/analytics.db (override with SOCIAL_ANALYTICS_DB). All
timestamps are stored in UTC (ISO 8601); reports display America/New_York.

Commands:
  python3 analytics.py collect [--platform instagram|tiktok|all]
  python3 analytics.py digest [--email] [--send]   # --email builds the Resend email; --send actually sends
  python3 analytics.py winners [--min-sample 3]    # also writes data/weights.json
  python3 analytics.py sync-queue                  # register already-published queue posts in the DB

Metric notes
- Instagram `impressions` is deprecated for media created after 2024-07-02 (error since
  2025-04-21); we collect `views` instead and only keep the impressions column for
  older media. Each metric is retried individually if a batch request fails, so an
  unsupported metric never blocks the rest.
- Instagram engagement rate = (likes + comments + saved + shares) / reach.
- TikTok has no reach: we store view_count in `views` and use
  (likes + comments + shares) / views as its engagement rate.
"""
import argparse
import json
import os
import sqlite3
import sys
from datetime import datetime, timedelta, timezone

import http_client
from common import QUEUE, config, load_json, now, path, save_json, tz

AGE_BUCKETS = [("24h", 24), ("72h", 72), ("7d", 168)]
IG_MEDIA_METRICS = ["reach", "views", "likes", "comments", "saved", "shares", "profile_visits",
                    "profile_activity", "follows", "total_interactions"]
IG_USER_METRICS = ["follower_count", "website_clicks", "profile_views"]
DIMENSIONS = ["post_type", "material", "stone", "style", "cabinets", "lighting", "layout", "cta",
              "hashtag_set_id", "slot", "promo"]

SCHEMA = """
CREATE TABLE IF NOT EXISTS posts (
  platform TEXT NOT NULL,              -- instagram | tiktok
  post_id TEXT NOT NULL,               -- IG media id | TikTok video id
  queue_id TEXT, permalink TEXT,
  published_at_utc TEXT, scheduled_at_utc TEXT,
  post_type TEXT, material TEXT, stone TEXT, style TEXT, cabinets TEXT, lighting TEXT, layout TEXT,
  cta TEXT, hashtag_set_id TEXT, slot TEXT, promo INTEGER,
  PRIMARY KEY (platform, post_id)
);
CREATE TABLE IF NOT EXISTS post_metrics (
  platform TEXT NOT NULL, post_id TEXT NOT NULL,
  age_bucket TEXT NOT NULL,            -- 24h | 72h | 7d | latest
  collected_at_utc TEXT NOT NULL, age_hours REAL,
  reach INTEGER, views INTEGER, impressions INTEGER, likes INTEGER, comments INTEGER,
  saved INTEGER, shares INTEGER, profile_visits INTEGER, profile_activity INTEGER,
  website_clicks INTEGER, follows INTEGER, total_interactions INTEGER,
  raw_json TEXT,
  PRIMARY KEY (platform, post_id, age_bucket)
);
CREATE TABLE IF NOT EXISTS follower_snapshots (
  platform TEXT NOT NULL, snapshot_date_et TEXT NOT NULL,
  collected_at_utc TEXT NOT NULL, followers_count INTEGER,
  follower_count_insight INTEGER, website_clicks INTEGER, profile_views INTEGER, raw_json TEXT,
  PRIMARY KEY (platform, snapshot_date_et)
);
CREATE TABLE IF NOT EXISTS collector_runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT, platform TEXT NOT NULL,
  started_at_utc TEXT NOT NULL, finished_at_utc TEXT,
  status TEXT,                         -- ok | not_connected | error | partial
  posts_checked INTEGER DEFAULT 0, metrics_written INTEGER DEFAULT 0,
  snapshots_written INTEGER DEFAULT 0, error TEXT
);
"""


def db_path():
    return os.environ.get("SOCIAL_ANALYTICS_DB") or path("data", "analytics.db")


def connect():
    con = sqlite3.connect(db_path())
    con.row_factory = sqlite3.Row
    con.executescript(SCHEMA)
    return con


def utcnow():
    return now().astimezone(timezone.utc)


def iso(dt):
    return dt.astimezone(timezone.utc).isoformat(timespec="seconds")


def et(ts):
    return datetime.fromisoformat(ts).astimezone(tz()).strftime("%b %-d, %-I:%M %p ET")


# ---------------------------------------------------------------- registration
def register_post(meta, platform="instagram", con=None):
    p = meta.get("platforms", {}).get(platform, {})
    # TikTok posts are registered only once the publish status returns a public video id
    post_id = p.get("ig_media_id") if platform == "instagram" else p.get("video_id")
    if not post_id:
        return False
    own = con is None
    con = con or connect()
    d = meta.get("dimensions", {})
    con.execute(
        """INSERT INTO posts (platform, post_id, queue_id, permalink, published_at_utc, scheduled_at_utc,
           post_type, material, stone, style, cabinets, lighting, layout, cta, hashtag_set_id, slot, promo)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
           ON CONFLICT(platform, post_id) DO UPDATE SET permalink=excluded.permalink,
           published_at_utc=excluded.published_at_utc""",
        (platform, post_id, meta.get("queue_id"), p.get("permalink") or p.get("share_url"),
         p.get("published_at_utc"), meta.get("scheduled_at_utc"),
         d.get("post_type"), d.get("material"), d.get("stone"), d.get("style"), d.get("cabinets"),
         d.get("lighting"), d.get("layout"), d.get("cta"), d.get("hashtag_set_id"), d.get("slot"),
         int(bool(d.get("promo")))))
    con.commit()
    if own:
        con.close()
    return True


def sync_queue(con):
    n = 0
    for name in sorted(os.listdir(QUEUE)) if os.path.isdir(QUEUE) else []:
        meta = load_json(os.path.join(QUEUE, name, "meta.json"))
        if meta:
            for platform in ("instagram", "tiktok"):
                n += register_post(meta, platform, con)
    return n


# ---------------------------------------------------------------- instagram
def ig_creds():
    uid, tok = os.environ.get("IG_USER_ID"), os.environ.get("IG_ACCESS_TOKEN")
    return (uid, tok) if uid and tok else None


def ig_url(*parts):
    g = config()["graph_api"]
    return "/".join([g["host"].rstrip("/"), g["version"]] + [str(p) for p in parts])


def parse_insights(resp):
    out = {}
    for item in resp.get("data", []):
        if "values" in item and item["values"]:
            out[item["name"]] = item["values"][-1].get("value")
        elif "total_value" in item:
            out[item["name"]] = item["total_value"].get("value")
    return out


def ig_media_insights(media_id, tok):
    """Batch request; on error retry metric by metric and skip unsupported ones."""
    try:
        return parse_insights(http_client.send("GET", ig_url(media_id, "insights"),
                                               {"metric": ",".join(IG_MEDIA_METRICS), "access_token": tok})), []
    except http_client.ApiError:
        vals, skipped = {}, []
        for m in IG_MEDIA_METRICS:
            try:
                vals.update(parse_insights(http_client.send("GET", ig_url(media_id, "insights"),
                                                            {"metric": m, "access_token": tok})))
            except http_client.ApiError:
                skipped.append(m)
        return vals, skipped


def store_metrics(con, platform, post_id, bucket, age_h, vals, raw):
    cols = ["reach", "views", "impressions", "likes", "comments", "saved", "shares", "profile_visits",
            "profile_activity", "website_clicks", "follows", "total_interactions"]
    con.execute(
        f"""INSERT OR REPLACE INTO post_metrics (platform, post_id, age_bucket, collected_at_utc, age_hours,
            {",".join(cols)}, raw_json) VALUES (?,?,?,?,?,{",".join("?" * len(cols))},?)""",
        [platform, post_id, bucket, iso(utcnow()), round(age_h, 2)] + [vals.get(c) for c in cols]
        + [json.dumps(raw)])


def buckets_due(con, platform, post_id, age_h):
    have = {r[0] for r in con.execute(
        "SELECT age_bucket FROM post_metrics WHERE platform=? AND post_id=?", (platform, post_id))}
    return [b for b, h in AGE_BUCKETS if age_h >= h and b not in have] + ["latest"]


def collect_instagram(con):
    run = start_run(con, "instagram")
    c = ig_creds()
    if not c:
        return finish_run(con, run, "not_connected",
                          error="Instagram not connected (IG_USER_ID / IG_ACCESS_TOKEN not set)")
    uid, tok = c
    checked = written = snaps = 0
    errors = []
    for row in con.execute("SELECT post_id, published_at_utc FROM posts WHERE platform='instagram'").fetchall():
        if not row["published_at_utc"]:
            continue
        age_h = (utcnow() - datetime.fromisoformat(row["published_at_utc"])).total_seconds() / 3600
        checked += 1
        try:
            vals, skipped = ig_media_insights(row["post_id"], tok)
            if "profile_activity" in vals and isinstance(vals["profile_activity"], dict):
                vals["website_clicks"] = vals["profile_activity"].get("bio_link_clicked")
                vals["profile_activity"] = sum(v for v in vals["profile_activity"].values() if isinstance(v, int))
            for bucket in buckets_due(con, "instagram", row["post_id"], age_h):
                store_metrics(con, "instagram", row["post_id"], bucket, age_h, vals,
                              {"values": vals, "skipped": skipped})
                written += 1
        except http_client.ApiError as e:
            errors.append(f"{row['post_id']}: {e}")
    try:
        user = http_client.send("GET", ig_url(uid), {"fields": "followers_count,media_count", "access_token": tok})
        extra = {}
        for m in IG_USER_METRICS:
            try:
                params = {"metric": m, "period": "day", "access_token": tok}
                if m != "follower_count":
                    params["metric_type"] = "total_value"
                extra.update(parse_insights(http_client.send("GET", ig_url(uid, "insights"), params)))
            except http_client.ApiError:
                pass  # follower_count needs 100+ followers; other metrics vary by API version
        snaps += write_snapshot(con, "instagram", user.get("followers_count"), extra.get("follower_count"),
                                extra.get("website_clicks"), extra.get("profile_views"), {"user": user, **extra})
    except http_client.ApiError as e:
        errors.append(f"followers: {e}")
    status = "ok" if not errors else ("partial" if written or snaps else "error")
    return finish_run(con, run, status, checked, written, snaps, "; ".join(errors)[:1000] or None)


# ---------------------------------------------------------------- shared
def write_snapshot(con, platform, followers, insight=None, clicks=None, views=None, raw=None):
    con.execute(
        """INSERT OR REPLACE INTO follower_snapshots (platform, snapshot_date_et, collected_at_utc,
           followers_count, follower_count_insight, website_clicks, profile_views, raw_json)
           VALUES (?,?,?,?,?,?,?,?)""",
        (platform, now().strftime("%Y-%m-%d"), iso(utcnow()), followers, insight, clicks, views,
         json.dumps(raw or {})))
    return 1


def start_run(con, platform):
    cur = con.execute("INSERT INTO collector_runs (platform, started_at_utc) VALUES (?,?)", (platform, iso(utcnow())))
    con.commit()
    return cur.lastrowid


def finish_run(con, run, status, checked=0, written=0, snaps=0, error=None):
    con.execute("""UPDATE collector_runs SET finished_at_utc=?, status=?, posts_checked=?, metrics_written=?,
                   snapshots_written=?, error=? WHERE id=?""",
                (iso(utcnow()), status, checked, written, snaps, error, run))
    con.commit()
    return {"status": status, "posts_checked": checked, "metrics_written": written,
            "snapshots_written": snaps, "error": error}


def tiktok_module():
    sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "tiktok"))
    import tiktok_publish
    return tiktok_publish


def collect(platform="all", con=None):
    con = con or connect()
    sync_queue(con)
    out = {}
    if platform in ("all", "instagram"):
        out["instagram"] = collect_instagram(con)
    if platform in ("all", "tiktok"):
        out["tiktok"] = tiktok_module().collect(con)
    return out


# ---------------------------------------------------------------- reporting
def engagement(row, platform):
    if row is None:
        return None
    inter = sum((row[k] or 0) for k in ("likes", "comments", "shares")) + (
        (row["saved"] or 0) if platform == "instagram" else 0)
    base = row["reach"] if platform == "instagram" else row["views"]
    return inter / base if base else None


def best_rows(con, platform):
    """One metrics row per post: most mature bucket (7d > 72h > 24h > latest)."""
    order = {"7d": 0, "72h": 1, "24h": 2, "latest": 3}
    rows = {}
    for r in con.execute("""SELECT m.*, p.* FROM post_metrics m JOIN posts p
                            ON p.platform=m.platform AND p.post_id=m.post_id WHERE m.platform=?""", (platform,)):
        cur = rows.get(r["post_id"])
        if cur is None or order[r["age_bucket"]] < order[cur["age_bucket"]]:
            rows[r["post_id"]] = r
    return list(rows.values())


def winners(con, platform="instagram", min_sample=3):
    rows = best_rows(con, platform)
    report = {}
    for dim in DIMENSIONS:
        groups = {}
        for r in rows:
            er = engagement(r, platform)
            if er is not None and r[dim] is not None:
                groups.setdefault(str(r[dim]), []).append(er)
        ranked = sorted(((v, len(e), sum(e) / len(e)) for v, e in groups.items() if len(e) >= min_sample),
                        key=lambda x: -x[2])
        report[dim] = [{"value": v, "posts": n, "engagement_rate": round(er, 4)} for v, n, er in ranked]
    return report


def write_weights(report, platform="instagram", min_sample=3):
    """Optional weights the prompt-builder MAY read later (not wired in yet): value -> ER / mean ER."""
    weights = {"_note": "Generated by analytics.py winners. Not used by prompt_builder yet; see README "
                        "'Using weights.json'. Values are engagement rate relative to the dimension mean "
                        f"(1.0 = average); only groups with >= {min_sample} posts are included.",
               "platform": platform, "generated_at_utc": iso(utcnow()), "min_sample": min_sample}
    for dim, items in report.items():
        if items:
            mean = sum(i["engagement_rate"] for i in items) / len(items)
            weights[dim] = {i["value"]: round(i["engagement_rate"] / mean, 3) if mean else 1.0 for i in items}
    save_json("data/weights.json", weights)
    return weights


def follower_change(con, platform):
    snaps = con.execute("""SELECT snapshot_date_et, followers_count FROM follower_snapshots
                           WHERE platform=? AND followers_count IS NOT NULL ORDER BY snapshot_date_et""",
                        (platform,)).fetchall()
    if not snaps:
        return None, None, None
    latest = snaps[-1]
    by_date = {s[0]: s[1] for s in snaps}
    d = datetime.strptime(latest[0], "%Y-%m-%d")
    prev = by_date.get((d - timedelta(days=1)).strftime("%Y-%m-%d"))
    wk = by_date.get((d - timedelta(days=7)).strftime("%Y-%m-%d"))
    return latest[1], (latest[1] - prev) if prev is not None else None, (latest[1] - wk) if wk is not None else None


def fmt_delta(v):
    return "n/a (need more snapshots)" if v is None else f"{v:+d}"


def platform_section(con, platform, min_sample=3):
    label = {"instagram": "Instagram", "tiktok": "TikTok"}[platform]
    base_name = "reach" if platform == "instagram" else "views"
    lines = [f"## {label}"]
    last = con.execute("""SELECT * FROM collector_runs WHERE platform=? ORDER BY id DESC LIMIT 1""",
                       (platform,)).fetchone()
    if last is None or last["status"] == "not_connected":
        lines.append(f"- Not connected yet: {last['error'] if last else 'collector has not run'}. No metrics collected.")
        return lines
    rows = best_rows(con, platform)
    yday = (now() - timedelta(days=1)).date()
    yrows = [r for r in rows if r["published_at_utc"]
             and datetime.fromisoformat(r["published_at_utc"]).astimezone(tz()).date() == yday]
    if yrows:
        top = max(yrows, key=lambda r: (r[base_name] or 0))
        er = engagement(top, platform)
        lines.append(f"- Yesterday's top post: {top['stone'] or top['post_id']} ({top['slot'] or ''}), "
                     f"{base_name} {top[base_name] or 0}, engagement {er:.1%}" if er is not None else
                     f"- Yesterday's top post: {top['stone'] or top['post_id']}, {base_name} {top[base_name] or 0}")
    else:
        lines.append("- Yesterday's top post: no posts published yesterday")
    tot_i = sum(sum((r[k] or 0) for k in ("likes", "comments", "shares"))
                + ((r["saved"] or 0) if platform == "instagram" else 0) for r in rows)
    tot_b = sum((r[base_name] or 0) for r in rows)
    lines.append(f"- Overall engagement rate: {tot_i / tot_b:.1%} across {len(rows)} posts" if tot_b
                 else "- Overall engagement rate: n/a (no metrics yet)")
    followers, dod, wk = follower_change(con, platform)
    lines.append(f"- Followers: {followers if followers is not None else 'n/a'} "
                 f"(day {fmt_delta(dod)}, 7-day {fmt_delta(wk)})")
    w = winners(con, platform, min_sample).get("post_type") or []
    lines.append(f"- Best post type: {w[0]['value']} ({w[0]['engagement_rate']:.1%}, {w[0]['posts']} posts)" if w
                 else f"- Best post type: not enough data yet (needs {min_sample}+ posts per type)")
    errs = con.execute("""SELECT started_at_utc, status, error FROM collector_runs WHERE platform=?
                          AND status IN ('error','partial') AND started_at_utc >= ? ORDER BY id DESC LIMIT 3""",
                       (platform, iso(utcnow() - timedelta(hours=24)))).fetchall()
    lines.append("- Collector errors (24h): none" if not errs else
                 "- Collector errors (24h): " + " | ".join(f"{et(e[0])} {e[1]}: {e[2]}" for e in errs))
    return lines


def digest(con=None, min_sample=3):
    con = con or connect()
    out = [f"# Urban Stone social digest, {now().strftime('%a %b %-d, %Y')} (ET)"]
    for platform in ("instagram", "tiktok"):
        out += [""] + platform_section(con, platform, min_sample)
    return "\n".join(out)


def email_payload(text):
    to = os.environ.get("SOCIAL_DIGEST_EMAIL_TO", "sales@urbanstone.co")
    sender = os.environ.get("SOCIAL_DIGEST_EMAIL_FROM", "Urban Stone <sales@urbanstone.co>")
    return {"from": sender, "to": [to], "subject": text.splitlines()[0].lstrip("# "), "text": text}


def send_email(text):
    key = os.environ.get("RESEND_API_KEY")
    if not key:
        raise SystemExit("RESEND_API_KEY not set; email not sent")
    return http_client.send("POST", "https://api.resend.com/emails", json_body=email_payload(text),
                            headers={"Authorization": f"Bearer {key}"})


def main(argv=None):
    ap = argparse.ArgumentParser()
    sub = ap.add_subparsers(dest="cmd", required=True)
    c = sub.add_parser("collect")
    c.add_argument("--platform", default="all", choices=["all", "instagram", "tiktok"])
    d = sub.add_parser("digest")
    d.add_argument("--email", action="store_true", help="build the email to sales@ (prints payload unless --send)")
    d.add_argument("--send", action="store_true", help="actually send via Resend (needs RESEND_API_KEY)")
    d.add_argument("--min-sample", type=int, default=3)
    w = sub.add_parser("winners")
    w.add_argument("--platform", default="instagram", choices=["instagram", "tiktok"])
    w.add_argument("--min-sample", type=int, default=3)
    sub.add_parser("sync-queue")
    a = ap.parse_args(argv)
    con = connect()
    if a.cmd == "collect":
        print(json.dumps(collect(a.platform, con), indent=2))
    elif a.cmd == "sync-queue":
        print(f"registered {sync_queue(con)} published posts")
    elif a.cmd == "winners":
        rep = winners(con, a.platform, a.min_sample)
        write_weights(rep, a.platform, a.min_sample)
        print(json.dumps(rep, indent=2))
    elif a.cmd == "digest":
        text = digest(con, a.min_sample)
        print(text)
        if a.email:
            if a.send:
                res = send_email(text)
                print(f"emailed digest (id={res.get('id')})")
            else:
                p = email_payload(text)
                print(f"\n[email not sent] would send to {p['to'][0]} from {p['from']}: {p['subject']} (add --send)")


if __name__ == "__main__":
    main()
