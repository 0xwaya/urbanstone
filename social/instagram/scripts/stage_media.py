#!/usr/bin/env python3
"""Copy a queued post's JPEGs (and tiktok.mp4 if present) into frontend/public/social/<queue_id>/
so that, once committed and deployed by Vercel, they are public at
https://urbanstone.co/social/<queue_id>/<file> (config image_base_url = https://urbanstone.co/social).

It only copies files; committing/pushing (which triggers the Vercel deploy) is a separate,
deliberate step. Usage: python3 stage_media.py --queue-id 2026-10-29-1600
"""
import argparse
import os
import shutil

from common import QUEUE, ROOT

PUBLIC = os.path.join(ROOT, "..", "..", "frontend", "public", "social")

if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--queue-id", required=True)
    a = ap.parse_args()
    src, dst = os.path.join(QUEUE, a.queue_id), os.path.normpath(os.path.join(PUBLIC, a.queue_id))
    os.makedirs(dst, exist_ok=True)
    for f in sorted(os.listdir(src)):
        if f.endswith(".jpg") and f.startswith("post_") or f == "tiktok.mp4":
            shutil.copyfile(os.path.join(src, f), os.path.join(dst, f))
            print(os.path.join(dst, f))
