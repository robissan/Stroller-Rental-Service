#!/usr/bin/env python3
"""Swap the lilac studio backdrop in the film frames for the app's cream.

The renders were made on a lilac seamless. This finds lilac pixels by hue,
keeps their shading relative to the backdrop in the same row (so the contact
shadow survives), and repaints them cream. The stroller's mustard, maroon and
grey sit far from lilac in hue and are left alone.

Usage: python3 recolor.py frames/      (rewrites every .webp in place; needs Pillow and numpy)
"""
import sys
from pathlib import Path

import numpy as np
from PIL import Image

CREAM = np.array([247, 240, 230], dtype=np.float32)  # app background #F7F0E6
LILAC_HUE = 250.0  # degrees


def smooth(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0.0, 1.0)
    return t * t * (3 - 2 * t)


def recolor(path: Path) -> None:
    im = Image.open(path).convert("RGB")
    rgb = np.asarray(im, dtype=np.float32)
    hsv = np.asarray(im.convert("HSV"), dtype=np.float32)
    hue = hsv[..., 0] * 360.0 / 255.0
    sat = hsv[..., 1] / 255.0
    dist = np.abs((hue - LILAC_HUE + 180.0) % 360.0 - 180.0)
    w = (1.0 - smooth(22.0, 42.0, dist)) * smooth(0.05, 0.13, sat)

    lum = rgb @ np.array([0.299, 0.587, 0.114], dtype=np.float32)
    # backdrop brightness per row, from clearly-lilac pixels, smoothed down the frame
    strong = w > 0.9
    rows = np.array([np.median(lum[y][strong[y]]) if strong[y].sum() > 8 else np.nan for y in range(lum.shape[0])])
    idx = np.arange(len(rows))
    ok = ~np.isnan(rows)
    rows = np.interp(idx, idx[ok], rows[ok]) if ok.any() else np.full(len(rows), lum.max())
    k = 31
    rows = np.convolve(np.pad(rows, k, mode="edge"), np.ones(k) / k, mode="same")[k:-k]

    shade = np.clip(lum / rows[:, None], 0.0, 1.06)[..., None]
    out = rgb * (1 - w[..., None]) + np.clip(CREAM * shade, 0, 255) * w[..., None]
    Image.fromarray(out.astype(np.uint8)).save(path, quality=74)


if __name__ == "__main__":
    folder = Path(sys.argv[1] if len(sys.argv) > 1 else "frames")
    files = sorted(folder.glob("f-*.webp"))
    for f in files:
        recolor(f)
    print(f"recoloured {len(files)} frames in {folder}")
