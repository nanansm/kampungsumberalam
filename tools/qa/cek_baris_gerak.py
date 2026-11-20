"""Gerbang baris saat gerak aktif.

SplitText memecah judul (data-judul, .judul-seksi) per baris dan paragraf (data-nyala) per kata.
Pecahan itu harus mematahkan baris di tempat yang sama dengan halaman tanpa gerak, karena semua
gerbang rag lain (cek_judul, rag) diukur dalam reduced motion. Bawaan SplitText mengubah NBSP jadi
spasi biasa, sehingga kelompok makna hilang hanya saat gerak aktif. Gerbang ini membandingkan
susunan baris tiap elemen: reduced motion vs gerak aktif, rute x ukuran x mesin.

Pakai: KSA_BASE=... python3 cek_baris_gerak.py [mesin] [lebar,lebar,...] [rute,rute,...]
"""
import asyncio, os, sys
from playwright.async_api import async_playwright

B = os.environ.get("KSA_BASE", "http://127.0.0.1:4330")
RUTE = ["/", "/accommodation/", "/meetings/", "/events/", "/gallery/", "/location/", "/about/", "/404.html", "/link/",
        "/en/", "/en/accommodation/", "/en/meetings/", "/en/events/", "/en/gallery/", "/en/location/", "/en/about/"]
UKURAN = {360: (360, 640), 390: (390, 844), 844: (844, 390), 1024: (1024, 768), 1190: (1190, 680), 1440: (1440, 900), 1512: (1512, 830), 1920: (1920, 1080)}
SEL = "[data-judul], [data-nyala], .hal .judul-seksi"

JS = r"""(sel) => {
  const kata = (s) => s.replace(/[\s ]+/g, ' ').trim();
  const baris = (el) => {
    // pecahan SplitText per baris: baca langsung isi tiap .baris
    const bs = el.querySelectorAll(':scope .baris');
    if (bs.length) return [...bs].map((b) => kata(b.textContent)).filter(Boolean);
    // selain itu: kelompokkan kata menurut tumpang-tindih vertikal
    const tw = document.createTreeWalker(el, NodeFilter.SHOW_TEXT); const L = []; let n;
    while ((n = tw.nextNode())) { const re = /[^\s ]+/g; let m;
      while ((m = re.exec(n.textContent))) { const rg = document.createRange(); rg.setStart(n, m.index); rg.setEnd(n, m.index + m[0].length);
        const b = rg.getClientRects()[0]; if (!b || !b.width) continue; const c = b.top + b.height / 2;
        let ln = L.find((x) => Math.abs(x.c - c) < Math.min(x.h, b.height) * 0.5);
        if (!ln) { ln = { c, h: b.height, w: [] }; L.push(ln); } ln.w.push(m[0]); } }
    return L.sort((a, b) => a.c - b.c).map((x) => x.w.join(' '));
  };
  return [...document.querySelectorAll(sel)].filter((el) => {
    if (el.closest('[inert],[aria-hidden="true"],dialog:not([open]),details:not([open])')) return false;
    const cs = getComputedStyle(el); const r = el.getBoundingClientRect();
    return cs.display !== 'none' && cs.visibility !== 'hidden' && r.width > 0 && r.height > 0;
  }).map((el, i) => ({ k: el.tagName + ':' + kata(el.textContent).slice(0, 48), baris: baris(el) }));
}"""


async def muat(ctx, rute, gerak):
    pg = await ctx.new_page()
    await pg.goto(B + rute, wait_until="networkidle", timeout=60000)
    await pg.evaluate("document.fonts.ready.then(()=>1)")
    await pg.wait_for_timeout(1500 if gerak else 300)
    if gerak:  # tunggu pecahan stabil (autoSplit memecah ulang sesudah huruf termuat)
        prev = -1
        for _ in range(10):
            n = await pg.evaluate("document.querySelectorAll('.baris, .kata-nyala').length")
            if n == prev: break
            prev = n; await pg.wait_for_timeout(300)
    hasil = await pg.evaluate(JS, SEL)
    await pg.close()
    return hasil


async def main():
    mesin = [sys.argv[1]] if len(sys.argv) > 1 and sys.argv[1] != "-" else ["chromium", "webkit"]
    lebar = [int(x) for x in sys.argv[2].split(",")] if len(sys.argv) > 2 and sys.argv[2] != "-" else list(UKURAN)
    rute = sys.argv[3].split(",") if len(sys.argv) > 3 and sys.argv[3] != "-" else RUTE
    gagal = 0; diperiksa = 0
    async with async_playwright() as p:
        for m in mesin:
            b = await getattr(p, m).launch()
            for w in lebar:
                vw, vh = UKURAN[w]; mob = vw < 900
                kw = dict(viewport={"width": vw, "height": vh}, has_touch=mob, is_mobile=mob)
                diam = await b.new_context(**kw, reduced_motion="reduce")
                gerak = await b.new_context(**kw, reduced_motion="no-preference")
                for r in rute:
                    try:
                        a = await muat(diam, r, False); g = await muat(gerak, r, True)
                    except Exception as e:  # noqa: BLE001
                        print(f"GALAT {m} {w} {r} {str(e)[:160]}"); gagal += 1; continue
                    gk = {}
                    for x in g: gk.setdefault(x["k"], []).append(x["baris"])
                    beda = []
                    for x in a:
                        lst = gk.get(x["k"])
                        if not lst: continue  # elemen hanya ada di salah satu mode
                        y = lst.pop(0); diperiksa += 1
                        if y != x["baris"]: beda.append((x["k"], x["baris"], y))
                    gagal += len(beda)
                    print(f"{m} {w} {r} elemen={len(a)} beda={len(beda)}", flush=True)
                    for k, d, gg in beda:
                        print(f"    {k}\n      diam : {' / '.join(d)}\n      gerak: {' / '.join(gg)}", flush=True)
                await diam.close(); await gerak.close()
            await b.close()
    print(f"diperiksa={diperiksa} beda={gagal}")
    sys.exit(1 if gagal else 0)


asyncio.run(main())
