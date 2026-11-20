"""Gerbang butir 4 (pola anyaman).

- semua elemen berpola bilik (.bilik dan ::after panel zona): background-size 24px 24px, repeat round
- tinggi pita hanya 24 atau 48 px (pita tegak panel: lebar 24 px)
- gulir per 100 px di 1440x900: pita yang terlihat di satu layar <= 1
- jarak antarpita (tepi ke tepi) >= satu tinggi layar; tidak ada pita yang menempel pita lain

Pakai: KSA_BASE=... python3 cek_pola.py [mesin]
"""
import asyncio, os, sys
from playwright.async_api import async_playwright

B = os.environ.get("KSA_BASE", "http://127.0.0.1:4330")
RUTE = ["/", "/accommodation/", "/meetings/", "/events/", "/gallery/", "/location/", "/about/", "/404.html", "/link/",
        "/en/", "/en/accommodation/", "/en/meetings/", "/en/events/", "/en/gallery/", "/en/location/", "/en/about/"]

JS_POLA = r"""() => {
  const out = [];
  for (const el of document.querySelectorAll('.bilik')) {
    const cs = getComputedStyle(el); const r = el.getBoundingClientRect();
    out.push({ el: el.className, size: cs.backgroundSize, ulang: cs.backgroundRepeat, w: Math.round(r.width), h: +r.height.toFixed(2), y: Math.round(r.top + scrollY), tampak: cs.display !== 'none' && cs.visibility === 'visible' && !el.closest('[popover]:not(:popover-open)') });
  }
  const kain = document.querySelector('.panel-kain');
  if (kain) { const a = getComputedStyle(kain, '::after'); out.push({ el: 'panel-kain::after', size: a.backgroundSize, ulang: a.backgroundRepeat, w: parseFloat(a.width), h: parseFloat(a.height), y: -1, tampak: false }); }
  return out;
}"""
JS_LAYAR = r"""() => [...document.querySelectorAll('main .bilik, .ftr .bilik')].filter(el => { const r = el.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight && r.height > 0; }).length"""


async def main():
    mesin = sys.argv[1] if len(sys.argv) > 1 else "chromium"
    gagal = 0
    async with async_playwright() as p:
        b = await getattr(p, mesin).launch()
        for vw, vh, mob in ((1440, 900, False), (1512, 830, False), (1190, 680, False), (390, 844, True)):
            ctx = await b.new_context(viewport={"width": vw, "height": vh}, has_touch=mob, is_mobile=mob, reduced_motion="reduce")
            for r in RUTE:
                pg = await ctx.new_page()
                await pg.goto(B + r, wait_until="networkidle")
                pola = await pg.evaluate(JS_POLA)
                masalah = []
                for x in pola:
                    if x["size"] != "24px 24px":
                        masalah.append(f"{x['el']} background-size {x['size']}")
                    if "round" not in x["ulang"]:
                        masalah.append(f"{x['el']} repeat {x['ulang']}")
                    if x["el"] == "panel-kain::after":
                        if abs(x["w"] - 24) > 0.5 and abs(x["h"] - 24) > 0.5:
                            masalah.append(f"tepi panel {x['w']}x{x['h']}")
                    elif x["tampak"] and x["h"] not in (24, 48):
                        masalah.append(f"{x['el']} tinggi {x['h']}")
                tampak = sorted([x for x in pola if x["tampak"] and x["el"] != "panel-kain::after"], key=lambda x: x["y"])
                for a, c in zip(tampak, tampak[1:]):
                    jarak = c["y"] - (a["y"] + a["h"])
                    if jarak < vh:
                        masalah.append(f"jarak pita {jarak}px < {vh} ({a['el']} y{a['y']} -> {c['el']} y{c['y']})")
                if vw == 1440:
                    tinggi = await pg.evaluate("document.documentElement.scrollHeight")
                    maks = 0
                    for y in range(0, tinggi, 100):
                        await pg.evaluate(f"window.scrollTo(0,{y})")
                        maks = max(maks, await pg.evaluate(JS_LAYAR))
                    if maks > 1:
                        masalah.append(f"{maks} pita dalam satu layar")
                gagal += bool(masalah)
                print(f"{'GAGAL' if masalah else 'LULUS'} {mesin} {vw} {r} pita={len(tampak)} " + "; ".join(masalah), flush=True)
                await pg.close()
            await ctx.close()
        await b.close()
    print(f"gagal: {gagal}")


asyncio.run(main())
