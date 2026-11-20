"""Gerbang butir 3 (foto pop-up peta).

Di tiap pemberhentian: kartu foto tampil (opacity ~1), menampilkan zona utama, tidak beririsan dengan
kotak keterangan, navigasi, tombol "Lewati peta", label titik aktif, dan tepi layar (jarak aman 16 px;
di HP kartu memang menjorok ke atas kotak, jadi irisan dengan kotaknya sendiri tidak dihitung).

Pakai: KSA_BASE=... python3 cek_popup.py [mesin] [lebar...]
"""
import asyncio, json, os, sys
from playwright.async_api import async_playwright

B = os.environ.get("KSA_BASE", "http://127.0.0.1:4330")
UKURAN = {"1512": (1512, 830), "1440": (1440, 900), "1280": (1280, 720), "390": (390, 844), "844": (844, 390), "1024": (1024, 768)}
JS = r"""(utama) => {
  const pg = document.querySelector('.peta-panggung').getBoundingClientRect();
  const r = (el) => { if (!el) return null; const b = el.getBoundingClientRect(); return b.width && b.height ? { l: b.left, t: b.top, r: b.right, b: b.bottom } : null; };
  const letak = [...document.querySelectorAll('.popup-letak:not([hidden])')];
  const kartu = letak.map((l) => l.querySelector('.popup-kartu')).filter((k) => parseFloat(getComputedStyle(k).opacity) > 0.9);
  if (!kartu.length) return { ada: false, jumlah: letak.length };
  const k = r(kartu[0]); const zona = kartu[0].closest('.popup-letak').dataset.popupZona;
  const aktif = document.querySelector('.peta-kotak.aktif');
  const kecil = innerWidth < 600;
  const rin = { kotak: kecil ? null : r(aktif), navDaftar: r(document.querySelector('.nav-daftar')), navRingkas: r(document.querySelector('.nav-ringkas')), lewati: r(document.querySelector('[data-lewati]')) };
  document.querySelectorAll('.pin.berlabel .pin-label').forEach((el, i) => rin['label' + i] = r(el));
  const timpa = (a, b) => b && a.l < b.r && b.l < a.r && a.t < b.b && b.t < a.b;
  if (kecil && aktif) {
    // teks kotak diukur per baris teks (Range), bukan kotak blok selebar kotak
    let i = 0;
    const tw = document.createTreeWalker(aktif, NodeFilter.SHOW_TEXT); let n;
    while ((n = tw.nextNode())) { if (!n.textContent.trim()) continue; const rg = document.createRange(); rg.selectNodeContents(n);
      for (const b of rg.getClientRects()) if (b.width) rin['teksKotak' + (i++)] = { l: b.left, t: b.top, r: b.right, b: b.bottom }; }
    aktif.querySelectorAll('.kotak-chip li').forEach((el) => rin['chip' + (i++)] = r(el));
  }
  const kena = Object.entries(rin).filter(([n, b]) => timpa(k, b)).map(([n]) => n);
  const tepi = k.l < pg.left + 16 - 0.5 || k.r > pg.right - 16 + 0.5 || k.b > pg.bottom - 16 + 0.5 || k.t < pg.top + 0;
  return { ada: true, zona, utama, benar: zona === utama, kena, tepi, k: [Math.round(k.l), Math.round(k.t), Math.round(k.r), Math.round(k.b)] };
}"""


async def main():
    mesin = sys.argv[1] if len(sys.argv) > 1 else "chromium"
    lebar = sys.argv[2:] or ["1512", "1440", "1280", "390"]
    gagal = 0
    async with async_playwright() as p:
        b = await getattr(p, mesin).launch()
        for kunci in lebar:
            vw, vh = UKURAN[kunci]
            mob = vw < 900
            ctx = await b.new_context(viewport={"width": vw, "height": vh}, has_touch=mob, is_mobile=mob)
            pg = await ctx.new_page()
            await pg.goto(B + "/", wait_until="networkidle")
            await pg.wait_for_timeout(600)
            data = json.loads(await pg.get_attribute("[data-peta]", "data-skrip"))
            n = len(data["henti"])
            for i in range(n):
                await pg.evaluate(f"document.querySelector('[data-ke=\"{i}\"]').click()")
                await pg.wait_for_timeout(3400)
                hasil = await pg.evaluate(JS, data["henti"][i]["utama"])
                ok = hasil.get("ada") and hasil.get("benar") and not hasil.get("kena") and not hasil.get("tepi")
                gagal += not ok
                print(f"{'LULUS' if ok else 'GAGAL'} {mesin} {kunci} henti {i + 1} {hasil}", flush=True)
                await pg.screenshot(path=f"/private/tmp/claude-501/-Users-aaaa/9f379481-ab96-422d-8dbd-53664679424d/scratchpad/ksaweb/qa/popup/{mesin}-{kunci}-henti{i + 1}.jpg", type="jpeg", quality=60)
            await ctx.close()
        await b.close()
    print(f"gagal: {gagal}")


asyncio.run(main())
