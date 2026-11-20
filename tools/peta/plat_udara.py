"""Bangun ulang dua plat foto udara peta kawasan dari sumber DJI asli, dengan SATU look .cube yang bisa diganti.

Kenapa dua langkah warna: langkah pertama (normalisasi) adalah grade Penyunting Video yang sudah
menentukan titik hitam/putih kedua plat ('Cerah Jujur' untuk foto 0035; A2 + trim shot 0087 + kurva
penyesuaian untuk frame video 0088). Look butir 7 ('Sejuk Hijau IG', setelan peta) disetel dan diukur
di atas hasil langkah itu, jadi langkah pertama tidak diubah. Resep berikutnya cukup mengganti --look.

  Plat utama   : DJI_20261117094753_0035_D.JPG (50 MP) -> WB + kurva Cerah Jujur (dasar.py Penyunting)
                 -> potong 3:2 (7045x4697) -> LOOK -> 4800 JPG, 2560/1440/HP AVIF+WebP
  Plat belakang: DJI_20261117142233_0088_D.MP4 detik 0,30 + 10 frame (rata-rata, disejajarkan)
                 -> A2 + trim 0087 -> kurva ke karakter plat utama -> LOOK BELAKANG -> putar 180 -> 3840 JPG, 2560/1440/HP
                 LOOK BELAKANG = fit per plat (siang mendung): arah warna sama dengan look utama, jangkar kurva
                 dan takaran hijau diukur dari plat ini (tools/foto/resep/p-peta-belakang.json).

Nama dan ukuran piksel berkas sama persis dengan kontrak public/peta/foto-udara/zona.json, karena posisi
titik zona dihitung dalam persen gambar plat. Sesudah plat, potongan lensa-udara-XX.webp dibuat ulang
dari plat baru (tools/peta/lensa_udara.py --hanya-gambar; src/data/lensa-udara.json tidak disentuh).

Pakai:
  python3 tools/peta/plat_udara.py                         # dua plat + lensa
  python3 tools/peta/plat_udara.py --look X.cube           # resep lain
  python3 tools/peta/plat_udara.py --hanya utama           # satu plat
  python3 tools/peta/plat_udara.py --keluar /tmp/uji --tanpa-lensa
"""
import argparse, json, os, subprocess, sys, tempfile
from pathlib import Path
import numpy as np
from PIL import Image, ImageFilter

Image.MAX_IMAGE_PIXELS = None
REPO = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO / "tools/foto"))
from kubus import baca_cube, terapkan_cube  # noqa: E402
import drone_video  # noqa: E402  (jalur bank drone + pemuat modul Penyunting)

PETA = drone_video.HASIL / "_sumber/peta"
FOTO_0035 = drone_video.MENTAH / "DJI_20261117094753_0035_D.JPG"
KLIP_0088 = drone_video.MENTAH / "DJI_20261117142233_0088_D.MP4"
LOOK = REPO / "tools/foto/resep/ksa-sejuk-peta-setel.cube"
# Plat belakang (mendung, tegak lurus) sudah 0,495 sebelum look; dengan setelan umum jatuh di median 0,542 dan
# saturasi daun 0,495 (gagal gerbang). Fit per plat: arah warna sama, jangkar kurva dari plat ini (p-peta-belakang.json).
LOOK_BELAKANG = REPO / "tools/foto/resep/ksa-sejuk-peta-belakang.cube"
KELUAR = REPO / "public/peta/foto-udara"


def modul_skrip(path, P, buang):
    """Jalankan skrip Penyunting tanpa baris main() di akhir, dengan 'grade' = grade.py Penyunting."""
    src = Path(path).read_text().replace(buang, "\n")
    simpan = {k: sys.modules.get(k) for k in ("grade", "getframe")}
    sys.modules["grade"], sys.modules["getframe"] = P["grade"], P["getframe"]
    try:
        ns = {"__name__": Path(path).stem}
        exec(compile(src, str(path), "exec"), ns)
    finally:
        for k, v in simpan.items():
            if v is None:
                sys.modules.pop(k, None)
            else:
                sys.modules[k] = v
    return ns


def ekspor(img, keluar, nama, besar, q_besar, usm_besar, bukti=None):
    """Sama dengan ekspor_peta.py / plat_belakang.py Penyunting: JPG terbesar + AVIF/WebP 2560, 1440, HP 1600."""
    berkas = {}
    if besar == img.width:
        k = img.filter(ImageFilter.UnsharpMask(**usm_besar))
    else:
        h = round(besar * img.height / img.width)
        k = img.resize((besar, h), Image.LANCZOS).filter(ImageFilter.UnsharpMask(**usm_besar))
    p = keluar / f"{nama}-{besar}.jpg"
    k.save(p, quality=q_besar, optimize=True, progressive=True)
    berkas[f"{besar}_jpg"] = (p.name, k.size, p.stat().st_size)
    for tag, w in (("2560", 2560), ("1440", 1440), ("hp", 1600)):
        h = round(w * img.height / img.width)
        kk = img.resize((w, h), Image.LANCZOS).filter(ImageFilter.UnsharpMask(radius=0.7, percent=40, threshold=2))
        pa, pw = keluar / f"{nama}-{tag}.avif", keluar / f"{nama}-{tag}.webp"
        kk.save(pa, quality=58, speed=4)
        kk.save(pw, quality=80, method=6)
        berkas[f"{tag}_avif"] = (pa.name, kk.size, pa.stat().st_size)
        berkas[f"{tag}_webp"] = (pw.name, kk.size, pw.stat().st_size)
    return berkas


def potong(W, H):
    """Sama dengan ekspor_peta.potong Penyunting: buang 14% kiri, 3:2, pusat tinggi di 0,5525 (master 7045x4697)."""
    x0 = round(0.14 * W); x1 = W
    w = x1 - x0; h = round(w / 1.5)
    yc = (0.17 + 0.935) / 2 * H
    y0 = int(round(yc - h / 2))
    return x0, y0, x1, y0 + h


def plat_utama(P, lut, keluar, kerja):
    os.environ.setdefault("WBR", "0.96"); os.environ.setdefault("WBB", "1.04"); os.environ.setdefault("SAT", "1.0")
    dasar = modul_skrip(PETA / "dasar.py", P, "\nmain()\n")
    im = Image.open(FOTO_0035).convert("RGB")
    W, H = im.size
    box = potong(W, H)
    a = np.asarray(im.crop(box)); del im
    res = np.empty(a.shape, np.uint8)
    for r0 in range(0, a.shape[0], 400):
        y = dasar["olah"](a[r0:r0 + 400])                     # normalisasi Cerah Jujur (Penyunting)
        if lut is not None:
            y = terapkan_cube(y, lut)                          # look
        res[r0:r0 + 400] = np.round(np.clip(y, 0, 1) * 255).astype(np.uint8)
    del a
    m = Image.fromarray(res)
    m.save(kerja / "plat-utama-master.png")
    berkas = ekspor(m, keluar, "ksa-foto-udara", 4800, 84, dict(radius=0.7, percent=40, threshold=2))
    return {"sumber": FOTO_0035.name, "potong_px": list(box), "master_px": list(m.size), "berkas": berkas}


def plat_belakang(P, lut, keluar, kerja):
    ns = modul_skrip(PETA / "plat_belakang.py", P, "\nmain()\n")
    T0, N, FPS, TRIM, pc, stats = ns["T0"], ns["N"], ns["FPS"], ns["TRIM"], ns["pc"], ns["stats"]
    PI = P["grade"].PchipInterpolator
    acc = ref = None; geser = []
    for k in range(N):
        f = P["getframe"].frame16(str(KLIP_0088), T0 + k / FPS, 3840, 2160)
        small = f[::4, ::4].mean(-1)
        if ref is None:
            ref = small; dx = dy = 0
        else:
            dx, dy = pc(ref, small); dx *= 4; dy *= 4
            if dx or dy:
                f = np.roll(f, (dy, dx), (0, 1))
        geser.append((int(dx), int(dy)))
        acc = f if acc is None else acc + f
    log = acc / N
    p = P["grade"].CANDIDATES["A2"]
    out = np.empty(log.shape, np.float32)
    for r0 in range(0, log.shape[0], 270):
        out[r0:r0 + 270] = P["grade"].grade(log[r0:r0 + 270], p, **TRIM)
    s0 = stats(out[::2, ::2])
    x_in = [0, s0["p1"], s0["p5"], s0["p50"], s0["p95"], s0["p99"], 255]
    y_out = [0, 16.5, 30.0, s0["p50"] * 1.06, min(222, s0["p95"] * 1.03), min(242, s0["p99"] * 1.02), 255]
    for i in range(1, len(y_out)):
        y_out[i] = max(y_out[i], y_out[i - 1] + 0.5)
        x_in[i] = max(x_in[i], x_in[i - 1] + 0.5)
    c = PI(np.array(x_in), np.array(y_out))
    lt = np.clip(c(np.arange(256 * 4) / 4.0), 0, 255) / 255.0
    o = np.clip(out * 255 * 4, 0, 1023).astype(np.int32)
    out = lt[o].astype(np.float32)
    corr = (0.015 - (s0["netral_tengah_RB"] or 0.0)) * 0.7
    out[..., 0] *= (1 + corr); out[..., 2] *= (1 - corr)
    out = np.clip(out, 0, 1)
    s1 = stats(out[::2, ::2])
    sat = 1.0
    if s1["hijau"]:
        sat = float(np.clip(1 + 0.8 * (0.44 / s1["hijau"] - 1), 0.85, 1.12))
        Y = 0.2126 * out[..., 0] + 0.7152 * out[..., 1] + 0.0722 * out[..., 2]
        out = np.clip(Y[..., None] + sat * (out - Y[..., None]), 0, 1)
    if lut is not None:
        out = terapkan_cube(out, lut)                          # look
    img = Image.fromarray(np.round(out * 255).astype(np.uint8)).rotate(180)
    img.save(kerja / "plat-belakang-master.png")
    berkas = ekspor(img, keluar, "ksa-foto-udara-belakang", 3840, 86, dict(radius=0.9, percent=35, threshold=2))
    return {"sumber": KLIP_0088.name, "geser": geser, "sat": sat, "ukuran": list(img.size), "berkas": berkas}


def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--look", default=str(LOOK), help="look plat utama (dan plat belakang kalau --look-belakang tidak diisi)")
    ap.add_argument("--look-belakang", default=str(LOOK_BELAKANG), help="look plat belakang (fit per plat); '' = pakai --look")
    ap.add_argument("--tanpa-look", action="store_true")
    ap.add_argument("--hanya", nargs="*", choices=["utama", "belakang"])
    ap.add_argument("--keluar", default=str(KELUAR))
    ap.add_argument("--kerja", default=str(Path(tempfile.gettempdir()) / "ksa-plat-kerja"))
    ap.add_argument("--tanpa-lensa", action="store_true", help="jangan buat ulang lensa-udara-XX.webp")
    a = ap.parse_args()
    look = {"utama": None, "belakang": None} if a.tanpa_look else \
        {"utama": str(Path(a.look).resolve()), "belakang": str(Path(a.look_belakang or a.look).resolve())}
    keluar, kerja = Path(a.keluar), Path(a.kerja)
    keluar.mkdir(parents=True, exist_ok=True); kerja.mkdir(parents=True, exist_ok=True)
    P = drone_video.penyunting()
    hasil = {"look": look}
    for n in a.hanya or ["utama", "belakang"]:
        lut = baca_cube(look[n]) if look[n] else None
        hasil[n] = (plat_utama if n == "utama" else plat_belakang)(P, lut, keluar, kerja)
        print(n, json.dumps(hasil[n]["berkas"]), flush=True)
    (kerja / "plat_udara_hasil.json").write_text(json.dumps(hasil, indent=1))
    if not a.tanpa_lensa and keluar.resolve() == KELUAR.resolve():
        subprocess.run([sys.executable, str(REPO / "tools/peta/lensa_udara.py"), "--hanya-gambar"], check=True)


if __name__ == "__main__":
    main()
