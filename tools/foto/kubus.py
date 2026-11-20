"""Baca berkas .cube (LUT 3D) dan terapkan ke gambar float dengan interpolasi tetrahedral.

Rumusnya sama dengan `lut3d=interp=tetrahedral` di ffmpeg, jadi foto diam dan plat peta
mendapat warna yang sama persis dengan video yang memakai .cube yang sama.

Pakai sebagai modul:
    from kubus import baca_cube, terapkan_cube
    lut = baca_cube("resep/ksa-sejuk-drone-setel.cube")
    out = terapkan_cube(arr_float01, lut)          # arr (..., 3), nilai 0..1
"""
from pathlib import Path
import numpy as np


def baca_cube(path):
    n = None
    lo, hi = np.zeros(3, np.float32), np.ones(3, np.float32)
    rows = []
    for line in Path(path).read_text().splitlines():
        s = line.strip()
        if not s or s.startswith("#") or s.startswith("TITLE"):
            continue
        if s.startswith("LUT_3D_SIZE"):
            n = int(s.split()[1])
        elif s.startswith("DOMAIN_MIN"):
            lo = np.array(s.split()[1:4], np.float32)
        elif s.startswith("DOMAIN_MAX"):
            hi = np.array(s.split()[1:4], np.float32)
        elif s[0].isdigit() or s[0] in "-.":
            rows.append(s.split()[:3])
    if not n:
        raise ValueError(f"{path}: LUT_3D_SIZE tidak ada")
    data = np.array(rows, np.float32)
    if len(data) != n ** 3:
        raise ValueError(f"{path}: {len(data)} baris, seharusnya {n ** 3}")
    # urutan .cube: R berubah paling cepat -> indeks [b, g, r]
    return {"n": n, "lo": lo, "hi": hi, "t": data.reshape(n, n, n, 3)}


def _tetra(x, lut):
    n, T = lut["n"], lut["t"]
    x = (np.clip(x, lut["lo"], lut["hi"]) - lut["lo"]) / (lut["hi"] - lut["lo"]) * (n - 1)
    i0 = np.clip(np.floor(x).astype(np.int32), 0, n - 2)
    f = x - i0
    r0, g0, b0 = i0[..., 0], i0[..., 1], i0[..., 2]
    r1, g1, b1 = r0 + 1, g0 + 1, b0 + 1
    fr, fg, fb = f[..., 0:1], f[..., 1:2], f[..., 2:3]

    def c(r, g, b):
        return T[b, g, r]

    c000, c111 = c(r0, g0, b0), c(r1, g1, b1)
    out = np.empty(x.shape, np.float32)
    # enam tetrahedron, sama dengan ffmpeg vf_lut3d interp_tetrahedral
    k = (fr > fg) & (fg > fb)
    m = k[..., 0]
    if m.any():
        out[m] = ((1 - fr) * c000 + (fr - fg) * c(r1, g0, b0) + (fg - fb) * c(r1, g1, b0) + fb * c111)[m]
    k2 = (fr > fg) & (fr > fb) & ~(fg > fb)
    m = k2[..., 0]
    if m.any():
        out[m] = ((1 - fr) * c000 + (fr - fb) * c(r1, g0, b0) + (fb - fg) * c(r1, g0, b1) + fg * c111)[m]
    k3 = (fr > fg) & ~(fr > fb)
    m = k3[..., 0]
    if m.any():
        out[m] = ((1 - fb) * c000 + (fb - fr) * c(r0, g0, b1) + (fr - fg) * c(r1, g0, b1) + fg * c111)[m]
    k4 = ~(fr > fg) & (fb > fg)
    m = k4[..., 0]
    if m.any():
        out[m] = ((1 - fb) * c000 + (fb - fg) * c(r0, g0, b1) + (fg - fr) * c(r0, g1, b1) + fr * c111)[m]
    k5 = ~(fr > fg) & ~(fb > fg) & (fb > fr)
    m = k5[..., 0]
    if m.any():
        out[m] = ((1 - fg) * c000 + (fg - fb) * c(r0, g1, b0) + (fb - fr) * c(r0, g1, b1) + fr * c111)[m]
    k6 = ~(fr > fg) & ~(fb > fg) & ~(fb > fr)
    m = k6[..., 0]
    if m.any():
        out[m] = ((1 - fg) * c000 + (fg - fr) * c(r0, g1, b0) + (fr - fb) * c(r1, g1, b0) + fb * c111)[m]
    return out


def terapkan_cube(a, lut, baris=256):
    """a: float32 (H, W, 3) atau (..., 3), 0..1. Diproses per potongan baris supaya hemat memori."""
    if isinstance(lut, (str, Path)):
        lut = baca_cube(lut)
    a = np.asarray(a, np.float32)
    if a.ndim != 3:
        return _tetra(a, lut)
    out = np.empty_like(a)
    for r in range(0, a.shape[0], baris):
        out[r:r + baris] = _tetra(a[r:r + baris], lut)
    return np.clip(out, 0, 1)
