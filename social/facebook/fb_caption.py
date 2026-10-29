#!/usr/bin/env python3
"""Make a Facebook caption from a queue post's Instagram caption.

Facebook gets the same message as Instagram, minus the long hashtag block:
keeps the body text and the first 3 hashtags (FB rewards few hashtags).
Writes <queue>/facebook_caption.txt and prints it.
Usage: python3 social/facebook/fb_caption.py social/instagram/queue/<queue_id>
"""
import os, re, sys

folder = sys.argv[1]
text = open(os.path.join(folder, "caption.txt"), encoding="utf-8").read().rstrip()
lines = text.split("\n")
tags = []
while lines and (lines[-1].strip() == "" or re.fullmatch(r"(#\w+\s*)+", lines[-1].strip())):
    tags = re.findall(r"#\w+", lines.pop()) + tags
body = "\n".join(lines).rstrip()
body = (body.replace("DM us", "Message us")
        .replace("at the link in bio", "at urbanstone.co").replace("link in bio", "urbanstone.co"))
keep = [t for t in tags if t.lower() in ("#cincinnati", "#countertops", "#kitchendesign", "#kitchenremodel")][:3] or tags[:3]
out = body + ("\n\n" + " ".join(keep) if keep else "") + "\n"
open(os.path.join(folder, "facebook_caption.txt"), "w", encoding="utf-8").write(out)
print(out, end="")
