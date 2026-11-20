"""Pindai ilustrasi/goresan/pola yang terpotong tepi section.

Aturan (Ryan, 20 Nov 2026):
 (a) ilustrasi utuh dengan jarak aman dari tepi section, ATAU
 (b) sengaja keluar tepi (bleed) hanya bila potongannya jelas disengaja: >= 25% massa tinta
     terpotong di sisi itu, dan di balik tepi itu ada latar yang jelas beda warna dari latar
     section (bukan latar sama atau foto yang membuat potongan terlihat seperti bug).
 Potongan tipis (0 < massa terpotong < 25%) selalu gagal.

Cara ukur:
 - kotak tinta goresan = kotak elemen (gambar masker sudah rapat), massa tinta per baris/kolom
   dari profil alpha gambar masker (goresan-profil.json)
 - kotak klip = irisan semua leluhur overflow != visible / clip-path (aturan containing block
   untuk absolute/fixed)
 - warna di balik tepi potong: tangkapan layar (elemen fixed disembunyikan), 15 titik di sepanjang
   bagian tepi yang memotong tinta, 4 px dan 10 px di luar tepi; dibanding warna latar section
   (Delta E76 Lab > 15 = beda)

Pakai: python3 pindai_ilustrasi.py <mesin> <keluaran.json> [lebar,...] [rute,...]
"""
import asyncio, io, json, math, os, sys
from pathlib import Path
from PIL import Image
from playwright.async_api import async_playwright

B = os.environ.get("KSA_BASE", "http://127.0.0.1:4330")
RUTE = ["/", "/accommodation/", "/meetings/", "/events/", "/gallery/", "/location/", "/about/", "/404.html", "/link/",
        "/en/", "/en/accommodation/", "/en/meetings/", "/en/events/", "/en/gallery/", "/en/location/", "/en/about/"]
UKURAN = {360: (360, 640), 390: (390, 844), 844: (844, 390), 1024: (1024, 768), 1440: (1440, 900), 1920: (1920, 1080)}
PROFIL = json.load(open(Path(__file__).with_name("goresan-profil.json")))
AMAN = 16          # px: jarak aman ilustrasi utuh dari tepi klip
MIN_POTONG = 0.25  # massa tinta minimal yang terpotong agar bleed terbaca disengaja
BEDA_DE = 15       # Delta E76 minimal latar tetangga vs latar section
BEDA_MIN = 0.8     # bagian tepi potong yang harus beda; dikalibrasi ke contoh Ryan: BENAR (bunga di Petang
                   # di atas foto udara) = 87% beda, SALAH (rumah di Kertas, kanan bawahnya Kertas lagi) < 60%

JS = r"""
(profil) => {
  const nama = (e) => e.tagName.toLowerCase() + (typeof e.className === 'string' && e.className.trim() ? '.' + e.className.trim().split(/\s+/).slice(0, 4).join('.') : '');
  const jadiCB = (cs) => cs.position !== 'static' || cs.transform !== 'none' || cs.filter !== 'none' || /paint|layout|strict|content/.test(cs.contain);
  function klip(el) {
    const C = { l: -1e9, t: -1e9, r: 1e9, b: 1e9, nl: '', nt: '', nr: '', nb: '' };
    let lewati = getComputedStyle(el).position === 'absolute';
    if (getComputedStyle(el).position === 'fixed') return C;
    for (let e = el.parentElement; e && e !== document.documentElement; e = e.parentElement) {
      const cs = getComputedStyle(e);
      const boleh = !lewati || jadiCB(cs);
      if (lewati && jadiCB(cs)) lewati = false;
      const b = e.getBoundingClientRect();
      const ox = cs.overflowX, oy = cs.overflowY;
      const potong = (r, n) => {
        if (r.l > C.l) { C.l = r.l; C.nl = n; } if (r.t > C.t) { C.t = r.t; C.nt = n; }
        if (r.r < C.r) { C.r = r.r; C.nr = n; } if (r.b < C.b) { C.b = r.b; C.nb = n; }
      };
      if (boleh && (ox !== 'visible' || oy !== 'visible')) {
        const L = b.left + e.clientLeft, T = b.top + e.clientTop;
        potong({ l: ox !== 'visible' ? L : -1e9, r: ox !== 'visible' ? L + e.clientWidth : 1e9, t: oy !== 'visible' ? T : -1e9, b: oy !== 'visible' ? T + e.clientHeight : 1e9 }, nama(e));
      }
      if (cs.clipPath && cs.clipPath !== 'none') {
        const m = cs.clipPath.match(/inset\(([^)]*)\)/);
        if (m) {
          const v = m[1].split(/\bround\b/)[0].trim().split(/\s+/);
          const px = (s, ref) => s.endsWith('%') ? parseFloat(s) / 100 * ref : parseFloat(s);
          const [t0, r0 = t0, b0 = t0, l0 = r0] = v;
          potong({ t: b.top + px(t0, b.height), r: b.right - px(r0, b.width), b: b.bottom - px(b0, b.height), l: b.left + px(l0, b.width) }, nama(e) + ' clip-path');
        } else potong({ l: b.left, t: b.top, r: b.right, b: b.bottom }, nama(e) + ' clip-path');
      }
      if (cs.position === 'fixed') break;
      if (cs.position === 'absolute') lewati = true;
    }
    return C;
  }
  function latar(el) {
    for (let e = el; e; e = e.parentElement) {
      const c = getComputedStyle(e).backgroundColor;
      const m = c.match(/rgba?\(([^)]+)\)/);
      if (m) { const p = m[1].split(/[ ,\/]+/).filter(Boolean).map(Number); if (p.length < 4 || p[3] > 0.5) return [p[0], p[1], p[2], nama(e)]; }
    }
    return [255, 255, 255, 'default'];
  }
  function tampak(el) {
    for (let e = el; e; e = e.parentElement) {
      const cs = getComputedStyle(e);
      if (cs.display === 'none' || cs.visibility !== 'visible' || parseFloat(cs.opacity) < 0.05) return false;
      if (e.tagName === 'DIALOG' && !e.open) return false;
    }
    return true;
  }
  const interp = (arr, f) => { f = Math.min(1, Math.max(0, f)); const i = f * (arr.length - 1), a = Math.floor(i), b = Math.min(arr.length - 1, a + 1); return arr[a] + (arr[b] - arr[a]) * (i - a); };
  const out = [];
  const vw = document.documentElement.clientWidth;
  for (const el of document.querySelectorAll('.goresan, .bilik, img[src*="/pola/"]')) {
    if (!tampak(el)) continue;
    const b = el.getBoundingClientRect();
    if (b.width < 4 || b.height < 4) continue;
    const jenis = [...el.classList].find((c) => /^goresan--/.test(c))?.slice(9) || (el.classList.contains('bilik') ? 'bilik' : 'gambar');
    const C = klip(el);
    const p = profil[jenis];
    const pr = p ? p.baris : null, pc = p ? p.kolom : null;
    const fy = (y) => (y - b.top) / b.height, fx = (x) => (x - b.left) / b.width;
    const massa = {
      atas: pr ? interp(pr, fy(C.t)) : Math.max(0, Math.min(1, fy(C.t))),
      bawah: pr ? 1 - interp(pr, fy(C.b)) : Math.max(0, Math.min(1, 1 - fy(C.b))),
      kiri: pc ? interp(pc, fx(C.l)) : Math.max(0, Math.min(1, fx(C.l))),
      kanan: pc ? 1 - interp(pc, fx(C.r)) : Math.max(0, Math.min(1, 1 - fx(C.r))),
    };
    const px = { atas: Math.max(0, C.t - b.top), bawah: Math.max(0, b.bottom - C.b), kiri: Math.max(0, C.l - b.left), kanan: Math.max(0, b.right - C.r) };
    const jarak = { atas: b.top - C.t, bawah: C.b - b.bottom, kiri: b.left - C.l, kanan: C.r - b.right };
    const lt = latar(el.parentElement);
    let ubin = null;
    if (jenis === 'bilik') {
      const cs = getComputedStyle(el);
      const w = parseFloat(cs.backgroundSize) || 24;
      ubin = { lebar: w, ulang: cs.backgroundRepeat, sisa: cs.backgroundRepeat.startsWith('round') ? 0 : +(((b.width / w) % 1) * w / 2).toFixed(1) };
    }
    out.push({
      el: nama(el), jenis, x: Math.round(b.left), y: Math.round(b.top + scrollY), w: Math.round(b.width), h: Math.round(b.height),
      klip: { l: C.l, t: C.t + scrollY, r: C.r, b: C.b + scrollY, nl: C.nl, nt: C.nt, nr: C.nr, nb: C.nb },
      massa, px, jarak, latar: lt, vw, ubin,
      tersembunyi: b.right <= C.l || b.left >= C.r || b.bottom <= C.t || b.top >= C.b,
    });
  }
  return out;
}
"""

SEMBUNYI_FIXED = r"""(nyala) => { for (const e of document.querySelectorAll('body *')) { if (getComputedStyle(e).position === 'fixed' || e.dataset.qaSembunyi) { if (nyala) { e.dataset.qaSembunyi = '1'; e.style.visibility = 'hidden'; } else { e.style.visibility = ''; delete e.dataset.qaSembunyi; } } } }"""


def lab(rgb):
    def lin(c):
        c /= 255
        return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
    r, g, b = (lin(v) for v in rgb[:3])
    x, y, z = (r * .4124 + g * .3576 + b * .1805) / .95047, r * .2126 + g * .7152 + b * .0722, (r * .0193 + g * .1192 + b * .9505) / 1.08883
    f = lambda t: t ** (1 / 3) if t > 0.008856 else 7.787 * t + 16 / 116
    return 116 * f(y) - 16, 500 * (f(x) - f(y)), 200 * (f(y) - f(z))


def de(a, b):
    la, lb = lab(a), lab(b)
    return math.dist(la, lb)


async def gulir_habis(pg, vh):
    y, h = 0, await pg.evaluate("document.documentElement.scrollHeight")
    while y < h:
        y += int(vh * 0.6)
        await pg.evaluate(f"window.scrollTo(0,{y})")
        await pg.wait_for_timeout(110)
        h = await pg.evaluate("document.documentElement.scrollHeight")
    await pg.wait_for_timeout(2600)


async def sampel_tetangga(pg, vw, vh, it, sisi):
    """Warna di balik tepi potong, sepanjang bagian tepi yang memotong tinta."""
    k = it["klip"]
    if sisi in ("atas", "bawah"):
        ytepi = k["t"] if sisi == "atas" else k["b"]
        x0, x1 = max(it["x"], k["l"], 0), min(it["x"] + it["w"], k["r"], vw)
        await pg.evaluate(f"window.scrollTo(0,{max(0, ytepi - vh / 2)})")
        await pg.wait_for_timeout(500)
        sy = await pg.evaluate("scrollY")
        yv = ytepi - sy
        titik = [(x0 + (x1 - x0) * (i + .5) / 15, yv + (d if sisi == "bawah" else -d)) for i in range(15) for d in (4, 10)]
    else:
        if (sisi == "kiri" and k["l"] <= 0.5) or (sisi == "kanan" and k["r"] >= vw - 0.5):
            return None  # tepi layar: tidak ada tetangga
        xtepi = k["l"] if sisi == "kiri" else k["r"]
        await pg.evaluate(f"window.scrollTo(0,{max(0, it['y'] + it['h'] / 2 - vh / 2)})")
        await pg.wait_for_timeout(500)
        sy = await pg.evaluate("scrollY")
        y0, y1 = max(it["y"], k["t"]) - sy, min(it["y"] + it["h"], k["b"]) - sy
        titik = [(xtepi + (d if sisi == "kanan" else -d), y0 + (y1 - y0) * (i + .5) / 15) for i in range(15) for d in (4, 10)]
    await pg.evaluate(SEMBUNYI_FIXED, True)
    png = await pg.screenshot()
    await pg.evaluate(SEMBUNYI_FIXED, False)
    im = Image.open(io.BytesIO(png)).convert("RGB")
    W, H = im.size
    skala = W / vw
    warna = []
    for x, y in titik:
        X, Y = int(x * skala), int(y * skala)
        if 0 <= X < W and 0 <= Y < H:
            warna.append(im.getpixel((X, Y)))
    return warna


async def main():
    mesin, keluar = sys.argv[1], sys.argv[2]
    lebar = [int(x) for x in sys.argv[3].split(",")] if len(sys.argv) > 3 and sys.argv[3] != "-" else list(UKURAN)
    rute = sys.argv[4].split(",") if len(sys.argv) > 4 and sys.argv[4] != "-" else RUTE
    semua = []
    async with async_playwright() as p:
        br = await getattr(p, mesin).launch()
        for w in lebar:
            vw, vh = UKURAN[w]
            mob = vw < 900
            ctx = await br.new_context(viewport={"width": vw, "height": vh}, has_touch=mob, is_mobile=mob, device_scale_factor=1)
            for r in rute:
                pg = await ctx.new_page()
                await pg.goto(B + r, wait_until="networkidle", timeout=60000)
                await pg.wait_for_timeout(400)
                await gulir_habis(pg, vh)
                data = await pg.evaluate(JS, PROFIL)
                for it in data:
                    if it["tersembunyi"]:
                        continue
                    hasil = {"mesin": mesin, "lebar": w, "rute": r, **it, "sisi": {}}
                    vonis, alasan = "LULUS", []
                    if it["jenis"] == "bilik":
                        if it["ubin"]["sisa"] > 0.5:
                            vonis = "GAGAL"; alasan.append(f"ubin pola terpotong {it['ubin']['sisa']}px di tiap ujung")
                    else:
                        for s in ("atas", "bawah", "kiri", "kanan"):
                            m = it["massa"][s]
                            if it["px"][s] > 0.5:
                                warna = await sampel_tetangga(pg, vw, vh, it, s)
                                if warna is None:
                                    beda = 1.0; ket = "tepi layar"
                                else:
                                    beda = sum(de(c, it["latar"]) > BEDA_DE for c in warna) / max(1, len(warna)); ket = f"tetangga beda {beda:.0%}"
                                hasil["sisi"][s] = {"massa": round(m, 3), "px": round(it["px"][s], 1), "beda": round(beda, 2), "ket": ket}
                                if m < MIN_POTONG:
                                    vonis = "GAGAL"; alasan.append(f"{s}: potongan tipis {m:.0%} ({it['px'][s]:.0f}px), {ket}")
                                elif beda < BEDA_MIN:
                                    vonis = "GAGAL"; alasan.append(f"{s}: dipotong {m:.0%} tetapi {ket}")
                            else:
                                j = it["jarak"][s]
                                if abs(j) < 1e8 and j < AMAN:
                                    vonis = "GAGAL"; alasan.append(f"{s}: utuh tetapi mepet tepi ({j:.0f}px)")
                    hasil["vonis"], hasil["alasan"] = vonis, alasan
                    semua.append(hasil)
                    print(f"{mesin} {w} {r} {it['el']} [{it['jenis']}] {vonis} {'; '.join(alasan)} | latar {it['latar'][3]} klip b:{it['klip']['nb']} t:{it['klip']['nt']}", flush=True)
                await pg.close()
            await ctx.close()
        await br.close()
    json.dump(semua, open(keluar, "w"), ensure_ascii=False, indent=1)


asyncio.run(main())
