"""Siapkan foto peta kawasan dan beranda dari berkas ASLI: putar sesuai EXIF, potong, beri warna, simpan.

Warna dua langkah (sama dengan video drone dan plat peta):
 1. Normalisasi 'Cerah Jujur' (Creative Direction KSA 2027 hlm 15: Highlights −30, Shadows +25,
    Contrast +5, hijau & kuning sedikit diredam), adaptif per foto: cast jingga/teal dinetralkan,
    median luminans ditarik ke ±0,46 dan saturasi ke ±0,32, supaya foto katalog (HDR, jingga) dan foto
    sesi MOTE November satu keluarga. Ini fungsi toning lama; tidak diubah.
 2. Resep (bisa diganti dengan --resep): default 'Sejuk Hijau IG' butir 7 = resep/p-foto.json lewat
    grade.py. Resep itu disetel dan diukur di atas hasil langkah 1, karena itu langkah 1 tetap dipakai.
    Foto yang cahayanya jauh dari rata-rata (mendung, backlight, katalog HDR jingga) diberi opsi
    {"fit": True}: parameternya dihitung per foto ke target feed IG (resep/target-ig-feed.json), cara
    tone-uji/sesudah/param/ di spek butir 7, lalu diberi pagar gerbang (a* netral, saturasi daun dan
    global, putaran hue daun, titik hitam tidak diangkat). {"fit": "nada"} hanya mem-fit terang.
 3. Koreksi per foto (opsional, opsi "koreksi"; QA Fable putaran 4): ijuk kebiruan ditarik ke abu kecokelatan,
    jingga/biru/toska foto katalog HDR dikurangi, selubung toska di bidang terang dinetralkan, kurva nada dengan
    titik hitam dipaku. Lihat koreksi().
 Frame drone (profil log) tidak lewat langkah 1: dinormalkan ke Rec.709 dengan grade Penyunting
 (A2 + trim otomatis per frame, disetel supaya hasil akhir masuk gerbang drone), lalu diberi look drone
 (resep/ksa-sejuk-drone-setel.cube), sama dengan video. Lihat drone_video.still().

Selalu dari berkas asli (Drive, Katalog, Data Master, klip DJI). Keluaran yang sudah ber-grade tidak
pernah di-grade ulang.

Pakai: python3 tools/foto/siapkan.py                      (keluaran: src/assets/peta/*.jpg)
      python3 tools/foto/siapkan.py --beranda            (keluaran: src/assets/cerita/*.jpg)
      python3 tools/foto/siapkan.py --halaman            (keluaran: src/assets/images, foto halaman dalam)
      python3 tools/foto/siapkan.py --semua              (ketiganya)
      python3 tools/foto/siapkan.py --resep X.json|X.cube|tanpa   (ganti resep langkah 2 foto darat)
      python3 tools/foto/siapkan.py --hanya henti-datang zona-01-lobby
      python3 tools/foto/siapkan.py --keluar DIR         (uji di luar repo, satu folder)
"""
import argparse, json
from pathlib import Path
import numpy as np
from PIL import Image, ImageOps

import grade as sejuk          # tools/foto/grade.py: resep 'Sejuk Hijau IG' (butir 7)
from kubus import terapkan_cube

REPO = Path(__file__).resolve().parents[2]
RESEP = Path(__file__).resolve().parent / "resep"
KSA = Path.home() / "Documents/MOTE/KAMPUNG SUMBER ALAM (KSA)"
DRIVE = KSA / "07-PRODUKSI KONTEN/2026-11 Foto KSA (Drive Ryan)"
KAT = KSA / "08-KATALOG/_sumber-katalog/foto"
SIB = KSA / "10-UNIT SIBENTANG/04-ASET-VISUAL/foto-drive"
DM = KSA / "00-DATA MASTER/_sumber/final/isi/gambar"
KELUAR = REPO / "src/assets/peta"
KELUAR.mkdir(parents=True, exist_ok=True)

# nama keluaran: (sumber, rasio potong lebar/tinggi atau None, kekuatan normalisasi 0..1[, opsi])
# opsi: {"fit": True} = resep dihitung per foto; {"fit": "nada"} = hanya terang yang di-fit.
# Aturan pemberian fit (20 Nov 2026, diukur grade.stat() di 1080 px): foto yang dengan resep umum p-foto gagal
# gerbang butir 7 (median 0,42–0,52, a* −4,5..−1,5, saturasi daun <= 0,46, jebol <= 1%) diberi fit.
# Resep umum hanya lolos di bungalow-1-14 dan suite-arileu; bungalow-1-14 tetap di-fit karena di galeri kamar
# ia bersebelahan dengan pondok-kalapa (selisih median harus <= 0,06).
FIT = {"fit": True}
# Langkah 3, koreksi per foto (QA Fable putaran 4, 20 Nov 2026). Gerbang tambahan: ijuk b* >= 0 (tidak kebiruan).
# Ijuk MOTE6725 memantulkan langit (b* −9): netral kebiruan ditarik ke abu kecokelatan, dan di area atap juga
# ijuk yang lebih jenuh birunya.
IJUK_BALONG = {"ijuk": 1.0, "ijuk_a": -2.0, "ijuk_kuat": {"area": [0.0, 0.0, 1.0, 0.42], "c": 36}}
# Foto katalog HDR: jingga dan biru dikurangi, ijuk dinetralkan, titik hitam dipaku.
# ijuk_a −2: ijuk jadi abu kecokelatan yang sedikit hijau, supaya netral seluruh foto tetap di gerbang a* −1,5..−4,5
KATALOG_HDR = {"ijuk": 1.0, "ijuk_a": -2.0, "jingga": 0.65, "biru": 0.72, "sat": 0.92}
DAFTAR = {
    # kotak keterangan tiap pemberhentian
    "henti-datang": (DRIVE / "MOTE6790.JPG", 4 / 3, 0.6, FIT),           # gelap (0,38), daun jenuh
    "henti-berendam": (DRIVE / "MOTE6767.JPG", 4 / 3, 0.6, FIT),         # netral terlalu dingin (a* −5,9)
    "henti-balong": (DRIVE / "MOTE6725.JPG", 4 / 3, 0.6, {**FIT, "koreksi": IJUK_BALONG}),  # gelap, ijuk biru
    "henti-sibentang": (DM / "09_foto_teh.jpg", 4 / 3, 0.4, FIT),        # terang karena dinding putih (0,74)
    "henti-kumpul": (DRIVE / "MOTE6809.JPG", 4 / 3, 0.6, FIT),           # langit jebol 7%, daun jenuh
    "henti-belakang": (KAT / "p09_3.jpg", 4 / 3, 1.0, {**FIT, "koreksi": KATALOG_HDR}),  # katalog HDR jingga
    # panel zona
    # tenda putih memantulkan kolam jadi hijau mint (a* −15) dan langit sian: selubung toska dinetralkan
    "kolam-tasik-madu": (DRIVE / "MOTE6732.JPG", 4 / 3, 0.7, {**FIT, "koreksi": {
        "ijuk": 1.0, "ijuk_kuat": {"area": [0.04, 0.2, 0.43, 0.42], "c": 36},
        "toska": {"L": 58, "c": 30, "a": -3.0, "b": -1.0, "kuat": 0.8}}}),
    "kawung": (KAT / "p03_2.jpg", 4 / 3, 1.0, {"fit": "nada"}),          # lorong gelap (0,27); netral tak terukur
    "pondok-kalapa": (KAT / "p04_3.jpg", 4 / 3, 1.0, FIT),               # gelap (0,33)
    "suite-couple": (KAT / "p11_2.jpg", 4 / 3, 1.0, FIT),                # katalog HDR, netral hangat
    "bungalow-1-14": (KAT / "p05_4.jpg", 4 / 3, 1.0, {**FIT, "koreksi": {"ijuk": 1.0, "biru": 0.85, "aqua": 0.9}}),
    "suite-room": (KAT / "p12_2.jpg", 4 / 3, 1.0, FIT),                  # netral hangat (a* +1,9), daun jenuh
    "bungalow-arileu": (KAT / "p10_3.jpg", 4 / 3, 1.0, FIT),             # gelap (0,40)
    "suite-arileu": (KAT / "p13_2.jpg", 4 / 3, 1.0),                     # lolos dengan resep umum
    "jr-suite": (KAT / "p14_2.jpg", 4 / 3, 1.0, FIT),                    # gelap (0,37), sore mendung
    "babakan-siluhur-1": (KAT / "p16_2.jpg", 4 / 3, 1.0, FIT),           # katalog HDR, netral hangat
    "babakan-siluhur-2": (KAT / "p17_2.jpg", 4 / 3, 1.0, FIT),           # netral hangat
    # pucat (QA putaran 4): nada tengah dan sorot diturunkan, saturasi dinaikkan sedikit, hitam dipaku
    "villa-sibentang": (SIB / "MOTE9760.jpg", 4 / 3, 0.4, {**FIT, "koreksi": {
        "nada": {"tengah": -0.08, "sorot": -0.05, "putih": 0.965}, "sat": 1.28}}),
    # spek Lampiran A: Suite Room = private whirlpool resmi KSA (Katalog hlm 12). Asli 1388 px, tidak diperbesar.
    "zona-11-suite-whirlpool": (KAT / "p12_4.jpg", 4 / 3, 1.0, FIT),     # mendung, daun kekuningan
}

# Frame drone (spek Lampiran A): (klip DJI, detik, potongan piksel x0, y0, x1, y1 di frame asli). Semua 4:3 mendatar,
# lebar ekspor 1600. Frame dipilih di foto-zona/DAFTAR.md (diam, paling tajam).
DRONE = {
    # Lobby: frame tegak 2160x3840. Bubungan atap (±y 200) sampai lantai teras dan anak tangga atas; lantai parkir
    # bergaris kuning dibuang. Bubungan sampai anak tangga terbawah setinggi ±2650 px, tidak muat di 4:3 mendatar.
    "zona-01-lobby": ("0070", 20.901, (0, 150, 2160, 1770)),
    # Area Parkir: frame tegak. Atap Lobby utuh, pagar pot, awal lantai parkir; dahan di pojok kanan atas (y < 730) dibuang.
    "zona-06-parkir": ("0070", 7.517, (0, 780, 2160, 2400)),
    # Bungalow 15–40: frame mendatar 3840x2160, sore mendung. Deret bungalow utuh di kiri, titian dan balong berteratai.
    "zona-19-belakang-udara": ("0085", 33.053, (0, 0, 2880, 2160)),
}

# Beranda: babak "satu hari di kampung" (tegak 2:3) dan galeri kamar (4:5).
# Lolos 4 pertanyaan uji Data Master bab 01 §4.5: tamu melakukan sesuatu atau tempatnya
# menunjuk nilai tambah (air panas, balong, ijuk, saung), suasana tenang, tanpa teks di gambar.
KELUAR_BERANDA = REPO / "src/assets/cerita"
# Halaman dalam (src/assets/images, dipakai lewat Gbr.astro): nama lengkap dengan ekstensi, ukuran piksel tetap.
# Foto situs lama tanpa berkas asli diambil dari riwayat git (commit 26ab7ee), jadi jalan ulang selalu mulai
# dari berkas yang sama dan tidak pernah meng-grade hasil grade.
KELUAR_HALAMAN = REPO / "src/assets/images"
GIT_ASLI = "26ab7ee"
HALAMAN = {
    # hero /accommodation: foto yang sama dengan henti-balong (MOTE6725), resep dan koreksi ijuk yang sama
    "menginap-balong.jpg": (DRIVE / "MOTE6725.JPG", 4 / 3, 0.6, {**FIT, "koreksi": IJUK_BALONG}),
    # Restoran Tunjung Balebat, foto situs lama (HDR jingga, satu-satunya foto tempat ini tanpa rapat tim)
    "restoran-tunjung.webp": (f"git:{GIT_ASLI}:src/assets/images/restoran-tunjung.webp", None, 1.0, {**FIT, "koreksi": {
        "jingga": 0.75, "biru": 0.7, "aqua": 0.75, "sat": 0.8, "nada": {"tengah": 0.03, "hitam": 0.03}}}),
    # ballroom Purba Dewata /meetings, foto situs lama (HDR jingga-kuning). a* netral tetap hangat: ruang dalam
    # berlampu hangat; netral yang digeser ke hijau membuat dinding krem jadi zaitun (sudah dicoba).
    "purba-dewata.webp": (f"git:{GIT_ASLI}:src/assets/images/purba-dewata.webp", None, 1.0, {**FIT, "koreksi": {
        "jingga": 0.6, "sat": 0.85, "wb": [0.5, -4.0], "nada": {"tengah": -0.085, "sorot": -0.03}}}),
}
BERANDA = {
    "cerita-datang": (DRIVE / "MOTE6790.JPG", 2 / 3, 0.6, FIT),          # kemeja putih jebol, daun jenuh
    # Kolam Renang Tasik Madu dengan tamu berendam dan Gunung Guntur (Drive Ryan, 17 Nov 2026).
    # Belum ada foto bak rendam kamar yang beruap dengan tamu: masuk daftar kebutuhan pemotretan.
    "cerita-berendam": (DRIVE / "MOTE6732.JPG", 2 / 3, 0.5, FIT),        # kolam + langit, jebol 3%
    "cerita-pulang": (DRIVE / "MOTE6776.JPG", 2 / 3, 0.6, FIT),          # langit terang (0,58), jebol
    "menu-foto": (DRIVE / "MOTE6884.JPG", 2 / 3, 0.6, FIT),              # netral dingin, daun jenuh
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


def normalisasi(a, k):
    """Langkah 1 'Cerah Jujur' (fungsi toning lama). a: float32 0..1 (H, W, 3). Kembali float32 0..1."""
    a = a.copy()
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
    return np.clip(L4 + (a - L4) * f, 0, 1)


def koreksi(a, o):
    """Langkah 3 (opsional, per foto; QA Fable putaran 4): koreksi foto HDR/katalog lama dan atap ijuk.
    o (dict), semua opsional:
      ijuk   : 0..1  netral yang kebiruan (C* < 22, L* 12–80, b* < +2,5) ditarik ke abu kecokelatan
                     (b* +2,5, a* ke ijuk_a, default 0). Atap ijuk, bayangan dinding, dan selubung toska ikut netral.
      jingga : faktor saturasi jingga/kuning-jingga (hue 8–52°), mis. 0,75 untuk kayu & karpet HDR
      biru   : faktor saturasi biru (hue 185–250°)
      aqua   : faktor saturasi toska (hue 156–200°)
      sat    : faktor saturasi global (di sekitar luma)
      nada   : dict kurva luma {tengah: geser median, sorot: geser p95, putih: titik putih, hitam: p05 tujuan};
               p05 dipaku (atau diturunkan ke 'hitam'), jadi titik hitam tidak diangkat.
      wb     : [da, db] geser Lab untuk nada tengah dan terang (putih kain/dinding yang kekuningan HDR)
      ijuk_kuat : {"area": [x0, y0, x1, y1] (fraksi), "c": batas C*} ijuk yang memantulkan langit biru
               (C* sampai ±34) dinetralkan juga, tetapi hanya di area atap itu (tepi dihaluskan).
    """
    if not o:
        return a
    from skimage import color
    a = np.clip(np.asarray(a, np.float64), 0, 1)
    if o.get("wb"):
        da, db = o["wb"]
        a = sejuk.f_wb(a, {"wb": {"shadow": [da * 0.5, db * 0.5], "mid": [da, db], "high": [da, db]}})
    if o.get("nada"):
        n = o["nada"]
        Y = 0.2126 * a[..., 0] + 0.7152 * a[..., 1] + 0.0722 * a[..., 2]
        p05, p50, p95 = [float(v) for v in np.percentile(Y, [5, 50, 95])]
        t05 = float(n["hitam"]) if n.get("hitam") is not None else p05   # hitam: kembalikan p05 ke nilai sumber
        P = {"tone": {"s05": p05, "s50": p50, "s95": p95, "t05": min(t05, p05),
                      "t50": float(np.clip(p50 + n.get("tengah", 0.0), p05 + 0.03, p95 - 0.03)),
                      "t95": float(np.clip(p95 + n.get("sorot", 0.0), p50 + 0.05, 0.99)),
                      "putih": float(n.get("putih", 1.0))}}
        a = sejuk.f_tone(a, P)
    if any(o.get(x) is not None for x in ("jingga", "biru", "aqua")):
        hsv = color.rgb2hsv(a)
        H, S = hsv[..., 0] * 360, hsv[..., 1]

        def pita(c, lebar):  # bobot halus (cos) di sekitar hue c
            d = np.abs(((H - c + 180) % 360) - 180)
            return np.where(d < lebar / 2, 0.5 * (1 + np.cos(np.pi * d / (lebar / 2))), 0.0)
        f = np.ones_like(S)
        if o.get("jingga") is not None:
            f *= 1 + pita(30, 44) * (o["jingga"] - 1)
        if o.get("biru") is not None:
            f *= 1 + pita(217, 64) * (o["biru"] - 1)
        if o.get("aqua") is not None:  # daun di balik kaca dan serbet toska foto HDR
            f *= 1 + pita(178, 44) * (o["aqua"] - 1)
        hsv[..., 1] = np.clip(S * f, 0, 1)
        a = np.clip(color.hsv2rgb(hsv), 0, 1)
    if o.get("sat") is not None and o["sat"] != 1:
        Y = (0.2126 * a[..., 0] + 0.7152 * a[..., 1] + 0.0722 * a[..., 2])[..., None]
        a = np.clip(Y + (a - Y) * o["sat"], 0, 1)
    if o.get("ijuk") or o.get("ijuk_kuat"):
        lab = color.rgb2lab(a)
        L, A, B = lab[..., 0], lab[..., 1], lab[..., 2]
        C = np.hypot(A, B)
        wl = np.clip((L - 12) / 10, 0, 1) * np.clip((80 - L) / 12, 0, 1)
        wb = np.clip((2.5 - B) / 5, 0, 1)
        w = np.clip((22 - C) / 8, 0, 1) * wl * wb * float(o.get("ijuk", 0.0))
        if o.get("ijuk_kuat"):
            k = o["ijuk_kuat"]
            H, W = L.shape
            x0, y0, x1, y1 = k["area"]
            yy, xx = np.mgrid[0:H, 0:W]
            f = 0.04 * W  # tepi area dihaluskan 4% lebar
            wa = (np.clip((xx - x0 * W) / f + 0.5, 0, 1) * np.clip((x1 * W - xx) / f + 0.5, 0, 1)
                  * np.clip((yy - y0 * H) / f + 0.5, 0, 1) * np.clip((y1 * H - yy) / f + 0.5, 0, 1))
            cmax = float(k.get("c", 34))
            biru = np.clip((-A + 8) / 8, 0, 1)  # hanya biru/toska (a* rendah), bukan ungu atau merah
            w = np.maximum(w, np.clip((cmax - C) / 8, 0, 1) * wl * wb * biru * wa)
        lab[..., 2] = B + w * (2.5 - B)
        lab[..., 1] = A + w * (float(o.get("ijuk_a", 0.0)) - A)
        a = np.clip(color.lab2rgb(lab), 0, 1)
    if o.get("toska"):
        # selubung toska di bidang terang (tenda putih yang memantulkan kolam, langit sian): nada terang
        # (L* > toska.L) yang hijau/sian (a* < 0) dan tidak jenuh (C* < toska.c) ditarik ke putih netral sejuk
        t = o["toska"]
        lab = color.rgb2lab(a)
        L, A, B = lab[..., 0], lab[..., 1], lab[..., 2]
        C = np.hypot(A, B)
        w = (np.clip((L - t.get("L", 60)) / 10, 0, 1) * np.clip((t.get("c", 30) - C) / 8, 0, 1)
             * np.clip(-A / 6, 0, 1) * t.get("kuat", 0.8))
        lab[..., 1] = A + w * (t.get("a", -3.0) - A)
        lab[..., 2] = B + w * (t.get("b", -1.0) - B)
        a = np.clip(color.lab2rgb(lab), 0, 1)
    return a


def toning(im, k):
    """Kompatibel dengan versi lama: langkah 1 saja, keluaran 8-bit."""
    a = normalisasi(np.asarray(im.convert("RGB")).astype(np.float32) / 255, k)
    return Image.fromarray((a * 255 + 0.5).astype(np.uint8))


def _kecil(a, maks):
    im = Image.fromarray((np.clip(a, 0, 1) * 255 + 0.5).astype(np.uint8))
    im.thumbnail((maks, maks), Image.LANCZOS)
    return np.asarray(im).astype(np.float32) / 255


# pagar fit per foto, dari gerbang butir 7
A_MID = (-3.6, -2.2)      # gerbang a* −4,5 .. −1,5; pita dipersempit ke sekitar −2,9 (rata-rata foto ber-resep umum)
                          # supaya foto hasil fit tidak lebih dingin daripada foto di sebelahnya
DAUN_SAT_MAKS = 0.45      # gerbang: saturasi daun <= 0,46
SAT_MAKS = 1.12           # sama dengan setelan drone; mencegah kulit dan rumput menyala
DAUN_GESER = (-8.0, 12.0) # putaran hue daun paling jauh 12° (setelan peta). Rumput kering tidak dipaksa hijau
                          # (spek butir 7: mengejar hue daun IG membuat rumput neon)


def resep_fit(a, cara=True):
    """Resep dihitung khusus untuk foto ini (cahaya jauh dari rata-rata).
    cara True  : grade.fit ke target feed IG (k 0,8, diukur di 900 px, cara tone-uji/sesudah/param/), lalu
                 diberi pagar gerbang butir 7: a* netral dijaga di A_MID, saturasi daun <= DAUN_SAT_MAKS,
                 saturasi global <= SAT_MAKS, putaran hue daun di DAUN_GESER.
    cara "nada": hanya kurva nada yang di-fit (terang foto); warna tetap resep umum p-foto.json. Untuk foto
                 yang netralnya tidak bisa diukur jujur (kayu jingga dan lantai merah mendominasi piksel netral).
    Hue daun tidak dipaksa: di foto kolam, 'daun' terukur ikut air toska."""
    T = json.loads((RESEP / "target-ig-feed.json").read_text())
    P = sejuk.fit(T, [_kecil(a, 900)], k=0.8)
    if "tone" in P:  # titik hitam tidak diangkat (spek butir 7): p05 paling banyak +0,005 dari sumbernya
        P["tone"]["t05"] = float(min(P["tone"]["t05"], P["tone"]["s05"] + 0.005))
        P["tone"]["t50"] = float(max(P["tone"]["t50"], P["tone"]["t05"] + 0.05))
    if cara == "nada":
        U = json.loads((RESEP / "p-foto.json").read_text())
        U["tone"] = P["tone"]
        U["fit"] = "nada"
        return U
    P["sat"] = float(min(P.get("sat", 1.0), SAT_MAKS))
    if "daun" in P:
        P["daun"]["sat"] = float(min(P["daun"]["sat"], 1.0))
        P["daun"]["geser"] = float(np.clip(P["daun"]["geser"], *DAUN_GESER))
    uk = _kecil(a, 1080)
    total_a = 0.0
    for _ in range(4):
        m = sejuk.stat(sejuk.terapkan_campur(uk, P))
        ubah = False
        if m["a_mid"] is not None and not A_MID[0] <= m["a_mid"] <= A_MID[1] and abs(total_a) < 3.0:
            d = float(np.clip(np.clip(m["a_mid"], *A_MID) - m["a_mid"], -3.0 - total_a, 3.0 - total_a))
            for z in P["wb"]:
                P["wb"][z][0] += d
            m2 = sejuk.stat(sejuk.terapkan_campur(uk, P))
            if m2["a_mid"] is None or abs(m2["a_mid"] - m["a_mid"]) < 0.3 * abs(d):
                # netral tidak merespons (piksel 'netral' didominasi warna hangat yang dilindungi): batalkan
                for z in P["wb"]:
                    P["wb"][z][0] -= d
            else:
                total_a += d
                ubah = True
        if m["daun_sat"] is not None and m["daun_sat"] > DAUN_SAT_MAKS and "daun" in P:
            P["daun"]["sat"] = float(P["daun"]["sat"] * DAUN_SAT_MAKS / m["daun_sat"])
            ubah = True
        if not ubah:
            break
    P["pagar"] = {"a_mid": A_MID, "daun_sat_maks": DAUN_SAT_MAKS, "sat_maks": SAT_MAKS, "daun_geser": DAUN_GESER,
                  "geser_a_tambahan": round(total_a, 3)}
    return P


def terapkan_resep(a, resep, fit=False):
    """Langkah 2. resep: path .json (parameter grade.py), path .cube, atau None (tanpa).
    fit: True = resep dihitung per foto; "nada" = hanya terang yang di-fit (lihat resep_fit)."""
    if fit:
        P = resep_fit(a, fit)
        return sejuk.terapkan_campur(a, P), P
    if resep is None:
        return a, None
    if str(resep).endswith(".cube"):
        return terapkan_cube(a, resep), str(resep)
    P = json.loads(Path(resep).read_text())
    return sejuk.terapkan_campur(a, P), str(resep)


def simpan(im, path):
    path = Path(path)
    if path.suffix == ".webp":
        im.save(path, quality=85, method=6)
    else:
        im.save(path, quality=86, optimize=True, progressive=True)


def buka(src):
    """Berkas asli, atau 'git:<rev>:<path>' untuk foto situs lama yang hanya ada di riwayat repo."""
    if isinstance(src, str) and src.startswith("git:"):
        import io, subprocess
        _, rev, path = src.split(":", 2)
        b = subprocess.run(["git", "-C", str(REPO), "show", f"{rev}:{path}"], capture_output=True, check=True).stdout
        return Image.open(io.BytesIO(b)).convert("RGB")
    return ImageOps.exif_transpose(Image.open(src)).convert("RGB")


def ada(src):
    return (isinstance(src, str) and src.startswith("git:")) or Path(src).exists()


def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--beranda", action="store_true", help="hanya src/assets/cerita")
    ap.add_argument("--halaman", action="store_true", help="hanya src/assets/images (halaman dalam)")
    ap.add_argument("--semua", action="store_true", help="peta + beranda + halaman")
    ap.add_argument("--resep", default=str(RESEP / "p-foto.json"), help="langkah 2 foto darat: .json, .cube, atau 'tanpa'")
    ap.add_argument("--look-drone", default=str(RESEP / "ksa-sejuk-drone-setel.cube"))
    ap.add_argument("--hanya", nargs="*")
    ap.add_argument("--keluar", help="satu folder keluaran untuk uji (default: folder repo)")
    ap.add_argument("--catat", help="tulis catatan parameter per foto ke JSON ini")
    a = ap.parse_args()
    resep = None if a.resep == "tanpa" else a.resep
    tugas = []
    if a.semua or not (a.beranda or a.halaman):
        tugas.append((DAFTAR, Path(a.keluar) if a.keluar else KELUAR, True))
    if a.semua or a.beranda:
        tugas.append((BERANDA, Path(a.keluar) if a.keluar else KELUAR_BERANDA, False))
    if a.semua or a.halaman:
        tugas.append((HALAMAN, Path(a.keluar) if a.keluar else KELUAR_HALAMAN, False))
    catatan = {}
    for daftar, keluar, dengan_drone in tugas:
        keluar.mkdir(parents=True, exist_ok=True)
        for nama, isi in daftar.items():
            if a.hanya and nama not in a.hanya:
                continue
            src, rasio, k = isi[:3]
            opsi = isi[3] if len(isi) > 3 else {}
            if not ada(src):
                print("BELUM ADA", nama, src)
                continue
            im = buka(src)
            im = potong(im, rasio)
            im.thumbnail((1600, 1600), Image.LANCZOS)
            x = normalisasi(np.asarray(im).astype(np.float32) / 255, k)
            y, P = terapkan_resep(x, resep, opsi.get("fit", False))
            y = koreksi(y, opsi.get("koreksi"))
            berkas = nama if Path(nama).suffix in (".jpg", ".webp") else f"{nama}.jpg"
            simpan(Image.fromarray((np.clip(y, 0, 1) * 255 + 0.5).astype(np.uint8)), keluar / berkas)
            catatan[nama] = {"sumber": str(src), "k": k, "resep": "fit" if opsi.get("fit") else P,
                             "param_fit": P if opsi.get("fit") else None, "koreksi": opsi.get("koreksi")}
            print(nama, im.size, "fit" if opsi.get("fit") else Path(str(P)).name if P else "tanpa resep")
        if dengan_drone:
            import drone_video
            Pz = None
            for nama, (cid, t, box) in DRONE.items():
                if a.hanya and nama not in a.hanya:
                    continue
                Pz = Pz or drone_video.penyunting()
                im, trim = drone_video.still(cid, t, box, a.look_drone, 1600, Pz)
                simpan(im, keluar / f"{nama}.jpg")
                catatan[nama] = {"sumber": f"klip {cid} detik {t}", "potong_px": box, "trim": trim, "look": a.look_drone}
                print(nama, im.size, "drone", trim)
    if a.catat:
        Path(a.catat).write_text(json.dumps(catatan, indent=1, ensure_ascii=False, default=str))


if __name__ == "__main__":
    main()
