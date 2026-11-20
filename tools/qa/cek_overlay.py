"""Gerbang overlay: menu layar penuh dan panel zona peta tidak boleh terpotong tanpa bisa digulir.

Di tiap ukuran (Chromium + WebKit): buka overlay, lalu untuk tiap sasaran (item menu terakhir, blok
kontak + goresan, tautan bahasa; untuk panel zona: elemen terakhir isinya) periksa apakah terlihat
penuh. Kalau belum, gulir dengan roda tetikus (page.mouse.wheel) di atas overlay sampai terlihat.
Gagal bila sasaran tidak pernah terlihat penuh. Tangkapan layar disimpan.

Pakai: KSA_BASE=... python3 cek_overlay.py <folder>
"""
import asyncio, os, sys
from playwright.async_api import async_playwright

B = os.environ.get("KSA_BASE", "http://127.0.0.1:4330")
OUT = sys.argv[1] if len(sys.argv) > 1 else "."
UKURAN = [(1190, 680), (1512, 830), (1280, 720), (1440, 800), (1024, 600), (844, 390), (390, 664)]
TAMPAK = r"""(sel) => { const el = document.querySelector(sel); if (!el) return 'tidak ada';
  const cs = getComputedStyle(el); if (cs.display === 'none' || !el.getClientRects().length) return 'tersembunyi';
  const r = el.getBoundingClientRect(); return (r.top >= -0.5 && r.bottom <= innerHeight + 0.5 && r.left >= -0.5 && r.right <= innerWidth + 0.5) ? 'penuh' : `sebagian ${Math.round(r.top)}..${Math.round(r.bottom)} / ${innerHeight}`; }"""


async def capai(pg, sel, wadah, x, y):
    s = await pg.evaluate(TAMPAK, sel)
    if s in ("penuh", "tidak ada", "tersembunyi"):
        return s, 0
    awal = await pg.evaluate(f"document.querySelector('{wadah}').scrollTop")
    await pg.mouse.move(x, y)
    for i in range(40):
        await pg.mouse.wheel(0, 240)
        await pg.wait_for_timeout(120)
        s = await pg.evaluate(TAMPAK, sel)
        if s == "penuh":
            geser = await pg.evaluate(f"document.querySelector('{wadah}').scrollTop") - awal
            return "penuh setelah gulir", geser
    geser = await pg.evaluate(f"document.querySelector('{wadah}').scrollTop") - awal
    return "TIDAK TERCAPAI " + s, geser


async def main():
    gagal = 0
    async with async_playwright() as p:
        for mesin in ("chromium", "webkit"):
            b = await getattr(p, mesin).launch()
            for vw, vh in UKURAN:
                mob = vw < 900 and vh > vw
                ctx = await b.new_context(viewport={"width": vw, "height": vh}, has_touch=mob, is_mobile=mob and mesin == "chromium")
                pg = await ctx.new_page()
                await pg.goto(B + "/", wait_until="networkidle")
                await pg.wait_for_timeout(500)
                # menu
                await pg.evaluate("document.getElementById('menu').showPopover()")
                await pg.wait_for_timeout(1400)
                hasil = []
                for nama, sel in (("item terakhir", "#menu nav a:last-of-type"), ("kontak", "#menu .menu-kontak"), ("goresan", "#menu .menu-kontak .goresan"), ("bahasa", "#menu .kecil")):
                    s, geser = await capai(pg, sel, "#menu", vw / 2, vh / 2)
                    hasil.append(f"{nama}: {s}" + (f" (gulir {geser:.0f}px)" if geser else ""))
                    gagal += s.startswith("TIDAK")
                await pg.screenshot(path=f"{OUT}/menu-{mesin}-{vw}x{vh}.jpg", type="jpeg", quality=60)
                print(f"{mesin} {vw}x{vh} MENU  " + " · ".join(hasil), flush=True)
                await pg.evaluate("document.getElementById('menu').hidePopover()")
                await pg.wait_for_timeout(600)
                # panel zona peta
                await pg.evaluate("document.querySelector('[data-buka=\"02\"]').click()")
                await pg.wait_for_timeout(1500)
                akhir = "dialog.zona-panel .panel-badan .zona-teks > *:last-child"
                s, geser = await capai(pg, akhir, "dialog.zona-panel .panel-isi", vw - 120 if vw >= 640 else vw / 2, vh * 0.7)
                gagal += s.startswith("TIDAK")
                await pg.screenshot(path=f"{OUT}/panel-{mesin}-{vw}x{vh}.jpg", type="jpeg", quality=60)
                print(f"{mesin} {vw}x{vh} PANEL akhir isi: {s}" + (f" (gulir {geser:.0f}px)" if geser else ""), flush=True)
                await ctx.close()
            await b.close()
    print(f"gagal: {gagal}")


asyncio.run(main())
