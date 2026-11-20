"""Gerbang teks terpotong.

Untuk tiap kata yang tampak: kotak tinta (ink) dihitung dari Range.getClientRects (posisi baris)
+ canvas measureText (actualBoundingBoxAscent/Descent/Left/Right dibanding fontBoundingBox untuk
garis dasar). Kotak tinta dibandingkan dengan semua kotak klip leluhur (overflow != visible,
contain: paint, clip-path inset) dengan memperhitungkan containing block elemen absolute/fixed.
Dihitung SETELAH halaman digulir habis dan semua animasi masuk selesai (gerak aktif, bukan
reduced motion), karena masker baris SplitText hanya ada saat gerak aktif.

Pakai: python3 pindai_teks.py <mesin> <keluaran.json> [lebar,lebar,...] [rute,rute,...] [--reduce]
"""
import asyncio, json, os, sys
from playwright.async_api import async_playwright

B = os.environ.get("KSA_BASE", "http://127.0.0.1:4330")
RUTE = ["/", "/accommodation/", "/meetings/", "/events/", "/gallery/", "/location/", "/about/", "/404.html", "/link/",
        "/en/", "/en/accommodation/", "/en/meetings/", "/en/events/", "/en/gallery/", "/en/location/", "/en/about/"]
UKURAN = {360: (360, 640), 390: (390, 844), 844: (844, 390), 1024: (1024, 768), 1440: (1440, 900), 1920: (1920, 1080)}

JS = r"""
() => {
  const cv = document.createElement('canvas').getContext('2d');
  const mc = new Map();
  const ukur = (font, w) => { const k = font + '|' + w; let m = mc.get(k); if (!m) { cv.font = font; const t = cv.measureText(w);
    m = { a: t.actualBoundingBoxAscent, d: t.actualBoundingBoxDescent, l: t.actualBoundingBoxLeft, r: t.actualBoundingBoxRight, fa: t.fontBoundingBoxAscent, fd: t.fontBoundingBoxDescent }; mc.set(k, m); } return m; };
  const nama = (e) => e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + (typeof e.className === 'string' && e.className.trim() ? '.' + e.className.trim().split(/\s+/).slice(0, 3).join('.') : '');
  const jadiCB = (cs) => cs.position !== 'static' || cs.transform !== 'none' || cs.filter !== 'none' || cs.perspective !== 'none' || /paint|layout|strict|content/.test(cs.contain) || (cs.willChange || '').includes('transform');
  const kc = new Map();
  function klip(el) {
    if (kc.has(el)) return kc.get(el);
    const out = [];
    let lewati = false; // sedang mencari containing block elemen absolute
    for (let e = el; e && e !== document.documentElement; e = e.parentElement) {
      const cs = getComputedStyle(e);
      const b = e.getBoundingClientRect();
      const bolehKlipOverflow = e === el ? true : !lewati || jadiCB(cs);
      if (e !== el && lewati && jadiCB(cs)) lewati = false;
      const ox = cs.overflowX, oy = cs.overflowY, paint = /paint|strict|content/.test(cs.contain);
      if (e !== el || true) {
        if (bolehKlipOverflow && (ox !== 'visible' || oy !== 'visible' || paint)) {
          const L = b.left + e.clientLeft, T = b.top + e.clientTop;
          const r = { l: L, t: T, r: L + e.clientWidth, b: T + e.clientHeight };
          if (ox === 'visible' && !paint) { r.l = -1e9; r.r = 1e9; }
          if (oy === 'visible' && !paint) { r.t = -1e9; r.b = 1e9; }
          out.push({ r, n: nama(e) + ' overflow:' + (ox === oy ? ox : ox + '/' + oy) + (paint ? ' contain' : ''), gulir: /auto|scroll/.test(ox + oy) });
        }
      }
      const cp = cs.clipPath;
      if (cp && cp !== 'none') {
        const m = cp.match(/inset\(([^)]*)\)/);
        let r = { l: b.left, t: b.top, r: b.right, b: b.bottom };
        if (m) {
          const fs = parseFloat(cs.fontSize);
          const v = m[1].split(/\bround\b/)[0].trim().split(/\s+/);
          const px = (s, ref) => s.endsWith('%') ? parseFloat(s) / 100 * ref : s.endsWith('em') ? parseFloat(s) * fs : parseFloat(s);
          const [t0, r0 = t0, b0 = t0, l0 = r0] = v;
          r = { t: b.top + px(t0, b.height), r: b.right - px(r0, b.width), b: b.bottom - px(b0, b.height), l: b.left + px(l0, b.width) };
        }
        out.push({ r, n: nama(e) + ' clip-path:' + cp.slice(0, 70), gulir: false });
      }
      if (cs.position === 'fixed') break;
      if (cs.position === 'absolute') lewati = true;
    }
    kc.set(el, out);
    return out;
  }
  const vc = new Map();
  function tampak(el) {
    if (vc.has(el)) return vc.get(el);
    const cs = getComputedStyle(el);
    let v;
    if (cs.display === 'none' || cs.visibility !== 'visible' || (el.tagName === 'DIALOG' && !el.open)) v = 0;
    else { v = parseFloat(cs.opacity); if (el.parentElement) v *= tampak(el.parentElement); }
    vc.set(el, v);
    return v;
  }
  const grup = new Map();
  let kata = 0;
  const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, { acceptNode: (n) => /\S/.test(n.textContent) ? 1 : 2 });
  let n;
  while ((n = tw.nextNode())) {
    const el = n.parentElement;
    if (!el || el.closest('script,style,noscript,template,svg')) continue;
    if (tampak(el) < 0.05) continue;
    const ks = klip(el);
    if (ks.some((k) => (k.r.r - k.r.l) < 3 || (k.r.b - k.r.t) < 3)) continue; // .sr / visually-hidden
    const cs = getComputedStyle(el);
    const font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    const t = n.textContent, re = /\S+/g;
    let m;
    while ((m = re.exec(t))) {
      const rg = document.createRange();
      rg.setStart(n, m.index); rg.setEnd(n, m.index + m[0].length);
      const rcs = [...rg.getClientRects()].filter((rc) => rc.width >= 0.5 && rc.height >= 0.5);
      for (const rc of rcs) {
        kata++;
        const mt = ukur(font, m[0]);
        const fh = mt.fa + mt.fd;
        const dasar = rc.top + (fh ? rc.height * mt.fa / fh : rc.height * 0.8);
        // kata yang patah ke baris berikutnya (tanda hubung, break-all) punya beberapa kotak:
        // lebar tinta tiap potongan = kotaknya sendiri, bukan lebar kata utuh
        const ink = rcs.length > 1 ? { t: dasar - mt.a, b: dasar + mt.d, l: rc.left, r: rc.right } : { t: dasar - mt.a, b: dasar + mt.d, l: rc.left - mt.l, r: rc.left + mt.r };
        for (const k of ks) {
          const c = k.r, tol = 0.75;
          if (!(ink.r > c.l && ink.l < c.r && ink.b > c.t && ink.t < c.b)) continue; // di luar penuh: tersembunyi, bukan terpotong
          const sisi = [];
          if (ink.t < c.t - tol) sisi.push(['atas', c.t - ink.t]);
          if (ink.b > c.b + tol) sisi.push(['bawah', ink.b - c.b]);
          if (!k.gulir) {
            // isi wadah gulir horizontal (galeri geser) yang sedang di luar layar = intip karosel, bukan potongan
            const gulirKiri = ks.some((g) => g.gulir && ink.l < g.r.l - tol), gulirKanan = ks.some((g) => g.gulir && ink.r > g.r.r + tol);
            if (ink.l < c.l - tol && !gulirKiri) sisi.push(['kiri', c.l - ink.l]);
            if (ink.r > c.r + tol && !gulirKanan) sisi.push(['kanan', ink.r - c.r]);
          }
          if (!sisi.length) continue;
          const kunci = nama(el) + ' | ' + k.n;
          let g = grup.get(kunci);
          if (!g) { g = { el: nama(el), klip: k.n, gulir: k.gulir, teks: (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 70), kata: [], sisi: {}, y: Math.round(rc.top + scrollY) }; grup.set(kunci, g); }
          if (g.kata.length < 6 && !g.kata.includes(m[0])) g.kata.push(m[0]);
          for (const [s, v] of sisi) g.sisi[s] = Math.max(g.sisi[s] || 0, +v.toFixed(1));
        }
      }
    }
  }
  return { kata, potong: [...grup.values()] };
}
"""


async def gulir_habis(pg, vh):
    y, h = 0, await pg.evaluate("document.documentElement.scrollHeight")
    while y < h:
        y += int(vh * 0.6)
        await pg.evaluate(f"window.scrollTo(0,{y})")
        await pg.wait_for_timeout(110)
        h = await pg.evaluate("document.documentElement.scrollHeight")
    await pg.wait_for_timeout(2800)


async def main():
    mesin, keluar = sys.argv[1], sys.argv[2]
    lebar = [int(x) for x in sys.argv[3].split(",")] if len(sys.argv) > 3 and sys.argv[3] != "-" else list(UKURAN)
    rute = sys.argv[4].split(",") if len(sys.argv) > 4 and sys.argv[4] != "-" else RUTE
    kurangi = "--reduce" in sys.argv
    hasil = []
    async with async_playwright() as p:
        b = await getattr(p, mesin).launch()
        for w in lebar:
            vw, vh = UKURAN[w]
            mob = vw < 900
            ctx = await b.new_context(viewport={"width": vw, "height": vh}, has_touch=mob, is_mobile=mob, reduced_motion="reduce" if kurangi else "no-preference")
            for r in rute:
                pg = await ctx.new_page()
                log = []
                pg.on("pageerror", lambda e: log.append(str(e)[:120]))
                try:
                    await pg.goto(B + r, wait_until="networkidle", timeout=60000)
                    await pg.evaluate("document.fonts.ready.then(()=>1)")
                    await pg.wait_for_timeout(500)
                    await gulir_habis(pg, vh)
                    res = await pg.evaluate(JS)
                except Exception as e:  # noqa: BLE001
                    res = {"kata": 0, "potong": [], "galat": str(e)[:200]}
                res.update({"mesin": mesin, "lebar": w, "rute": r, "log": log})
                hasil.append(res)
                print(f"{mesin} {w} {r} kata={res['kata']} potong={len(res['potong'])}" + (f" GALAT {res.get('galat')}" if res.get("galat") else "") + (f" LOG {log}" if log else ""), flush=True)
                for g in res["potong"]:
                    print(f"    {g['el']} <- {g['klip']} {g['sisi']} {g['kata']} y={g['y']} | {g['teks']}", flush=True)
                await pg.close()
            await ctx.close()
        await b.close()
    json.dump(hasil, open(keluar, "w"), ensure_ascii=False, indent=1)


asyncio.run(main())
