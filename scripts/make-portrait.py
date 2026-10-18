"""Builds the badge portrait from Anika.jpeg.

Crops to Anika at the panel desk, enlarges the crop, then keeps her sharp and bright while
the room behind is softened, desaturated and toned down. The grade is warm and neutral to
sit on the paper-coloured badge. Output: public/images/anika-portrait.jpg

    python3 scripts/make-portrait.py
"""
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter, ImageEnhance

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "Anika.jpeg"
OUT = ROOT / "public" / "images" / "anika-portrait.jpg"

# Crop (source px) matching the badge photo window aspect (268:232), centred on her face.
CROP = (380, 622, 620, 830)
SCALE = 4  # enlargement factor; final 960x832 (badge shows it at ~305px wide)

# Focus point (fraction of the crop) — between her face and shoulders.
FOCUS = (0.5, 0.5)


def subject_mask(size):
    """Smooth, lens-like focus falloff: sharp around her, softening outward.
    No hard cut-out edges."""
    w, h = size
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    r = np.sqrt(((xx - FOCUS[0] * w) / (0.34 * w)) ** 2 + ((yy - FOCUS[1] * h) / (0.52 * h)) ** 2)
    m = np.clip((1.35 - r) / 0.75, 0, 1)
    m = m * m * (3 - 2 * m)
    return Image.fromarray((m * 255).astype(np.uint8))


def grade(img, sat_bg):
    """Warm-neutral grade; mutes the loud yellow wall panels."""
    a = np.asarray(img.convert("HSV")).astype(np.float32)
    hue = a[..., 0] * 360 / 255
    yellow = np.clip(1 - np.abs(hue - 58) / 22, 0, 1)
    a[..., 1] *= 1 - yellow * (1 - sat_bg)
    a[..., 1] *= 0.82
    out = Image.fromarray(a.astype(np.uint8), "HSV").convert("RGB")
    # Gentle S-curve and a warm, paper-toned balance.
    x = np.asarray(out).astype(np.float32) / 255
    x = x + 0.08 * np.sin(2 * np.pi * x) * -0.5
    x[..., 0] *= 1.02
    x[..., 2] *= 0.96
    return Image.fromarray((np.clip(x, 0, 1) * 255).astype(np.uint8))


def main():
    src = Image.open(SRC).convert("RGB")
    crop = src.crop(CROP).filter(ImageFilter.MedianFilter(3))
    size = (crop.width * SCALE, crop.height * SCALE)
    big = crop.resize(size, Image.LANCZOS)

    mask = subject_mask(size)

    # Subject: lifted, crisp, slightly richer.
    subject = grade(big, sat_bg=0.25)
    subject = ImageEnhance.Brightness(subject).enhance(1.07)
    subject = ImageEnhance.Contrast(subject).enhance(1.05)
    subject = subject.filter(ImageFilter.UnsharpMask(radius=2.2, percent=60, threshold=2))

    # Background: blurred (shallow depth of field), quieter, slightly darker.
    back = grade(big, sat_bg=0.08).filter(ImageFilter.GaussianBlur(7))
    back = ImageEnhance.Color(back).enhance(0.6)
    back = ImageEnhance.Brightness(back).enhance(0.9)

    img = Image.composite(subject, back, mask)

    # Soft vignette toward the edges to frame her.
    w, h = size
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    cx, cy = w * FOCUS[0], h * 0.44
    r = np.sqrt(((xx - cx) / (w * 0.62)) ** 2 + ((yy - cy) / (h * 0.7)) ** 2)
    v = 1 - 0.28 * np.clip(r - 0.45, 0, 1) ** 1.4
    arr = np.asarray(img).astype(np.float32) * v[..., None]
    # Tiny warm lift in the shadows so blacks are not harsh.
    arr = arr * 0.96 + np.array([10, 8, 6], np.float32)
    img = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8))

    OUT.parent.mkdir(parents=True, exist_ok=True)
    img.save(OUT, quality=88, optimize=True, progressive=True)
    print(OUT, img.size)


if __name__ == "__main__":
    main()
