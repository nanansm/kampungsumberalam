"""Bangun aset peta kawasan untuk beranda dari Peta Ilustrasi KSA Opsi E (vektor).

1. Bersihkan SVG: buang bulatan zona (diganti titik HTML yang bisa diklik),
   kompas, dan label hotel tetangga.
2. Render lewat Chromium (Playwright): dasar 2560 px dan versi 2,5x untuk ubin.
3. Potong 25 ubin, lalu encode.mjs mengubahnya ke AVIF/WebP di public/peta/.
4. Tulis koordinat titik zona ke src/data/peta-titik.json (satuan = unit SVG,
   dihitung dari pojok potongan).

Pakai: python3 tools/peta/bangun.py && node tools/peta/encode.mjs
"""
import functools, http.server, json, re, threading, time
from pathlib import Path
import xml.etree.ElementTree as ET
from PIL import Image
from playwright.sync_api import sync_playwright

Image.MAX_IMAGE_PIXELS = None
REPO = Path(__file__).resolve().parents[2]
SUMBER = Path.home() / "Documents/MOTE/KAMPUNG SUMBER ALAM (KSA)/00-DATA MASTER/_sumber/peta-isometrik/peta-isometrik.svg"
PROJ = SUMBER.with_name("proj.json")
KERJA = Path(__file__).resolve().parent / "_kerja"
KERJA.mkdir(exist_ok=True)

# Potongan dunia peta (unit SVG): seluruh pelat kawasan + Gunung Guntur
POTONG = (980, 30, 2020, 1970)
KOLOM = BARIS = 5
# titik utama untuk zona yang punya beberapa titik (sama dengan src/data/peta.ts)
UTAMA = {"10": 1, "19": 4}
SKALA_BESAR = 2.5
LENSA = (360, 270)  # unit SVG di sekitar titik zona, untuk gambar 'letak di peta' di panel


def potong_grup(s, gid):
    i = s.find(f'<g id="{gid}"')
    assert i >= 0, gid
    depth, j = 0, i
    pola = re.compile(r"<g[\s>]|</g>")
    while True:
        m = pola.search(s, j)
        if m.group(0).startswith("</"):
            depth -= 1
            if depth == 0:
                return s[:i] + s[m.end():]
        else:
            depth += 1
        j = m.end()


def titik_zona(s):
    ns = "{http://www.w3.org/2000/svg}"
    akar = ET.fromstring(s)
    pin = [c for c in akar if c.attrib.get("id") == "pin"][0]
    el = list(pin)
    hasil = []
    for i in range(0, len(el), 4):
        p, kaki, kepala, teks = el[i:i + 4]
        assert p.tag == ns + "path" and teks.tag == ns + "text"
        hasil.append({
            "no": teks.text,
            "x": round(float(kaki.attrib["cx"]) - POTONG[0], 1),
            "y": round(float(kaki.attrib["cy"]) - POTONG[1], 1),
        })
    return hasil


def render(svg, x, y, w, h, skala, keluar):
    W, H = round(w * skala), round(h * skala)
    s = re.sub(r'viewBox="[^"]+"', f'viewBox="{x} {y} {w} {h}"', svg, count=1)
    s = re.sub(r'(<svg[^>]*?)\swidth="[^"]+"', rf'\1 width="{W}"', s, count=1)
    s = re.sub(r'(<svg[^>]*?)\sheight="[^"]+"', rf'\1 height="{H}"', s, count=1)
    (KERJA / "_r.svg").write_text(s, encoding="utf8")
    (KERJA / "AlbertSans.woff2").write_bytes((REPO / "public/fonts2/AlbertSans.woff2").read_bytes())
    (KERJA / "_r.html").write_text(
        '<!doctype html><meta charset="utf-8"><style>@font-face{font-family:"AS";src:url(AlbertSans.woff2) format("woff2");font-weight:400 700}'
        'html,body{margin:0;background:#FCFAE6}svg{display:block}</style><div id="w"></div>'
        "<script>fetch('_r.svg').then(r=>r.text()).then(t=>{w.innerHTML=t;document.fonts.load('600 20px AS').then(()=>document.fonts.ready).then(()=>{window.SIAP=true})})</script>",
        encoding="utf8")

    class Diam(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *a):
            pass

    srv = http.server.ThreadingHTTPServer(("127.0.0.1", 0), functools.partial(Diam, directory=str(KERJA)))
    port = srv.server_address[1]
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    try:
        with sync_playwright() as p:
            b = p.chromium.launch()
            pg = b.new_page(viewport={"width": W, "height": H}, device_scale_factor=1)
            pg.goto(f"http://127.0.0.1:{port}/_r.html")
            pg.wait_for_function("window.SIAP===true", timeout=120000)
            pg.wait_for_timeout(300)
            pg.screenshot(path=str(keluar), clip={"x": 0, "y": 0, "width": W, "height": H}, timeout=300000)
            b.close()
    finally:
        srv.shutdown()
    print("render", keluar.name, W, H)


def main():
    t = time.time()
    svg = SUMBER.read_text(encoding="utf8")
    titik = titik_zona(svg)
    bersih = potong_grup(potong_grup(svg, "pin"), "kompas")
    bersih = re.sub(r"<text[^>]*>Hotel Purbasari</text>", "", bersih)
    proj = json.loads(PROJ.read_text())
    pintu = proj["PINTU"]["tip"]
    x, y, w, h = POTONG
    render(bersih, x, y, w, h, 2560 / w, KERJA / "dasar.png")
    render(bersih, x, y, w, h, SKALA_BESAR, KERJA / "besar.png")
    im = Image.open(KERJA / "besar.png").convert("RGB")
    tw, th = im.width / KOLOM, im.height / BARIS
    for r in range(BARIS):
        for c in range(KOLOM):
            kotak = (round(c * tw), round(r * th), round((c + 1) * tw), round((r + 1) * th))
            im.crop(kotak).save(KERJA / f"ubin-{r}{c}.png")
    # lensa: potongan tajam di sekitar titik utama tiap zona
    sudah = set()
    hitung = {}
    for tk in titik:
        ke = hitung.get(tk["no"], 0)
        hitung[tk["no"]] = ke + 1
        if tk["no"] in sudah or ke != UTAMA.get(tk["no"], 0):
            continue
        sudah.add(tk["no"])
        lw, lh = LENSA
        x0 = (tk["x"] - lw / 2) * SKALA_BESAR
        y0 = (tk["y"] - lh / 2) * SKALA_BESAR
        im.crop((round(x0), round(y0), round(x0 + lw * SKALA_BESAR), round(y0 + lh * SKALA_BESAR))).save(KERJA / f"lensa-{tk['no']}.png")
    data = {
        "catatan": "Dibangun tools/peta/bangun.py dari Peta Ilustrasi KSA Opsi E. Satuan = unit SVG dari pojok kiri atas potongan.",
        "lebar": w, "tinggi": h, "kolom": KOLOM, "baris": BARIS,
        "pintuMasuk": {"x": round(pintu[0] - x, 1), "y": round(pintu[1] - y, 1)},
        "titik": titik,
    }
    (REPO / "src/data/peta-titik.json").write_text(json.dumps(data, ensure_ascii=False, indent=1), encoding="utf8")
    print("selesai", round(time.time() - t, 1), "dtk,", len(titik), "titik")


if __name__ == "__main__":
    main()
