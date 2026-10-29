"""Shared helpers for the Urban Stone Instagram automation."""
import json
import os
from datetime import datetime
from zoneinfo import ZoneInfo

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STATE = os.path.join(ROOT, "state")
QUEUE = os.path.join(ROOT, "queue")


def path(*parts):
    return os.path.join(ROOT, *parts)


def load_json(rel, default=None):
    p = path(rel) if not os.path.isabs(rel) else rel
    if not os.path.exists(p):
        return default
    with open(p, encoding="utf-8") as f:
        return json.load(f)


def save_json(rel, data):
    p = path(rel) if not os.path.isabs(rel) else rel
    os.makedirs(os.path.dirname(p), exist_ok=True)
    tmp = p + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
        f.write("\n")
    os.replace(tmp, p)


def config():
    return load_json("config.json")


def tz():
    return ZoneInfo(config()["timezone"])


def now():
    return datetime.now(tz())


def next_slot(after=None):
    """Next configured posting slot (local tz) strictly after `after`."""
    from datetime import timedelta
    after = after or now()
    slots = sorted(config()["schedule_slots"])
    for day in range(0, 3):
        d = (after + timedelta(days=day)).date()
        for s in slots:
            hh, mm = map(int, s.split(":"))
            cand = datetime(d.year, d.month, d.day, hh, mm, tzinfo=tz())
            if cand > after:
                return cand
    raise RuntimeError("no slot found")


def parse_slot(text):
    """'2026-10-29 17:00' (local tz) -> aware datetime."""
    return datetime.strptime(text, "%Y-%m-%d %H:%M").replace(tzinfo=tz())


def promo_active(when=None):
    """True if the repo's promo window covers `when` (local date). Ends automatically."""
    from datetime import date
    promo = load_json("data/talking_points.json")["promo"]
    d = (when or now()).date()
    return date.fromisoformat(promo["start"]) <= d <= date.fromisoformat(promo["end"])
