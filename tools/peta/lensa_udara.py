"""Potongan 'lensa' zona dari foto udara drone, untuk panel zona yang tidak punya foto sendiri.

Membaca (tidak mengubah) public/peta/foto-udara/zona.json + ksa-foto-udara-4800.jpg milik
Penyunting Video. Keluaran: public/peta/lensa-udara-XX.webp (720x540) dan
src/data/lensa-udara.json (letak titik di dalam potongan, persen), karena potongan di
tepi foto digeser supaya tetap di dalam bingkai.

Pakai: python3 -I tools/peta/lensa_udara.py
      python3 -I tools/peta/lensa_udara.py --hanya-gambar   (webp saja, data titik tidak ditulis)
"""
import json, sys
from pathlib import Path
from PIL import Image

REPO = Path(__file__).resolve().parents[2]
FU = REPO / "public/peta/foto-udara"
LUAR_W, LUAR_H = 720, 540
POTONG_W = 1100  # lebar potongan di foto 4800 px (±23% lebar foto)

def jpg_terbesar(berkas):
    jpg = [b for k, b in berkas.items() if k.startswith("jpg")]
    return max(jpg, key=lambda b: b["w"]) if jpg else max(berkas.values(), key=lambda b: b["w"])

def main():
    if "-h" in sys.argv or "--help" in sys.argv:
        print(__doc__)
        return
    j = json.loads((FU / "zona.json").read_text("utf-8"))
    # kontrak versi 2: plat = [{id, berkas}]; versi 1: satu plat di ukuran.berkas
    plat = {p["id"]: p.get("berkas") or p.get("ukuran", {}).get("berkas") for p in j.get("plat", [])} or {"utama": j["ukuran"]["berkas"]}
    plat = {k: (v or j["ukuran"]["berkas"]) for k, v in plat.items()}
    gambar = {}
    hasil = {}
    for z in j["zona"]:
        if z.get("x") is None or z.get("y") is None:
            continue
        pid = z.get("plat") or next(iter(plat))
        if pid not in gambar:
            gambar[pid] = Image.open(FU / Path(jpg_terbesar(plat[pid])["src"]).name).convert("RGB")
        im = gambar[pid]
        W, H = im.size
        # potongan setara ±23% lebar plat, berapa pun resolusi berkasnya
        pw = round(W * POTONG_W / 4800); ph = round(pw * LUAR_H / LUAR_W)
        cx, cy = z["x"] / 100 * W, z["y"] / 100 * H
        x0 = min(max(cx - pw / 2, 0), W - pw)
        y0 = min(max(cy - ph / 2, 0), H - ph)
        kotak = im.crop((round(x0), round(y0), round(x0 + pw), round(y0 + ph))).resize((LUAR_W, LUAR_H), Image.LANCZOS)
        no = str(z["no"]).zfill(2)
        kotak.save(REPO / f"public/peta/lensa-udara-{no}.webp", quality=80, method=6)
        hasil[no] = {"x": round((cx - x0) / pw * 100, 2), "y": round((cy - y0) / ph * 100, 2)}
    data = REPO / "src/data/lensa-udara.json"
    teks = json.dumps(hasil, indent=1)
    if "--hanya-gambar" in sys.argv:
        # dipanggil sesudah plat di-grade ulang (tools/peta/plat_udara.py): letak titik tidak berubah,
        # jadi berkas data tidak ditulis; cukup lapor kalau ternyata berbeda.
        lama = data.read_text("utf-8") if data.exists() else ""
        print(len(hasil), "lensa (gambar saja);", "data sama" if lama == teks else "DATA BERBEDA, jalankan tanpa --hanya-gambar")
        return
    data.write_text(teks, "utf-8")
    print(len(hasil), "lensa")

if __name__ == "__main__":
    main()
