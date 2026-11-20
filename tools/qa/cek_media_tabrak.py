"""Gerbang media penuh lebar yang bertabrakan.

Aturan (Ryan, 20 Nov 2026): dua media bergerak/foto penuh lebar tidak boleh bersentuhan langsung.
Keduanya harus dipisah teks atau ruang Kertas yang cukup (paling sedikit +-12vh), atau digabung jadi
satu adegan dengan transisi yang disengaja.

Cara ukur (reduced motion, setelah halaman digulir habis supaya media malas sudah dimuat):
- media = img/video yang tampak, lebar >= 85% layar, tinggi >= 120 px; kotaknya dipotong leluhur yang
  overflow-nya bukan visible (figure, bingkai); poster + video di tempat yang sama dihitung satu
- panggung peta kawasan (.peta-panggung) dihitung satu media (foto udara penuh layar)
- dua media berurutan: GAGAL bila jarak tegak <= 8 px (bersentuhan) atau < 12vh (terlalu dekat);
  di dalam kisi galeri (deret foto bergutter) hanya aturan bersentuhan yang berlaku

Pakai: KSA_BASE=... python3 cek_media_tabrak.py [mesin] [lebar,...] [rute,...]
"""
import asyncio, os, sys
from playwright.async_api import async_playwright

B = os.environ.get("KSA_BASE", "http://127.0.0.1:4330")
RUTE = ["/", "/accommodation/", "/meetings/", "/events/", "/gallery/", "/location/", "/about/", "/404.html", "/link/",
        "/en/", "/en/accommodation/", "/en/meetings/", "/en/events/", "/en/gallery/", "/en/location/", "/en/about/"]
UKURAN = {360: (360, 640), 390: (390, 844), 1190: (1190, 680), 1440: (1440, 900), 1512: (1512, 830)}
JARAK_MIN = 0.12  # x tinggi layar

JS = r"""() => {
  const W = innerWidth, sy = scrollY;
  const nama = (e) => e.tagName.toLowerCase() + (typeof e.className === 'string' && e.className.trim() ? '.' + e.className.trim().split(/\s+/).slice(0, 2).join('.') : '');
  const tampak = (e) => { for (let x = e; x && x !== document.body; x = x.parentElement) { const c = getComputedStyle(x);
    if (c.display === 'none' || c.visibility === 'hidden' || parseFloat(c.opacity) === 0) return false; } return true; };
  const blok = [];
  const panggung = document.querySelector('.peta-panggung');
  if (panggung && tampak(panggung)) { const r = panggung.getBoundingClientRect(); if (r.width >= W * 0.85) blok.push({ n: 'peta-panggung', t: r.top + sy, b: r.bottom + sy, l: r.left, r: r.right }); }
  for (const m of document.querySelectorAll('img, video')) {
    if (panggung && panggung.contains(m)) continue;
    if (!tampak(m)) continue;
    // isi <details> yang tertutup punya kotak tata letak (content-visibility: hidden) tetapi tidak tergambar
    if (m.closest('details:not([open])') && !m.closest('summary')) continue;
    let r = m.getBoundingClientRect(); let t = r.top, b = r.bottom, l = r.left, rr = r.right;
    for (let x = m.parentElement; x && x !== document.body; x = x.parentElement) {
      const c = getComputedStyle(x); if (c.overflow === 'visible' && c.overflowY === 'visible' && c.clipPath === 'none') continue;
      const q = x.getBoundingClientRect(); t = Math.max(t, q.top); b = Math.min(b, q.bottom); l = Math.max(l, q.left); rr = Math.min(rr, q.right);
    }
    if (rr - l < W * 0.85 || b - t < 120) continue;
    const fig = m.closest('figure, .hero-media, .hal-hero, .guntur-gbr, picture') || m;
    // kisi galeri (foto berurutan dengan gutter) memang deret foto: hanya aturan bersentuhan yang berlaku
    const galeri = !!m.closest('.galeri-dua, [class*="columns-"]');
    blok.push({ n: nama(fig), t: t + sy, b: b + sy, l, r: rr, galeri });
  }
  // gabung kotak yang hampir sama (poster + video)
  blok.sort((a, c) => a.t - c.t);
  const satu = [];
  for (const k of blok) { const s = satu.find((x) => Math.abs(x.t - k.t) < 4 && Math.abs(x.b - k.b) < 4); if (!s) satu.push(k); }
  return { H: innerHeight, blok: satu.map((k) => ({ ...k, t: Math.round(k.t), b: Math.round(k.b) })) };
}"""


async def gulir_habis(pg, vh):
    tinggi = await pg.evaluate("document.documentElement.scrollHeight")
    y = 0
    while y < tinggi:
        y += vh * 0.8
        await pg.evaluate(f"window.scrollTo(0,{y})")
        await pg.wait_for_timeout(90)
        tinggi = await pg.evaluate("document.documentElement.scrollHeight")
    await pg.wait_for_timeout(500)
    await pg.evaluate("window.scrollTo(0,0)")
    await pg.wait_for_timeout(300)


async def main():
    mesin = [sys.argv[1]] if len(sys.argv) > 1 and sys.argv[1] != "-" else ["chromium", "webkit"]
    lebar = [int(x) for x in sys.argv[2].split(",")] if len(sys.argv) > 2 and sys.argv[2] != "-" else list(UKURAN)
    rute = sys.argv[3].split(",") if len(sys.argv) > 3 and sys.argv[3] != "-" else RUTE
    gagal = 0
    async with async_playwright() as p:
        for m in mesin:
            b = await getattr(p, m).launch()
            for w in lebar:
                vw, vh = UKURAN[w]; mob = vw < 900
                ctx = await b.new_context(viewport={"width": vw, "height": vh}, has_touch=mob, is_mobile=mob, reduced_motion="reduce")
                for r in rute:
                    pg = await ctx.new_page()
                    await pg.goto(B + r, wait_until="networkidle", timeout=60000)
                    await gulir_habis(pg, vh)
                    res = await pg.evaluate(JS)
                    blok, H = res["blok"], res["H"]
                    masalah = []
                    for a, c in zip(blok, blok[1:]):
                        if c["t"] < a["b"] - 4:  # bertumpuk/bersarang: bukan pasangan berurutan
                            continue
                        jarak = c["t"] - a["b"]
                        if jarak <= 8:
                            masalah.append(f"BERSENTUHAN {a['n']} [{a['t']}-{a['b']}] -> {c['n']} [{c['t']}-{c['b']}] jarak {jarak}px")
                        elif jarak < JARAK_MIN * H and not (a.get("galeri") and c.get("galeri")):
                            masalah.append(f"TERLALU DEKAT {a['n']} [{a['t']}-{a['b']}] -> {c['n']} [{c['t']}-{c['b']}] jarak {jarak}px < {JARAK_MIN * H:.0f}px")
                    gagal += len(masalah)
                    print(f"{m} {w} {r} media={len(blok)} masalah={len(masalah)}", flush=True)
                    for x in masalah:
                        print("    " + x, flush=True)
                    await pg.close()
                await ctx.close()
            await b.close()
    print(f"gagal: {gagal}")
    sys.exit(1 if gagal else 0)


asyncio.run(main())
