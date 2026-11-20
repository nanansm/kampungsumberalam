"""Gerbang butir 1 (rag judul beranda).

- #h-lokasi di 1512, 1440, 1280, 1024, 768, 390: 2 baris, baris terpanjang <= lebar kolom,
  baris terpendek >= 85% baris terpanjang
- semua h1-h3 beranda ID dan EN (360-1920): nol judul scrollWidth > clientWidth, nol baris
  terakhir berisi satu kata

Pakai: KSA_BASE=... python3 cek_judul.py [mesin]
"""
import asyncio, os, sys
from playwright.async_api import async_playwright

B = os.environ.get("KSA_BASE", "http://127.0.0.1:4330")
LEBAR = [(1920, 1080), (1512, 830), (1440, 900), (1280, 720), (1190, 680), (1024, 768), (768, 1024), (390, 844), (360, 640)]
RUTE = ["/", "/accommodation/", "/meetings/", "/events/", "/gallery/", "/location/", "/about/", "/404.html", "/link/",
        "/en/", "/en/accommodation/", "/en/meetings/", "/en/events/", "/en/gallery/", "/en/location/", "/en/about/"]
JS = r"""() => {
  const baris = (el) => {
    const tw = document.createTreeWalker(el, NodeFilter.SHOW_TEXT); const L = []; let n;
    while ((n = tw.nextNode())) { const re = /[^\s ]+/g; let m;
      while ((m = re.exec(n.textContent))) { const rg = document.createRange(); rg.setStart(n, m.index); rg.setEnd(n, m.index + m[0].length);
        for (const b of rg.getClientRects()) { if (!b.width) continue; let r = L.find((x) => Math.abs(x.y - b.top) < b.height * 0.5);
          if (!r) { r = { y: b.top, l: b.left, r: b.right, w: [] }; L.push(r); } r.l = Math.min(r.l, b.left); r.r = Math.max(r.r, b.right); r.w.push(m[0]); } } }
    return L.sort((a, b) => a.y - b.y);
  };
  return [...document.querySelectorAll('main h1, main h2, main h3')].filter((el) => {
    const cs = getComputedStyle(el); return el.offsetParent && cs.visibility === 'visible' && !el.closest('[inert],[aria-hidden="true"],.sr');
  }).map((el) => { const L = baris(el); const cs = getComputedStyle(el);
    const kolom = el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    // nama resort tidak boleh terbelah antarbaris (QA putaran 4: "Kampung Sumber / Alam")
    let namaPatah = false;
    const tw2 = document.createTreeWalker(el, NodeFilter.SHOW_TEXT); let t2;
    while ((t2 = tw2.nextNode())) { const re2 = /Kampung[\s\u00a0]+Sumber[\s\u00a0]+Alam/g; let m2;
      while ((m2 = re2.exec(t2.textContent))) { const rg = document.createRange(); rg.setStart(t2, m2.index); rg.setEnd(t2, m2.index + m2[0].length);
        const tops = new Set([...rg.getClientRects()].filter((b) => b.width > 1).map((b) => Math.round(b.top / 6))); if (tops.size > 1) namaPatah = true; } }
    return { id: el.id || el.className || el.tagName, teks: el.textContent.trim().slice(0, 60), kolom: Math.round(kolom), luber: el.scrollWidth > el.clientWidth + 1, namaPatah,
      lebar: L.map((x) => Math.round(x.r - x.l)), akhir: L.length > 1 ? L[L.length - 1].w.length : 9, baris: L.map((x) => x.w.join(' ')) }; });
}"""


async def main():
    mesin = sys.argv[1] if len(sys.argv) > 1 else "chromium"
    gagal = 0
    async with async_playwright() as p:
        b = await getattr(p, mesin).launch()
        for vw, vh in LEBAR:
            mob = vw < 900
            ctx = await b.new_context(viewport={"width": vw, "height": vh}, has_touch=mob, is_mobile=mob, reduced_motion="reduce")
            for r in RUTE:
                pg = await ctx.new_page()
                await pg.goto(B + r, wait_until="networkidle")
                await pg.evaluate("document.fonts.ready.then(()=>1)")
                for j in await pg.evaluate(JS):
                    masalah = []
                    if j["luber"]:
                        masalah.append("meluber")
                    if j["akhir"] == 1:
                        masalah.append("baris akhir satu kata")
                    if j.get("namaPatah"):
                        masalah.append("nama Kampung Sumber Alam terbelah")
                    if j["id"] == "h-lokasi" and vw in (1512, 1440, 1280, 1024, 768, 390):
                        L = j["lebar"]
                        if len(L) != 2:
                            masalah.append(f"lokasi {len(L)} baris")
                        elif max(L) > j["kolom"] + 0.5 or min(L) < 0.85 * max(L):
                            masalah.append(f"lokasi lebar {L} kolom {j['kolom']}")
                    if masalah or j["id"] == "h-lokasi":
                        print(f"{'GAGAL' if masalah else 'LULUS'} {mesin} {vw} {r} {j['id']} {j['lebar']}/{j['kolom']} {' / '.join(j['baris'])} {'; '.join(masalah)}", flush=True)
                    gagal += bool(masalah)
                await pg.close()
            await ctx.close()
        await b.close()
    print(f"gagal: {gagal}")


asyncio.run(main())
