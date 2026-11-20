"""Halimun dan uap peta kawasan (beranda), dibuat prosedural, bukan foto.

Spek revisi 20 Nov 2026 butir 3:
- halimun-a / halimun-b: 1536x1536, bisa diubin mulus (semua noise mode="wrap").
  fBm 5 oktaf (sigma 160, 80, 40, 20, 10; bobot 1, .55, .3, .16, .08), lalu dibengkokkan
  sekali dengan medan noise kedua (geser sampai 90 px) supaya bentuknya serabut.
  Alfa = smoothstep(.42, .86, n) x .9, ditambah dither +-1 tingkat sebelum dibulatkan ke
  8-bit supaya tidak ada garis kontur. Warna rata Kertas yang memutih #FFFEF5.
  halimun-b memakai benih lain dan satu oktaf lebih halus (lapis depan).
- halimun-a-hp: 1024x1024 untuk HP (satu lapis saja).
- uap pembuka (kiri, kanan, tengah): bentuk gumpal yang sama seperti dulu, teksturnya dari
  keluarga halimun yang sama, dengan dither yang sama.
Semua disimpan WebP lossless (alfa tidak boleh lossy).

Pakai: python3 tools/peta/uap.py
"""
from pathlib import Path

import numpy as np
from PIL import Image
from scipy.ndimage import gaussian_filter, map_coordinates

KELUAR = Path(__file__).resolve().parents[2] / "public" / "peta"
KELUAR.mkdir(parents=True, exist_ok=True)
WARNA = (255, 254, 245)  # #FFFEF5
OKTAF = (160, 80, 40, 20, 10)
BOBOT = (1, 0.55, 0.3, 0.16, 0.08)


def fbm(rng, h, w, skala, bobot):
    acc = np.zeros((h, w), np.float32)
    for s, b in zip(skala, bobot):
        n = gaussian_filter(rng.standard_normal((h, w)).astype(np.float32), s, mode="wrap")
        acc += b * n / (n.std() + 1e-6)
    acc -= acc.min()
    return acc / acc.max()


def bengkok(rng, n, geser, skala=(220, 110)):
    """domain warp sekali: tiap piksel mengambil nilai dari titik yang digeser medan noise kedua"""
    h, w = n.shape
    wx = fbm(rng, h, w, skala, (1, 0.5)) * 2 - 1
    wy = fbm(rng, h, w, skala, (1, 0.5)) * 2 - 1
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    return map_coordinates(n, [yy + wy * geser, xx + wx * geser], order=1, mode="grid-wrap")


def smoothstep(a, b, x):
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


def dither8(rng, a):
    """alfa 0..1 -> 8-bit dengan dither +-1 tingkat (acak seragam), supaya gradasi tidak bertangga"""
    v = a * 255 + rng.uniform(-1, 1, a.shape)
    v[a <= 0] = 0  # bagian bening tetap bening penuh
    return np.clip(np.rint(v), 0, 255).astype(np.uint8)


def simpan(nama, a8):
    h, w = a8.shape
    rgba = np.empty((h, w, 4), np.uint8)
    rgba[..., :3] = WARNA
    rgba[..., 3] = a8
    jalur = KELUAR / f"{nama}.webp"
    Image.fromarray(rgba, "RGBA").save(jalur, "WEBP", lossless=True, quality=100, method=6, exact=True)
    print(nama, f"{w}x{h}", f"{jalur.stat().st_size // 1024} KB", "rata alfa", round(float(a8.mean() / 255), 3))


def halimun(benih, ukuran, geser_oktaf=0):
    rng = np.random.default_rng(benih)
    k = ukuran / 1536
    skala = [s * k / (2 ** geser_oktaf) for s in OKTAF]
    n = fbm(rng, ukuran, ukuran, skala, BOBOT)
    n = bengkok(rng, n, 90 * k, (220 * k, 110 * k))
    n = (n - n.min()) / (n.max() - n.min())
    a = smoothstep(0.42, 0.86, n) * 0.9
    return dither8(rng, a)


simpan("halimun-a", halimun(1970, 1536))
simpan("halimun-b", halimun(2026, 1536, geser_oktaf=1))
simpan("halimun-a-hp", halimun(1970, 1024))

# ---------- uap pembuka: gumpal kiri/kanan + lapis tengah, tekstur keluarga halimun ----------
W, H = 1600, 1200
rng = np.random.default_rng(1971)
yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)


def tekstur_halimun(benih):
    r = np.random.default_rng(benih)
    n = fbm(r, H, W, OKTAF, BOBOT)
    n = bengkok(r, n, 90)
    return (n - n.min()) / (n.max() - n.min())


def gumpal(sisi, n=70):
    d = np.zeros((H, W), np.float32)
    for _ in range(n):
        u = abs(rng.normal(0, 0.36))  # pusat condong ke sisi luar
        cx = (u if sisi == "kiri" else 1 - u) * W
        cy = rng.uniform(-0.05, 1.05) * H
        r = rng.uniform(70, 230) * (1.25 - min(u, 0.9) * 0.6)
        d += np.exp(-(((xx - cx) ** 2 + (yy - cy) ** 2) / (2 * r * r)))
    t = tekstur_halimun(1972 if sisi == "kiri" else 1973)
    d = d * (0.45 + 0.9 * t)
    return smoothstep(0.35, 1.25, d)


for sisi in ("kiri", "kanan"):
    simpan(f"uap-{sisi}", dither8(rng, gumpal(sisi)))

pusat = np.exp(-(((xx - W / 2) / (W * 0.30)) ** 2) - (((yy - H * 0.5) / (H * 0.55)) ** 2))
t = tekstur_halimun(1974)
simpan("uap-tengah", dither8(rng, smoothstep(0.30, 0.80, t) * pusat * 0.9))
