/**
 * Peta kawasan: kamera digerakkan gulir + panel zona.
 *
 * Alur: uap tersibak (scrub) → kamera turun ke pemberhentian 1 (scrub) →
 * pindah antar pemberhentian = terbang 1,4 dtk (bukan scrub, supaya terasa
 * berpindah tempat) → penutup: kamera mundur ke pandangan utuh.
 *
 * Plat = satu gambar dasar (foto udara utama, foto udara area belakang, atau ilustrasi
 * isometrik). Pemberhentian di plat lain dicapai lewat kabut uap: kabut menutup, plat
 * berganti, kabut tersibak sambil kamera turun pelan. Tidak ada potongan kasar.
 *
 * Kamera = { cx, cy } titik dunia plat aktif yang diletakkan di { ax, ay }
 * (piksel layar), dengan skala s (piksel per unit).
 */
import { gsap, ScrollTrigger, gerakBoleh, gulirKe, kunciGulir, lepasGulir, dapatLenis } from "./gerak";

type Kam = { cx: number; cy: number; s: number; ax: number; ay: number };
type PlatData = { lebar: number; tinggi: number; foto: boolean; ubin: boolean; kolom: number; baris: number; tajam?: { dk?: string; hp?: string } };
type Data = {
  babak: { buka: number; henti: number; tutup: number };
  plat: PlatData[];
  awal: { cx: number; cy: number; vw: number; vh: number };
  henti: { id: string; cx: number; cy: number; vw: number; vh: number; plat: number; sisi: "kiri" | "kanan"; hp?: { cx: number; cy: number; vw: number; vh: number } }[];
  teksTutup: string;
};
type Kotak = { l: number; t: number; r: number; b: number };
const luasTimpa = (a: Kotak, b: Kotak) =>
  Math.max(0, Math.min(a.r, b.r) - Math.max(a.l, b.l)) * Math.max(0, Math.min(a.b, b.b) - Math.max(a.t, b.t));

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const jepit = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const halus = (t: number) => t * t * (3 - 2 * t);
const campur = (a: Kam, b: Kam, t: number): Kam => ({
  cx: lerp(a.cx, b.cx, t),
  cy: lerp(a.cy, b.cy, t),
  ax: lerp(a.ax, b.ax, t),
  ay: lerp(a.ay, b.ay, t),
  s: Math.exp(lerp(Math.log(a.s), Math.log(b.s), t)),
});

export function mulaiPeta(akar: HTMLElement) {
  const D: Data = JSON.parse(akar.dataset.skrip || "{}");
  pasangPanel(akar);
  if (!gerakBoleh() || !document.documentElement.classList.contains("gerak")) return;
  (window as any).__petaSiap = true;

  const seksi = akar.querySelector<HTMLElement>(".peta")!;
  const panggung = akar.querySelector<HTMLElement>(".peta-panggung")!;
  const duniaEl = [...akar.querySelectorAll<HTMLElement>(".peta-dunia")];
  const lapisUbin = duniaEl.map((d) => d.querySelector<HTMLElement>(".peta-ubin")!);
  const dasarImg = duniaEl.map((d) => d.querySelector<HTMLImageElement>(".peta-dasar"));
  const kabut = akar.querySelector<HTMLElement>(".peta-kabut");
  const pins = [...akar.querySelectorAll<HTMLButtonElement>(".pin")].map((el) => ({
    el,
    x: +el.dataset.x!,
    y: +el.dataset.y!,
    henti: +el.dataset.henti!,
    plat: +(el.dataset.plat || 0),
    arahAsli: el.dataset.arah as string,
  }));
  const lain = [...akar.querySelectorAll<HTMLElement>(".titik-lain, .pintu, .tepi-arah")].map((el) => {
    const induk = el.dataset.induk ? pins.find((p) => p.el.dataset.zona === el.dataset.induk) : undefined;
    const tepi = el.classList.contains("tepi-arah");
    const arah = (el.className.match(/tepi-(atas|bawah|kiri|kanan)/) || [])[1] || "kanan";
    return { el, x: +el.dataset.x!, y: +el.dataset.y!, plat: +(el.dataset.plat || 0), henti: induk ? induk.henti : el.dataset.henti ? +el.dataset.henti : 0, tepi, arah, w: 0 };
  });
  const kotak = [...akar.querySelectorAll<HTMLElement>("[data-henti-kotak]")];
  const kotakLapis = akar.querySelector<HTMLElement>(".peta-kotak-lapis")!;
  // cadangan untuk peramban tanpa overflow: clip: wadah peta tidak boleh tergulir oleh focus()
  [panggung, akar.querySelector<HTMLElement>(".peta-bingkai")].forEach((el) =>
    el?.addEventListener("scroll", () => {
      if (el.scrollLeft || el.scrollTop) {
        el.scrollLeft = 0;
        el.scrollTop = 0;
      }
    }),
  );
  const progres = kotak.map((k) => k.querySelector<HTMLElement>(".kotak-progres span"));
  const navBtn = [...akar.querySelectorAll<HTMLButtonElement>(".nav-daftar [data-ke]")];
  const navPenanda = akar.querySelector<HTMLElement>(".nav-penanda");
  const navDaftar = akar.querySelector<HTMLElement>(".nav-daftar")!;
  const navRingkas = akar.querySelector<HTMLButtonElement>(".nav-ringkas")!;
  const navNo = akar.querySelector<HTMLElement>("[data-nav-no]")!;
  const navNama = akar.querySelector<HTMLElement>("[data-nav-nama]")!;
  const lewati = akar.querySelector<HTMLAnchorElement>("[data-lewati]")!;

  const B = D.babak;
  const N = D.henti.length;
  const TOTAL = B.buka + B.henti * N + B.tutup;

  /* ---------- ukuran layar & kamera tujuan ---------- */
  let W = 0, H = 0, hp = false, lanskap = false;
  let fokus = { x: 0, y: 0, w: 0, h: 0 };
  let aktif = -1;
  let platAktif = 0;
  function ukur() {
    W = panggung.clientWidth;
    H = Math.min(panggung.clientHeight, window.innerHeight);
    hp = W < 900;
    // HP miring (mis. 844x390): kotak keterangan pindah ke samping seperti desktop, peta di sisi lain
    lanskap = hp && W > H * 1.3 && H < 560;
    if (!hp || lanskap) {
      const kolom = lanskap ? Math.min(340, W * 0.42) + 16 : jepit(W * 0.3, 380, 470) + 24;
      const atas = lanskap ? 64 : 84, bawah = lanskap ? 14 : 52, sisiTepi = lanskap ? 16 : 40;
      const kanan = D.henti[Math.max(0, Math.min(N - 1, aktif))]?.sisi === "kanan" && aktif >= 0 && aktif < N;
      fokus = kanan ? { x: sisiTepi, y: atas, w: W - kolom - sisiTepi, h: H - atas - bawah } : { x: kolom, y: atas, w: W - kolom - sisiTepi, h: H - atas - bawah };
    } else {
      const k = kotak[Math.max(0, Math.min(N - 1, aktif))];
      const kh = k ? k.offsetHeight : 220;
      fokus = { x: 14, y: 64, w: W - 28, h: Math.max(160, H - 64 - kh - 30) };
    }
  }
  /* foto udara: SATU aturan untuk semua pemberhentian dan semua layar. Skala minimum =
     max(lebar layar / lebar foto, tinggi layar / tinggi foto), translasi dijepit, jadi tepi foto
     tidak pernah masuk layar. Titik yang tidak muat ditunjuk di tepi layar (lihat letakTitik). */
  const jepitKam = (k: Kam, pl: number): Kam => {
    const P = D.plat[pl];
    if (!P?.foto) return k;
    const s = Math.max(k.s, W / P.lebar, H / P.tinggi);
    let tx = k.ax - k.cx * s, ty = k.ay - k.cy * s;
    tx = Math.min(0, Math.max(W - P.lebar * s, tx));
    ty = Math.min(0, Math.max(H - P.tinggi * s, ty));
    return { ...k, s, cx: (k.ax - tx) / s, cy: (k.ay - ty) / s };
  };
  const kamHenti = (i: number): Kam => {
    const h0 = D.henti[i];
    const h = hp && h0.hp ? { ...h0, ...h0.hp } : h0;
    const foto = !!D.plat[h.plat]?.foto;
    // foto miring: di HP kotak pandang dipersempit supaya titik yang rapat tetap berjarak;
    // skala maksimum dijaga supaya foto tidak terlihat lunak di layar retina
    const rapat = foto && hp && !lanskap ? (H < 700 || W < 380 ? 0.5 : 0.62) : 1;
    const maks = foto ? (hp ? 1.25 : 1.35) : hp ? 1.05 : 1.5;
    let s = Math.min(fokus.w / (h.vw * rapat), fokus.h / (h.vh * rapat), maks);
    const ax = fokus.x + fokus.w / 2, ay = fokus.y + fokus.h / 2;
    if (foto) {
      // skala minimum supaya pusat pemberhentian BISA diletakkan di tengah area pandang tanpa
      // kamera mentok di tepi foto (di HP tegak, skala penutup layar mengunci posisi tegak foto
      // sehingga zona di bagian bawah foto jatuh di bawah kotak keterangan)
      const P = D.plat[h.plat];
      const sPusat = Math.max(ay / Math.max(1, h.cy), (H - ay) / Math.max(1, P.tinggi - h.cy), ax / Math.max(1, h.cx), (W - ax) / Math.max(1, P.lebar - h.cx));
      s = Math.min(Math.max(s, sPusat), maks);
    }
    return jepitKam({ cx: h.cx, cy: h.cy, s, ax, ay }, h.plat);
  };
  const kamAwal = (): Kam => {
    const a = D.awal;
    if (D.plat[0]?.foto) return jepitKam({ cx: a.cx, cy: a.cy, s: Math.max(W / a.vw, H / a.vh), ax: W / 2, ay: H / 2 }, 0);
    const s = Math.min((W * 0.94) / a.vw, (H * 0.9) / a.vh);
    return { cx: a.cx, cy: a.cy, s, ax: W / 2, ay: H / 2 + (hp ? 10 : 0) };
  };
  /* penutup: foto udara kembali ke tampak penuh yang menutup layar, sama dengan pembuka;
     ilustrasi isometrik tampil utuh di atas kartu penutup */
  const kartuTutup = akar.querySelector<HTMLElement>(".peta-penutup");
  const kamTutup = (): Kam => {
    if (D.plat[0]?.foto) return kamAwal();
    const a = D.awal;
    if (!hp) {
      const s = Math.min(fokus.w / a.vw, (H - 48) / a.vh);
      return { cx: a.cx, cy: a.cy, s, ax: fokus.x + fokus.w / 2, ay: H / 2 + 8 };
    }
    const kh = kartuTutup ? kartuTutup.offsetHeight : 240;
    const tinggi = Math.max(200, H - kh - 64 - 40);
    const s = Math.min((W * 0.96) / a.vw, tinggi / a.vh);
    return { cx: a.cx, cy: a.cy, s, ax: W / 2, ay: 64 + tinggi / 2 };
  };

  /* ---------- gambar ---------- */
  ukur();
  let cur: Kam = kamAwal();
  let sasaran: Kam = cur;
  let terbang: gsap.core.Animation | null = null;
  let jejak = "";
  function gantiPlat(pl: number) {
    if (pl === platAktif) return;
    platAktif = pl;
    duniaEl.forEach((d, i) => d.classList.toggle("plat-aktif", i === pl));
    pins.forEach((p) => p.el.classList.toggle("plat-lain", p.plat !== pl));
    lain.forEach((p) => p.el.classList.toggle("plat-lain", p.plat !== pl));
    jejak = "";
  }
  /* area layar yang benar-benar terlihat untuk titik: tanpa bilah atas HP dan tanpa kotak keterangan */
  let jepitAktif = false;
  let areaCache: (Kotak & { kotak?: Kotak }) | null = null;
  const areaLihat = () => (areaCache ??= ukurAreaLihat());
  function ukurAreaLihat(): Kotak & { kotak?: Kotak } {
    // HP: di bawah pil nomor pemberhentian dan "Lewati peta", juga saat header ikut turun
    const atas = hp && !lanskap ? 122 : lanskap ? 64 : 54;
    const bawahHp = H - (kotak[aktif]?.offsetHeight ?? 220) - 26;
    const area: Kotak & { kotak?: Kotak } = { l: 16, t: atas, r: W - 16, b: hp && !lanskap ? Math.max(atas + 48, bawahHp) : H - 14 };
    if ((!hp || lanskap) && aktif >= 0 && aktif < N) {
      const k = kotak[aktif];
      const lp = kotakLapis.getBoundingClientRect();
      const st = panggung.getBoundingClientRect();
      if (k) area.kotak = { l: lp.left - st.left + k.offsetLeft - 14, t: lp.bottom - st.top - k.offsetHeight - 14, r: lp.left - st.left + k.offsetLeft + k.offsetWidth + 14, b: H };
    }
    return area;
  }
  const dalamArea = (x: number, y: number, a: Kotak & { kotak?: Kotak }) =>
    x >= a.l && x <= a.r && y >= a.t && y <= a.b && !(a.kotak && x > a.kotak.l && x < a.kotak.r && y > a.kotak.t);
  /* chip (titik di luar bingkai / penanda tepi) diletakkan utuh di dalam area terlihat */
  function jepitChip(x: number, y: number, w: number, h: number, a: Kotak & { kotak?: Kotak }) {
    let nx = Math.min(a.r - w / 2, Math.max(a.l + w / 2, x));
    let ny = Math.min(a.b - h / 2, Math.max(a.t + h / 2, y));
    const k = a.kotak;
    if (k && nx + w / 2 > k.l && nx - w / 2 < k.r && ny + h / 2 > k.t) ny = Math.max(a.t + h / 2, k.t - h / 2 - 8);
    return { x: nx, y: ny };
  }
  const lebarChip = new WeakMap<HTMLElement, number>();
  function ukurChip(el: HTMLElement, sel: string, cadangan: number) {
    const c = el.querySelector<HTMLElement>(sel);
    const w = c?.offsetWidth || 0;
    if (w) lebarChip.set(el, w);
    return lebarChip.get(el) || cadangan;
  }
  function gambar() {
    const { cx, cy, s, ax, ay } = cur;
    const tx = ax - cx * s;
    const ty = ay - cy * s;
    const kunci = `${platAktif}|${tx.toFixed(2)}|${ty.toFixed(2)}|${s.toFixed(4)}`;
    if (kunci === jejak) return;
    jejak = kunci;
    const d = duniaEl[platAktif];
    if (d) d.style.transform = `translate3d(${tx}px,${ty}px,0) scale(${s})`;
    const batasLihat = jepitAktif ? areaLihat() : null;
    // kepala titik pemberhentian yang terlihat: chip titik luar bingkai tidak boleh menutupinya
    const kepalaTerlihat: { x: number; y: number }[] = [];
    if (batasLihat) for (const p of pins) {
      if (p.plat !== platAktif || p.henti !== aktif) continue;
      const x = p.x * s + tx, y = p.y * s + ty;
      if (dalamArea(x, y, batasLihat)) kepalaTerlihat.push({ x, y: y - 26 });
    }
    for (const p of pins) {
      if (p.plat !== platAktif) continue;
      let x = p.x * s + tx, y = p.y * s + ty, tepi = false;
      if (batasLihat && p.henti === aktif && !dalamArea(x, y, batasLihat)) {
        // titik di luar bingkai: bukan pin palsu di tempat salah, tetapi chip berpanah ke arah letaknya
        tepi = true;
        const w = ukurChip(p.el, ".pin-label", 150);
        let j = jepitChip(x, y, w, 32, batasLihat);
        for (const dy of [0, -40, 40, -80, 80]) {
          const c = jepitChip(x, y + dy, w, 32, batasLihat);
          const kena = kepalaTerlihat.some((k) => Math.abs(k.x - c.x) < w / 2 + 18 && Math.abs(k.y - c.y) < 34);
          if (!kena) { j = c; break; }
        }
        p.el.style.setProperty("--sudut", `${Math.atan2(y - j.y, x - j.x).toFixed(3)}rad`);
        x = j.x; y = j.y;
      }
      p.el.classList.toggle("di-tepi", tepi);
      if (tepi) p.el.classList.add("berlabel");
      p.el.style.transform = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0)`;
    }
    for (const p of lain) {
      if (p.plat !== platAktif) continue;
      let x = p.x * s + tx, y = p.y * s + ty;
      if (batasLihat && p.tepi && p.henti === aktif) {
        const w = ukurChip(p.el, ".tepi-isi", 280), h = 44;
        const cxC = p.arah === "kanan" ? x - w / 2 : p.arah === "kiri" ? x + w / 2 : x;
        const cyC = p.arah === "atas" ? y + h / 2 : p.arah === "bawah" ? y - h / 2 : y;
        const j = jepitChip(cxC, cyC, w, h, batasLihat);
        x = p.arah === "kanan" ? j.x + w / 2 : p.arah === "kiri" ? j.x - w / 2 : j.x;
        y = p.arah === "atas" ? j.y - h / 2 : p.arah === "bawah" ? j.y + h / 2 : j.y;
      }
      p.el.style.transform = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0)`;
    }
  }
  pins.forEach((p) => p.el.classList.toggle("plat-lain", p.plat !== 0));
  lain.forEach((p) => p.el.classList.toggle("plat-lain", p.plat !== 0));
  gambar();

  /* ---------- ketajaman: ubin (isometrik) atau satu foto tajam (foto udara), saat memperbesar ---------- */
  const dasar = (pl: number) => (dasarImg[pl]?.naturalWidth || (hp ? 1600 : 2560)) / D.plat[pl].lebar;
  const ubin = new Map<string, { img: HTMLImageElement; dipakai: number }>();
  const MAKS = hp ? 12 : 20;
  let detik = 0;
  const tajamDimuat = new Set<number>();
  function muatTajam(k: Kam, pl: number) {
    const src = hp ? D.plat[pl].tajam?.hp : D.plat[pl].tajam?.dk;
    if (tajamDimuat.has(pl) || !src || k.s * (window.devicePixelRatio || 1) < dasar(pl) * 1.12) return;
    tajamDimuat.add(pl);
    const img = new Image();
    img.className = "ubin";
    img.alt = "";
    img.decoding = "async";
    img.style.cssText = `left:0;top:0;width:${D.plat[pl].lebar}px;height:${D.plat[pl].tinggi}px`;
    img.onload = () => img.classList.add("siap");
    img.src = src;
    lapisUbin[pl].append(img);
  }
  function muatUbin(k: Kam, pl = platAktif) {
    const P = D.plat[pl];
    if (!P) return;
    if (!P.ubin) return muatTajam(k, pl);
    if (k.s * (window.devicePixelRatio || 1) < dasar(pl) * 1.12) return;
    const UBIN_W = P.lebar / P.kolom;
    const UBIN_H = P.tinggi / P.baris;
    const tx = k.ax - k.cx * k.s;
    const ty = k.ay - k.cy * k.s;
    const m = 0.12;
    const x0 = (-tx - W * m) / k.s, x1 = (W * (1 + m) - tx) / k.s;
    const y0 = (-ty - H * m) / k.s, y1 = (H * (1 + m) - ty) / k.s;
    detik++;
    for (let r = 0; r < P.baris; r++) {
      for (let c = 0; c < P.kolom; c++) {
        const ux = c * UBIN_W, uy = r * UBIN_H;
        if (ux > x1 || ux + UBIN_W < x0 || uy > y1 || uy + UBIN_H < y0) continue;
        const id = `${r}${c}`;
        const ada = ubin.get(id);
        if (ada) { ada.dipakai = detik; continue; }
        const img = new Image();
        img.className = "ubin";
        img.alt = "";
        img.decoding = "async";
        img.style.cssText = `left:${ux}px;top:${uy}px;width:${UBIN_W}px;height:${UBIN_H}px`;
        img.onload = () => img.classList.add("siap");
        img.src = `/peta/ubin-${id}.webp`;
        lapisUbin[pl].append(img);
        ubin.set(id, { img, dipakai: detik });
      }
    }
    if (ubin.size > MAKS) {
      [...ubin.entries()].sort((a, b) => a[1].dipakai - b[1].dipakai).slice(0, ubin.size - MAKS).forEach(([id, u]) => {
        if (u.dipakai === detik) return;
        u.img.remove();
        ubin.delete(id);
      });
    }
  }

  /* ---------- label nama: dipasang setelah kamera tiba, tanpa saling tabrak ----------
     Posisi dihitung dari kamera (bukan dari kotak DOM), jadi animasi muncul titik
     tidak mengacaukan ukuran. Kalau keempat arah bertabrakan, label tetap tampil:
     arah dengan tabrakan paling kecil dipilih lalu labelnya dijepit ke dalam layar. */
  const ARAH = ["kanan", "kiri", "atas", "bawah"];
  const diLayar = (px: number, py: number, _aktifkan = false) => {
    const tx = cur.ax - cur.cx * cur.s;
    const ty = cur.ay - cur.cy * cur.s;
    return { x: px * cur.s + tx, y: py * cur.s + ty };
  };
  // geometri sama dengan peta.css: kotak titik 30x41, kepala 30x30, label di kanan/kiri/atas/bawah kepala
  const kotakLabel = (arah: string, x: number, y: number, lw: number, lh: number): Kotak => {
    if (arah === "kanan") return { l: x + 21, t: y - 26 - lh / 2, r: x + 21 + lw, b: y - 26 + lh / 2 };
    if (arah === "kiri") return { l: x - 21 - lw, t: y - 26 - lh / 2, r: x - 21, b: y - 26 + lh / 2 };
    if (arah === "atas") return { l: x - lw / 2, t: y - 45 - lh, r: x + lw / 2, b: y - 45 };
    return { l: x - lw / 2, t: y + 8, r: x + lw / 2, b: y + 8 + lh };
  };
  function aturLabel() {
    pins.forEach((p) => {
      p.el.classList.remove("bergaris");
      if (!p.el.classList.contains("di-tepi")) p.el.classList.remove("berlabel");
      p.el.style.removeProperty("--lx");
      p.el.style.removeProperty("--ly");
    });
    if (aktif < 0 || aktif >= N) return;
    const stg = panggung.getBoundingClientRect();
    const rel = (r: DOMRect): Kotak => ({ l: r.left - stg.left, t: r.top - stg.top, r: r.right - stg.left, b: r.bottom - stg.top });
    const aman: Kotak = { l: 8, t: hp ? 58 : 14, r: W - 8, b: H - 8 };
    const halangan: Kotak[] = [];
    // kotak keterangan aktif, dihitung dari lapisnya supaya transisi masuk tidak ikut terukur
    const k = kotak[aktif];
    if (k) {
      const lp = kotakLapis.getBoundingClientRect();
      halangan.push({ l: lp.left - stg.left + k.offsetLeft, t: lp.bottom - stg.top - k.offsetHeight, r: lp.left - stg.left + k.offsetLeft + k.offsetWidth, b: lp.bottom - stg.top });
    }
    for (const el of [hp ? navRingkas : navDaftar, lewati]) {
      const r = el.getBoundingClientRect();
      if (r.width) halangan.push(rel(r));
    }
    // chip titik luar bingkai dan penanda tepi ikut jadi halangan label
    const chipRect: Kotak[] = [];
    for (const el of akar.querySelectorAll<HTMLElement>(".pin.di-tepi .pin-label, .tepi-arah.di-henti .tepi-isi")) {
      const r = el.getBoundingClientRect();
      if (r.width) chipRect.push(rel(r));
    }
    const kepala = pins.filter((p) => p.plat === platAktif && !p.el.classList.contains("di-tepi")).map((p) => {
      const { x, y } = diLayar(p.x, p.y, p.henti === aktif);
      const sk = p.henti === aktif ? 1 : 0.74;
      return { p, k: { l: x - 15 * sk, t: y - 41 * sk, r: x + 15 * sk, b: y - 11 * sk } as Kotak };
    });
    const dipasang: Kotak[] = [];
    // urutan: titik yang paling berdesakan dipasang lebih dulu; arah pertama = menjauhi pusat kelompok,
    // jadi label menyebar keluar dan tidak saling tumpang di tengah
    const aktifPins = pins.filter((q) => q.henti === aktif && q.plat === platAktif && !q.el.classList.contains("di-tepi"));
    const posAktif = aktifPins.map((q) => diLayar(q.x, q.y));
    const pusatX = posAktif.reduce((a, t) => a + t.x, 0) / Math.max(1, posAktif.length);
    const pusatY = posAktif.reduce((a, t) => a + t.y, 0) / Math.max(1, posAktif.length);
    const jarakTerdekat = (i: number) => Math.min(...posAktif.map((t, j) => (j === i ? Infinity : Math.hypot(t.x - posAktif[i].x, t.y - posAktif[i].y))));
    const urutan = aktifPins.map((q, i) => ({ q, i, d: jarakTerdekat(i) })).sort((a, b) => a.d - b.d);
    for (const { q: p, i: ip } of urutan) {
      const { x, y } = posAktif[ip];
      const dxp = x - pusatX, dyp = y - pusatY;
      const keluar = posAktif.length < 2 || Math.hypot(dxp, dyp) < 6 ? p.arahAsli : Math.abs(dxp) > Math.abs(dyp) * 0.8 ? (dxp > 0 ? "kanan" : "kiri") : dyp < 0 ? "atas" : "bawah";
      if (x < 0 || x > W || y < 0 || y > H) continue;
      const lbl = p.el.querySelector<HTMLElement>(".pin-label")!;
      const lw = lbl.offsetWidth, lh = lbl.offsetHeight;
      const sendiri = kepala.find((h) => h.p === p)!.k;
      const lainKepala = kepala.filter((h) => h.p !== p).map((h) => h.k);
      const nilai = (r: Kotak) => {
        let v = luasTimpa(r, sendiri) * 8;
        for (const o of halangan) v += luasTimpa(r, o) * 3;
        // chip titik luar bingkai: label tidak boleh menimpanya (termasuk titik kepala tersembunyinya)
        for (const o of chipRect) {
          v += luasTimpa(r, o) * 9;
          const kx = (o.l + o.r) / 2, ky = (o.t + o.b) / 2;
          for (const ty of [ky, ky - 26]) if (kx > r.l - 2 && kx < r.r + 2 && ty > r.t - 2 && ty < r.b + 2) v += 1e5;
        }
        for (const o of lainKepala) {
          v += luasTimpa(r, o) * 9;
          // label tidak boleh menutup titik pusat kepala titik lain (nomornya harus terbaca)
          const kx = (o.l + o.r) / 2, ky = (o.t + o.b) / 2;
          if (kx > r.l - 2 && kx < r.r + 2 && ky > r.t - 2 && ky < r.b + 2) v += 1e5;
        }
        for (const o of dipasang) v += luasTimpa(r, o) * 7;
        return v;
      };
      let pilih = { a: keluar, dx: 0, dy: 0, v: Infinity, k: kotakLabel(keluar, x, y, lw, lh) };
      // kandidat: empat arah, masing-masing dengan geseran (diagonal); label yang bergeser jauh
      // dari kepalanya diberi garis penunjuk tipis
      for (const a of [keluar, ...ARAH.filter((q) => q !== keluar)]) {
        const r0 = kotakLabel(a, x, y, lw, lh);
        const geser = a === "kanan" || a === "kiri"
          ? [[0, 0], [0, -30], [0, 30], [0, -58], [0, 58], [0, -86], [0, 86], [a === "kanan" ? 24 : -24, 0]]
          : [[0, 0], [-(lw / 2 + 18), 0], [lw / 2 + 18, 0], [0, a === "atas" ? -28 : 28], [-(lw / 2 + 18), a === "atas" ? -28 : 28], [lw / 2 + 18, a === "atas" ? -28 : 28]];
        for (const [gx, gy] of geser) {
          const rg = { l: r0.l + gx, r: r0.r + gx, t: r0.t + gy, b: r0.b + gy };
          const dx = gx + (rg.l < aman.l ? aman.l - rg.l : rg.r > aman.r ? aman.r - rg.r : 0);
          const dy = gy + (rg.t < aman.t ? aman.t - rg.t : rg.b > aman.b ? aman.b - rg.b : 0);
          const r1 = { l: r0.l + dx, r: r0.r + dx, t: r0.t + dy, b: r0.b + dy };
          const v = nilai(r1) + (Math.abs(dx) + Math.abs(dy)) * lh * 0.35;
          if (v < pilih.v) pilih = { a, dx, dy, v, k: r1 };
          if (v === 0) break;
        }
        if (pilih.v === 0) break;
      }
      p.el.dataset.arah = pilih.a;
      p.el.style.setProperty("--lx", `${pilih.dx.toFixed(1)}px`);
      p.el.style.setProperty("--ly", `${pilih.dy.toFixed(1)}px`);
      const jauh = Math.abs(pilih.dx) + Math.abs(pilih.dy) > 8;
      p.el.classList.toggle("bergaris", jauh);
      if (jauh) {
        // garis dari pusat kepala (x, y-26) ke sisi label terdekat
        const k2 = pilih.k;
        const tx2 = Math.min(k2.r, Math.max(k2.l, x)), ty2 = Math.min(k2.b, Math.max(k2.t, y - 26));
        const gx2 = tx2 - x, gy2 = ty2 - (y - 26);
        p.el.style.setProperty("--gl", `${Math.max(0, Math.hypot(gx2, gy2) - 14).toFixed(1)}px`);
        p.el.style.setProperty("--ga", `${Math.atan2(gy2, gx2).toFixed(3)}rad`);
      }
      p.el.classList.add("berlabel");
      dipasang.push(pilih.k);
    }
  }

  /* ---------- status pemberhentian ---------- */
  function setAktif(i: number) {
    const diHenti = i >= 0 && i < N;
    pins.forEach((p) => {
      const ya = diHenti && p.henti === i;
      p.el.classList.toggle("di-henti", ya);
      p.el.classList.remove("berlabel");
      p.el.tabIndex = (ya || !diHenti) && p.plat === (diHenti ? D.henti[i].plat : 0) ? 0 : -1;
      if (ya) {
        p.el.style.setProperty("--urut", String(pins.filter((q) => q.henti === i).indexOf(p)));
        p.el.classList.remove("muncul");
        void p.el.offsetWidth;
        p.el.classList.add("muncul");
      }
    });
    lain.forEach((p) => p.el.classList.toggle("di-henti", diHenti && p.henti === i));
    kotak.forEach((k, n) => {
      const ya = n === i;
      k.classList.toggle("aktif", ya);
      k.toggleAttribute("inert", !ya);
      k.setAttribute("aria-hidden", ya ? "false" : "true");
    });
    navBtn.forEach((b, n) => (n === i ? b.setAttribute("aria-current", "step") : b.removeAttribute("aria-current")));
    letakPenanda(i);
    if (diHenti) {
      const nb = navBtn[i];
      navNo.textContent = String(i + 1).padStart(2, "0");
      navNama.textContent = nb?.textContent?.replace(/^\d+/, "").trim() || "";
    } else if (i === N) {
      navNama.textContent = D.teksTutup;
    }
  }
  /* penanda bulat di daftar pemberhentian; di penutup penanda disembunyikan (bukan tetap di nomor terakhir) */
  function letakPenanda(i: number) {
    if (!navPenanda) return;
    const nb = navBtn[Math.max(0, Math.min(N - 1, i))];
    const ol = nb?.closest("ol") as HTMLElement | null;
    navPenanda.classList.toggle("sembunyi", i < 0 || i >= N);
    if (nb && ol) navPenanda.style.transform = `translateY(${ol.offsetTop + nb.offsetTop + nb.offsetHeight / 2 - 4}px)`;
  }

  /* drift: kamera bergerak sangat pelan selama diam di pemberhentian (sinematik), tetap dijepit */
  let drift: gsap.core.Tween | null = null;
  function hentikanDrift() {
    drift?.kill();
    drift = null;
  }
  function mulaiDrift() {
    hentikanDrift();
    if (fase !== "henti" || aktif < 0 || aktif >= N) return;
    const dasarKam = { ...cur };
    const o = { t: 0 };
    drift = gsap.to(o, {
      t: 1,
      duration: 16,
      ease: "sine.inOut",
      yoyo: true,
      repeat: -1,
      onUpdate() {
        if (terbang) return;
        cur = jepitKam({ ...dasarKam, s: dasarKam.s * (1 + 0.022 * o.t), cx: dasarKam.cx + 6 * o.t / dasarKam.s }, D.henti[aktif]?.plat ?? platAktif);
        gambar();
      },
    });
  }
  function selesaiTerbang() {
    terbang = null;
    jejak = "";
    jepitAktif = fase === "henti";
    areaCache = null;
    jejak = "";
    gambar();
    muatUbin(cur);
    aturLabel();
    mulaiDrift();
  }
  function terbangKe(tujuan: Kam, durasi: number, platTujuan = platAktif) {
    terbang?.kill();
    hentikanDrift();
    jepitAktif = false;
    pins.forEach((p) => p.el.classList.remove("berlabel"));
    if (platTujuan !== platAktif) return pindahPlat(tujuan, platTujuan);
    const dari = { ...cur };
    const lebarPandang = W / Math.min(dari.s, tujuan.s);
    const jarak = Math.hypot(tujuan.cx - dari.cx, tujuan.cy - dari.cy) / lebarPandang;
    const lekuk = Math.min(0.42, jarak * 0.5);
    const o = { t: 0 };
    muatUbin(tujuan);
    terbang = gsap.to(o, {
      t: 1,
      duration: durasi,
      ease: "ksaIO",
      onUpdate() {
        const e = o.t;
        cur = campur(dari, tujuan, e);
        cur.s = Math.exp(lerp(Math.log(dari.s), Math.log(tujuan.s), e) - lekuk * Math.sin(Math.PI * e));
        // lekuk mundur tidak boleh memperlihatkan tepi foto: dijepit di setiap frame
        cur = jepitKam(cur, platAktif);
        gambar();
      },
      onComplete() {
        cur = { ...tujuan };
        selesaiTerbang();
      },
    });
  }
  /* pindah plat: kabut uap menutup, plat berganti di balik kabut, lalu kabut tersibak sambil
     kamera turun pelan ke pemberhentian. Tanpa kabut (satu plat) langsung berganti. */
  function pindahPlat(tujuan: Kam, pl: number) {
    // kamera turun ke pemberhentian dari sedikit lebih DEKAT, jadi tepi foto tidak pernah terlihat
    const mulai = jepitKam({ ...tujuan, s: tujuan.s * 1.12 }, pl);
    if (!kabut) {
      gantiPlat(pl);
      cur = { ...tujuan };
      return selesaiTerbang();
    }
    const uap = kabut.querySelector(".kabut-uap");
    const o = { t: 0 };
    muatUbin(tujuan, pl);
    terbang = gsap.timeline({ onComplete: selesaiTerbang })
      .to(kabut, { opacity: 1, duration: 0.65, ease: "power2.in" }, 0)
      .fromTo(uap, { scale: 1.25 }, { scale: 1, duration: 0.65, ease: "power2.out" }, 0)
      .add(() => {
        gantiPlat(pl);
        cur = { ...mulai };
        gambar();
      })
      .to(kabut, { opacity: 0, duration: 1.1, ease: "power2.out" })
      .to(uap, { scale: 1.3, duration: 1.1, ease: "power1.in" }, "<")
      .to(o, {
        t: 1,
        duration: 1.3,
        ease: "ksa",
        onUpdate() {
          cur = jepitKam(campur(mulai, tujuan, o.t), pl);
          gambar();
        },
        onComplete() {
          cur = { ...tujuan };
        },
      }, "<");
  }

  /* ---------- uap & judul pembuka (scrub) ---------- */
  const uapKiri = akar.querySelector(".uap-kiri");
  const uapKanan = akar.querySelector(".uap-kanan");
  const uapTengah = akar.querySelector(".uap-tengah");
  const pembuka = akar.querySelector(".peta-pembuka");
  const uapDasar = akar.querySelector(".uap-dasar");
  const tlUap = gsap.timeline({ paused: true, defaults: { ease: "none", duration: 1 } })
    .to(uapDasar, { opacity: 0, ease: "power1.in", duration: 0.32 }, 0)
    .to(uapKiri, { xPercent: -64, scale: 1.45, opacity: 0, ease: "power1.in" }, 0)
    .to(uapKanan, { xPercent: 64, scale: 1.45, opacity: 0, ease: "power1.in" }, 0)
    .to(uapTengah, { scale: 1.3, opacity: 0, ease: "power2.out", duration: 0.6 }, 0)
    .to(pembuka, { yPercent: -14, scale: 1.18, opacity: 0, filter: "blur(10px)", ease: "power1.in", duration: 0.55 }, 0);

  /* ---------- gulir → fase ---------- */
  let fase = "";
  let posTerakhir = 0;
  let lokalTerakhir = 0;
  /* status beku: dipegang selama ubah ukuran/rotasi sampai posisi gulir dipulihkan */
  let beku: { fase: string; aktif: number; lokal: number } | null = null;
  function perbarui(p: number) {
    if (beku) return;
    const pos = p * TOTAL;
    posTerakhir = pos;
    let f: string;
    if (pos < B.buka) {
      f = "buka";
      const q = pos / B.buka;
      lokalTerakhir = q;
      tlUap.progress(jepit(q / 0.62));
      if (platAktif !== 0) {
        terbang?.kill();
        terbang = null;
        gantiPlat(0);
        if (kabut) gsap.set(kabut, { opacity: 0 });
      }
      const qz = halus(jepit((q - 0.48) / 0.52));
      sasaran = campur(kamAwal(), kamHenti(0), qz);
      if (aktif !== -1) {
        aktif = -1;
        terbang?.kill();
        terbang = null;
        hentikanDrift();
        jepitAktif = false;
        setAktif(-1);
      }
    } else if (pos < B.buka + B.henti * N) {
      f = "henti";
      tlUap.progress(1);
      const i = Math.min(N - 1, Math.floor((pos - B.buka) / B.henti));
      const lokal = (pos - B.buka - i * B.henti) / B.henti;
      lokalTerakhir = lokal;
      if (i !== aktif) {
        const dulu = aktif;
        aktif = i;
        setAktif(i);
        // area pandang bergantung pada pemberhentian (sisi kotak keterangan, tinggi kotak di HP)
        ukur();
        areaCache = null;
        sasaran = kamHenti(i);
        terbangKe(sasaran, dulu === -1 ? 0.7 : 1.4, D.henti[i].plat);
      }
      const bar = progres[i];
      if (bar) bar.style.transform = `scaleX(${jepit(lokal).toFixed(3)})`;
    } else {
      f = "tutup";
      lokalTerakhir = (pos - B.buka - B.henti * N) / B.tutup;
      tlUap.progress(1);
      if (aktif !== N) {
        aktif = N;
        setAktif(N);
        sasaran = kamTutup();
        terbangKe(sasaran, 1.5, 0);
      }
    }
    if (f !== fase) {
      fase = f;
      seksi.dataset.fase = f;
    }
  }

  // ikuti sasaran dengan halus selama fase buka (scrub dengan sedikit pegas)
  gsap.ticker.add((_, dt) => {
    if (fase !== "buka" || terbang) return;
    const k = 1 - Math.exp(-(dt / 1000) * 9);
    const baru = campur(cur, sasaran, k);
    baru.s = Math.exp(lerp(Math.log(cur.s), Math.log(sasaran.s), k));
    cur = jepitKam(baru, platAktif);
    gambar();
  });

  let diDalam = false;
  const st = ScrollTrigger.create({
    trigger: seksi,
    start: "top top",
    end: "bottom bottom",
    onUpdate: (self) => perbarui(self.progress),
    onRefresh: (self) => perbarui(self.progress),
    // tombol WhatsApp melayang disembunyikan selama di dalam peta: kotak keterangan sudah punya jalannya sendiri
    onToggle: (self) => {
      if (beku) return;
      diDalam = self.isActive;
      document.documentElement.classList.toggle("di-peta", self.isActive);
    },
  });

  /* ---------- ubah ukuran & rotasi: pemberhentian yang sedang dilihat dipertahankan ----------
     Status disimpan dari catatan peta sendiri (fase, pemberhentian, posisi lokal), bukan dari
     st.isActive/progress saat refreshInit. Setelah ScrollTrigger menghitung ulang, halaman
     digulir ke titik yang sama di pemberhentian yang sama. */
  const posDari = (b: { fase: string; aktif: number; lokal: number }) => {
    let pos: number;
    if (b.fase === "buka") pos = jepit(b.lokal, 0, 0.98) * B.buka;
    else if (b.fase === "henti") pos = B.buka + (Math.max(0, Math.min(N - 1, b.aktif)) + jepit(b.lokal, 0.06, 0.94)) * B.henti;
    else pos = B.buka + N * B.henti + jepit(b.lokal, 0.04, 1) * B.tutup;
    return st.start + (pos / TOTAL) * (st.end - st.start);
  };
  let jamLepas = 0, jamCadangan = 0;
  function bekukan() {
    if (beku || !diDalam || !fase) return;
    beku = { fase, aktif, lokal: lokalTerakhir };
  }
  function pulihkan() {
    if (!beku) return;
    clearTimeout(jamCadangan);
    dapatLenis()?.resize();
    const y = posDari(beku);
    if (Math.abs(window.scrollY - y) > 1) gulirKe(y, { cepat: true });
    clearTimeout(jamLepas);
    jamLepas = window.setTimeout(() => {
      beku = null;
      perbarui(st.progress);
      aturLabel();
    }, 160);
  }
  ScrollTrigger.addEventListener("refreshInit", bekukan);
  ScrollTrigger.addEventListener("refresh", pulihkan);

  let tundaUkur = 0;
  const lebarAwal = { w: window.innerWidth, h: window.innerHeight };
  function ubahUkuran() {
    // di HP, bilah alamat yang naik-turun bukan ubah ukuran yang sebenarnya
    if (hp && window.innerWidth === lebarAwal.w && Math.abs(window.innerHeight - lebarAwal.h) < 160) return;
    lebarAwal.w = window.innerWidth;
    lebarAwal.h = window.innerHeight;
    bekukan();
    ukur();
    terbang?.kill();
    terbang = null;
    hentikanDrift();
    areaCache = null;
    if (kabut) gsap.set(kabut, { opacity: 0 });
    if (aktif >= 0 && aktif < N) {
      gantiPlat(D.henti[aktif].plat);
      sasaran = kamHenti(aktif);
    } else {
      gantiPlat(0);
      sasaran = aktif === N ? kamTutup() : campur(kamAwal(), kamHenti(0), halus(jepit((posTerakhir / B.buka - 0.48) / 0.52)));
    }
    cur = { ...sasaran };
    jejak = "";
    gambar();
    letakPenanda(aktif);
    pins.forEach((p) => p.el.classList.remove("berlabel"));
    clearTimeout(tundaUkur);
    tundaUkur = window.setTimeout(() => {
      areaCache = null;
      jejak = "";
      gambar();
      muatUbin(cur);
      aturLabel();
      mulaiDrift();
    }, 260);
    // cadangan kalau ScrollTrigger tidak menghitung ulang (mis. ubah tinggi kecil)
    clearTimeout(jamCadangan);
    jamCadangan = window.setTimeout(pulihkan, 900);
  }
  window.addEventListener("resize", ubahUkuran);
  window.addEventListener("orientationchange", () => window.setTimeout(ubahUkuran, 60));

  /* ---------- navigasi ---------- */
  const yHenti = (i: number) => st.start + ((B.buka + i * B.henti + 0.04) / TOTAL) * (st.end - st.start);
  navBtn.forEach((b, i) =>
    b.addEventListener("click", () => {
      navDaftar.classList.remove("buka");
      navRingkas.setAttribute("aria-expanded", "false");
      gulirKe(yHenti(i), { durasi: 1.2 });
    }),
  );
  navRingkas.addEventListener("click", () => {
    const buka = !navDaftar.classList.contains("buka");
    navDaftar.classList.toggle("buka", buka);
    navRingkas.setAttribute("aria-expanded", String(buka));
  });
  document.addEventListener("click", (e) => {
    if (!navDaftar.classList.contains("buka")) return;
    if (!(e.target as Element).closest(".nav-daftar, .nav-ringkas")) {
      navDaftar.classList.remove("buka");
      navRingkas.setAttribute("aria-expanded", "false");
    }
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && navDaftar.classList.contains("buka")) {
      navDaftar.classList.remove("buka");
      navRingkas.setAttribute("aria-expanded", "false");
      navRingkas.focus();
    }
  });
  // "Lewati peta" adalah tautan jangkar biasa ke daftar zona sesudah peta (Lenis ikut menggulirnya);
  // di sini cuma memindahkan fokus papan ketik ke sana
  lewati.addEventListener("click", () => {
    window.setTimeout(() => akar.querySelector<HTMLElement>("#setelah-peta summary")?.focus({ preventScroll: true }), 1300);
  });

  /* panel terbuka di desktop: geser kamera supaya titik yang dipilih tidak tertutup panel */
  let sebelumPanel: Kam | null = null;
  akar.addEventListener("panel-zona", (e: Event) => {
    const no = (e as CustomEvent).detail?.no as string | null;
    if (hp || fase !== "henti" && fase !== "tutup") return;
    if (!no) {
      if (sebelumPanel) {
        const balik = sebelumPanel;
        sebelumPanel = null;
        terbangKe(balik, 0.8);
      }
      return;
    }
    const p = pins.find((q) => q.el.dataset.zona === no && q.plat === platAktif);
    if (!p) return;
    const lebarPanel = Math.min(520, W);
    const tx = cur.ax - cur.cx * cur.s;
    const ty = cur.ay - cur.cy * cur.s;
    const sx = p.x * cur.s + tx;
    const sy = p.y * cur.s + ty;
    const tujuanX = (W - lebarPanel) / 2;
    const perluGeser = sx > W - lebarPanel - 40 || sx < 40 || sy < 60 || sy > H - 40;
    if (!perluGeser) return;
    if (!sebelumPanel) sebelumPanel = { ...cur };
    terbangKe(jepitKam({ ...cur, ax: cur.ax + (tujuanX - sx), ay: cur.ay + (H / 2 - sy) * 0.5 }, platAktif), 0.9);
  });

  setAktif(-1);
  perbarui(st.progress);
  // jejak untuk uji otomatis (dibaca skrip QA, tidak dipakai situs)
  (window as any).__peta = { kam: () => ({ ...cur }), fokus: () => ({ ...fokus, W, H, hp }), aktif: () => aktif, plat: () => platAktif, beku: () => beku, fase: () => fase };
}

/* ======================================================================
   Panel zona: <dialog> modal. Esc, klik luar, fokus pindah dan kembali,
   gulir halaman terkunci (Lenis ikut berhenti).
   ====================================================================== */
function pasangPanel(akar: HTMLElement) {
  const dialog = akar.querySelector<HTMLDialogElement>("dialog.zona-panel");
  if (!dialog) return;
  const kain = dialog.querySelector<HTMLElement>(".panel-kain")!;
  const isi = dialog.querySelector<HTMLElement>(".panel-isi")!;
  const badan = dialog.querySelector<HTMLElement>(".panel-badan")!;
  const tombolTutup = dialog.querySelector<HTMLButtonElement>(".panel-tutup")!;
  let pemicu: HTMLElement | null = null;
  let anim: gsap.core.Timeline | null = null;
  let terkunci = false;
  /* true selama animasi tutup berjalan: ketukan titik lain di saat itu membuka panel lagi, tidak tertelan */
  let menutup = false;
  const hpPanel = () => window.matchMedia("(max-width: 639px)").matches;

  function tandai(no: string | null) {
    akar.querySelectorAll<HTMLElement>(".pin").forEach((p) => p.classList.toggle("dibuka", p.dataset.zona === no));
    akar.dispatchEvent(new CustomEvent("panel-zona", { detail: { no } }));
  }

  function siapkanVideo(wadah: HTMLElement) {
    const v = wadah.querySelector<HTMLVideoElement>("video.zona-video");
    // gerak dikurangi: klip tidak dimuat sama sekali, foto diam di bawahnya yang tampil
    if (!v || !gerakBoleh()) return;
    const k = hpPanel() ? "Hp" : "Dk";
    const webm = v.dataset[`webm${k}` as "webmHp"];
    const mp4 = v.dataset[`mp4${k}` as "mp4Hp"];
    // poster dipasang saat panel dibuka (bukan di markup), sesuai rasio layar; klip main sekali lalu diam di frame terakhir
    const poster = v.dataset[`poster${k}` as "posterHp"];
    if (poster) v.poster = poster;
    v.loop = false;
    if (webm) v.insertAdjacentHTML("beforeend", `<source src="${webm}" type="video/webm">`);
    if (mp4) v.insertAdjacentHTML("beforeend", `<source src="${mp4}" type="video/mp4">`);
    v.addEventListener("playing", () => v.classList.add("main"), { once: true });
    v.load();
    v.play().catch(() => {});
  }
  function hentikanVideo() {
    badan.querySelectorAll("video").forEach((v) => {
      v.pause();
      v.removeAttribute("src");
      v.querySelectorAll("source").forEach((s) => s.remove());
      v.load();
    });
  }

  function isiDari(no: string) {
    const art = akar.querySelector<HTMLElement>(`[data-zona-isi="${no}"]`);
    if (!art) return false;
    hentikanVideo();
    const klon = art.cloneNode(true) as HTMLElement;
    klon.removeAttribute("id");
    klon.removeAttribute("aria-labelledby");
    klon.querySelectorAll("[id]").forEach((e) => e.removeAttribute("id"));
    const judul = klon.querySelector("h3");
    if (judul) {
      judul.id = "zona-panel-judul";
      judul.tabIndex = -1;
    }
    klon.querySelectorAll("img[loading='lazy']").forEach((i) => i.setAttribute("loading", "eager"));
    badan.replaceChildren(klon);
    isi.scrollTop = 0;
    siapkanVideo(klon);
    return true;
  }

  function selesaiTutup() {
    menutup = false;
    dialog!.classList.remove("menutup");
    if (dialog!.open) dialog!.close();
    dialog!.classList.remove("terbuka");
    hentikanVideo();
    tandai(null);
    if (terkunci) {
      terkunci = false;
      lepasGulir();
    }
    gsap.set([kain, isi], { clearProps: "transform" });
    pemicu?.focus?.({ preventScroll: true });
    pemicu = null;
  }

  function masukLagi() {
    anim = gsap.timeline()
      .to(kain, { xPercent: 0, yPercent: 0, duration: 0.7, ease: "ksa" }, 0)
      .to(isi, { xPercent: 0, yPercent: 0, duration: 0.7, ease: "ksa" }, 0);
  }

  function buka(no: string, dari?: HTMLElement | null) {
    if (menutup) {
      // panel sedang menutup: batalkan, ganti isi, lalu tarik kainnya masuk lagi dari posisinya sekarang
      anim?.kill();
      menutup = false;
      dialog!.classList.remove("menutup");
      if (!isiDari(no)) return;
      pemicu = dari ?? (document.activeElement as HTMLElement);
      tandai(no);
      if (!dialog!.open) dialog!.showModal();
      if (!terkunci) {
        terkunci = true;
        kunciGulir();
      }
      requestAnimationFrame(() => dialog!.classList.add("terbuka"));
      masukLagi();
      tombolTutup.focus({ preventScroll: true });
      return;
    }
    if (dialog!.open) return ganti(no);
    if (!isiDari(no)) return;
    pemicu = dari ?? (document.activeElement as HTMLElement);
    tandai(no);
    dialog!.showModal();
    if (!terkunci) {
      terkunci = true;
      kunciGulir();
    }
    requestAnimationFrame(() => dialog!.classList.add("terbuka"));
    if (gerakBoleh()) {
      anim?.kill();
      const hp = hpPanel();
      anim = gsap.timeline()
        .fromTo(kain, hp ? { yPercent: 100, xPercent: 0 } : { xPercent: 100, yPercent: 0 }, { xPercent: 0, yPercent: 0, duration: 0.95, ease: "ksa" }, 0)
        .fromTo(isi, hp ? { yPercent: -28, xPercent: 0 } : { xPercent: -46, yPercent: 0 }, { xPercent: 0, yPercent: 0, duration: 0.95, ease: "ksa" }, 0);
    }
    tombolTutup.focus({ preventScroll: true });
  }

  function tutup() {
    if (!dialog!.open || menutup) return;
    if (!gerakBoleh()) return selesaiTutup();
    dialog!.classList.remove("terbuka");
    anim?.kill();
    const hp = hpPanel();
    /* modal dilepas sejak animasi tutup dimulai: halaman langsung bisa digulir dan titik lain
       langsung bisa diketuk; kain tetap terlihat menutup lewat kelas .menutup */
    menutup = true;
    dialog!.classList.add("menutup");
    dialog!.close();
    if (terkunci) {
      terkunci = false;
      lepasGulir();
    }
    pemicu?.focus?.({ preventScroll: true });
    pemicu = null;
    anim = gsap.timeline({ onComplete: selesaiTutup })
      .to(kain, hp ? { yPercent: 100, duration: 0.6, ease: "ksa" } : { xPercent: 100, duration: 0.6, ease: "ksa" }, 0)
      .to(isi, hp ? { yPercent: -20, duration: 0.6, ease: "ksa" } : { xPercent: -30, duration: 0.6, ease: "ksa" }, 0);
  }

  function ganti(no: string) {
    tandai(no);
    if (!gerakBoleh()) {
      isiDari(no);
      badan.querySelector<HTMLElement>("h3")?.focus({ preventScroll: true });
      return;
    }
    gsap.to(badan, {
      opacity: 0,
      y: 10,
      filter: "blur(4px)",
      duration: 0.22,
      ease: "power1.out",
      onComplete() {
        isiDari(no);
        gsap.fromTo(badan, { opacity: 0, y: 14, filter: "blur(4px)" }, { opacity: 1, y: 0, filter: "blur(0px)", duration: 0.55, ease: "ksa", clearProps: "filter,transform" });
        badan.querySelector<HTMLElement>("h3")?.focus({ preventScroll: true });
      },
    });
  }

  akar.addEventListener("click", (e) => {
    const t = (e.target as Element).closest<HTMLElement>("[data-zona], [data-buka]");
    if (!t || dialog.contains(t)) return;
    const no = t.dataset.zona || t.dataset.buka;
    if (no) buka(no, t);
  });
  badan.addEventListener("click", (e) => {
    const a = (e.target as Element).closest<HTMLElement>("[data-ganti]");
    if (!a) return;
    e.preventDefault();
    ganti(a.dataset.ganti!);
  });
  tombolTutup.addEventListener("click", tutup);
  dialog.addEventListener("cancel", (e) => {
    e.preventDefault();
    tutup();
  });
  dialog.addEventListener("close", () => {
    if (menutup) return;
    if (terkunci || dialog.classList.contains("terbuka")) selesaiTutup();
  });
  dialog.addEventListener("click", (e) => {
    if (e.target === dialog) tutup();
  });
}
