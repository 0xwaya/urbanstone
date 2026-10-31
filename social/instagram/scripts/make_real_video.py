#!/usr/bin/env python3
"""Build a real-install progress->finished video (Reel/TikTok) for an existing queue folder.

in-progress photo (photo_s, slow push-in, 'IN PROGRESS' label) -> finished clip ('FINISHED' label
for the first 2 s). Original audio is muted (silent AAC track kept for platform compatibility).
Landscape sources are fitted over a blurred fill of themselves. Seal top-left per config margins.
Outputs reel_9x16.mp4 (1080x1920) and reel_4x5.mp4 (1080x1350), H.264 High / AAC, 30 fps, +faststart.

Usage: make_real_video.py QUEUE_DIR --photo P.jpg --video V.mov [--photo-s 3] [--cover-t 4]
"""
import argparse, os, subprocess, tempfile
from PIL import Image, ImageDraw
from common import config, path
import compose

FPS = 30


def label_png(text, W, H, out, top):
    cfg = config(); b = cfg["brand"]
    im = Image.new("RGBA", (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    f = compose._font("fonts/Manrope-VF.ttf", round(W * 0.034), 700)
    tw = sum(d.textlength(c, font=f) for c in text) + 6 * (len(text) - 1)
    pw, ph = tw + 64, round(W * 0.034 * 2.1)
    x0 = (W - pw) / 2
    d.rounded_rectangle((x0, top, x0 + pw, top + ph), radius=ph / 2, fill=compose._hex(b["navy"]) + (215,),
                        outline=compose._hex(b["gold"]) + (255,), width=3)
    compose._spaced(d, W / 2, top + ph * 0.2, text, f, 6, compose._hex(b["gold"]) + (255,))
    im.save(out)


def seal_png(W, H, fmt, out):
    cfg = config(); m = cfg["formats"][fmt]["margin"]
    sw = round(W * cfg["logo_stamp"]["width_frac"] * 0.8)
    s = Image.open(path("brand", "urban-stone-seal.png")).convert("RGBA").resize((sw, sw), Image.LANCZOS)
    im = Image.new("RGBA", (W, H), (0, 0, 0, 0)); im.alpha_composite(s, (m[0], m[1])); im.save(out)


def prep_photo(src, W, H, out):
    from PIL import ImageFilter, ImageOps, ImageEnhance
    im = ImageOps.exif_transpose(Image.open(src)).convert("RGB")
    if im.width < im.height:
        im = ImageOps.fit(im, (W, H), Image.LANCZOS)
    else:
        bg = ImageEnhance.Brightness(ImageOps.fit(im, (W, H)).filter(ImageFilter.GaussianBlur(60))).enhance(0.85)
        fg = ImageOps.contain(im, (W, H), Image.LANCZOS)
        bg.paste(fg, ((W - fg.width) // 2, (H - fg.height) // 2)); im = bg
    im.save(out)


def fit(W, H):
    # scale-to-cover crop if aspect close, else blurred fill + contain
    return (f"split[a][b];[a]scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H},boxblur=40:2,eq=brightness=-0.08[bg];"
            f"[b]scale={W}:{H}:force_original_aspect_ratio=decrease[fg];[bg][fg]overlay=(W-w)/2:(H-h)/2")


def build(folder, photo, video, fmt, W, H, photo_s, tmp, portrait_cover):
    seal = os.path.join(tmp, f"seal_{fmt}.png"); seal_png(W, H, fmt, seal)
    top = round(H * (0.80 if fmt == "9x16" else 0.86))
    lp, lf = os.path.join(tmp, f"lp_{fmt}.png"), os.path.join(tmp, f"lf_{fmt}.png")
    label_png("IN PROGRESS", W, H, lp, top); label_png("FINISHED", W, H, lf, top)
    pimg = os.path.join(tmp, f"photo_{fmt}.png"); prep_photo(photo, W * 2, H * 2, pimg)
    vfit = f"scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H}" if portrait_cover else fit(W, H)
    n = int(photo_s * FPS)
    out = os.path.join(folder, f"reel_{fmt}.mp4")
    fc = (f"[0:v]"
          f"zoompan=z='1+0.04*on/{n}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s={W}x{H}:fps={FPS},setsar=1,format=yuv420p[p];"
          f"[p][3:v]overlay=0:0[p2];"
          f"[1:v]fps={FPS},{vfit},setsar=1,format=yuv420p[v];[v][4:v]overlay=0:0:enable='lt(t,2)'[v2];"
          f"[p2][v2]concat=n=2:v=1:a=0[c];[c][2:v]overlay=0:0,fade=t=in:d=0.3,format=yuv420p[o]")
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-loop", "1", "-framerate", str(FPS), "-t", str(photo_s), "-i", pimg, "-i", video,
                    "-i", seal, "-i", lp, "-i", lf, "-f", "lavfi", "-i", "anullsrc=r=48000:cl=stereo",
                    "-filter_complex", fc, "-map", "[o]", "-map", "5:a", "-shortest",
                    "-c:v", "libx264", "-profile:v", "high", "-preset", "slow", "-crf", "20", "-r", str(FPS),
                    "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart", out], check=True)
    return out


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("folder"); ap.add_argument("--photo", required=True); ap.add_argument("--video", required=True)
    ap.add_argument("--photo-s", type=float, default=3.0); ap.add_argument("--portrait-video", action="store_true")
    a = ap.parse_args()
    with tempfile.TemporaryDirectory() as t:
        for fmt, (W, H) in {"9x16": (1080, 1920), "4x5": (1080, 1350)}.items():
            print(build(a.folder, a.photo, a.video, fmt, W, H, a.photo_s, t, a.portrait_video))
