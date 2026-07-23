"""Extract transparent logo marks from the boxed black logo PNG."""

from pathlib import Path

import numpy as np
from PIL import Image

src = Path(__file__).resolve().parents[1] / "public" / "brand" / "logo.png"
out_dir = src.parent

img = Image.open(src).convert("RGBA")
arr = np.array(img).astype(np.float32)
r, g, b = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2]
lum = 0.299 * r + 0.587 * g + 0.114 * b

# Soft alpha: near-black background becomes transparent
alpha = np.clip((lum - 18.0) / 40.0, 0.0, 1.0) * 255.0
alpha = np.where(lum < 18.0, 0.0, alpha)
alpha = np.where(lum >= 40.0, 255.0, alpha)

# Light header: dark ink spiral on transparent
ink = np.clip(255.0 - lum, 0.0, 255.0)
light = np.zeros_like(arr)
light[:, :, 0] = ink
light[:, :, 1] = ink
light[:, :, 2] = ink
light[:, :, 3] = alpha

# Dark footer: keep original light spiral, new alpha
dark = arr.copy()
dark[:, :, 3] = alpha


def crop_alpha(rgba_arr: np.ndarray, pad: int = 8) -> np.ndarray:
    a = rgba_arr[:, :, 3]
    ys, xs = np.where(a > 8)
    if len(xs) == 0:
        return rgba_arr
    y0 = max(0, int(ys.min()) - pad)
    y1 = min(a.shape[0], int(ys.max()) + 1 + pad)
    x0 = max(0, int(xs.min()) - pad)
    x1 = min(a.shape[1], int(xs.max()) + 1 + pad)
    return rgba_arr[y0:y1, x0:x1]


light_img = Image.fromarray(crop_alpha(light).astype(np.uint8), "RGBA")
dark_img = Image.fromarray(crop_alpha(dark).astype(np.uint8), "RGBA")

target_h = 240
if light_img.height < target_h:
    scale = target_h / light_img.height
    size = (max(1, int(light_img.width * scale)), target_h)
    light_img = light_img.resize(size, Image.Resampling.LANCZOS)
    dark_img = dark_img.resize(size, Image.Resampling.LANCZOS)

backup = out_dir / "logo-original-boxed.png"
if not backup.exists():
    Image.open(src).save(backup)

light_path = out_dir / "logo-mark.png"
dark_path = out_dir / "logo-mark-invert.png"
light_img.save(light_path, optimize=True)
dark_img.save(dark_path, optimize=True)

print(f"light {light_img.size} -> {light_path}")
print(f"dark  {dark_img.size} -> {dark_path}")
print(f"backup -> {backup}")
