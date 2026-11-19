"""Siapkan foto peta kawasan: putar sesuai EXIF, potong, samakan toning, simpan.

Toning mengikuti resep 'Cerah Jujur' Creative Direction KSA 2027 hlm 15
(Highlights −30, Shadows +25, Contrast +5, hijau & kuning sedikit diredam),
lalu tiap foto ditarik ke angka yang sama: median luminans ±0,46 dan
saturasi rata-rata ±0,32, supaya foto katalog (HDR, jingga) dan foto sesi
MOTE November terlihat satu keluarga dan tidak terlalu gelap.

Pakai: python3 tools/foto/siapkan.py            (keluaran: src/assets/peta/*.jpg)
      python3 tools/foto/siapkan.py --beranda  (keluaran: src/assets/cerita/*.jpg)
"""
from pathlib import Path
import numpy as np
from PIL import Image, ImageOps

REPO = Path(__file__).resolve().parents[2]
KSA = Path.home() / "Documents/MOTE/KAMPUNG SUMBER ALAM (KSA)"
DRIVE = KSA / "07-PRODUKSI KONTEN/2026-11 Foto KSA (Drive Ryan)"
KAT = KSA / "08-KATALOG/_sumber-katalog/foto"
SIB = KSA / "10-UNIT SIBENTANG/04-ASET-VISUAL/foto-drive"
DM = KSA / "00-DATA MASTER/_sumber/final/isi/gambar"
KELUAR = REPO / "src/assets/peta"
KELUAR.mkdir(parents=True, exist_ok=True)

# nama keluaran: (sumber, rasio potong lebar/tinggi atau None, kekuatan toning 0..1)
DAFTAR = {
    # kotak keterangan tiap pemberhentian
    "henti-datang": (DRIVE / "MOTE6790.JPG", 4 / 3, 0.6),
    "henti-berendam": (DRIVE / "MOTE6767.JPG", 4 / 3, 0.6),
    "henti-balong": (DRIVE / "MOTE6725.JPG", 4 / 3, 0.6),
    "henti-sibentang": (DM / "09_foto_teh.jpg", 4 / 3, 0.4),
    "henti-kumpul": (DRIVE / "MOTE6809.JPG", 4 / 3, 0.6),
    "henti-belakang": (KAT / "p09_3.jpg", 4 / 3, 1.0),
    # panel zona
    "kolam-tasik-madu": (DRIVE / "MOTE6732.JPG", 4 / 3, 0.7),
    "kawung": (KAT / "p03_2.jpg", 4 / 3, 1.0),
    "pondok-kalapa": (KAT / "p04_3.jpg", 4 / 3, 1.0),
    "suite-couple": (KAT / "p11_2.jpg", 4 / 3, 1.0),
    "bungalow-1-14": (KAT / "p05_4.jpg", 4 / 3, 1.0),
    "suite-room": (KAT / "p12_2.jpg", 4 / 3, 1.0),
    "bungalow-arileu": (KAT / "p10_3.jpg", 4 / 3, 1.0),
    "suite-arileu": (KAT / "p13_2.jpg", 4 / 3, 1.0),
    "jr-suite": (KAT / "p14_2.jpg", 4 / 3, 1.0),
    "babakan-siluhur-1": (KAT / "p16_2.jpg", 4 / 3, 1.0),
    "babakan-siluhur-2": (KAT / "p17_2.jpg", 4 / 3, 1.0),
    "villa-sibentang": (SIB / "MOTE9760.jpg", 4 / 3, 0.4),
}

# Beranda: babak "satu hari di kampung" (tegak 2:3) dan galeri kamar (4:5).
# Lolos 4 pertanyaan uji Data Master bab 01 §4.5: tamu melakukan sesuatu atau tempatnya
# menunjuk nilai tambah (air panas, balong, ijuk, saung), suasana tenang, tanpa teks di gambar.
KELUAR_BERANDA = REPO / "src/assets/cerita"
BERANDA = {
    "cerita-datang": (DRIVE / "MOTE6790.JPG", 2 / 3, 0.6),
    "cerita-berendam": (DRIVE / "MOTE6889.JPG", 2 / 3, 0.5),
    "cerita-saung": (DRIVE / "MOTE6834.JPG", 2 / 3, 0.6),
    "cerita-pulang": (DRIVE / "MOTE6776.JPG", 2 / 3, 0.6),
    "kamar-1": (DRIVE / "MOTE6725.JPG", 4 / 5, 0.6),
    "kamar-2": (DRIVE / "MOTE6801.JPG", 4 / 5, 0.6),
    "kamar-3": (DRIVE / "MOTE6819.JPG", 4 / 5, 0.6),
    "kamar-4": (DRIVE / "MOTE6840.JPG", 4 / 5, 0.6),
    "kamar-5": (DRIVE / "MOTE6868.JPG", 4 / 5, 0.6),
    "kamar-6": (DRIVE / "MOTE6855.JPG", 4 / 5, 0.6),
    "kamar-7": (DRIVE / "MOTE6732.JPG", 4 / 5, 0.6),
    "menu-foto": (DRIVE / "MOTE6884.JPG", 2 / 3, 0.6),
}


def potong(im, rasio):
    if not rasio:
        return im
    w, h = im.size
    if w / h > rasio:
        nw = round(h * rasio)
        x = (w - nw) // 2
        return im.crop((x, 0, x + nw, h))
    nh = round(w / rasio)
    y = (h - nh) // 2
    return im.crop((0, y, w, y + nh))


def toning(im, k):
    a = np.asarray(im.convert("RGB")).astype(np.float32) / 255
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    L = 0.2126 * r + 0.7152 * g + 0.0722 * b
    # 1. netralkan cast jingga/teal di bayangan-midtone (foto HDR katalog)
    mid = (L > 0.15) & (L < 0.75)
    cast = float((r[mid] - b[mid]).mean()) if mid.any() else 0.0
    geser = np.clip(cast - 0.04, -0.12, 0.12) * 0.45 * k
    a[..., 0] -= geser / 2
    a[..., 2] += geser / 2
    a = np.clip(a, 0, 1)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    L = 0.2126 * r + 0.7152 * g + 0.0722 * b
    # 2. Shadows +25, Highlights −30, S ringan
    naik = 0.24 * k * 4 * L * (1 - L) ** 3
    turun = -0.20 * k * 4 * L ** 3 * (1 - L)
    s = 0.04 * k * np.sin(2 * np.pi * (L - 0.5)) * (L * (1 - L)) * 4
    L2 = np.clip(L + naik + turun + s, 0, 1)
    # 3. tarik median ke ±0,46 (cerah, tidak gelap), sebagian saja
    med = float(np.median(L2))
    gam = np.clip(np.log(0.46) / np.log(max(med, 1e-3)), 0.82, 1.18)
    gam = 1 + (gam - 1) * 0.6 * k
    L3 = np.clip(L2, 1e-4, 1) ** gam
    rasio = np.where(L > 1e-4, L3 / np.maximum(L, 1e-4), 1)[..., None]
    a = np.clip(a * rasio, 0, 1)
    # 4. saturasi ke ±0,32; hijau & kuning diredam sedikit
    L4 = (0.2126 * a[..., 0] + 0.7152 * a[..., 1] + 0.0722 * a[..., 2])[..., None]
    mx, mn = a.max(-1), a.min(-1)
    sat = float(np.where(mx > 0, (mx - mn) / np.maximum(mx, 1e-6), 0).mean())
    faktor = np.clip(0.32 / max(sat, 1e-3), 0.72, 1.08)
    faktor = 1 + (faktor - 1) * k
    hijau = np.clip((a[..., 1] - np.maximum(a[..., 0], a[..., 2])) * 4, 0, 1)[..., None]
    f = faktor * (1 - 0.06 * hijau * k)
    a = np.clip(L4 + (a - L4) * f, 0, 1)
    return Image.fromarray((a * 255 + 0.5).astype(np.uint8))


def main():
    import sys
    tugas = [(DAFTAR, KELUAR)]
    if "--beranda" in sys.argv:
        KELUAR_BERANDA.mkdir(parents=True, exist_ok=True)
        tugas = [(BERANDA, KELUAR_BERANDA)]
    for daftar, keluar in tugas:
        for nama, (src, rasio, k) in daftar.items():
            if not src.exists():
                print("BELUM ADA", nama, src.name)
                continue
            im = ImageOps.exif_transpose(Image.open(src)).convert("RGB")
            im = potong(im, rasio)
            im.thumbnail((1600, 1600), Image.LANCZOS)
            im = toning(im, k)
            im.save(keluar / f"{nama}.jpg", quality=86, optimize=True, progressive=True)
            print(nama, im.size)


if __name__ == "__main__":
    main()
