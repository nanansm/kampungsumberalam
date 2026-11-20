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
  henti: { id: string; cx: number; cy: number; vw: number; vh: number; plat: number; sisi: "kiri" | "kanan"; utama: string; hp?: { cx: number; cy: number; vw: number; vh: number } }[];
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
  // tombol WhatsApp melayang disembunyikan selama bagian peta terlihat, termasuk saat baru masuk dari
  // bawah layar: "Lewati peta" (pojok kanan) tidak pernah tertutup, dan kotak keterangan punya jalan WA
  // sendiri. Berlaku juga di versi diam.
  const bagianPeta = akar.querySelector(".peta");
  if (bagianPeta && "IntersectionObserver" in window) {
    new IntersectionObserver((es) => es.forEach((e) => document.documentElement.classList.toggle("di-peta", e.isIntersecting))).observe(bagianPeta);
  }
  if (!gerakBoleh() || !document.documentElement.classList.contains("gerak")) return;
  (window as any).__petaSiap = true;
  // tekstur halimun/kabut (WebP lossless +-0,9 MB) baru dimuat saat peta mendekat
  if ("IntersectionObserver" in window) {
    const dekatPeta = new IntersectionObserver((es) => {
      if (!es.some((e) => e.isIntersecting)) return;
      akar.classList.add("halimun-siap");
      dekatPeta.disconnect();
    }, { rootMargin: "150% 0px" });
    dekatPeta.observe(akar);
  } else akar.classList.add("halimun-siap");

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
  /* halimun & foto pop-up (butir 3): elemen dan status, dideklarasikan di atas karena gambar()
     sudah dipanggil saat awal */
  const halimunA = akar.querySelector<HTMLElement>(".halimun-a");
  const halimunB = akar.querySelector<HTMLElement>(".halimun-b");
  const popupLapis = akar.querySelector<HTMLElement>("[data-popup]");
  const popupGaris = popupLapis?.querySelector<SVGLineElement>(".popup-garis line") ?? null;
  const popupSemua = [...akar.querySelectorAll<HTMLElement>("[data-popup-zona]")];
  const hdr = document.querySelector<HTMLElement>(".hdr");
  let popupEl: HTMLElement | null = null; // kartu yang sedang tampil
  let popupZona = ""; // zona yang fotonya tampil
  let popupAsal = ""; // zona tempat kartu diletakkan (zona utama henti)
  let popupGeser: { dx: number; dy: number; w: number; h: number } | null = null;
  let popupTunda: gsap.core.Animation | null = null;
  let halimunTl: gsap.core.Timeline | null = null;
  let halimunDiam: gsap.core.Timeline | null = null;
  let halimunHpMati = false, fpsDiukur = false;
  let terbangPanel = false;
  /* catatan QA: hanya aktif kalau pengujian mengisi window.__petaLog = [] */
  const catat = (m: string) => (window as any).__petaLog?.push([Math.round(performance.now()), m]);

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
    // ukuran kepala titik mengikuti peta.css: fase tutup diperkecil 0,6, titik bukan pemberhentian 0,74
    const faseKini = seksi.dataset.fase;
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
      // titik tampil utuh atau tidak sama sekali: kepala yang terpotong tepi bingkai disembunyikan
      const sk = faseKini === "tutup" ? 0.6 : faseKini === "henti" && p.henti !== aktif ? 0.74 : 1;
      const rk = 15 * sk;
      p.el.classList.toggle("terpotong", !tepi && (x - rk < 0 || x + rk > W || y - 41 * sk < 0 || y + 3 > H));
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
    if (popupEl && popupGeser) ikutiPopup();
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
    halimunDiam?.kill();
    halimunDiam = null;
  }
  function mulaiDrift() {
    hentikanDrift();
    if (fase !== "henti" || aktif < 0 || aktif >= N) return;
    halimunDrift();
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
    // geser kamera karena panel zona: kartu tetap (mengikuti kamera), tidak diletakkan ulang
    if (fase === "henti" && !terbangPanel) {
      popupTunda?.kill();
      popupTunda = gsap.delayedCall(0.15, tampilPopup);
    }
    terbangPanel = false;
  }
  function terbangKe(tujuan: Kam, durasi: number, platTujuan = platAktif, halimunLewat = false, karenaPanel = false) {
    catat(`terbang aktif=${aktif} panel=${karenaPanel}`);
    terbang?.kill();
    hentikanDrift();
    // panel zona dibuka/ditutup: kamera hanya bergeser, kartu foto tetap ada supaya fokus papan
    // ketik bisa kembali ke kartu itu saat panel ditutup
    terbangPanel = karenaPanel;
    if (!karenaPanel) sembunyikanPopup();
    jepitAktif = false;
    pins.forEach((p) => p.el.classList.remove("berlabel"));
    if (platTujuan !== platAktif) return pindahPlat(tujuan, platTujuan);
    const dari = { ...cur };
    const lebarPandang = W / Math.min(dari.s, tujuan.s);
    const jarak = Math.hypot(tujuan.cx - dari.cx, tujuan.cy - dari.cy) / lebarPandang;
    const lekuk = Math.min(0.42, jarak * 0.5);
    if (halimunLewat) halimunTerbang(dari, tujuan, durasi, jarak);
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
    const uap = kabut.querySelector<HTMLElement>(".kabut-uap");
    if (uap) acakUbin(uap);
    halimunTl?.kill();
    halimunTl = null;
    const lapis = [halimunA, halimunB].filter((l): l is HTMLElement => !!l);
    if (lapis.length) gsap.to(lapis, { opacity: 0, duration: 0.2, ease: "power1.out" });
    const o = { t: 0 };
    muatUbin(tujuan, pl);
    terbang = gsap.timeline({ onComplete: selesaiTerbang })
      .to(kabut, { opacity: 1, duration: 0.7, ease: "sine.inOut" }, 0)
      .fromTo(uap, { scale: 1.25 }, { scale: 1, duration: 0.65, ease: "power2.out" }, 0)
      .add(() => {
        gantiPlat(pl);
        cur = { ...mulai };
        gambar();
      })
      .to(kabut, { opacity: 0, duration: 1.1, ease: "sine.inOut" })
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

  /* ---------- halimun pindah henti (butir 3) ----------
     Dua lapis tipis melintas searah terbang selama 1,4 dtk; puncak opacity mengikuti jarak terbang
     (dalam lebar pandang). Ganti plat tetap memakai kabut dasar yang menutup penuh. */
  /* QA putaran 4: puncak 0,40-0,45 di desktop (0,28 terlalu tipis dan terasa tidak konsisten) */
  function puncakHalimun(jarak: number) {
    const p = jarak < 0.6 ? 0.43 : jarak >= 1.2 ? 0.45 : 0.43 + ((jarak - 0.6) / 0.6) * 0.02;
    return hp ? p * 0.8 : p;
  }
  function acakUbin(el: HTMLElement) {
    const u = hp ? 1024 : 1536; // titik awal ubin diacak: kabut tidak pernah sama dua kali
    el.style.backgroundPosition = `${Math.round(Math.random() * u)}px ${Math.round(Math.random() * u)}px`;
  }
  function halimunTerbang(dari: Kam, tujuan: Kam, d: number, jarak: number) {
    if (!halimunA) return;
    halimunDiam?.kill();
    halimunDiam = null;
    halimunTl?.kill();
    const lapis = hp || !halimunB ? [halimunA] : [halimunA, halimunB];
    // gulir cepat melewati beberapa henti: lapis lama turun ke 0 dulu, kabut tidak menumpuk
    const t0 = Math.max(...lapis.map((l) => Number(gsap.getProperty(l, "opacity")))) > 0.01 ? 0.2 : 0;
    let vx = tujuan.cx - dari.cx, vy = tujuan.cy - dari.cy;
    const n = Math.hypot(vx, vy) || 1;
    vx /= n;
    vy /= n;
    const pA = puncakHalimun(jarak), pB = pA * 0.7;
    // masuk +-0,4 dtk, tahan +-0,55 dtk di puncak, keluar sisanya; sine supaya tidak menyergap
    const masuk = Math.min(0.4, d * 0.3), tahan = Math.min(0.55, d - masuk - 0.3), keluar = d - masuk - tahan;
    const tl = gsap.timeline();
    if (t0) tl.to(lapis, { opacity: 0, duration: 0.2, ease: "power1.out" }, 0);
    tl.add(() => lapis.forEach(acakUbin), t0)
      .fromTo(halimunA, { xPercent: vx * 12, yPercent: vy * 12, scale: 1.05 }, { xPercent: -vx * 12, yPercent: -vy * 12, scale: 1.18, duration: d, ease: "none", immediateRender: false }, t0)
      .fromTo(halimunA, { opacity: 0 }, { opacity: pA, duration: masuk, ease: "sine.inOut", immediateRender: false }, t0)
      .to(halimunA, { opacity: 0, duration: keluar, ease: "sine.inOut" }, t0 + masuk + tahan);
    if (lapis.length > 1 && halimunB) {
      tl.fromTo(halimunB, { xPercent: vx * 22, yPercent: vy * 22, scale: 1.1 }, { xPercent: -vx * 22, yPercent: -vy * 22, scale: 1.32, duration: d, ease: "none", immediateRender: false }, t0)
        .fromTo(halimunB, { opacity: 0 }, { opacity: pB, duration: masuk, ease: "sine.inOut", immediateRender: false }, t0 + 0.08)
        .to(halimunB, { opacity: 0, duration: keluar - 0.08, ease: "sine.inOut" }, t0 + masuk + tahan);
    }
    halimunTl = tl;
  }
  /* diam di henti: halimun belakang tetap ada tipis (0,06) dan bergeser 3% bolak-balik mengikuti drift;
     di HP dimatikan kalau laju gambar di bawah 50 fps */
  function halimunDrift() {
    if (!halimunA || (hp && halimunHpMati)) return;
    if (hp && !fpsDiukur) {
      fpsDiukur = true;
      let n = 0;
      const mulai = performance.now();
      const hitung = (t: number) => {
        n++;
        if (t - mulai < 1000) return requestAnimationFrame(hitung);
        if ((n * 1000) / (t - mulai) < 50) {
          halimunHpMati = true;
          halimunDiam?.kill();
          gsap.to(halimunA, { opacity: 0, duration: 0.4 });
        }
      };
      requestAnimationFrame(hitung);
    }
    halimunDiam?.kill();
    acakUbin(halimunA);
    gsap.set(halimunA, { xPercent: -3, yPercent: 0, scale: 1.05 });
    halimunDiam = gsap.timeline()
      .to(halimunA, { opacity: 0.06, duration: 1.2, ease: "power1.out" }, 0)
      .to(halimunA, { xPercent: 3, duration: 16, ease: "sine.inOut", yoyo: true, repeat: -1 }, 0);
  }

  /* ---------- foto pop-up di titik zona (butir 3) ---------- */
  const kecil = () => W < 600;
  function kepalaZona(no: string) {
    const p = pins.find((q) => q.el.dataset.zona === no && q.plat === platAktif);
    if (!p) return null;
    if (p.el.classList.contains("di-tepi")) {
      // zona di luar bingkai: kartu menunjuk chip berpanah di tepi layar yang mewakilinya
      const c = p.el.querySelector(".pin-label")?.getBoundingClientRect();
      const pr = panggung.getBoundingClientRect();
      return c && c.width ? { x: c.left + c.width / 2 - pr.left, y: c.top + c.height / 2 - pr.top } : null;
    }
    const { cx, cy, s, ax, ay } = cur;
    return { x: p.x * s + ax - cx * s, y: p.y * s + ay - cy * s - 26 };
  }
  function kotakPanggung(el: Element | null | undefined, pr: DOMRect): Kotak | null {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) return null;
    return { l: r.left - pr.left, t: r.top - pr.top, r: r.right - pr.left, b: r.bottom - pr.top };
  }
  function rintangan(): Kotak[] {
    const pr = panggung.getBoundingClientRect();
    const out = [kotak[aktif], navDaftar, navRingkas, lewati, hdr && !hdr.classList.contains("sembunyi") ? hdr : null].map((el) => kotakPanggung(el, pr));
    akar.querySelectorAll(".pin.di-henti .pin-kepala, .pin.berlabel .pin-label, .tepi-arah.di-henti .tepi-isi").forEach((el) => out.push(kotakPanggung(el, pr)));
    return out.filter((x): x is Kotak => !!x);
  }
  function garisKe(P: { x: number; y: number }, x: number, y: number, w: number, h: number) {
    if (!popupGaris) return;
    const pojok = [[x, y], [x + w, y], [x, y + h], [x + w, y + h]].sort((a, b) => Math.hypot(a[0] - P.x, a[1] - P.y) - Math.hypot(b[0] - P.x, b[1] - P.y))[0];
    const dx = pojok[0] - P.x, dy = pojok[1] - P.y, d = Math.hypot(dx, dy) || 1;
    popupGaris.setAttribute("x1", (P.x + (dx / d) * 16).toFixed(1));
    popupGaris.setAttribute("y1", (P.y + (dy / d) * 16).toFixed(1));
    popupGaris.setAttribute("x2", pojok[0].toFixed(1));
    popupGaris.setAttribute("y2", pojok[1].toFixed(1));
    return pojok;
  }
  /* letak kartu: sisi berlawanan dengan kotak keterangan; coba kanan-atas, kanan-bawah, kiri-atas,
     atas (dicerminkan bila kotak di kanan); tidak boleh beririsan dengan kotak, navigasi, tombol,
     label aktif, dan tepi layar (16 px). Gagal semua: slot tetap di bawah "Lewati peta". */
  function letakPopup(el: HTMLElement, no: string) {
    const kartu = el.querySelector<HTMLElement>(".popup-kartu")!;
    const w = kartu.offsetWidth, h = kartu.offsetHeight;
    const pr = panggung.getBoundingClientRect();
    if (kecil()) {
      const kr = kotak[aktif]?.getBoundingClientRect();
      if (!kr) return false;
      // menjorok ke dalam kotak paling banyak separuh kartu, tetapi tidak melewati baris label:
      // judul dan isi kotak tidak pernah tertutup dan kotak tidak bertambah tinggi
      const lbl = kotak[aktif].querySelector(".lbl")?.getBoundingClientRect();
      const masuk = Math.max(0, Math.min(h / 2, lbl ? lbl.bottom - kr.top + 2 : h / 2));
      const x = kr.right - pr.left - w - 12, y = kr.top - pr.top - h + masuk;
      el.style.transform = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0)`;
      kartu.style.transformOrigin = "100% 100%";
      popupGeser = null;
      return true;
    }
    const P = kepalaZona(no);
    if (!P) return false;
    const g = 22, aman = 16;
    const kotakKiri = (D.henti[aktif]?.sisi ?? "kiri") === "kiri";
    const kanan = [{ x: P.x + g, y: P.y - g - h }, { x: P.x + g, y: P.y + g }];
    const kiri = [{ x: P.x - g - w, y: P.y - g - h }, { x: P.x - g - w, y: P.y + g }];
    const atas = { x: P.x - w / 2, y: P.y - 15 - g - h };
    const calon = kotakKiri ? [...kanan, kiri[0], atas] : [...kiri, kanan[0], atas];
    const rin = rintangan();
    const bebas = (c: { x: number; y: number }) => {
      const k = { l: c.x - 8, t: c.y - 8, r: c.x + w + 8, b: c.y + h + 8 };
      return c.x >= aman && c.y >= aman && c.x + w <= W - aman && c.y + h <= H - aman && !rin.some((r) => luasTimpa(k, r) > 0);
    };
    let pilih = calon.find(bebas);
    if (!pilih) {
      // keempat letak utama tertutup label/kotak: cari letak bebas terdekat ke titik zona di kisi 24 px,
      // dengan sisi yang berlawanan dengan kotak keterangan didahulukan
      let skor = Infinity;
      for (let y = aman; y + h <= H - aman; y += 24) {
        for (let x = aman; x + w <= W - aman; x += 24) {
          if (!bebas({ x, y })) continue;
          const mx = x + w / 2, my = y + h / 2;
          const sisiKotak = kotakKiri ? mx < P.x - w * 0.25 : mx > P.x + w * 0.25;
          const d = Math.hypot(mx - P.x, my - P.y) + (sisiKotak ? 400 : 0);
          if (d < skor) {
            skor = d;
            pilih = { x, y };
          }
        }
      }
    }
    if (!pilih) {
      const lr = lewati.getBoundingClientRect();
      pilih = { x: W - aman - w, y: lr.bottom - pr.top + aman };
    }
    popupGeser = { dx: pilih.x - P.x, dy: pilih.y - P.y, w, h };
    el.style.transform = `translate3d(${pilih.x.toFixed(1)}px,${pilih.y.toFixed(1)}px,0)`;
    const pojok = garisKe(P, pilih.x, pilih.y, w, h);
    if (pojok) kartu.style.transformOrigin = `${pojok[0] > pilih.x + w / 2 ? 100 : 0}% ${pojok[1] > pilih.y + h / 2 ? 100 : 0}%`;
    return true;
  }
  /* kartu mengikuti drift kamera; garis menunjuk zona yang fotonya sedang tampil */
  function ikutiPopup() {
    if (!popupEl || !popupGeser) return;
    const A = kepalaZona(popupAsal);
    if (!A) return;
    const x = A.x + popupGeser.dx, y = A.y + popupGeser.dy;
    popupEl.style.transform = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0)`;
    const P = kepalaZona(popupZona) ?? A;
    garisKe(P, x, y, popupGeser.w, popupGeser.h);
  }
  function kartuZona(no: string) {
    return popupSemua.find((e) => +e.dataset.popupHenti! === aktif && e.dataset.popupZona === no);
  }
  function tampilPopup() {
    catat(`tampil fase=${fase} aktif=${aktif}`);
    if (!popupLapis || fase !== "henti" || aktif < 0 || aktif >= N) return;
    const no = D.henti[aktif].utama;
    const el = kartuZona(no);
    if (!el) return;
    sembunyikanPopup(true);
    el.hidden = false;
    el.inert = false;
    const kartu = el.querySelector<HTMLElement>(".popup-kartu")!;
    gsap.set(kartu, { opacity: 0, scale: 1 });
    if (!letakPopup(el, no)) {
      catat("letak gagal");
      el.hidden = true;
      return;
    }
    popupEl = el;
    popupZona = popupAsal = no;
    const foto = kartu.querySelector("img");
    const tl = gsap.timeline();
    if (popupGaris && !kecil()) tl.fromTo(popupGaris, { strokeDashoffset: 1, opacity: 1 }, { strokeDashoffset: 0, duration: 0.3, ease: "power2.out" });
    tl.fromTo(kartu, { opacity: 0, scale: 0.9 }, { opacity: 1, scale: 1, duration: 0.55, ease: "ksa" });
    if (foto) tl.fromTo(foto, { scale: 1.08 }, { scale: 1, duration: 0.55, ease: "ksa" }, "<");
    popupTunda = tl;
  }
  function sembunyikanPopup(langsung = false) {
    catat(`sembunyi langsung=${langsung}`);
    popupTunda?.kill();
    popupTunda = null;
    popupEl = null;
    popupZona = popupAsal = "";
    popupGeser = null;
    const tampak = popupSemua.filter((e) => !e.hidden);
    tampak.forEach((e) => (e.inert = true)); // kartu yang sedang menghilang tidak bisa difokus
    if (langsung || !tampak.length) {
      tampak.forEach((e) => (e.hidden = true));
      if (popupGaris) gsap.set(popupGaris, { opacity: 0, strokeDashoffset: 1 });
      return;
    }
    const kartu = tampak.map((e) => e.querySelector(".popup-kartu")).filter((k): k is Element => !!k);
    const tl = gsap.timeline({ onComplete: () => tampak.forEach((e) => e !== popupEl && (e.hidden = true)) })
      .to(kartu, { opacity: 0, scale: 0.96, duration: 0.22, ease: "power2.in" }, 0);
    if (popupGaris) tl.to(popupGaris, { opacity: 0, duration: 0.18, ease: "power2.in" }, 0);
    popupTunda = tl;
  }
  /* arahkan kursor / fokus papan ketik ke titik atau chip zona lain di henti ini: foto dan keterangan
     berganti (pudar-silang 0,3 dtk); kartu tetap di tempatnya, garis pindah ke zona itu */
  function gantiPopup(no: string) {
    if (!popupEl || no === popupZona || fase !== "henti") return;
    const baru = kartuZona(no);
    if (!baru) return;
    const lama = popupEl;
    const kb = baru.querySelector<HTMLElement>(".popup-kartu")!, kl = lama.querySelector<HTMLElement>(".popup-kartu")!;
    baru.hidden = false;
    baru.inert = false;
    lama.inert = true; // fokus papan ketik tidak boleh jatuh ke kartu yang sedang memudar
    baru.style.transform = lama.style.transform;
    kb.style.transformOrigin = kl.style.transformOrigin;
    popupEl = baru;
    popupZona = no;
    popupTunda?.kill();
    gsap.set(kb, { scale: 1 });
    popupTunda = gsap.timeline({ onComplete: () => { if (popupEl !== lama) lama.hidden = true; } })
      .fromTo(kb, { opacity: 0 }, { opacity: 1, duration: 0.3, ease: "power1.out" }, 0)
      .to(kl, { opacity: 0, duration: 0.3, ease: "power1.out" }, 0);
    if (popupGaris && !kecil()) gsap.set(popupGaris, { opacity: 1, strokeDashoffset: 0 });
    ikutiPopup();
  }
  const fokusPapan = (el: Element) => { try { return el.matches(":focus-visible"); } catch { return true; } };
  akar.querySelectorAll<HTMLElement>(".kotak-chip [data-buka]").forEach((b) => {
    const no = b.dataset.buka!;
    b.addEventListener("pointerenter", (e) => { if ((e as PointerEvent).pointerType === "mouse") gantiPopup(no); });
    b.addEventListener("focus", () => { if (fokusPapan(b)) gantiPopup(no); });
    // HP: ketuk chip zona lain mengganti foto; ketuk kartu (atau chip zona yang sedang tampil) membuka panel
    b.addEventListener("click", (e) => {
      if (!kecil() || !popupEl || no === popupZona || !kartuZona(no)) return;
      e.stopPropagation();
      e.preventDefault();
      gantiPopup(no);
    });
  });
  pins.forEach((p) => {
    const no = p.el.dataset.zona!;
    p.el.addEventListener("pointerenter", (e) => { if (e.pointerType === "mouse" && p.henti === aktif) gantiPopup(no); });
    p.el.addEventListener("focus", () => { if (p.henti === aktif && fokusPapan(p.el)) gantiPopup(no); });
  });

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
        sembunyikanPopup();
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
        terbangKe(sasaran, dulu === -1 ? 0.7 : 1.4, D.henti[i].plat, dulu !== -1);
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
    onToggle: (self) => {
      if (beku) return;
      diDalam = self.isActive;
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
    catat(`pulihkan beku=${!!beku}`);
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
      if (fase === "henti" && !terbang && popupEl) tampilPopup();
    }, 160);
  }
  ScrollTrigger.addEventListener("refreshInit", bekukan);
  ScrollTrigger.addEventListener("refresh", pulihkan);

  let tundaUkur = 0;
  const lebarAwal = { w: window.innerWidth, h: window.innerHeight };
  function ubahUkuran() {
    catat(`ubahUkuran ${window.innerWidth}x${window.innerHeight}`);
    // di HP, bilah alamat yang naik-turun bukan ubah ukuran yang sebenarnya
    if (hp && window.innerWidth === lebarAwal.w && Math.abs(window.innerHeight - lebarAwal.h) < 160) return;
    // bilah gulir yang hilang-muncul saat panel modal dibuka/ditutup juga bukan ubah ukuran: tanpa
    // penjaga ini kartu pop-up yang sedang difokus ikut disembunyikan dan fokusnya hilang
    if (window.innerWidth === lebarAwal.w && window.innerHeight === lebarAwal.h) return;
    lebarAwal.w = window.innerWidth;
    lebarAwal.h = window.innerHeight;
    bekukan();
    ukur();
    terbang?.kill();
    terbang = null;
    hentikanDrift();
    sembunyikanPopup(true);
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
      if (fase === "henti" && !terbang) tampilPopup();
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
        terbangKe(balik, 0.8, platAktif, false, true);
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
    terbangKe(jepitKam({ ...cur, ax: cur.ax + (tujuanX - sx), ay: cur.ay + (H / 2 - sy) * 0.5 }, platAktif), 0.9, platAktif, false, true);
  });

  setAktif(-1);
  perbarui(st.progress);
  // jejak untuk uji otomatis (dibaca skrip QA, tidak dipakai situs)
  (window as any).__peta = { kam: () => ({ ...cur }), fokus: () => ({ ...fokus, W, H, hp }), aktif: () => aktif, plat: () => platAktif, beku: () => beku, fase: () => fase, jeda: (ya: boolean) => (ya ? gsap.globalTimeline.pause() : gsap.globalTimeline.resume()) };
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
