"""Fixture tests for the Urban Stone social pipeline (Instagram + TikTok), mocked APIs only.

Run: python3 -m unittest discover -s social/tests -v
"""
import json
import os
import shutil
import sqlite3
import sys
import tempfile
import unittest
from datetime import datetime, timedelta, timezone
from unittest import mock

HERE = os.path.dirname(os.path.abspath(__file__))
IG = os.path.join(HERE, "..", "instagram")
sys.path.insert(0, os.path.join(IG, "scripts"))
sys.path.insert(0, os.path.join(HERE, "..", "tiktok"))

import common  # noqa: E402
import http_client  # noqa: E402
import prompt_builder, hashtags, captions, compose, make_post, publish, analytics  # noqa: E402,E401
import tiktok_publish  # noqa: E402
from PIL import Image  # noqa: E402

ET = common.tz()


class FakeAPI:
    """Routes (method, url-substring) -> response or exception; records calls."""

    def __init__(self, routes):
        self.routes, self.calls = routes, []

    def __call__(self, method, url, params=None, json_body=None, headers=None):
        self.calls.append((method, url, params, json_body))
        metric = (params or {}).get("metric")
        for (m, frag, met), resp in self.routes.items():
            if m == method and frag in url and (met is None or met == metric):
                if isinstance(resp, Exception):
                    raise resp
                return resp(params, json_body) if callable(resp) else resp
        raise http_client.ApiError(f"unrouted {method} {url} {metric}")


class Sandbox(unittest.TestCase):
    """Copies config/data/brand/fonts into a temp ROOT so tests never touch the real queue/state."""

    def setUp(self):
        self.tmp = tempfile.mkdtemp()
        for d in ("data", "brand", "fonts"):
            shutil.copytree(os.path.join(IG, d), os.path.join(self.tmp, d),
                            ignore=shutil.ignore_patterns("analytics.db", "weights.json"))
        shutil.copy(os.path.join(IG, "config.json"), self.tmp)
        os.makedirs(os.path.join(self.tmp, "state"))
        os.makedirs(os.path.join(self.tmp, "queue"))
        common.save_json(os.path.join(self.tmp, "state", "history.json"), [])
        q = os.path.join(self.tmp, "queue")
        self.patches = [mock.patch.object(common, "ROOT", self.tmp)] + [
            mock.patch.object(m, "QUEUE", q) for m in (common, make_post, publish, analytics, tiktok_publish)]
        self.patches.append(mock.patch.dict(os.environ, {"SOCIAL_ANALYTICS_DB": os.path.join(self.tmp, "a.db")}))
        for k in ("IG_USER_ID", "IG_ACCESS_TOKEN", "TIKTOK_ACCESS_TOKEN", "TIKTOK_REFRESH_TOKEN",
                  "TIKTOK_CLIENT_KEY", "TIKTOK_CLIENT_SECRET", "RESEND_API_KEY"):
            self.patches.append(mock.patch.dict(os.environ, {k: ""}))
        for p in self.patches:
            p.start()
        self.scene_img = os.path.join(self.tmp, "scene.jpg")
        img = Image.new("RGB", (720, 1280), (236, 234, 228))
        for x in range(40, 680, 4):  # "countertop" stripe at 60% height
            for y in range(740, 800):
                img.putpixel((x, y), (20, 20, 20) if (x // 8 + y // 8) % 2 else (240, 240, 240))
        for x in range(520, 720, 3):  # busy top-right corner
            for y in range(0, 420, 3):
                img.putpixel((x, y), (0, 0, 0))
        img.save(self.scene_img)

    def tearDown(self):
        for p in reversed(self.patches):
            p.stop()
        shutil.rmtree(self.tmp)

    def make(self, slot="2026-10-29 16:00", focus=0.6):
        prompt_builder.choose(seed=1)
        scene = prompt_builder.choose(seed=hash(slot) % 1000)
        common.save_json("state/pending_scene.json", scene)
        extra = ["--before", self.scene_img] if scene.get("format") == "before_after" else []
        with mock.patch("sys.stdout"):
            make_post.main(["--scene", self.scene_img, "--slot", slot, "--focus-y", str(focus)] + extra)
        return common.load_json(os.path.join(self.tmp, "queue", slot.replace("-", "-").replace(" ", "-").replace(":", ""), "meta.json"))


class RulesTests(Sandbox):
    def test_finish_and_outdoor_rules(self):
        import rules
        self.assertTrue(rules.violations("marble", "live edge", "kitchen island"))
        self.assertTrue(rules.violations("quartzite", "live edge", "vanity"))
        self.assertTrue(rules.violations("quartz", "leathered", "kitchen island"))
        for m in ("marble", "quartzite", "quartz"):
            self.assertTrue(rules.violations(m, "polished", rules.OUTDOOR))
        self.assertFalse(rules.violations("granite", "live edge", rules.OUTDOOR))
        self.assertFalse(rules.violations("marble", "leathered", "fireplace"))

    def test_generated_scenes_obey_rules(self):
        hist = []
        for i in range(60):
            sc = prompt_builder.choose(seed=i)
            import rules
            self.assertEqual(rules.violations(sc["material"], sc["finish"], sc["application"]), [])
            self.assertEqual(sc["format"] == "before_after", sc["application"] in rules.BEFORE_AFTER_APPS)
            if sc["format"] == "before_after":
                self.assertIn("BEFORE the remodel", sc["before_prompt"])
            hist.append({"key": sc["key"], "stone": sc["stone"], "material": sc["material"],
                         "finish": sc["finish"], "application": sc["application"]})
            common.save_json("state/history.json", hist)


class GeneratorTests(Sandbox):
    def test_prompts_unique_and_no_recent_stone_repeat(self):
        hist = []
        for i in range(30):
            sc = prompt_builder.choose(seed=i)
            self.assertNotIn(sc["key"], {h["key"] for h in hist})
            self.assertNotIn(sc["stone"], {h["stone"] for h in hist[-6:]})
            if hist:
                # alternate material whenever another material still has a stone outside the last 6
                space = common.load_json("data/design_space.json")["stones"]
                if common.config().get("supplier_stones_only"):
                    space = [s for s in space if s.get("catalog")]
                recent = {h["stone"] for h in hist[-6:]}
                if any(s["material"] != hist[-1]["material"] and s["name"] not in recent for s in space):
                    self.assertNotEqual(sc["material"], hist[-1]["material"])
            hist.append(sc)
            common.save_json("state/history.json", hist)
        space = common.load_json("data/design_space.json")["stones"]
        if common.config().get("supplier_stones_only"):
            space = [s for s in space if s.get("catalog")]
            self.assertTrue(all(h["catalog"] for h in hist))
        self.assertEqual({s["material"] for s in space}, {h["material"] for h in hist})

    def test_hashtags_five_max_rotating_and_stone_aware(self):
        hist = []
        dropped = set(common.load_json("data/hashtags.json")["dropped"]["tags"])
        for i in range(6):
            tags, sid = hashtags.pick("marble", hist, seed=i, stone="Nero Marquina Marble")
            self.assertEqual(len(tags), 5, tags)
            self.assertEqual(len(set(tags)), 5)
            self.assertIn("cincinnati", tags)
            self.assertIn("marblecountertops", tags)
            self.assertNotIn("carraramarble", tags)
            self.assertFalse(dropped & set(tags), tags)
            if hist:
                self.assertGreaterEqual(len(set(tags) ^ set(hist[-1]["hashtags"])), 2)
            hist.append({"hashtags": tags})

    def test_hashtags_follow_application_and_finish(self):
        tags, _ = hashtags.pick("granite", [], seed=1, stone="Absolute Black",
                                application="outdoor kitchen/grill area", finish="leathered")
        self.assertIn("granitecountertops", tags)
        self.assertTrue({"outdoorkitchen", "outdoorkitchens", "outdoorkitchendesign"} & set(tags), tags)
        self.assertTrue({"blackgranite", "leatheredgranite", "granite", "naturalstone", "countertops",
                         "countertop"} & set(tags), tags)
        tags, _ = hashtags.pick("quartz", [], seed=2, stone="Taj Mahal")  # quartz Taj Mahal is not quartzite
        self.assertNotIn("tajmahalquartzite", tags)
        self.assertIn("quartzcountertops", tags)
        import tiktok_caption
        tt = tiktok_caption.tags_for({"material": "granite", "application": "outdoor kitchen/grill area",
                                      "format": "before_after"})
        self.assertEqual(tt, ["granitecountertops", "countertops", "outdoorkitchen", "cincinnati", "beforeandafter"])

    def test_caption_promo_window_and_cta_rotation(self):
        sc = prompt_builder.choose(seed=3)
        inside = datetime(2026, 12, 15, 16, tzinfo=ET)
        after = datetime(2026, 12, 16, 6, tzinfo=ET)
        cap, meta = captions.build(sc, [], inside, "#x")
        self.assertIn("18-gauge", cap)
        self.assertTrue(meta["promo"])
        cap2, meta2 = captions.build(sc, [{"cta": meta["cta"]}], after, "#x")
        self.assertNotIn("18-gauge", cap2)
        self.assertNotEqual(meta["cta"], meta2["cta"])
        self.assertIn("(513) 307-5840", cap2)
        if "warranty" in cap2.lower():
            self.assertIn("1-Year Workmanship Warranty", cap2)

    def test_compose_three_formats_logo_clear_of_counter(self):
        out = compose.compose(self.scene_img, os.path.join(self.tmp, "o"), 0.6)
        sizes = {k: Image.open(v["png"]).size for k, v in out.items()}
        self.assertEqual(sizes, {"1x1": (1080, 1080), "4x5": (1080, 1350), "9x16": (1080, 1920)})
        for v in out.values():
            self.assertEqual(v["logo_corner"], "top-left")  # top-right is busy; top preferred over equally calm bottom
            self.assertTrue(os.path.exists(v["jpg"]))

    def test_make_post_queues_and_tags_dimensions(self):
        meta = self.make()
        self.assertEqual(meta["scheduled_at_local"], "2026-10-29T16:00:00-04:00")
        self.assertEqual(meta["dimensions"]["slot"], "4 PM")
        for k in ("post_type", "material", "stone", "style", "cabinets", "cta", "hashtag_set_id"):
            self.assertTrue(meta["dimensions"][k] is not None)
        folder = os.path.join(self.tmp, "queue", "2026-10-29-1600")
        for f in ("post_1x1.png", "post_4x5.png", "post_9x16.png", "caption.txt", "tiktok_caption.txt"):
            self.assertTrue(os.path.exists(os.path.join(folder, f)), f)
        tk = open(os.path.join(folder, "tiktok_caption.txt")).read()
        self.assertLessEqual(tk.count("#"), 5)
        import re
        ig = open(os.path.join(folder, "caption.txt"), encoding="utf-8").read()
        self.assertLessEqual(len(re.findall(r"(?<!\w)#\w+", ig)), 5)
        self.assertEqual(common.config()["schedule_slots"], ["06:00", "16:00"])


class InstagramPublishTests(Sandbox):
    def test_dry_run_when_not_connected(self):
        self.make()
        with mock.patch("builtins.print") as p:
            publish.main(["--queue-id", "2026-10-29-1600"])
        self.assertIn("not connected", " ".join(str(c) for c in p.call_args_list))

    def test_publish_writes_back_media_id_and_registers(self):
        self.make()
        publish.main(["--approve", "2026-10-29-1600"])
        api = FakeAPI({
            ("POST", "/media_publish", None): {"id": "1789"},
            ("POST", "/17841/media", None): {"id": "C1"},
            ("GET", "/C1", None): {"status_code": "FINISHED"},
            ("GET", "/1789", None): {"permalink": "https://instagram.com/p/x", "timestamp": "t"},
        })
        with mock.patch.dict(os.environ, {"IG_USER_ID": "17841", "IG_ACCESS_TOKEN": "tok"}), \
                mock.patch.object(http_client, "send", api):
            rc = publish.main(["--queue-id", "2026-10-29-1600", "--image-url", "https://urbanstone.co/x.jpg"],
                              sleep=lambda s: None)
        self.assertEqual(rc, 0)
        meta = common.load_json(os.path.join(self.tmp, "queue", "2026-10-29-1600", "meta.json"))
        self.assertEqual(meta["ig_media_id"], "1789")
        con = analytics.connect()
        self.assertEqual(con.execute("SELECT stone FROM posts WHERE post_id='1789'").fetchone()[0],
                         meta["dimensions"]["stone"])


class AnalyticsTests(Sandbox):
    def seed_posts(self, n=4):
        con = analytics.connect()
        for i in range(n):
            pub = (analytics.utcnow() - timedelta(hours=30 + i * 24)).isoformat()
            con.execute("INSERT INTO posts (platform, post_id, published_at_utc, post_type, stone, slot) VALUES (?,?,?,?,?,?)",
                        ("instagram", f"m{i}", pub, "kitchen" if i < 3 else "promo", f"S{i}", "4 PM"))
        con.commit()
        return con

    def test_collect_handles_deprecated_metric_and_buckets(self):
        con = self.seed_posts()

        def per_metric(params, body):
            if params["metric"] == "profile_activity":
                raise http_client.ApiError("unsupported")
            return {"data": [{"name": params["metric"], "values": [{"value": 10 if params["metric"] == "reach" else 1}]}]}
        api = FakeAPI({
            ("GET", "/insights", ",".join(analytics.IG_MEDIA_METRICS)): http_client.ApiError("(#100) invalid metric"),
            ("GET", "/m", None): per_metric,
            ("GET", "/17841/insights", "follower_count"): {"data": [{"name": "follower_count", "values": [{"value": 3}]}]},
            ("GET", "/17841/insights", None): http_client.ApiError("n/a"),
            ("GET", "/17841", None): {"followers_count": 120, "media_count": 4},
        })
        with mock.patch.dict(os.environ, {"IG_USER_ID": "17841", "IG_ACCESS_TOKEN": "tok"}), \
                mock.patch.object(http_client, "send", api):
            res = analytics.collect_instagram(con)
        self.assertEqual(res["status"], "ok")
        buckets = {r[0] for r in con.execute("SELECT age_bucket FROM post_metrics WHERE post_id='m3'")}
        self.assertEqual(buckets, {"24h", "72h", "latest"})
        self.assertFalse(any("impressions" in str(c[2]) for c in api.calls))
        self.assertEqual(con.execute("SELECT followers_count FROM follower_snapshots").fetchone()[0], 120)

    def test_winners_min_sample_weights_and_digest(self):
        con = self.seed_posts()
        for i in range(4):
            analytics.store_metrics(con, "instagram", f"m{i}", "24h", 30, {"reach": 100, "likes": 5 + i, "saved": 1}, {})
        today = analytics.now().strftime("%Y-%m-%d")
        yday = (analytics.now() - timedelta(days=1)).strftime("%Y-%m-%d")
        con.execute("INSERT INTO follower_snapshots (platform, snapshot_date_et, collected_at_utc, followers_count) VALUES ('instagram',?,?,100)", (yday, "x"))
        con.execute("INSERT INTO follower_snapshots (platform, snapshot_date_et, collected_at_utc, followers_count) VALUES ('instagram',?,?,104)", (today, "x"))
        analytics.finish_run(con, analytics.start_run(con, "instagram"), "ok")
        rep = analytics.winners(con, "instagram", 3)
        self.assertEqual([g["value"] for g in rep["post_type"]], ["kitchen"])  # promo has n=1 < 3
        w = analytics.write_weights(rep)
        self.assertIn("kitchen", w["post_type"])
        text = analytics.digest(con)
        self.assertIn("day +4", text)
        self.assertIn("Best post type: kitchen", text)
        self.assertIn("TikTok", text)
        p = analytics.email_payload(text)
        self.assertEqual(p["to"], ["sales@urbanstone.co"])

    def test_digest_not_connected(self):
        con = analytics.connect()
        analytics.collect("all", con)
        self.assertIn("Not connected yet", analytics.digest(con))


class TikTokTests(Sandbox):
    def test_publish_photo_selfonly_and_status_and_collect(self):
        self.make()
        publish.main(["--approve", "2026-10-29-1600"])
        cfg = tiktok_publish.cfg()
        cfg["image_base_url"] = "https://urbanstone.co/social"
        api = FakeAPI({
            ("POST", "/oauth/token/", None): {"access_token": "at", "refresh_token": "rt"},
            ("POST", "/creator_info/query/", None): {"data": {"privacy_level_options": ["SELF_ONLY"]}, "error": {"code": "ok"}},
            ("POST", "/content/init/", None): {"data": {"publish_id": "pub1"}, "error": {"code": "ok"}},
            ("POST", "/status/fetch/", None): {"data": {"status": "PUBLISH_COMPLETE", "publicaly_available_post_id": [7300]}, "error": {"code": "ok"}},
            ("POST", "/video/query/", None): {"data": {"videos": [{"id": "7300", "view_count": 200, "like_count": 9, "comment_count": 2, "share_count": 1}]}, "error": {"code": "ok"}},
            ("GET", "/user/info/", None): {"data": {"user": {"follower_count": 55}}, "error": {"code": "ok"}},
        })
        env = {"TIKTOK_CLIENT_KEY": "k", "TIKTOK_CLIENT_SECRET": "s", "TIKTOK_REFRESH_TOKEN": "rt"}
        with mock.patch.dict(os.environ, env), mock.patch.object(http_client, "send", api), \
                mock.patch.object(tiktok_publish, "cfg", return_value=cfg):
            self.assertEqual(tiktok_publish.main(["publish", "--queue-id", "2026-10-29-1600"]), 0)
            body = [c[3] for c in api.calls if "/content/init/" in c[1]][0]
            self.assertEqual(body["media_type"], "PHOTO")
            self.assertEqual(body["source_info"]["source"], "PULL_FROM_URL")
            self.assertEqual(body["post_info"]["privacy_level"], "SELF_ONLY")
            self.assertTrue(body["source_info"]["photo_images"][0].endswith("/2026-10-29-1600/post_9x16.jpg"))
            con = analytics.connect()
            res = tiktok_publish.collect(con)
        self.assertEqual(res["status"], "ok", res)
        row = con.execute("SELECT views, likes FROM post_metrics WHERE platform='tiktok' AND age_bucket='latest'").fetchone()
        self.assertEqual(tuple(row), (200, 9))
        self.assertEqual(con.execute("SELECT followers_count FROM follower_snapshots WHERE platform='tiktok'").fetchone()[0], 55)
        self.assertIn("## TikTok", analytics.digest(con))

    def test_privacy_level_not_allowed_fails_cleanly(self):
        self.make()
        publish.main(["--approve", "2026-10-29-1600"])
        cfg = dict(tiktok_publish.cfg(), image_base_url="https://urbanstone.co/social", privacy_level="PUBLIC_TO_EVERYONE")
        api = FakeAPI({("POST", "/creator_info/query/", None): {"data": {"privacy_level_options": ["SELF_ONLY"]}, "error": {"code": "ok"}}})
        with mock.patch.dict(os.environ, {"TIKTOK_ACCESS_TOKEN": "at"}), mock.patch.object(http_client, "send", api), \
                mock.patch.object(tiktok_publish, "cfg", return_value=cfg), mock.patch("sys.stderr"):
            self.assertEqual(tiktok_publish.main(["publish", "--queue-id", "2026-10-29-1600"]), 1)
        meta = common.load_json(os.path.join(self.tmp, "queue", "2026-10-29-1600", "meta.json"))
        self.assertEqual(meta["platforms"]["tiktok"]["status"], "queued")

    def test_dry_run_without_credentials(self):
        self.make()
        with mock.patch("builtins.print") as p:
            tiktok_publish.main(["publish"])
        self.assertIn("TikTok not connected", str(p.call_args_list[0]))


if __name__ == "__main__":
    unittest.main()
