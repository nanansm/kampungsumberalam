"""Gerbang butir 3 (halimun pindah henti).

Tiga perpindahan: 1->2 (pendek), 3->4 (sedang), 5->6 (ganti plat), di 1440x900 dan 390x844 (HP:
throttle CPU 4x lewat CDP). Untuk tiap perpindahan:
- laju gambar (rAF) selama terbang, DENGAN halimun dan TANPA halimun (lapis disembunyikan) di
  lingkungan yang sama, supaya biaya halimun sendiri terbaca. Catatan: Chromium headless menggambar
  komposit tanpa GPU, jadi angka mutlaknya lebih rendah daripada peramban sungguhan.
- tangkapan layar saat halimun mencapai puncak (opacity dipantau per frame, tanpa membekukan
  timeline) + potongan 300% untuk cek garis kontur dan sambungan ubin.

Pakai: KSA_BASE=... python3 cek_halimun.py <folder-keluaran>
"""
import asyncio, os, sys
from PIL import Image
from playwright.async_api import async_playwright

B = os.environ.get("KSA_BASE", "http://127.0.0.1:4330")
OUT = sys.argv[1] if len(sys.argv) > 1 else "."
FPS = r"""() => new Promise((selesai) => {
  const a = document.querySelector('.halimun-a'), kb = document.querySelector('.peta-kabut');
  let n = 0, t0 = 0; const mulai = performance.now();
  const f = (t) => {
    const o = Math.max(parseFloat(getComputedStyle(a).opacity), kb ? parseFloat(getComputedStyle(kb).opacity) : 0);
    if (o > 0.02 && !t0) t0 = t;
    if (t0) n++;
    if (t0 && t - t0 > 1300) return selesai(n * 1000 / (t - t0));
    if (t - mulai > 7000) return selesai(t0 ? n * 1000 / (t - t0) : -1);
    requestAnimationFrame(f);
  };
  requestAnimationFrame(f);
})"""
PUNCAK = r"""() => new Promise((selesai) => {
  const a = document.querySelector('.halimun-a'), kb = document.querySelector('.peta-kabut');
  let maks = 0, mulai = performance.now();
  const f = (t) => {
    const o = Math.max(parseFloat(getComputedStyle(a).opacity), kb ? parseFloat(getComputedStyle(kb).opacity) * 0.99 : 0);
    if (o > maks) maks = o;
    else if (maks > 0.1 && o < maks - 0.005) return selesai(maks); // baru lewat puncak
    if (t - mulai > 7000) return selesai(maks);
    requestAnimationFrame(f);
  };
  requestAnimationFrame(f);
})"""


async def ke_henti(pg, i, tunggu=4200):
    await pg.evaluate(f"document.querySelector('[data-ke=\"{i}\"]').click()")
    await pg.wait_for_timeout(tunggu)


async def main():
    async with async_playwright() as p:
        # KSA_GPU=1: komposit lewat GPU (ANGLE Metal di Mac), mendekati peramban sungguhan
        gpu = ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist", "--enable-gpu-rasterization"] if os.environ.get("KSA_GPU") else []
        b = await p.chromium.launch(args=gpu)
        for nama, vw, vh, mob in (("dk", 1440, 900, False), ("hp", 390, 844, True)):
            ctx = await b.new_context(viewport={"width": vw, "height": vh}, has_touch=mob, is_mobile=mob, device_scale_factor=2 if mob else 1)
            pg = await ctx.new_page()
            await pg.goto(B + "/", wait_until="networkidle")
            await pg.wait_for_timeout(800)
            if mob:
                cdp = await ctx.new_cdp_session(pg)
                await cdp.send("Emulation.setCPUThrottlingRate", {"rate": 4})
            for dari, ke, ket in ((0, 1, "pendek"), (2, 3, "sedang"), (4, 5, "ganti-plat")):
                hasil = {}
                for mode in ("dengan", "tanpa"):
                    await pg.evaluate(f"document.querySelector('.peta-halimun').style.visibility = '{'hidden' if mode == 'tanpa' else ''}'")
                    await ke_henti(pg, dari)
                    tugas = asyncio.ensure_future(pg.evaluate(FPS))
                    await pg.evaluate(f"document.querySelector('[data-ke=\"{ke}\"]').click()")
                    hasil[mode] = await tugas
                    await pg.wait_for_timeout(3000)
                await pg.evaluate("document.querySelector('.peta-halimun').style.visibility = ''")
                await ke_henti(pg, dari)
                tugas = asyncio.ensure_future(pg.evaluate(PUNCAK))
                await pg.evaluate(f"document.querySelector('[data-ke=\"{ke}\"]').click()")
                maks = await tugas
                jalur = f"{OUT}/halimun-{nama}-{ket}.png"
                await pg.screenshot(path=jalur)
                im = Image.open(jalur)
                w, h = im.size
                im.crop((w // 2 - w // 8, h // 3, w // 2 + w // 8, h // 3 + w // 4 * 3 // 4)).resize((w // 4 * 3, w // 4 * 3 * 3 // 4), Image.NEAREST).save(f"{OUT}/halimun-{nama}-{ket}-300.png")
                print(f"{nama} {dari + 1}->{ke + 1} ({ket}): fps dengan halimun {hasil['dengan']:.1f}, tanpa {hasil['tanpa']:.1f}; puncak opacity {maks:.2f}", flush=True)
                await pg.wait_for_timeout(2500)
            await ctx.close()
        await b.close()


asyncio.run(main())
