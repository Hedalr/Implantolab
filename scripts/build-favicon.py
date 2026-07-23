"""Génère app/icon.png, app/apple-icon.png et public/favicon.ico depuis logo-mark.png."""

from pathlib import Path

from PIL import Image

root = Path(__file__).resolve().parents[1]
brand = root / "public" / "brand"
app_dir = root / "app"

mark = Image.open(brand / "logo-mark.png").convert("RGBA")
bbox = mark.getbbox()
if bbox:
    mark = mark.crop(bbox)


def make_light(size: int, pad_ratio: float = 0.1) -> Image.Image:
    scale = 4
    big = size * scale
    canvas = Image.new("RGBA", (big, big), (255, 255, 255, 255))
    inner = int(big * (1 - 2 * pad_ratio))
    ratio = min(inner / mark.width, inner / mark.height)
    tw = max(1, int(mark.width * ratio))
    th = max(1, int(mark.height * ratio))
    scaled = mark.resize((tw, th), Image.Resampling.LANCZOS)
    canvas.paste(scaled, ((big - tw) // 2, (big - th) // 2), scaled)
    return canvas.resize((size, size), Image.Resampling.LANCZOS)


def make_dark(size: int, pad_ratio: float = 0.1) -> Image.Image:
    """Même silhouette que le header, courbes blanches sur fond sombre."""
    light = make_light(size, pad_ratio=pad_ratio)
    pixels = light.load()
    out = Image.new("RGBA", (size, size), (12, 12, 12, 255))
    op = out.load()
    for y in range(size):
        for x in range(size):
            r, g, b, _a = pixels[x, y]
            lum = 0.299 * r + 0.587 * g + 0.114 * b
            if lum >= 245:
                continue
            v = int(max(0, min(255, 255 - lum)))
            if v > 25:
                op[x, y] = (v, v, v, 255)
    return out


icon_64 = make_dark(64)
apple_180 = make_dark(180)
icon_64.save(app_dir / "icon.png", optimize=True)
apple_180.save(app_dir / "apple-icon.png", optimize=True)

# Fallback navigateurs anciens
master = make_dark(48)
master.save(
    root / "public" / "favicon.ico",
    format="ICO",
    sizes=[(16, 16), (32, 32), (48, 48)],
)

print("wrote app/icon.png, app/apple-icon.png, public/favicon.ico")
