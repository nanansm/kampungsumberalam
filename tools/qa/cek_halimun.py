"""Gerbang butir 3 (halimun pindah henti).

Tiga perpindahan: 1->2 (pendek), 3->4 (sedang), 5->6 (ganti plat). Untuk tiap perpindahan:
- laju gambar selama terbang (rAF), desktop tanpa throttle, HP dengan throttle CPU 4x (CDP)
- tangkapan layar saat halimun di puncak (timeline GSAP dibekukan), potongan 300% untuk dicek
  garis kontur dan sambungan ubin

Pakai: KSA_BASE=... python3 cek_halimun.py <folder-keluaran>
"""
import asyncio, json, os, sys
from playwright.async_api import async_playwright

B = os.environ.get("KSA_BASE", "http://127.0.0.1:4330")
OUT = sys.argv[1] if len(sys.argv) > 1 else "."
PANTAU = r"""(ambang) => new Promise((selesai) => {
  const a = document.querySelector('.halimun-a'), kb = document.querySelector('.peta-kabut');
  let n = 0, t0 = 0, puncak = 0, beku = false;
  const mulai = performance.now();
  const f = (t) => {
    const oa = parseFloat(getComputedStyle(a).opacity), ok = kb ? parseFloat(getComputedStyle(kb).opacity) : 0;
    const o = Math.max(oa, ok);
    if (o > 0.02 && !t0) t0 = t;
    if (t0) n++;
    puncak = Math.max(puncak, oa);
    if (!beku && t0 && oa >= ambang) { beku = true; window.__peta.jeda(true); return selesai({ fps: t0 && t > t0 ? n * 1000 / (t - t0) : 0, puncak, beku: true }); }
    if (t - mulai > 6000) return selesai({ fps: t0 ? n * 1000 / (t - t0) : 0, puncak, beku: false });
    requestAnimationFrame(f);
  };
  requestAnimationFrame(f);
})"""
FPS = r"""() => new Promise((selesai) => {
  const a = document.querySelector('.halimun-a'); let n = 0, t0 = 0; const mulai = performance.now();
  const f = (t) => { const o = parseFloat(getComputedStyle(a).opacity); if (o > 0.02 && !t0) t0 = t; if (t0) n++;
    if (t0 && t - t0 > 1400) return selesai(n * 1000 / (t - t0)); if (t - mulai > 6000) return selesai(t0 ? n * 1000 / (t - t0) : -1); requestAnimationFrame(f); };
  requestAnimationFrame(f);
})"""


async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        for nama, vw, vh, mob in (("dk", 1440, 900, False), ("hp", 390, 844, True)):
            ctx = await b.new_context(viewport={"width": vw, "height": vh}, has_touch=mob, is_mobile=mob)
            pg = await ctx.new_page()
            await pg.goto(B + "/", wait_until="networkidle")
            await pg.wait_for_timeout(600)
            if mob:
                cdp = await ctx.new_cdp_session(pg)
                await cdp.send("Emulation.setCPUThrottlingRate", {"rate": 4})
            for dari, ke, ket in ((0, 1, "pendek"), (2, 3, "sedang"), (4, 5, "ganti-plat")):
                await pg.evaluate(f"document.querySelector('[data-ke=\"{dari}\"]').click()")
                await pg.wait_for_timeout(4000)
                fps_tugas = pg.evaluate(FPS)
                await pg.evaluate(f"document.querySelector('[data-ke=\"{ke}\"]').click()")
                fps = await fps_tugas
                print(f"{nama} {dari + 1}->{ke + 1} ({ket}) fps={fps:.1f}", flush=True)
                # ulangi untuk tangkapan puncak: kembali, lalu bekukan saat halimun di puncak
                await pg.evaluate(f"document.querySelector('[data-ke=\"{dari}\"]').click()")
                await pg.wait_for_timeout(4000)
                tugas = pg.evaluate(PANTAU, 0.2 if ket != "ganti-plat" else 0.0)
                await pg.evaluate(f"document.querySelector('[data-ke=\"{ke}\"]').click()")
                r = await tugas
                await pg.wait_for_timeout(120)
                await pg.screenshot(path=f"{OUT}/halimun-{nama}-{ket}.png")
                print(f"   puncak a={r['puncak']:.2f} beku={r['beku']}", flush=True)
                await pg.evaluate("window.__peta.jeda(false)")
                await pg.wait_for_timeout(2500)
            await ctx.close()
        await b.close()


asyncio.run(main())
