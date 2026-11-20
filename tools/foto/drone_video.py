"""Render ulang semua video drone situs dari footage DJI asli, dengan SATU look .cube yang bisa diganti.

Kenapa dua langkah warna: footage DJI direkam profil log. Langkah pertama (normalisasi) membawa log ke
Rec.709 tampil memakai grade Penyunting Video ('Cerah Jujur' A2 + trim per shot, tersimpan di EDL-nya).
Langkah kedua (look) adalah resep butir 7 ('Sejuk Hijau IG', setelan drone). Look disetel dan diukur di
atas hasil langkah pertama, jadi grade A2 dipertahankan. Resep berikutnya cukup mengganti --look.

Look satu .cube untuk semua klip, padahal terang tiap shot berbeda (kolam bertenda putih, dinding putih,
mendung). Karena itu trim normalisasi tiap shot disetel lagi per keluaran (pas_gerbang: eksposur, pengali
hijau, tint, hitam) supaya hasil SESUDAH look masuk gerbang butir 7. Trim ini dihitung ulang
otomatis setiap render, jadi tetap benar kalau look diganti. Shot yang sudah di dalam gerbang tidak diubah;
yang di luar dibawa ke tepi gerbang terdekat. --tanpa-pas mematikannya.

Rantai per shot (ffmpeg, BT.709, LUT di float 32-bit, interpolasi tetrahedral):
  DJI HEVC 10-bit log 59,94p --fps 29,97 (frame terdekat, tanpa blending)
  --> RGB penuh (matriks BT.709, tv->pc)
  --> lut3d dasar 65^3 = A2 + trim shot EDL Penyunting + trim gerbang   [normalisasi log -> Rec.709]
  --> lut3d LOOK (.cube dari --look)                                     [satu-satunya parameter grade]
  --> potong/skala per keluaran (lanczos) --> YUV 4:2:2 10-bit BT.709 tv --> ProRes 422 HQ
  --> sambung shot (concat, cut bersih) --> H.264 High@4.0 2-pass + faststart, VP9 2-pass
  --> poster JPG + AVIF dari frame pertama MP4

Nama berkas, ukuran, durasi, potongan bingkai, dan anggaran ukuran diambil dari EDL Penyunting
(_sumber/edl/), jadi sama dengan public/video/drone/manifest.json. Klip zona-08 memakai sumber
yang pipa servisnya sudah dihapus (z08_bersih.py Penyunting); kalau berkas antaranya belum ada,
skrip ini membuatnya ulang dari klip 0006 asli.

Pakai:
  python3 tools/foto/drone_video.py                          # semua: hero + 6 klip zona -> public/video/drone/
  python3 tools/foto/drone_video.py --look tools/foto/resep/X.cube
  python3 tools/foto/drone_video.py --hanya hero zona-08-balong-pondok-kalapa
  python3 tools/foto/drone_video.py --keluar /tmp/uji --kerja /tmp/kerja
  python3 tools/foto/drone_video.py --tanpa-look             # normalisasi saja (cek: sama dengan render Penyunting)
  python3 tools/foto/drone_video.py --vp9-kali 1.3           # naikkan bitrate WebM kalau langit/air berpita
"""
import argparse, glob, json, os, shutil, subprocess, sys, tempfile
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
BANK = Path.home() / "Documents/MOTE/KAMPUNG SUMBER ALAM (KSA)/07-PRODUKSI KONTEN/2026-11 Bank Drone KSA"
HASIL = BANK / "_hasil-web-2026-11-19"
PY = HASIL / "_sumber/py"          # skrip Penyunting: grade.py (A2), render.py, trim*.py, z08_bersih.py, telemetry.py
EDL = HASIL / "_sumber/edl"
MENTAH = BANK / "_mentah-drive"
LOOK = Path(__file__).resolve().parent / "resep/ksa-sejuk-drone-setel.cube"
KELUAR = REPO / "public/video/drone"
FPS = "30000/1001"
URUT = ["hero", "zona-02-kolam-tasik-madu", "zona-03-restoran-tunjung-balebat", "zona-08-balong-pondok-kalapa",
        "zona-17-18-babakan-siluhur", "zona-19-bungalow-balong-belakang", "zona-21-villa-sibentang"]


def penyunting():
    """Muat modul Penyunting (grade A2, render, trim, getframe) tanpa mengotori sys.modules:
    tools/foto/grade.py (resep Sejuk) bernama sama dengan grade.py Penyunting."""
    nama = ("grade", "trim", "trim2", "render", "getframe")
    simpan = {k: sys.modules.pop(k, None) for k in nama}
    sys.path.insert(0, str(PY))
    try:
        import grade, trim, trim2, render, getframe  # noqa: E401  (milik Penyunting)
        m = dict(grade=grade, trim=trim, trim2=trim2, render=render, getframe=getframe)
    finally:
        while str(PY) in sys.path:
            sys.path.remove(str(PY))
        for k in nama:
            sys.modules.pop(k, None)
            if simpan[k] is not None:
                sys.modules[k] = simpan[k]
    return m


def jalan(cmd):
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        raise RuntimeError(" ".join(map(str, cmd[:10])) + "\n" + r.stderr[-2500:])
    return r


def klip(cid):
    c = glob.glob(str(MENTAH / f"DJI_*_{cid}_D.MP4"))
    if not c:
        raise FileNotFoundError(f"klip sumber {cid} tidak ada di {MENTAH}")
    return c[0]


def sumber_z08(kerja):
    """Sumber zona-08: klip 0006 detik 25-31 dengan pipa servis dihapus (z08_bersih.py Penyunting)."""
    out = kerja / "z08" / "0006_bersih.mov"
    if out.exists():
        return str(out)
    (kerja / "z08" / "cek").mkdir(parents=True, exist_ok=True)
    tel = kerja / "z08" / "0006_tel.json"
    if not tel.exists():
        jalan([sys.executable, "-I", str(PY / "telemetry.py"), klip("0006"), str(tel)])
    jalan([sys.executable, "-I", str(PY / "z08_bersih.py"), klip("0006"), str(tel), str(out), str(kerja / "z08" / "cek")])
    return str(out)


def _rect(fstr, SW, SH):
    """Potongan crop=w:h:x:y (x boleh ekspresi geser; diambil posisi awal) -> fraksi (x0, y0, x1, y1)."""
    import re
    m = re.search(r"crop=(\d+):(\d+):'?([\d.]+)[^:]*:(\d+)", fstr)
    if not m:
        return (0.0, 0.0, 1.0, 1.0)
    w, h, x, y = int(m.group(1)), int(m.group(2)), float(m.group(3)), int(m.group(4))
    return (x / SW, y / SH, (x + w) / SW, (y + h) / SH)


PITA_MEDIAN = (0.46, 0.51)   # gerbang drone 0,44–0,52 dengan jarak aman; tepi bawah 0,46 supaya klip Cerita 1
                             # (zona-08) tidak lebih dari 0,06 di bawah hero (±0,51) yang tampil persis sebelumnya
PITA_A = (-4.3, -1.7)        # gerbang a* netral −4,5..−1,5
DAUN_SAT_MAKS = 0.45         # gerbang saturasi daun <= 0,46


def _sejuk():
    """tools/foto/grade.py (resep Sejuk) dimuat dengan nama lain supaya tidak bentrok dengan grade.py Penyunting."""
    import importlib.util
    if "grade_sejuk" not in sys.modules:
        spec = importlib.util.spec_from_file_location("grade_sejuk", Path(__file__).resolve().parent / "grade.py")
        m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
        sys.modules["grade_sejuk"] = m
    return sys.modules["grade_sejuk"]


def _stat_sejuk():
    return _sejuk().stat


def _setel(y, adj):
    """Setelan terang dan hijau per shot SEBELUM look: kurva luma yang memaku hitam (p05) dan putih (p95),
    hanya menggeser nada tengah (p50), plus pengali saturasi daun. Mesin yang sama dengan look (grade.py)."""
    if not adj:
        return y
    return _sejuk().terapkan_campur(y, adj)


def pas_gerbang(P, edl, sh, o, src, lut):
    """Setelan normalisasi tambahan per shot per keluaran supaya hasil SESUDAH look masuk gerbang drone butir 7.
    Look (.cube) satu untuk semua; yang disetel hanya normalisasi shot ini (dipanggang ke LUT dasar shot itu).
    Campur tangan sekecil mungkin: yang sudah di dalam gerbang tidak diubah, yang di luar dibawa ke tepi
    gerbang terdekat, bukan ke tengah.
      nada tengah : kurva luma (hitam p05 dan putih p95 dipaku), kalau median di luar PITA_MEDIAN. Bukan
                    eksposur, karena menurunkan eksposur shot kolam/dinding putih menenggelamkan bayangan.
      daun        : pengali saturasi daun (hue 55–165), kalau saturasi daun > DAUN_SAT_MAKS
      tint        : G di ruang log (trim A2), kalau a* netral di luar PITA_A
      bk          : pendalaman hitam (trim A2), kalau p05 naik lebih dari 0,008 dari versi lama (gerbang +0,01)
    Diukur di 3 frame (awal, tengah, akhir shot) pada potongan keluaran. Mengembalikan (trim, setelan, ukuran)."""
    import numpy as np
    from kubus import terapkan_cube
    stat = _stat_sejuk()
    SW, SH = P["render"].src_dims(src)
    n = int(round(sh["dur"] * 30000 / 1001))
    x0, y0, x1, y1 = _rect(P["render"].crop_filter(sh, o["mode"], o["w"], o["h"], n, SW, SH), SW, SH)
    fw, fh = (1280, 720) if SW >= SH else (720, 1280)
    ts = [sh["t_in"] + 0.1, sh["t_in"] + sh["dur"] / 2, sh["t_in"] + sh["dur"] - 0.1]
    if sh.get("src"):  # sumber antara (zona-08) mulai di detik 0
        ts = [0.1, sh["dur"] / 2, sh["dur"] - 0.1]
    fr = []
    for t in ts:
        f = P["getframe"].frame16(src, t, fw, fh)
        f = f[int(y0 * fh):int(y1 * fh), int(x0 * fw):int(x1 * fw)]
        s = max(1, int(round(max(f.shape[:2]) / 640)))
        fr.append(f[::s, ::s])
    p = P["grade"].CANDIDATES[edl.get("grade", "A2")]
    g = {k: sh.get("grade", {}).get(k, d) for k, d in
         (("e", 0.0), ("wb_r", 0.0), ("wb_b", 0.0), ("ct", 1.0), ("tint", 0.0), ("bk", 0.0), ("sh_rb", 0.0),
          ("sh_gm", 0.0), ("gs", 1.0), ("ws", 1.0))}
    adj = {}

    def dasar(f):
        return P["grade"].grade(f, p, g["e"], g["wb_r"], g["wb_b"], g["ct"], g["tint"], bk=g["bk"], sh_rb=g["sh_rb"],
                                sh_gm=g["sh_gm"], gs=g["gs"], ws=g["ws"])

    def ukur(pakai_look=True, pakai_setel=True):
        ms = []
        for f in fr:
            y = dasar(f)
            if pakai_setel:
                y = _setel(y, adj)
            ms.append(stat(terapkan_cube(y, lut) if pakai_look else y))
        return {k: (float(np.median([m[k] for m in ms if m[k] is not None])) if any(m[k] is not None for m in ms) else None)
                for k in ("p05", "p50", "p95", "a_mid", "daun_hue", "daun_sat")}

    def bagi(atur, lo, hi, naik, n=13):
        """bisection: atur(x) memasang nilai; naik(m) True = nilai perlu lebih besar."""
        for _i in range(n):
            mid = (lo + hi) / 2
            atur(mid)
            if naik(ukur()):
                lo = mid
            else:
                hi = mid
        atur(round((lo + hi) / 2, 4))

    lama = ukur(False, False)      # versi lama (normalisasi tanpa look) = 'sumber' untuk gerbang p05
    awal = ukur(True, False)       # look saja, trim EDL
    for _ in range(2):
        m = ukur()
        if not PITA_MEDIAN[0] <= m["p50"] <= PITA_MEDIAN[1]:
            tepi = min(max(m["p50"], PITA_MEDIAN[0]), PITA_MEDIAN[1])
            pre = ukur(False, False)
            s05, s50, s95 = pre["p05"], pre["p50"], pre["p95"]
            ds = adj.get("daun", {"geser": 0.0, "sat": 1.0})

            def atur(t50):
                adj.clear()
                adj.update({"tone": {"s05": s05, "s50": s50, "s95": s95, "t05": s05, "t50": t50, "t95": s95, "putih": 1.0},
                            "daun": ds, "sat": 1.0})
            bagi(atur, s05 + 0.03, s95 - 0.03, lambda m: m["p50"] < tepi)
        m = ukur()
        if m["daun_sat"] is not None and m["daun_sat"] > DAUN_SAT_MAKS:
            adj.setdefault("daun", {"geser": 0.0, "sat": 1.0})
            adj.setdefault("sat", 1.0)
            adj["daun"]["sat"] = round(adj["daun"]["sat"] * (DAUN_SAT_MAKS - 0.005) / m["daun_sat"], 4)
        m = ukur()
        if m["a_mid"] is not None and not PITA_A[0] <= m["a_mid"] <= PITA_A[1]:
            tepi_a = min(max(m["a_mid"], PITA_A[0] + 0.1), PITA_A[1] - 0.1)
            bagi(lambda v: g.__setitem__("tint", v), g["tint"] - 0.03, g["tint"] + 0.03, lambda m: m["a_mid"] >= tepi_a)
        m = ukur()
        if m["p05"] > lama["p05"] + 0.008:
            bagi(lambda v: g.__setitem__("bk", v), g["bk"], min(g["bk"] + 0.3, 0.6), lambda m: m["p05"] > lama["p05"] + 0.004)
    akhir = ukur()
    return g, (adj or None), {"lama": lama, "look_saja": awal, "sesudah": akhir}


def lut_dasar(P, edl, k, sh, kerja, g=None, tag="", adj=None):
    """LUT dasar 65^3 shot ini: A2 + trim (EDL / gerbang), lalu setelan per shot kalau ada."""
    import numpy as np
    g = g if g is not None else sh.get("grade", {})
    cube = kerja / f"{edl['nama']}_{k}_{sh['id']}{tag}_dasar.cube"
    n = 65
    t = np.linspace(0, 1, n, dtype=np.float32)
    B, G, R = np.meshgrid(t, t, t, indexing="ij")
    rgb = np.stack([R, G, B], -1).reshape(-1, 3)
    y = P["grade"].grade(rgb, P["grade"].CANDIDATES[edl.get("grade", "A2")], g.get("e", 0), g.get("wb_r", 0),
                         g.get("wb_b", 0), g.get("ct", 1.0), g.get("tint", 0), bk=g.get("bk", 0.0),
                         sh_rb=g.get("sh_rb", 0.0), sh_gm=g.get("sh_gm", 0.0), gs=g.get("gs", 1.0), ws=g.get("ws", 1.0))
    if adj:
        y = _setel(y.reshape(1, -1, 3), adj).reshape(-1, 3)
    with open(cube, "w") as fh:
        fh.write(f'TITLE "KSA dasar {edl["nama"]} {sh["id"]}{tag}"\nLUT_3D_SIZE {n}\nDOMAIN_MIN 0 0 0\nDOMAIN_MAX 1 1 1\n')
        np.savetxt(fh, np.clip(y, 0, 1), fmt="%.6f")
    return cube


def render_shot(P, sh, src, out, mode, w, h, dasar, look):
    n = int(round(sh["dur"] * 30000 / 1001))
    SW, SH = P["render"].src_dims(src)
    warna = f"format=gbrpf32le,lut3d=file='{dasar}':interp=tetrahedral"
    if look:
        warna += f",lut3d=file='{look}':interp=tetrahedral"
    vf = (f"fps={FPS}:round=near,"
          "scale=in_color_matrix=bt709:in_range=tv:out_range=pc:flags=accurate_rnd+full_chroma_int,"
          f"{warna},format=rgb48le,"
          + P["render"].crop_filter(sh, mode, w, h, n, SW, SH) +
          ",scale=out_color_matrix=bt709:out_range=tv:flags=accurate_rnd+full_chroma_int,format=yuv422p10le")
    jalan(["ffmpeg", "-nostdin", "-v", "error", "-y", "-ss", f"{sh['t_in']:.4f}", "-i", src, "-map", "0:v:0",
           "-vf", vf, "-frames:v", str(n), "-c:v", "prores_ks", "-profile:v", "3", "-vendor", "apl0",
           "-color_primaries", "bt709", "-color_trc", "bt709", "-colorspace", "bt709", "-color_range", "tv", "-an", str(out)])
    return n


def encode(inter, base, mb, durasi, vp9_kali=1.0):
    """Sama dengan render.encode Penyunting (bitrate dari anggaran ukuran, 2-pass), plus pengali bitrate VP9."""
    kbps = int(mb * 8 * 1024 * 0.93 / durasi)
    kv = int(kbps * vp9_kali)
    mp4, webm, log = base + ".mp4", base + ".webm", base + "_2pass"
    vf = "scale=flags=accurate_rnd+full_chroma_int,format=yuv420p"
    tag = ["-color_primaries", "bt709", "-color_trc", "bt709", "-colorspace", "bt709", "-color_range", "tv", "-an"]
    for ps in (1, 2):
        cmd = ["ffmpeg", "-nostdin", "-v", "error", "-y", "-i", inter, "-vf", vf, "-c:v", "libx264", "-preset", "slow",
               "-profile:v", "high", "-level:v", "4.0", "-b:v", f"{kbps}k", "-maxrate", f"{int(kbps * 1.6)}k",
               "-bufsize", f"{int(kbps * 3)}k", "-g", "60", "-pass", str(ps), "-passlogfile", log,
               "-x264-params", "aq-mode=3:psy-rd=1.0,0.15"] + tag
        jalan(cmd + (["-f", "null", "/dev/null"] if ps == 1 else ["-movflags", "+faststart", mp4]))
    for ps in (1, 2):
        cmd = ["ffmpeg", "-nostdin", "-v", "error", "-y", "-i", inter, "-vf", vf, "-c:v", "libvpx-vp9", "-b:v", f"{kv}k",
               "-minrate", f"{int(kv * 0.5)}k", "-maxrate", f"{int(kv * 1.45)}k", "-deadline", "good",
               "-cpu-used", "2" if ps == 2 else "4", "-row-mt", "1", "-tile-columns", "2", "-g", "120",
               "-auto-alt-ref", "1", "-lag-in-frames", "25", "-pass", str(ps), "-passlogfile", log + "vp9"] + tag
        jalan(cmd + (["-f", "null", "/dev/null"] if ps == 1 else [webm]))
    for f in glob.glob(log + "*"):
        os.remove(f)
    return mp4, webm, kbps, kv


def render_edl(P, edl, keluar, kerja, look, vp9_kali=1.0, simpan_antara=False, pas=True):
    hasil = {}
    lut = None
    if pas and look:
        from kubus import baca_cube
        lut = baca_cube(look)
    for o in edl["keluaran"]:
        parts, total = [], 0
        for k, sh in enumerate(edl["shots"]):
            src = sh.get("src")
            if src and not Path(src).exists():
                src = sumber_z08(kerja) if sh["id"] == "0006" else None
            src = src or klip(sh["id"])
            g = None
            if lut is not None:
                g, adj, uk = pas_gerbang(P, edl, sh, o, src, lut)
                hasil.setdefault("trim_gerbang", {})[f"{o['tag']}/{k}/{sh['id']}"] = {"trim": g, "setelan": adj, "ukur": uk}
                print(" ", edl["nama"], o["tag"], sh["id"], "tint/bk", (g["tint"], g["bk"]), "setelan",
                      None if not adj else {"t50": adj.get("tone", {}).get("t50"), "s50": adj.get("tone", {}).get("s50"),
                                            "daun_sat": adj.get("daun", {}).get("sat")},
                      "median", round(uk["sesudah"]["p50"], 3), flush=True)
            else:
                adj = None
            dasar = lut_dasar(P, edl, k, sh, kerja, g, f"_{o['tag']}", adj)
            part = kerja / f"{edl['nama']}_{o['tag']}_{k}.mov"
            total += render_shot(P, sh, src, part, o["mode"], o["w"], o["h"], dasar, look)
            parts.append(part)
        lst = kerja / f"{edl['nama']}_{o['tag']}.txt"
        lst.write_text("".join(f"file '{p}'\n" for p in parts))
        inter = kerja / f"{edl['nama']}_{o['tag']}_gabung.mov"
        jalan(["ffmpeg", "-nostdin", "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", str(lst), "-c", "copy", str(inter)])
        durasi = total * 1001 / 30000
        base = str(keluar / f"{edl['nama']}-{o['tag']}")
        # pengali bitrate WebM hanya untuk hero (bidang air/langit paling luas dan paling lama di layar)
        kali = vp9_kali if edl["nama"] == "hero" else 1.0
        mp4, webm, kbps, kv = encode(str(inter), base, edl["anggaran_mb"][o["tag"]], durasi, kali)
        if o.get("poster", True):
            P["render"].poster(mp4, str(keluar / f"{edl['nama']}-{o.get('poster_tag', o['tag'])}"))
        hasil[o["tag"]] = {"mp4": Path(mp4).name, "webm": Path(webm).name, "frames": total, "durasi": round(durasi, 3),
                           "kbps_mp4": kbps, "kbps_webm": kv,
                           "mb_mp4": round(os.path.getsize(mp4) / 1048576, 3), "mb_webm": round(os.path.getsize(webm) / 1048576, 3)}
        print(edl["nama"], o["tag"], hasil[o["tag"]], flush=True)
        if simpan_antara:
            shutil.copy(inter, kerja / f"{edl['nama']}-{o['tag']}_antara.mov")
        for p in parts + [inter]:
            p.unlink(missing_ok=True)
    return hasil


def still(cid, t, potong_px, look=LOOK, lebar=1600, P=None, pas_gerbang=True):
    """Satu frame drone sebagai foto diam, dengan rantai warna yang sama dengan video:
    frame 16-bit dari klip asli -> A2 + trim otomatis (trim2.solve2 Penyunting, diukur di potongan ini)
    -> look .cube -> potong -> skala ke `lebar`. Mengembalikan (PIL.Image, trim).

    pas_gerbang: trim normalisasi frame ini disetel lagi supaya HASIL AKHIR (sesudah look) masuk gerbang
    drone butir 7: median luma ±0,49 (gerbang 0,44–0,52; sisi atas supaya adegan mendung berlangit putih
    tidak jadi berat), saturasi daun <= 0,45, hue daun <= 119°. Yang disetel hanya normalisasi (eksposur e,
    pengali hijau gs, putaran hijau A2); look tetap satu .cube. Putaran hijau dikembalikan ke A2 kalau
    tidak berhasil membawa hue ke gerbang (hue terukur ikut air kolam atau kabut, bukan daun)."""
    import numpy as np
    from PIL import Image
    from kubus import baca_cube, terapkan_cube
    P = P or penyunting()
    path = klip(cid)
    SW, SH = P["render"].src_dims(path)
    x0, y0, x1, y1 = potong_px
    fw, fh = (640, 360) if SW >= SH else (360, 640)
    kecil = P["getframe"].frame16(path, t, fw, fh)
    p = dict(P["grade"].CANDIDATES["A2"])
    g = P["trim2"].solve2([kecil], p, [(x0 / SW, y0 / SH, x1 / SW, y1 / SH)])
    a = P["getframe"].frame16(path, t, SW, SH)[y0:y1, x0:x1]
    lut = baca_cube(str(look)) if look else None

    def jadi(arr, g, p):
        y = np.empty(arr.shape, np.float32)
        for r in range(0, arr.shape[0], 270):
            y[r:r + 270] = P["grade"].grade(arr[r:r + 270], p, g["e"], g["wb_r"], g["wb_b"], g["ct"], g["tint"], bk=g["bk"],
                                            sh_rb=g["sh_rb"], sh_gm=g["sh_gm"], gs=g["gs"], ws=g["ws"])
        return terapkan_cube(y, lut) if lut is not None else y

    if pas_gerbang and lut is not None:
        stat = _stat_sejuk()
        k = max(1, int(round(a.shape[1] / 1080)))
        uk = a[::k, ::k]                       # ±1080 px, ukuran ukur gerbang
        hue_a2 = p["green_hue"]

        def eksposur():
            lo, hi = g["e"] - 0.15, g["e"] + 0.15
            for _i in range(14):
                g["e"] = (lo + hi) / 2
                if stat(jadi(uk, g, p))["p50"] < 0.49:
                    lo = g["e"]
                else:
                    hi = g["e"]
            return stat(jadi(uk, g, p))

        for _ in range(3):
            m = eksposur()
            ubah = False
            if m["daun_sat"] is not None and m["daun_sat"] > 0.45:
                g["gs"] = round(float(g["gs"] * 0.44 / m["daun_sat"]), 4)
                ubah = True
            if m["daun_hue"] is not None and m["daun_hue"] > 119 and p["green_hue"] > -5:
                p["green_hue"] = float(max(-5.0, p["green_hue"] - (m["daun_hue"] - 118)))
                ubah = True
            if not ubah:
                break
        m = eksposur()
        if m["daun_hue"] is not None and m["daun_hue"] > 120 and p["green_hue"] != hue_a2:
            p["green_hue"] = hue_a2            # tidak berhasil: kembalikan, jangan geser daun tanpa hasil
            m = eksposur()
        if m["a_mid"] is not None and not -4.3 <= m["a_mid"] <= -1.7:
            # netral terlalu hijau/magenta: setel tint (G di ruang log) supaya a* akhir ±−3,5 (gerbang −4,5..−1,5)
            t0 = g["tint"]; lo, hi = t0 - 0.03, t0 + 0.03
            for _i in range(12):
                g["tint"] = (lo + hi) / 2
                if stat(jadi(uk, g, p))["a_mid"] < -3.5:   # a* terlalu hijau -> kurangi G
                    hi = g["tint"]
                else:
                    lo = g["tint"]
            g["tint"] = round(float(g["tint"]), 4)
            m = eksposur()
        g["e"] = round(float(g["e"]), 4)
        g["green_hue"] = p["green_hue"]
    y = jadi(a, g, p)
    im = Image.fromarray(np.round(np.clip(y, 0, 1) * 255).astype(np.uint8))
    if lebar and im.width != lebar:
        im = im.resize((lebar, round(lebar * im.height / im.width)), Image.LANCZOS)
    return im, g


def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--look", default=str(LOOK), help="berkas .cube look (default: resep butir 7 setelan drone)")
    ap.add_argument("--tanpa-look", action="store_true", help="normalisasi saja, tanpa look")
    ap.add_argument("--hanya", nargs="*", help="nama EDL (mis. hero, zona-08-balong-pondok-kalapa)")
    ap.add_argument("--keluar", default=str(KELUAR))
    ap.add_argument("--kerja", default=str(Path(tempfile.gettempdir()) / "ksa-drone-kerja"))
    ap.add_argument("--vp9-kali", type=float, default=1.0, help="pengali bitrate WebM hero (anti banding)")
    ap.add_argument("--simpan-antara", action="store_true", help="simpan ProRes gabungan di folder kerja (untuk cek banding)")
    ap.add_argument("--tanpa-pas", action="store_true", help="jangan setel trim normalisasi ke gerbang butir 7")
    a = ap.parse_args()
    look = None if a.tanpa_look else str(Path(a.look).resolve())
    if look and not Path(look).exists():
        sys.exit(f"look tidak ada: {look}")
    keluar, kerja = Path(a.keluar), Path(a.kerja)
    keluar.mkdir(parents=True, exist_ok=True); kerja.mkdir(parents=True, exist_ok=True)
    P = penyunting()
    nama = a.hanya or URUT
    ringkas = {"look": look, "edl": str(EDL), "hasil": {}}
    for n in nama:
        f = EDL / ("hero.json" if n == "hero" else f"edl_{n}.json")
        edl = json.loads(f.read_text())
        ringkas["hasil"][n] = render_edl(P, edl, keluar, kerja, look, a.vp9_kali, a.simpan_antara, not a.tanpa_pas)
    catat = kerja / "drone_video_hasil.json"   # digabung per EDL, supaya render sebagian tidak menghapus catatan lain
    lama = json.loads(catat.read_text()) if catat.exists() else {}
    lama.setdefault("hasil", {}).update(ringkas["hasil"])
    lama.update({"look": look, "edl": str(EDL)})
    catat.write_text(json.dumps(lama, indent=1, default=float))
    print("selesai ->", keluar)


if __name__ == "__main__":
    main()
