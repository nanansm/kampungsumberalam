"""Uap air panas untuk pembuka peta kawasan (beranda).

Dua gumpal uap (kiri, kanan) dan satu lapis tipis (tengah), dibuat dari
kumpulan gumpalan lunak ditambah noise halus, bukan foto. Warnanya Kertas KSA
yang memutih, tanpa hijau, jadi tidak melanggar aturan 'tanpa gradasi
antarhijau'.

Pakai: python3 tools/peta/uap.py, lalu node tools/peta/encode.mjs
"""
import numpy as np
from scipy.ndimage import gaussian_filter
from PIL import Image
from pathlib import Path

KELUAR = Path(__file__).resolve().parents[2] / "public" / "peta"
KELUAR.mkdir(parents=True, exist_ok=True)
rng = np.random.default_rng(1970)
W, H = 1600, 1200


def fbm(skala, bobot):
    acc = np.zeros((H, W), np.float32)
    for s, b in zip(skala, bobot):
        n = gaussian_filter(rng.standard_normal((H, W)).astype(np.float32), s, mode="wrap")
        acc += b * n / (n.std() + 1e-6)
    acc -= acc.min()
    return acc / acc.max()


def smoothstep(a, b, x):
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)


def gumpal(sisi, n=70):
    d = np.zeros((H, W), np.float32)
    for _ in range(n):
        # pusat condong ke sisi luar, makin ke dalam makin jarang dan kecil
        u = abs(rng.normal(0, 0.36))
        cx = (u if sisi == "kiri" else 1 - u) * W
        cy = rng.uniform(-0.05, 1.05) * H
        r = rng.uniform(70, 230) * (1.25 - min(u, 0.9) * 0.6)
        d += np.exp(-(((xx - cx) ** 2 + (yy - cy) ** 2) / (2 * r * r)))
    tekstur = fbm((90, 40, 16), (1, 0.55, 0.25))
    d = d * (0.55 + 0.7 * tekstur)
    a = smoothstep(0.35, 1.25, d)
    a = gaussian_filter(a, 3)
    # sisi terang di atas, sedikit lebih gelap di bawah gumpalan: memberi volume
    terang = np.clip(0.8 + 0.25 * gaussian_filter(d, 25) / (d.max() + 1e-6) + 0.08 * (tekstur - 0.5), 0, 1)
    return a, terang


def simpan(nama, a, terang):
    bayang = np.array([233, 231, 214], np.float32)  # Kertas yang menggelap sedikit
    putih = np.array([255, 255, 250], np.float32)
    t = terang[..., None]
    rgb = bayang * (1 - t) + putih * t
    rgba = np.dstack([rgb, np.clip(a, 0, 1) * 255]).astype(np.uint8)
    Image.fromarray(rgba, "RGBA").save(KELUAR / f"{nama}.png")
    print(nama, round(float(a.mean()), 3))


for sisi in ("kiri", "kanan"):
    simpan(f"uap-{sisi}", *gumpal(sisi))

# lapis tipis di tengah: menutup sambungan dua gumpal, paling cepat hilang
pusat = np.exp(-(((xx - W / 2) / (W * 0.30)) ** 2) - (((yy - H * 0.5) / (H * 0.55)) ** 2))
n = fbm((150, 60, 24), (1, 0.5, 0.25))
a = smoothstep(0.25, 0.75, n) * pusat * 0.9
simpan("uap-tengah", gaussian_filter(a, 8), np.full((H, W), 0.92, np.float32))
