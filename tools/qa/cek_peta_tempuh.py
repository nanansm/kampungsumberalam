"""Gerbang peta waktu tempuh (seksi [data-jalan], beranda ID & EN).

Untuk 12 tujuan x ukuran x mesin: klik tujuan, tunggu kamera + garis + label selesai, lalu ukur kotak
semua yang tampak di bingkai peta: nama tempat, pin, logo KSA, label tujuan, kompas, skala, atribusi.
Gagal bila:
- dua kotak bertumpuk (toleransi 1 px), atau ada yang keluar bingkai;
- garis rute terpilih (termasuk garis titik-titik sambungan) lewat di bawah nama tempat, label, pin lain,
  kompas, skala, atau atribusi (titik garis tiap 2 px, kotak diperlebar 1,5 px = setengah tebal garis);
- garis rute keluar bingkai;
- lebih dari 15% panjang garis (di layar) tertutup logo KSA;
- header menutupi peta (HP: peta lengket, header ditampilkan dengan gulir naik);
- ada galat konsol / pageerror.
Juga: cek reduced motion (statis, label & garis langsung lengkap, tanpa transisi) dan papan ketik
(Tab melewati 12 tombol berurutan, tiap fokus memilih tujuan, cincin fokus terlihat, tidak tertutup
peta lengket atau header, Tab berikutnya keluar dari daftar).

Pakai: KSA_BASE=http://127.0.0.1:4341 python3 cek_peta_tempuh.py <mesin> <folder-keluaran> [rute,rute] [--tanpa-ekstra]
(bawaan rute: /,/en/; --tanpa-ekstra melewati cek reduced motion & papan ketik, mis. untuk /location/)
"""
import asyncio, json, os, sys
from playwright.async_api import async_playwright

B = os.environ.get("KSA_BASE", "http://127.0.0.1:4330")
UKURAN = [(1440, 900), (1190, 680), (1512, 830), (390, 844), (360, 640)]  # 1512x830 & 360x640: aturan semua gerbang repo
CONTOH = {1: "pendek", 7: "sedang", 11: "panjang"}  # Tegal Malaka, Sukaregang, Papandayan

UKUR = r"""() => {
  const akar = document.querySelector('[data-jalan]');
  const bingkai = akar.querySelector('[data-bingkai]');
  const F = bingkai.getBoundingClientRect();
  const kotak = (el) => { const r = el.getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom }; };
  const tampak = (el) => { for (let e = el; e && e !== akar; e = e.parentElement) { const cs = getComputedStyle(e);
    if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) < 0.05) return false; } return true; };
  const isi = [];
  akar.querySelectorAll('.jalan-lapis .tempat').forEach((el) => tampak(el) && isi.push({ n: 'tempat:' + el.textContent, k: kotak(el), jenis: 'tempat' }));
  akar.querySelectorAll('.jalan-lapis .titik').forEach((el) => tampak(el) && isi.push({ n: (el.classList.contains('dipilih') ? 'pin*' : 'pin') + ':' + el.textContent, k: kotak(el), jenis: el.classList.contains('dipilih') ? 'pin-pilih' : 'pin' }));
  const ksa = akar.querySelector('.ksa-isi'); isi.push({ n: 'ksa', k: kotak(ksa), jenis: 'ksa' });
  const ket = akar.querySelector('.ket'); if (tampak(ket)) isi.push({ n: 'ket:' + ket.textContent, k: kotak(ket), jenis: 'ket' });
  isi.push({ n: 'kompas', k: kotak(akar.querySelector('.kompas')), jenis: 'ui' });
  isi.push({ n: 'skala', k: kotak(akar.querySelector('.skala')), jenis: 'ui' });
  isi.push({ n: 'atribusi', k: kotak(akar.querySelector('.atribusi')), jenis: 'ui' });
  const salah = [];
  const tabrak = (a, b, t = 1) => a.l < b.r - t && a.r > b.l + t && a.t < b.b - t && a.b > b.t + t;
  for (let a = 0; a < isi.length; a++) for (let b = a + 1; b < isi.length; b++) if (tabrak(isi[a].k, isi[b].k)) salah.push(isi[a].n + ' X ' + isi[b].n);
  for (const o of isi) if (o.k.l < F.left - 0.5 || o.k.t < F.top - 0.5 || o.k.r > F.right + 0.5 || o.k.b > F.bottom + 0.5) salah.push('KELUAR ' + o.n);
  // garis rute terpilih dalam koordinat layar
  const pts = [];
  for (const p of akar.querySelectorAll('.rute-isi.dipilih, .rute-sambung.dipilih')) {
    const L = p.getTotalLength(), m = p.getScreenCTM(), n = Math.max(2, Math.ceil(L * m.a / 2));
    for (let j = 0; j <= n; j++) { const q = p.getPointAtLength(L * j / n); const s = new DOMPoint(q.x, q.y).matrixTransform(m); pts.push([s.x, s.y]); }
  }
  const kena = (k, m) => pts.filter(([x, y]) => x > k.l - m && x < k.r + m && y > k.t - m && y < k.b + m).length;
  for (const o of isi) { if (o.jenis === 'ksa' || o.jenis === 'pin-pilih') continue; const h = kena(o.k, 1.5); if (h) salah.push('RUTE X ' + o.n + ' (' + h + ' titik)'); }
  const keluar = pts.filter(([x, y]) => x < F.left || x > F.right || y < F.top || y > F.bottom).length;
  if (keluar) salah.push('RUTE KELUAR ' + keluar);
  const kk = kotak(ksa), cx = (kk.l + kk.r) / 2, cy = (kk.t + kk.b) / 2, rr = (kk.r - kk.l) / 2;
  const tutup = pts.length ? pts.filter(([x, y]) => Math.hypot(x - cx, y - cy) < rr).length / pts.length : 0;
  if (tutup > 0.15) salah.push('LOGO MENUTUP RUTE ' + Math.round(tutup * 100) + '%');
  // header vs peta
  const hdr = document.querySelector('.hdr');
  if (hdr) { const h = hdr.getBoundingClientRect(); if (!hdr.classList.contains('sembunyi') && h.bottom > 0 && h.bottom > F.top + 0.5 && h.top < F.bottom) salah.push('HEADER X peta (' + Math.round(h.bottom - F.top) + ' px)'); }
  return { salah, tampak: isi.length, tutupKsa: +(tutup * 100).toFixed(1), logoKecil: akar.querySelector('.ksa').classList.contains('kecil'),
    skalaAtas: bingkai.classList.contains('skala-atas'), ket: ket.textContent, titikRute: pts.length };
}"""

KEYBOARD = r"""() => { const a = document.activeElement; const akar = document.querySelector('[data-jalan]');
  const ts = [...akar.querySelectorAll('.jalan-daftar button')]; const i = ts.indexOf(a);
  const cs = getComputedStyle(a); const b = a.getBoundingClientRect();
  // kotak cincin fokus = kotak tombol + outline-offset + outline-width: cincinnya juga harus terlihat utuh
  const o = cs.outlineStyle !== 'none' ? parseFloat(cs.outlineOffset) + parseFloat(cs.outlineWidth) : 0;
  const r = { top: b.top - o, bottom: b.bottom + o, left: b.left - o, right: b.right + o };
  const peta = akar.querySelector('.jalan-peta').getBoundingClientRect(); const hdr = document.querySelector('.hdr');
  const h = hdr ? hdr.getBoundingClientRect() : null; const hdrTampak = hdr && !hdr.classList.contains('sembunyi') && h.bottom > 0;
  const petaLengket = getComputedStyle(akar.querySelector('.jalan-peta')).position === 'sticky';
  const ditutupPeta = petaLengket && r.top < peta.bottom - 1 && r.bottom > peta.top + 1;
  return { i, tag: a.tagName, teks: (a.textContent || '').trim().slice(0, 40), ditekan: a.getAttribute('aria-pressed'),
    pilih: ts.findIndex((b) => b.getAttribute('aria-pressed') === 'true'),
    cincin: cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) >= 2, warna: cs.outlineColor,
    terlihat: r.top >= 0 && r.bottom <= innerHeight, ditutupPeta, ditutupHeader: !!(hdrTampak && r.top < h.bottom - 1),
    ket: akar.querySelector('.ket').textContent };
}"""


async def tunggu_siap(pg):
    await pg.wait_for_function("() => document.querySelector('[data-bingkai]')?.classList.contains('siap')", timeout=15000)


async def ke_seksi(pg, vh, mob):
    # desktop: peta utuh di layar; HP: gulir sampai peta lengket di atas daftar
    if mob:
        y = await pg.evaluate("() => { const r = document.querySelector('.jalan-daftar').getBoundingClientRect(); return r.top + scrollY - 200; }")
    else:
        y = await pg.evaluate("() => { const r = document.querySelector('.jalan-peta').getBoundingClientRect(); return r.top + scrollY - 90; }")
    await pg.evaluate(f"window.scrollTo(0, {y})")
    await pg.wait_for_timeout(600)
    if mob:  # gulir naik sedikit: header tampil, peta harus turun ke bawahnya
        await pg.evaluate("window.scrollBy(0, -40)")
        await pg.wait_for_timeout(1000)


async def main():
    mesin, out = sys.argv[1], sys.argv[2]
    rute = sys.argv[3].split(",") if len(sys.argv) > 3 and not sys.argv[3].startswith("--") else ["/", "/en/"]
    ekstra = "--tanpa-ekstra" not in sys.argv  # reduced motion & papan ketik (di beranda ID)
    os.makedirs(out, exist_ok=True)
    hasil, gagal = [], 0
    async with async_playwright() as p:
        br = await getattr(p, mesin).launch()
        for vw, vh in UKURAN:
            mob = vw < 900
            for r in rute:
                ctx = await br.new_context(viewport={"width": vw, "height": vh}, device_scale_factor=2, has_touch=mob, is_mobile=mob and mesin != "firefox")
                pg = await ctx.new_page()
                log = []
                pg.on("console", lambda m: m.type == "error" and log.append(m.text[:160]))
                pg.on("pageerror", lambda e: log.append("pageerror " + str(e)[:160]))
                await pg.goto(B + r, wait_until="networkidle")
                await tunggu_siap(pg)
                await ke_seksi(pg, vh, mob)
                await pg.wait_for_timeout(2200)  # garis awal tergambar saat peta masuk layar
                n = await pg.locator(".jalan-daftar button").count()
                for i in range(n):
                    await pg.evaluate("(i) => document.querySelectorAll('.jalan-daftar button')[i].click()", i)
                    await pg.wait_for_timeout(2300)
                    if mob:  # header tampil (gulir naik) tiap kali, peta tidak boleh tertutup
                        await pg.evaluate("window.scrollBy(0, 24)"); await pg.wait_for_timeout(150)
                        await pg.evaluate("window.scrollBy(0, -24)"); await pg.wait_for_timeout(900)
                    u = await pg.evaluate(UKUR)
                    u.update(mesin=mesin, lebar=vw, rute=r, no=i + 1)
                    hasil.append(u)
                    gagal += bool(u["salah"])
                    print(f"{mesin} {vw} {r} {i+1:2d} {u['ket']:34s} tampak={u['tampak']:2d} logo={'kecil' if u['logoKecil'] else 'penuh'} tutup={u['tutupKsa']}% skala={'atas' if u['skalaAtas'] else 'bawah'} {'GAGAL ' + '; '.join(u['salah']) if u['salah'] else 'lulus'}", flush=True)
                    if r == "/" and i in CONTOH:
                        await pg.locator("[data-bingkai]").screenshot(path=f"{out}/{mesin}-{vw}-{i+1:02d}-{CONTOH[i]}.png")
                if r == "/":  # tangkapan seksi utuh: sembunyikan elemen fixed yang ikut tergambar di tengah,
                    # peta lengket dilepas supaya tangkapan menunjukkan urutan halaman (bukan peta menempel di tengah daftar)
                    await pg.add_style_tag(content=".hdr, .garis-progres, .wa-float { visibility: hidden !important; } .jalan-peta { position: relative !important; top: auto !important; }")
                    await pg.locator("[data-jalan]").screenshot(path=f"{out}/{mesin}-{vw}-seksi.png")
                if log:
                    gagal += 1
                    print(f"{mesin} {vw} {r} KONSOL {log}", flush=True)
                hasil.append({"mesin": mesin, "lebar": vw, "rute": r, "konsol": log})
                await ctx.close()

        # ---------- reduced motion: statis, langsung lengkap ----------
        for vw, vh in ([(1440, 900), (390, 844)] if ekstra else []):
            mob = vw < 900
            ctx = await br.new_context(viewport={"width": vw, "height": vh}, has_touch=mob, is_mobile=mob and mesin != "firefox", reduced_motion="reduce")
            pg = await ctx.new_page()
            log = []
            pg.on("console", lambda m: m.type == "error" and log.append(m.text[:160]))
            pg.on("pageerror", lambda e: log.append("pageerror " + str(e)[:160]))
            await pg.goto(B + "/", wait_until="networkidle")
            await tunggu_siap(pg)
            await ke_seksi(pg, vh, mob)
            masalah = []
            for i in range(12):
                await pg.evaluate("(i) => document.querySelectorAll('.jalan-daftar button')[i].click()", i)
                await pg.wait_for_timeout(120)  # tanpa gerak: semuanya harus sudah di tempat
                s = await pg.evaluate("""(i) => { const a = document.querySelector('[data-jalan]');
                  const isi = a.querySelector('.rute-isi.dipilih'); const cs = getComputedStyle(isi);
                  const ket = a.querySelector('.ket'); const t = a.querySelector('.titik.dipilih');
                  return { dash: cs.strokeDasharray, ket: ket.classList.contains('tampak') && getComputedStyle(ket).opacity === '1',
                    transisi: getComputedStyle(t).transitionDuration, html: document.documentElement.className,
                    ditekan: a.querySelectorAll('.jalan-daftar button')[i].getAttribute('aria-pressed') }; }""", i)
                if s["dash"] not in ("none", "") or not s["ket"] or s["ditekan"] != "true" or any(float(x.strip()[:-1] or 0) > 0 for x in s["transisi"].split(",")):
                    masalah.append((i + 1, s))
                u = await pg.evaluate(UKUR)
                if u["salah"]:
                    masalah.append((i + 1, u["salah"]))
            await pg.add_style_tag(content=".hdr, .garis-progres, .wa-float { visibility: hidden !important; } .jalan-peta { position: relative !important; top: auto !important; }")
            await pg.locator("[data-jalan]").screenshot(path=f"{out}/{mesin}-{vw}-reduce.png")
            print(f"{mesin} REDUCE {vw}: {'lulus' if not masalah and not log else 'GAGAL ' + str(masalah) + ' ' + str(log)}", flush=True)
            gagal += bool(masalah or log)
            hasil.append({"mesin": mesin, "lebar": vw, "reduce": True, "masalah": [str(m) for m in masalah], "konsol": log})
            await ctx.close()

        # ---------- papan ketik ----------
        # Safari/WebKit: Tab bawaan hanya melompati isian; tombol & tautan lewat Option+Tab (atau setelan
        # "Press Tab to highlight each item"). Jadi di WebKit diuji dengan Alt+Tab.
        TAB = "Alt+Tab" if mesin == "webkit" else "Tab"
        for vw, vh in ([(1440, 900), (390, 844)] if ekstra else []):
            for red in (False, True):
                mob = vw < 900
                ctx = await br.new_context(viewport={"width": vw, "height": vh}, reduced_motion="reduce" if red else "no-preference")
                pg = await ctx.new_page()
                await pg.goto(B + "/", wait_until="networkidle")
                await tunggu_siap(pg)
                await ke_seksi(pg, vh, False)
                # mulai dari tautan atribusi di dalam peta, lalu Tab ke daftar
                await pg.focus(".jalan-bingkai .atribusi a")
                atr = await pg.evaluate("() => { const a = document.activeElement; const cs = getComputedStyle(a); return a.matches('.atribusi a') && cs.outlineStyle !== 'none'; }")
                urut, masalah = [], []
                if not atr:
                    masalah.append("atribusi tidak bisa difokus / tanpa cincin")
                for _ in range(13):
                    await pg.keyboard.press(TAB)
                    await pg.wait_for_timeout(1300 if not red else 200)
                    k = await pg.evaluate(KEYBOARD)
                    urut.append(k["i"])
                    if k["i"] >= 0:
                        if k["pilih"] != k["i"] or k["ditekan"] != "true":
                            masalah.append(f"fokus {k['i']+1} tidak memilih (pilih {k['pilih']+1})")
                        if not k["cincin"]:
                            masalah.append(f"fokus {k['i']+1} tanpa cincin")
                        if not k["terlihat"] or k["ditutupPeta"] or k["ditutupHeader"]:
                            masalah.append(f"fokus {k['i']+1} tertutup/tak terlihat {k}")
                if urut[:12] != list(range(12)):
                    masalah.append(f"urutan Tab {urut}")
                if urut[12] != -1:
                    masalah.append("Tab ke-13 masih di daftar (jebakan?)")
                # mundur: Shift+Tab kembali ke tombol 12
                await pg.keyboard.press("Shift+" + TAB)
                await pg.wait_for_timeout(300)
                k = await pg.evaluate(KEYBOARD)
                if k["i"] != 11:
                    masalah.append(f"Shift+Tab tidak kembali ke 12 ({k['i']+1})")
                await pg.screenshot(path=f"{out}/{mesin}-{vw}-papanketik{'-reduce' if red else ''}.png")
                print(f"{mesin} PAPAN KETIK {vw}{' reduce' if red else ''}: urutan {[u + 1 for u in urut]} {'lulus' if not masalah else 'GAGAL ' + '; '.join(masalah)}", flush=True)
                gagal += bool(masalah)
                hasil.append({"mesin": mesin, "lebar": vw, "papanketik": True, "reduce": red, "urut": urut, "masalah": masalah})
                await ctx.close()
        await br.close()
    json.dump(hasil, open(f"{out}/hasil-{mesin}.json", "w"), ensure_ascii=False, indent=1)
    print(f"{mesin}: gagal {gagal}", flush=True)


asyncio.run(main())
