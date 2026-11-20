"""Gerbang butir 2 (logo di foto udara lokasi).

- kotak pembatas logo tidak beririsan dengan poligon kawasan (koordinat layar dari getScreenCTM) dan
  dengan kotak krem, di 1440, 1280, 1024, 768, 390; dilaporkan juga jarak terdekat ke garis kawasan
  (ruang kosong minimal setinggi huruf S lockup)
- kontras lockup putih terhadap titik paling terang di bawahnya (tangkapan layar dengan logo
  disembunyikan) >= 4,5:1

Pakai: KSA_BASE=... python3 cek_lokasi.py <folder>
"""
import asyncio, io, math, os, sys
from PIL import Image
from playwright.async_api import async_playwright

B = os.environ.get("KSA_BASE", "http://127.0.0.1:4330")
OUT = sys.argv[1] if len(sys.argv) > 1 else "."
JS = r"""() => {
  const logo = document.querySelector('.lokasi-logo'); const l = logo.getBoundingClientRect();
  const kotak = document.querySelector('.guntur .kotak').getBoundingClientRect();
  const svg = [...document.querySelectorAll('.lokasi-batas')].find((s) => getComputedStyle(s).display !== 'none');
  const m = svg.getScreenCTM(); const poli = [...svg.querySelectorAll('.lokasi-garis')].map((pg) => [...pg.points].map((p) => { const q = new DOMPoint(p.x, p.y).matrixTransform(m); return [q.x, q.y]; }));
  return { logo: [l.left, l.top, l.right, l.bottom], kotak: [kotak.left, kotak.top, kotak.right, kotak.bottom], kotakAbs: getComputedStyle(document.querySelector('.guntur .kotak')).position === 'absolute', poli, dpr: devicePixelRatio, sY: scrollY };
}"""


def dalam(px, py, poly):
    c = False
    for i in range(len(poly)):
        x1, y1 = poly[i]; x2, y2 = poly[i - 1]
        if (y1 > py) != (y2 > py) and px < (x2 - x1) * (py - y1) / (y2 - y1 + 1e-12) + x1:
            c = not c
    return c


def jarak_segmen(px, py, a, b):
    ax, ay = a; bx, by = b
    dx, dy = bx - ax, by - ay
    t = max(0, min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy + 1e-12)))
    return math.hypot(px - (ax + t * dx), py - (ay + t * dy))


def lum(c):
    def f(v):
        v /= 255
        return v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4
    r, g, b = (f(x) for x in c[:3])
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


async def main():
    gagal = 0
    async with async_playwright() as p:
        br = await p.chromium.launch()
        for vw, vh in ((1512, 830), (1440, 900), (1280, 720), (1190, 680), (1024, 768), (768, 1024), (390, 844)):
            mob = vw < 900
            pg = await br.new_page(viewport={"width": vw, "height": vh}, is_mobile=mob, has_touch=mob, device_scale_factor=1)
            await pg.goto(B + "/", wait_until="networkidle")
            await pg.evaluate("document.querySelector('#lokasi').scrollIntoView({block:'center'})")
            await pg.wait_for_timeout(2600)
            d = await pg.evaluate(JS)
            L = d["logo"]
            sudut = [(L[0], L[1]), (L[2], L[1]), (L[0], L[3]), (L[2], L[3]), ((L[0] + L[2]) / 2, (L[1] + L[3]) / 2)]
            masalah = []
            for poly in d["poli"]:
                if any(dalam(x, y, poly) for x, y in sudut):
                    masalah.append("logo di dalam kawasan")
                # sisi poligon yang masuk kotak logo
                for i in range(len(poly)):
                    a, b = poly[i - 1], poly[i]
                    for k in range(21):
                        x = a[0] + (b[0] - a[0]) * k / 20; y = a[1] + (b[1] - a[1]) * k / 20
                        if L[0] <= x <= L[2] and L[1] <= y <= L[3]:
                            masalah.append("garis kawasan memotong logo"); break
            K = d["kotak"]
            if d["kotakAbs"] and not (L[2] <= K[0] or K[2] <= L[0] or L[3] <= K[1] or K[3] <= L[1]):
                masalah.append("logo menimpa kotak krem")
            # jarak terdekat garis kawasan ke kotak logo
            dmin = min(jarak_segmen(x, y, poly[i - 1], poly[i]) for poly in d["poli"] for i in range(len(poly)) for x, y in sudut[:4] + [((L[0] + L[2]) / 2, L[1]), ((L[0] + L[2]) / 2, L[3]), (L[0], (L[1] + L[3]) / 2), (L[2], (L[1] + L[3]) / 2)])
            s_tinggi = 0.131 * (L[3] - L[1])
            if dmin < s_tinggi:
                masalah.append(f"ruang kosong {dmin:.0f}px < tinggi S {s_tinggi:.0f}px")
            # kontras: sembunyikan logo, ambil titik paling terang di bawah kotak logo
            await pg.evaluate("document.querySelector('.lokasi-logo').style.visibility='hidden'")
            png = await pg.screenshot(clip={"x": L[0], "y": L[1], "width": L[2] - L[0], "height": L[3] - L[1]})
            await pg.evaluate("document.querySelector('.lokasi-logo').style.visibility=''")
            im = Image.open(io.BytesIO(png)).convert("RGB")
            terang = max(lum(c) for c in im.getdata())
            p99 = sorted(lum(c) for c in im.getdata())[int(len(im.getdata()) * 0.99)]
            kontras = 1.05 / (terang + 0.05)
            kontras99 = 1.05 / (p99 + 0.05)
            if kontras < 4.5:
                masalah.append(f"kontras {kontras:.2f}:1 (persentil 99: {kontras99:.2f}:1)")
            gagal += bool(masalah)
            print(f"{'GAGAL' if masalah else 'LULUS'} {vw} logo {[round(v) for v in L]} jarak-garis {dmin:.0f}px S {s_tinggi:.0f}px kontras {kontras:.2f} (p99 {kontras99:.2f}) {'; '.join(masalah)}", flush=True)
            await pg.locator("#lokasi").screenshot(path=f"{OUT}/lokasi-{vw}.jpg", type="jpeg", quality=70)
            await pg.close()
        await br.close()
    print(f"gagal: {gagal}")


asyncio.run(main())
