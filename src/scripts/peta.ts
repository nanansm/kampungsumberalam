/**
 * Peta kawasan: kamera digerakkan gulir + panel zona.
 *
 * Alur: uap tersibak (scrub) → kamera turun ke pemberhentian 1 (scrub) →
 * pindah antar pemberhentian = terbang 1,4 dtk (bukan scrub, supaya terasa
 * berpindah tempat) → penutup: kamera mundur ke pandangan utuh.
 *
 * Kamera = { cx, cy } titik dunia (unit SVG) yang diletakkan di { ax, ay }
 * (piksel layar), dengan skala s (piksel per unit).
 */
import { gsap, ScrollTrigger, gerakBoleh, gulirKe, kunciGulir, lepasGulir } from "./gerak";

type Kam = { cx: number; cy: number; s: number; ax: number; ay: number };
type Data = {
  babak: { buka: number; henti: number; tutup: number };
  dunia: { lebar: number; tinggi: number; kolom: number; baris: number };
  awal: { cx: number; cy: number; vw: number; vh: number };
  henti: { id: string; cx: number; cy: number; vw: number; vh: number }[];
};

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
  const dunia = akar.querySelector<HTMLElement>(".peta-dunia")!;
  const lapisUbin = akar.querySelector<HTMLElement>(".peta-ubin")!;
  const pins = [...akar.querySelectorAll<HTMLButtonElement>(".pin")].map((el) => ({
    el,
    x: +el.dataset.x!,
    y: +el.dataset.y!,
    henti: +el.dataset.henti!,
    arahAsli: el.dataset.arah as string,
  }));
  const lain = [...akar.querySelectorAll<HTMLElement>(".titik-lain, .pintu")].map((el) => {
    const induk = el.dataset.induk ? pins.find((p) => p.el.dataset.zona === el.dataset.induk) : undefined;
    return { el, x: +el.dataset.x!, y: +el.dataset.y!, henti: induk ? induk.henti : 0 };
  });
  const kotak = [...akar.querySelectorAll<HTMLElement>("[data-henti-kotak]")];
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
  let W = 0, H = 0, hp = false;
  let fokus = { x: 0, y: 0, w: 0, h: 0 };
  function ukur() {
    W = panggung.clientWidth;
    H = Math.min(panggung.clientHeight, window.innerHeight);
    hp = W < 900;
    if (!hp) {
      const kiri = jepit(W * 0.3, 380, 470) + 24;
      fokus = { x: kiri, y: 84, w: W - kiri - 40, h: H - 84 - 52 };
    } else {
      const k = kotak[Math.max(0, Math.min(N - 1, aktif))];
      const kh = k ? k.offsetHeight : 220;
      fokus = { x: 14, y: 64, w: W - 28, h: Math.max(160, H - 64 - kh - 30) };
    }
  }
  const kamHenti = (i: number): Kam => {
    const h = D.henti[i];
    const s = Math.min(fokus.w / h.vw, fokus.h / h.vh, hp ? 1.05 : 1.5);
    return { cx: h.cx, cy: h.cy, s, ax: fokus.x + fokus.w / 2, ay: fokus.y + fokus.h / 2 };
  };
  const kamAwal = (): Kam => {
    const a = D.awal;
    const s = Math.min((W * 0.94) / a.vw, (H * 0.9) / a.vh);
    return { cx: a.cx, cy: a.cy, s, ax: W / 2, ay: H / 2 + (hp ? 10 : 0) };
  };
  /* penutup: peta utuh di atas kartu ajakan, supaya titik tidak tertutup kartu */
  const kartuTutup = akar.querySelector<HTMLElement>(".peta-penutup");
  const kamTutup = (): Kam => {
    const a = D.awal;
    const kh = kartuTutup ? kartuTutup.offsetHeight : 240;
    const atas = hp ? 64 : 24;
    const tinggi = Math.max(200, H - kh - atas - (hp ? 40 : 56));
    const s = Math.min((W * 0.92) / a.vw, tinggi / a.vh);
    return { cx: a.cx, cy: a.cy, s, ax: W / 2, ay: atas + tinggi / 2 };
  };

  /* ---------- gambar ---------- */
  let aktif = -1;
  ukur();
  let cur: Kam = kamAwal();
  let sasaran: Kam = cur;
  let terbang: gsap.core.Tween | null = null;
  let jejak = "";
  function gambar() {
    const { cx, cy, s, ax, ay } = cur;
    const tx = ax - cx * s;
    const ty = ay - cy * s;
    const kunci = `${tx.toFixed(2)}|${ty.toFixed(2)}|${s.toFixed(4)}`;
    if (kunci === jejak) return;
    jejak = kunci;
    dunia.style.transform = `translate3d(${tx}px,${ty}px,0) scale(${s})`;
    for (const p of pins) p.el.style.transform = `translate3d(${(p.x * s + tx).toFixed(1)}px,${(p.y * s + ty).toFixed(1)}px,0)`;
    for (const p of lain) p.el.style.transform = `translate3d(${(p.x * s + tx).toFixed(1)}px,${(p.y * s + ty).toFixed(1)}px,0)`;
  }
  gambar();

  /* ---------- ubin tajam: dimuat hanya saat skala melebihi resolusi gambar dasar ---------- */
  const UBIN_W = D.dunia.lebar / D.dunia.kolom;
  const UBIN_H = D.dunia.tinggi / D.dunia.baris;
  const DASAR = 2560 / D.dunia.lebar; // piksel gambar dasar per unit
  const ubin = new Map<string, { img: HTMLImageElement; dipakai: number }>();
  const MAKS = hp ? 12 : 20;
  let detik = 0;
  function muatUbin(k: Kam) {
    if (k.s * (window.devicePixelRatio || 1) < DASAR * 1.12) return;
    const tx = k.ax - k.cx * k.s;
    const ty = k.ay - k.cy * k.s;
    const m = 0.12;
    const x0 = (-tx - W * m) / k.s, x1 = (W * (1 + m) - tx) / k.s;
    const y0 = (-ty - H * m) / k.s, y1 = (H * (1 + m) - ty) / k.s;
    detik++;
    for (let r = 0; r < D.dunia.baris; r++) {
      for (let c = 0; c < D.dunia.kolom; c++) {
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
        lapisUbin.append(img);
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

  /* ---------- label nama: dipasang setelah kamera tiba, tanpa saling tabrak ---------- */
  const ARAH = ["kanan", "kiri", "atas", "bawah"];
  function aturLabel() {
    pins.forEach((p) => p.el.classList.remove("berlabel"));
    if (aktif < 0 || aktif >= N) return;
    const larangan: DOMRect[] = [];
    const st = panggung.getBoundingClientRect();
    const k = kotak[aktif]?.getBoundingClientRect();
    if (k) larangan.push(k);
    const nav = (hp ? navRingkas : navDaftar).getBoundingClientRect();
    if (nav.width) larangan.push(nav);
    const lw = lewati.getBoundingClientRect();
    if (lw.width) larangan.push(lw);
    const kepala = pins.filter((p) => p.henti === aktif).map((p) => p.el.querySelector(".pin-kepala")!.getBoundingClientRect());
    const tabrak = (r: DOMRect) =>
      r.left < st.left + 6 || r.right > st.right - 6 || r.top < st.top + 6 || r.bottom > st.bottom - 6 ||
      larangan.some((o) => r.left < o.right + 4 && r.right > o.left - 4 && r.top < o.bottom + 4 && r.bottom > o.top - 4);
    for (const p of pins.filter((q) => q.henti === aktif)) {
      const kandidat = [p.arahAsli, ...ARAH.filter((a) => a !== p.arahAsli)];
      const lbl = p.el.querySelector<HTMLElement>(".pin-label")!;
      let pasang = false;
      for (const a of kandidat) {
        p.el.dataset.arah = a;
        const r = lbl.getBoundingClientRect();
        const kotakLabel = new DOMRect(r.left, r.top, r.width, r.height);
        const sendiri = p.el.querySelector(".pin-kepala")!.getBoundingClientRect();
        const kenaKepala = kepala.some((h) => h !== sendiri && h.left < r.right && h.right > r.left && h.top < r.bottom && h.bottom > r.top && !(h.x === sendiri.x && h.y === sendiri.y));
        if (!tabrak(kotakLabel) && !kenaKepala) {
          larangan.push(kotakLabel);
          pasang = true;
          break;
        }
      }
      if (!pasang) p.el.dataset.arah = p.arahAsli;
      p.el.classList.toggle("berlabel", pasang);
    }
  }

  /* ---------- status pemberhentian ---------- */
  function setAktif(i: number) {
    const diHenti = i >= 0 && i < N;
    pins.forEach((p, n) => {
      const ya = diHenti && p.henti === i;
      p.el.classList.toggle("di-henti", ya);
      p.el.classList.remove("berlabel");
      p.el.tabIndex = ya || !diHenti ? 0 : -1;
      if (ya) {
        p.el.style.setProperty("--urut", String(pins.filter((q) => q.henti === i).indexOf(p)));
        p.el.classList.remove("muncul");
        void p.el.offsetWidth;
        p.el.classList.add("muncul");
      }
      void n;
    });
    lain.forEach((p) => p.el.classList.toggle("di-henti", diHenti && p.henti === i));
    kotak.forEach((k, n) => {
      const ya = n === i;
      k.classList.toggle("aktif", ya);
      k.toggleAttribute("inert", !ya);
      k.setAttribute("aria-hidden", ya ? "false" : "true");
    });
    navBtn.forEach((b, n) => (n === i ? b.setAttribute("aria-current", "step") : b.removeAttribute("aria-current")));
    const nb = navBtn[Math.max(0, Math.min(N - 1, i))];
    const ol = nb?.closest("ol") as HTMLElement | null;
    if (navPenanda && nb && ol) navPenanda.style.transform = `translateY(${ol.offsetTop + nb.offsetTop + nb.offsetHeight / 2 - 4}px)`;
    if (diHenti) {
      navNo.textContent = String(i + 1).padStart(2, "0");
      navNama.textContent = nb?.textContent?.replace(/^\d+/, "").trim() || "";
    }
  }

  function terbangKe(tujuan: Kam, durasi: number) {
    terbang?.kill();
    pins.forEach((p) => p.el.classList.remove("berlabel"));
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
        gambar();
      },
      onComplete() {
        terbang = null;
        cur = { ...tujuan };
        gambar();
        muatUbin(cur);
        aturLabel();
      },
    });
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
  function perbarui(p: number) {
    const pos = p * TOTAL;
    posTerakhir = pos;
    let f: string;
    if (pos < B.buka) {
      f = "buka";
      const q = pos / B.buka;
      tlUap.progress(jepit(q / 0.62));
      const qz = halus(jepit((q - 0.48) / 0.52));
      sasaran = campur(kamAwal(), kamHenti(0), qz);
      if (aktif !== -1) {
        aktif = -1;
        terbang?.kill();
        terbang = null;
        setAktif(-1);
      }
    } else if (pos < B.buka + B.henti * N) {
      f = "henti";
      tlUap.progress(1);
      const i = Math.min(N - 1, Math.floor((pos - B.buka) / B.henti));
      const lokal = (pos - B.buka - i * B.henti) / B.henti;
      if (i !== aktif) {
        const dulu = aktif;
        aktif = i;
        setAktif(i);
        if (hp) ukur();
        sasaran = kamHenti(i);
        terbangKe(sasaran, dulu === -1 ? 0.7 : 1.4);
      }
      const bar = progres[i];
      if (bar) bar.style.transform = `scaleX(${jepit(lokal).toFixed(3)})`;
    } else {
      f = "tutup";
      tlUap.progress(1);
      if (aktif !== N) {
        aktif = N;
        setAktif(N);
        sasaran = kamTutup();
        terbangKe(sasaran, 1.5);
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
    cur = baru;
    gambar();
  });

  const st = ScrollTrigger.create({
    trigger: seksi,
    start: "top top",
    end: "bottom bottom",
    onUpdate: (self) => perbarui(self.progress),
    onRefresh: (self) => perbarui(self.progress),
    // tombol WhatsApp melayang disembunyikan selama di dalam peta: kotak keterangan sudah punya jalannya sendiri
    onToggle: (self) => document.documentElement.classList.toggle("di-peta", self.isActive),
  });

  /* ---------- ubah ukuran: kamera ikut, posisi gulir dipertahankan ---------- */
  let simpan: number | null = null;
  ScrollTrigger.addEventListener("refreshInit", () => {
    simpan = st.isActive ? st.progress : null;
  });
  ScrollTrigger.addEventListener("refresh", () => {
    if (simpan === null) return;
    const y = st.start + simpan * (st.end - st.start);
    simpan = null;
    if (Math.abs(window.scrollY - y) > 2) gulirKe(y, { cepat: true });
  });
  let tundaUkur = 0;
  const lebarAwal = { w: window.innerWidth };
  window.addEventListener("resize", () => {
    // di HP, bilah alamat yang naik-turun bukan ubah ukuran yang sebenarnya
    if (hp && window.innerWidth === lebarAwal.w) return;
    lebarAwal.w = window.innerWidth;
    ukur();
    if (aktif >= 0 && aktif < N) sasaran = kamHenti(aktif);
    else if (aktif === N) sasaran = kamTutup();
    else sasaran = campur(kamAwal(), kamHenti(0), halus(jepit((posTerakhir / B.buka - 0.48) / 0.52)));
    terbang?.kill();
    terbang = null;
    cur = { ...sasaran };
    jejak = "";
    gambar();
    clearTimeout(tundaUkur);
    tundaUkur = window.setTimeout(() => {
      muatUbin(cur);
      aturLabel();
    }, 220);
  });

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
    const p = pins.find((q) => q.el.dataset.zona === no);
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
    terbangKe({ ...cur, ax: cur.ax + (tujuanX - sx), ay: cur.ay + (H / 2 - sy) * 0.5 }, 0.9);
  });

  setAktif(-1);
  perbarui(st.progress);
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
  const hpPanel = () => window.matchMedia("(max-width: 639px)").matches;

  function tandai(no: string | null) {
    akar.querySelectorAll<HTMLElement>(".pin").forEach((p) => p.classList.toggle("dibuka", p.dataset.zona === no));
    akar.dispatchEvent(new CustomEvent("panel-zona", { detail: { no } }));
  }

  function siapkanVideo(wadah: HTMLElement) {
    const v = wadah.querySelector<HTMLVideoElement>("video.zona-video");
    if (!v || !gerakBoleh()) return;
    const k = hpPanel() ? "hp" : "dk";
    const webm = v.dataset[`webm${k === "hp" ? "Hp" : "Dk"}` as "webmHp"];
    const mp4 = v.dataset[`mp4${k === "hp" ? "Hp" : "Dk"}` as "mp4Hp"];
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

  function buka(no: string, dari?: HTMLElement | null) {
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
    if (!dialog!.open) return;
    if (!gerakBoleh()) return selesaiTutup();
    dialog!.classList.remove("terbuka");
    anim?.kill();
    const hp = hpPanel();
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
    if (terkunci || dialog.classList.contains("terbuka")) selesaiTutup();
  });
  dialog.addEventListener("click", (e) => {
    if (e.target === dialog) tutup();
  });
}
