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
 Frame drone (profil log) tidak lewat langkah 1: dinormalkan ke Rec.709 dengan grade Penyunting
 (A2 + trim otomatis per frame, disetel supaya hasil akhir masuk gerbang drone), lalu diberi look drone
 (resep/ksa-sejuk-drone-setel.cube), sama dengan video. Lihat drone_video.still().

Selalu dari berkas asli (Drive, Katalog, Data Master, klip DJI). Keluaran yang sudah ber-grade tidak
pernah di-grade ulang.

Pakai: python3 tools/foto/siapkan.py                      (keluaran: src/assets/peta/*.jpg)
      python3 tools/foto/siapkan.py --beranda            (keluaran: src/assets/cerita/*.jpg)
      python3 tools/foto/siapkan.py --semua              (keduanya)
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
DAFTAR = {
    # kotak keterangan tiap pemberhentian
    "henti-datang": (DRIVE / "MOTE6790.JPG", 4 / 3, 0.6, FIT),           # gelap (0,38), daun jenuh
    "henti-berendam": (DRIVE / "MOTE6767.JPG", 4 / 3, 0.6, FIT),         # netral terlalu dingin (a* −5,9)
    "henti-balong": (DRIVE / "MOTE6725.JPG", 4 / 3, 0.6, FIT),           # gelap (0,40), daun jenuh
    "henti-sibentang": (DM / "09_foto_teh.jpg", 4 / 3, 0.4, FIT),        # terang karena dinding putih (0,74)
    "henti-kumpul": (DRIVE / "MOTE6809.JPG", 4 / 3, 0.6, FIT),           # langit jebol 7%, daun jenuh
    "henti-belakang": (KAT / "p09_3.jpg", 4 / 3, 1.0, FIT),              # katalog HDR, netral hangat
    # panel zona
    "kolam-tasik-madu": (DRIVE / "MOTE6732.JPG", 4 / 3, 0.7, FIT),       # tenda putih + kolam, jebol 6%
    "kawung": (KAT / "p03_2.jpg", 4 / 3, 1.0, {"fit": "nada"}),          # lorong gelap (0,27); netral tak terukur
    "pondok-kalapa": (KAT / "p04_3.jpg", 4 / 3, 1.0, FIT),               # gelap (0,33)
    "suite-couple": (KAT / "p11_2.jpg", 4 / 3, 1.0, FIT),                # katalog HDR, netral hangat
    "bungalow-1-14": (KAT / "p05_4.jpg", 4 / 3, 1.0, FIT),               # lolos; fit demi selisih galeri
    "suite-room": (KAT / "p12_2.jpg", 4 / 3, 1.0, FIT),                  # netral hangat (a* +1,9), daun jenuh
    "bungalow-arileu": (KAT / "p10_3.jpg", 4 / 3, 1.0, FIT),             # gelap (0,40)
    "suite-arileu": (KAT / "p13_2.jpg", 4 / 3, 1.0),                     # lolos dengan resep umum
    "jr-suite": (KAT / "p14_2.jpg", 4 / 3, 1.0, FIT),                    # gelap (0,37), sore mendung
    "babakan-siluhur-1": (KAT / "p16_2.jpg", 4 / 3, 1.0, FIT),           # katalog HDR, netral hangat
    "babakan-siluhur-2": (KAT / "p17_2.jpg", 4 / 3, 1.0, FIT),           # netral hangat
    "villa-sibentang": (SIB / "MOTE9760.jpg", 4 / 3, 0.4, FIT),          # dinding putih (0,63), netral dingin
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
    im.save(path, quality=86, optimize=True, progressive=True)


def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--beranda", action="store_true", help="hanya src/assets/cerita")
    ap.add_argument("--semua", action="store_true", help="peta + beranda")
    ap.add_argument("--resep", default=str(RESEP / "p-foto.json"), help="langkah 2 foto darat: .json, .cube, atau 'tanpa'")
    ap.add_argument("--look-drone", default=str(RESEP / "ksa-sejuk-drone-setel.cube"))
    ap.add_argument("--hanya", nargs="*")
    ap.add_argument("--keluar", help="satu folder keluaran untuk uji (default: folder repo)")
    ap.add_argument("--catat", help="tulis catatan parameter per foto ke JSON ini")
    a = ap.parse_args()
    resep = None if a.resep == "tanpa" else a.resep
    tugas = []
    if a.semua or not a.beranda:
        tugas.append((DAFTAR, Path(a.keluar) if a.keluar else KELUAR, True))
    if a.semua or a.beranda:
        tugas.append((BERANDA, Path(a.keluar) if a.keluar else KELUAR_BERANDA, False))
    catatan = {}
    for daftar, keluar, dengan_drone in tugas:
        keluar.mkdir(parents=True, exist_ok=True)
        for nama, isi in daftar.items():
            if a.hanya and nama not in a.hanya:
                continue
            src, rasio, k = isi[:3]
            opsi = isi[3] if len(isi) > 3 else {}
            if not src.exists():
                print("BELUM ADA", nama, src.name)
                continue
            im = ImageOps.exif_transpose(Image.open(src)).convert("RGB")
            im = potong(im, rasio)
            im.thumbnail((1600, 1600), Image.LANCZOS)
            x = normalisasi(np.asarray(im).astype(np.float32) / 255, k)
            y, P = terapkan_resep(x, resep, opsi.get("fit", False))
            simpan(Image.fromarray((np.clip(y, 0, 1) * 255 + 0.5).astype(np.uint8)), keluar / f"{nama}.jpg")
            catatan[nama] = {"sumber": str(src), "k": k, "resep": "fit" if opsi.get("fit") else P,
                             "param_fit": P if opsi.get("fit") else None}
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
