#!/usr/bin/env python3
"""White-background cutout for the Sumi mascot (v2).

The naive flood-fill (v1) left a faint yellowish "ghost box" across the whole
frame: background pixels a few units off-white were never flooded, and the
despill pass amplified their small color shifts into a visible translucent
wash. v2 instead:

  1. estimates the background color from the frame border (median),
  2. thresholds every pixel by distance to that color,
  3. opens the mask (erode + dilate) to drop tiny background-noise islands
     while keeping the character and its anti-aliased edge,
  4. fills small interior holes so light details (white dress, stockings) stay,
  5. feathers the silhouette with a distance ramp + light blur,
  6. applies a *gentle* despill (no low-alpha amplification),
  7. crops to the alpha bbox with a small pad, downscales, and writes RGBA
     PNG + WebP with alpha.

Usage:
  python scripts/mascot-cutout.py --src <input.png> [--out-dir public/mascot]
"""

from __future__ import annotations

import argparse
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

SEED_DIST = 14.0   # pixels within this distance of the border bg = background
EDGE_DIST = 52.0   # alpha ramp reaches 1.0 at this distance
ISLAND = 9         # open() kernel size: drops noise islands < 9px across
PAD = 14           # crop padding around the alpha bbox (px, pre-scale)
MAX_EDGE = 1200    # long-edge target for the web asset


def _open(mask: np.ndarray, size: int) -> np.ndarray:
    """Morphological open on a 0/255 uint8 mask (erode then dilate)."""
    im = Image.fromarray(mask, "L")
    im = im.filter(ImageFilter.MinFilter(size)).filter(ImageFilter.MaxFilter(size))
    return np.asarray(im)


def _close(mask: np.ndarray, size: int) -> np.ndarray:
    """Morphological close (dilate then erode): fills small interior holes."""
    im = Image.fromarray(mask, "L")
    im = im.filter(ImageFilter.MaxFilter(size)).filter(ImageFilter.MinFilter(size))
    return np.asarray(im)


def cutout(src: Path, out_dir: Path, stem: str = "sumi-mascot-v1") -> None:
    raw = Image.open(src)
    rgba = raw.convert("RGBA")
    if (np.asarray(rgba.getchannel("A"), dtype=np.uint8) < 10).mean() > 0.01:
        return _convert_only(rgba, out_dir, stem)
    im = rgba.convert("RGB")
    rgb = np.asarray(im, dtype=np.float32)
    h, w, _ = rgb.shape

    # 1) Background color = median of the 2% border strip.
    bh = max(2, h // 50)
    bw = max(2, w // 50)
    border = np.concatenate(
        [
            rgb[:bh].reshape(-1, 3),
            rgb[-bh:].reshape(-1, 3),
            rgb[:, :bw].reshape(-1, 3),
            rgb[:, -bw:].reshape(-1, 3),
        ]
    )
    bg = np.median(border, axis=0)
    dist = np.sqrt(((rgb - bg) ** 2).sum(axis=2))

    # 2) Hard figure mask; 3) open to drop noise islands.
    fig = (dist > SEED_DIST).astype(np.uint8) * 255
    fig = _open(fig, ISLAND)

    # 4) Fill small interior holes (e.g. bright highlights inside the dress).
    fig = _close(fig, 7)

    # 5) Alpha ramp from SEED_DIST to EDGE_DIST, blurred lightly.
    ramp = np.clip((dist - SEED_DIST) / (EDGE_DIST - SEED_DIST), 0.0, 1.0)
    alpha = np.where(fig > 0, ramp, 0.0)
    alpha = Image.fromarray((alpha * 255).astype(np.uint8), "L").filter(
        ImageFilter.GaussianBlur(1.0)
    )
    alpha = np.asarray(alpha, dtype=np.float32) / 255.0

    # 6) Gentle despill: pull translucent white fringe toward the opaque
    #    color without amplifying low-alpha noise. af is clamped high enough
    #    (0.45) that a one-unit color shift can never become a dark pixel.
    af = np.clip(alpha, 0.45, 1.0)[..., None]
    rgb_d = np.clip((rgb - 255.0 * (1.0 - af)) / af, 0.0, 255.0)
    rgb_d = 0.7 * rgb_d + 0.3 * rgb

    rgba = np.dstack([rgb_d, alpha * 255.0]).astype(np.uint8)
    out = Image.fromarray(rgba, "RGBA")

    # 7) Crop to the alpha bbox with padding, then downscale.
    ys, xs = np.where(alpha > 0.02)
    if len(xs) == 0:
        raise SystemExit("empty alpha mask")
    box = (
        max(0, int(xs.min()) - PAD),
        max(0, int(ys.min()) - PAD),
        min(w, int(xs.max()) + 1 + PAD),
        min(h, int(ys.max()) + 1 + PAD),
    )
    out = out.crop(box)
    long_edge = max(out.size)
    if long_edge > MAX_EDGE:
        scale = MAX_EDGE / long_edge
        out = out.resize(
            (max(1, round(out.width * scale)), max(1, round(out.height * scale))),
            Image.LANCZOS,
        )

    out_dir.mkdir(parents=True, exist_ok=True)
    png_path = out_dir / f"{stem}.png"
    webp_path = out_dir / f"{stem}.webp"
    out.save(png_path, "PNG")
    out.save(webp_path, "WEBP", quality=92, method=6, alpha_quality=92)

    a = np.asarray(out.getchannel("A"), dtype=np.float32)
    print(f"wrote {png_path} / {webp_path}")
    print(
        f"size: {out.size}, alpha min/max: {a.min():.0f}/{a.max():.0f}, "
        f"opaque%: {(a > 200).mean() * 100:.1f}, transparent%: {(a < 10).mean() * 100:.1f}"
    )


def _convert_only(rgba: Image.Image, out_dir: Path, stem: str) -> None:
    """Source already has transparency: resize + write PNG/WebP, no cutout."""
    long_edge = max(rgba.size)
    if long_edge > MAX_EDGE:
        scale = MAX_EDGE / long_edge
        rgba = rgba.resize(
            (max(1, round(rgba.width * scale)), max(1, round(rgba.height * scale))),
            Image.LANCZOS,
        )
    out_dir.mkdir(parents=True, exist_ok=True)
    png_path = out_dir / f"{stem}.png"
    webp_path = out_dir / f"{stem}.webp"
    rgba.save(png_path, "PNG")
    rgba.save(webp_path, "WEBP", quality=92, method=6, alpha_quality=92)
    a = np.asarray(rgba.getchannel("A"), dtype=np.float32)
    print(f"wrote {png_path} / {webp_path} (alpha already present, no cutout)")
    print(
        f"size: {rgba.size}, alpha min/max: {a.min():.0f}/{a.max():.0f}, "
        f"opaque%: {(a > 200).mean() * 100:.1f}, transparent%: {(a < 10).mean() * 100:.1f}"
    )


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Mascot asset pipeline: cutout (white bg) or plain convert (has alpha)"
    )
    parser.add_argument("--src", required=True, help="source image path")
    parser.add_argument(
        "--out-dir",
        type=Path,
        default=Path("public/mascot"),
        help="output directory (default: public/mascot)",
    )
    parser.add_argument("--stem", default="sumi-mascot-v1", help="output file stem")
    args = parser.parse_args()
    cutout(Path(args.src), args.out_dir, args.stem)


if __name__ == "__main__":
    main()
