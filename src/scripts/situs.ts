/**
 * Gerak seluruh situs: header, garis progres, reveal, parallax, kursor geser,
 * angka ulasan, menu. Dimuat di semua halaman lewat Situs.astro.
 */
import { gsap, ScrollTrigger, gerakBoleh, bermouse, kunciGulir, lepasGulir, dapatLenis } from "./gerak";
import { SplitText } from "gsap/SplitText";

gsap.registerPlugin(SplitText);
(window as any).__gerakSiap = true;

const html = document.documentElement;
const gerak = gerakBoleh() && html.classList.contains("gerak");

/* ---------- Header: bening di atas hero, lalu sembunyi saat turun, muncul saat naik ---------- */
function pasangHeader() {
  const hdr = document.querySelector<HTMLElement>(".hdr");
  if (!hdr) return;
  const hero = document.querySelector<HTMLElement>("[data-hero]");
  let atas = !!hero;
  let tampil = true;
  const set = () => {
    hdr.classList.toggle("di-hero", atas);
    hdr.classList.toggle("sembunyi", !tampil);
    html.classList.toggle("hdr-tampil", tampil && !atas);
  };
  if (hero) {
    ScrollTrigger.create({
      trigger: hero,
      start: "bottom top+=64",
      onEnter: () => { atas = false; set(); },
      onLeaveBack: () => { atas = true; tampil = true; set(); },
    });
  }
  let yLalu = window.scrollY;
  ScrollTrigger.create({
    start: 0,
    end: "max",
    onUpdate: (self) => {
      const y = self.scroll();
      const d = y - yLalu;
      yLalu = y;
      if (Math.abs(d) < 4) return;
      const baru = d < 0 || y < 80 || atas;
      if (baru !== tampil) {
        tampil = baru;
        set();
      }
    },
  });
  set();
}

/* ---------- Label GULIR di hero: memudar begitu halaman digulir > 40 px ----------
   (di layar pendek label itu ikut naik dan menimpa logo di header) */
function pasangGulirHero() {
  if (!document.querySelector(".hero-gulir")) return;
  let lewat = false;
  const cek = () => {
    const y = window.scrollY > 40;
    if (y === lewat) return;
    lewat = y;
    html.classList.toggle("gulir-lewat", y);
  };
  window.addEventListener("scroll", cek, { passive: true });
  cek();
}

/* ---------- Garis progres gulir ---------- */
function pasangProgres() {
  const g = document.querySelector<HTMLElement>(".garis-progres span");
  if (!g) return;
  ScrollTrigger.create({
    start: 0,
    end: "max",
    onUpdate: (self) => {
      g.style.transform = `scaleX(${self.progress.toFixed(4)})`;
    },
  });
}

/* ---------- Judul per baris: naik dari balik masker ----------
   SplitText membungkus tiap baris dengan overflow: clip setinggi kotak baris. Judul display
   memakai line-height 1.02–1.08, jadi ekor huruf (g, j, p, y), aksen, dan tonjolan sisi huruf
   serif keluar dari kotak itu dan terpotong rata. Pembungkus diganti klip clip-path yang melebar
   ke semua sisi (tata letak tidak bergeser), dan baris berangkat dari bawah tepi klip yang sudah
   melebar itu supaya tetap tersembunyi sebelum naik. */
const LEGA = { atas: 0.3, bawah: 0.36, sisi: 0.3 }; // em, mengikuti ukuran huruf judul

function judulPerBaris(el: HTMLElement) {
  SplitText.create(el, {
    type: "lines",
    mask: "lines",
    linesClass: "baris",
    autoSplit: true,
    onSplit(self) {
      (self.masks as HTMLElement[]).forEach((m) => {
        m.style.overflow = "visible";
        m.style.clipPath = `inset(-${LEGA.atas}em -${LEGA.sisi}em -${LEGA.bawah}em -${LEGA.sisi}em)`;
      });
      gsap.set(el, { opacity: 1 });
      return gsap.from(self.lines, {
        y: (_i: number, baris: HTMLElement) => baris.offsetHeight + parseFloat(getComputedStyle(baris).fontSize) * (LEGA.atas + LEGA.bawah),
        duration: 1.2,
        ease: "ksa",
        stagger: 0.09,
        scrollTrigger: { trigger: el, start: "top 88%", once: true },
      });
    },
  });
}

/* ---------- Reveal: judul per baris, teks naik pelan, gambar tersingkap ---------- */
function pasangReveal() {
  if (!gerak) return;
  document.querySelectorAll<HTMLElement>("[data-judul]").forEach(judulPerBaris);
  // lokasi (butir 2): luar kawasan meredup, garis batas digambar, lalu logo muncul
  document.querySelectorAll<HTMLElement>("#lokasi .guntur-isi").forEach((isi) => {
    const redam = isi.querySelectorAll(".lokasi-redam"), garis = isi.querySelectorAll(".lokasi-garis"), logo = isi.querySelector(".lokasi-logo");
    gsap.timeline({ scrollTrigger: { trigger: isi, start: "top 65%", once: true } })
      .fromTo(redam, { opacity: 0 }, { opacity: 0.62, duration: 0.9, ease: "ksa" }, 0)
      .fromTo(garis, { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 1.2, ease: "ksaIO" }, 0.1)
      .fromTo(logo, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.6, ease: "ksa" }, 0.7);
  });
  // pita bilik: tersingkap dari kiri sekali, marka logo muncul di akhir (butir 4)
  document.querySelectorAll<HTMLElement>("main .bilik, .ftr .bilik").forEach((el) => {
    const marka = el.querySelector(".bilik-marka");
    const tl = gsap.timeline({ scrollTrigger: { trigger: el, start: "top 92%", once: true } })
      .fromTo(el, { clipPath: "inset(0% 100% 0% 0%)" }, { clipPath: "inset(0% 0% 0% 0%)", duration: 1.1, ease: "ksa" });
    if (marka) tl.fromTo(marka, { opacity: 0 }, { opacity: 1, duration: 0.4, ease: "power1.out" }, ">-0.2");
  });
  // teks & blok kecil: naik 14px sambil muncul, berurutan per kelompok
  ScrollTrigger.batch("[data-muncul]", {
    start: "top 90%",
    once: true,
    onEnter: (els) =>
      gsap.fromTo(els, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.9, ease: "ksa", stagger: 0.07, overwrite: true }),
  });
  // gambar: tersingkap dari bawah, isi sedikit membesar lalu turun ke ukuran asli
  // data-singkap="halus" (babak malam): foto hanya 1,06 -> 1 selama 1,4 dtk, tanpa efek lain
  document.querySelectorAll<HTMLElement>("[data-singkap]").forEach((el) => {
    const isi = el.querySelector("img, video") ?? el;
    const halus = el.dataset.singkap === "halus";
    gsap.timeline({ scrollTrigger: { trigger: el, start: "top 88%", once: true } })
      .fromTo(el, { clipPath: "inset(0% 0% 100% 0%)" }, { clipPath: "inset(0% 0% 0% 0%)", duration: 1.3, ease: "ksa" }, 0)
      .fromTo(isi, { scale: halus ? 1.06 : 1.12 }, { scale: 1, duration: halus ? 1.4 : 1.6, ease: "ksa", clearProps: "transform" }, 0);
  });
  // isi yang menunggu judulnya selesai menyala kata demi kata (babak keyakinan): muncul saat
  // tepi bawah judul mencapai 45% layar, titik akhir gulir data-nyala
  document.querySelectorAll<HTMLElement>("[data-muncul-sesudah]").forEach((el) => {
    const judul = document.getElementById(el.dataset.munculSesudah || "") ?? el;
    ScrollTrigger.create({
      trigger: judul,
      start: "bottom 45%",
      once: true,
      onEnter: () => gsap.fromTo(el, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.9, ease: "ksa" }),
    });
  });
}

/* ---------- Halaman dalam: blok isi naik pelan, judul seksi per baris ---------- */
function pasangHalamanDalam() {
  if (!gerak) return;
  const hal = document.querySelector(".hal");
  if (!hal) return;
  hal.querySelectorAll<HTMLElement>(".judul-seksi").forEach((el) => {
    if (el.closest("[data-jalan]")) return;
    el.setAttribute("data-judul", "");
    judulPerBaris(el);
  });
  const blok = [...hal.querySelectorAll<HTMLElement>(".seksi > *")].filter((el) => !el.closest("[data-jalan]") && !el.matches(".judul-seksi"));
  ScrollTrigger.batch(blok, {
    start: "top 92%",
    once: true,
    onEnter: (els) => {
      gsap.fromTo(els, { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 1, ease: "ksa", stagger: 0.08, overwrite: true });
      // foto di dalam blok ikut turun pelan dari sedikit lebih besar: satu gerak, bukan dua
      els.forEach((el) => el.querySelectorAll("picture img").forEach((img) => gsap.fromTo(img, { scale: 1.07 }, { scale: 1, duration: 1.6, ease: "ksa", clearProps: "transform" })));
    },
  });
}

/* ---------- Paragraf yang menyala kata demi kata saat digulir ---------- */
function pasangNyala() {
  if (!gerak) return;
  document.querySelectorAll<HTMLElement>("[data-nyala]").forEach((el) => {
    SplitText.create(el, {
      type: "words",
      wordsClass: "kata-nyala",
      autoSplit: true,
      onSplit(self) {
        return gsap.fromTo(self.words, { opacity: 0.14 }, {
          opacity: 1,
          ease: "none",
          stagger: 0.06,
          scrollTrigger: { trigger: el, start: "top 80%", end: "bottom 45%", scrub: 0.6 },
        });
      },
    });
  });
}

/* ---------- Parallax ringan, hanya perangkat bermouse ---------- */
function pasangParallax() {
  if (!gerak) return;
  const mm = gsap.matchMedia();
  mm.add("(hover: hover) and (pointer: fine)", () => {
    document.querySelectorAll<HTMLElement>("[data-parallax]").forEach((el) => {
      const kuat = Number(el.dataset.parallax) || 8;
      const isi = el.querySelector("[data-parallax-isi]") ?? el.querySelector("picture, video, img") ?? el;
      // diperbesar sedikit supaya tepi gambar tidak pernah terlihat saat bergeser
      gsap.set(isi, { scale: 1 + (kuat * 2.2) / 100, transformOrigin: "50% 50%" });
      gsap.fromTo(isi, { yPercent: -kuat }, {
        yPercent: kuat,
        ease: "none",
        scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", scrub: 0.5 },
      });
    });
  });
}

/* ---------- Galeri geser: kursor berlabel + seret dengan mouse ---------- */
function pasangGeser() {
  const galeri = [...document.querySelectorAll<HTMLElement>(".geser")];
  if (!galeri.length) return;
  if (bermouse()) {
    const k = document.createElement("div");
    k.className = "kursor";
    k.setAttribute("aria-hidden", "true");
    k.innerHTML = '<span class="kursor-isi"><span class="kursor-tx"></span></span>';
    document.body.append(k);
    const tx = k.querySelector<HTMLElement>(".kursor-tx")!;
    const keX = gsap.quickTo(k, "x", { duration: 0.5, ease: "power3" });
    const keY = gsap.quickTo(k, "y", { duration: 0.5, ease: "power3" });
    window.addEventListener("pointermove", (e) => {
      keX(e.clientX);
      keY(e.clientY);
    }, { passive: true });
    galeri.forEach((g) => {
      g.addEventListener("pointerenter", (e) => {
        gsap.set(k, { x: e.clientX, y: e.clientY });
        tx.textContent = g.dataset.kursor || "Geser";
        k.classList.add("tampil");
      });
      g.addEventListener("pointerleave", () => k.classList.remove("tampil", "tekan"));
      // seret untuk menggeser
      let turun = false, x0 = 0, s0 = 0, gerakX = 0;
      g.addEventListener("pointerdown", (e) => {
        if (e.pointerType !== "mouse") return;
        turun = true;
        x0 = e.clientX;
        s0 = g.scrollLeft;
        gerakX = 0;
        g.classList.add("diseret");
        k.classList.add("tekan");
      });
      window.addEventListener("pointermove", (e) => {
        if (!turun) return;
        gerakX = e.clientX - x0;
        g.scrollLeft = s0 - gerakX;
      });
      window.addEventListener("pointerup", () => {
        if (!turun) return;
        turun = false;
        g.classList.remove("diseret");
        k.classList.remove("tekan");
      });
      g.addEventListener("click", (e) => {
        if (Math.abs(gerakX) > 6) {
          e.preventDefault();
          e.stopPropagation();
        }
      }, true);
    });
  }
  // nomor posisi geser (01 / 04) diperbarui saat galeri bergulir
  galeri.forEach((g) => {
    const nomor = g.parentElement?.querySelector<HTMLElement>("[data-geser-no]");
    if (!nomor) return;
    const kartu = [...g.children] as HTMLElement[];
    const hitung = () => {
      const kiri = g.getBoundingClientRect().left;
      let i = 0, best = Infinity;
      kartu.forEach((c, n) => {
        const d = Math.abs(c.getBoundingClientRect().left - kiri - parseFloat(getComputedStyle(g).paddingLeft));
        if (d < best) { best = d; i = n; }
      });
      nomor.textContent = String(i + 1).padStart(2, "0");
    };
    g.addEventListener("scroll", () => requestAnimationFrame(hitung), { passive: true });
  });
}

/* ---------- Angka ulasan menghitung naik sekali ---------- */
function pasangAngka() {
  if (!gerak) return;
  document.querySelectorAll<HTMLElement>("[data-angka]").forEach((el) => {
    const akhir = parseFloat((el.dataset.angka || "0").replace(",", "."));
    const koma = (el.dataset.angka || "").includes(",") ? "," : ".";
    const o = { v: Math.max(0, akhir - 1.2) };
    const tulis = () => (el.textContent = o.v.toFixed(1).replace(".", koma));
    tulis();
    gsap.to(o, { v: akhir, duration: 1.6, ease: "ksa", onUpdate: tulis, scrollTrigger: { trigger: el, start: "top 85%", once: true } });
  });
}

/* ---------- Menu layar penuh: gulir dikunci selama terbuka ---------- */
function pasangMenu() {
  const menu = document.getElementById("menu");
  if (!menu) return;
  menu.addEventListener("toggle", (e: any) => {
    if (e.newState === "open") {
      kunciGulir();
      if (gerak) {
        gsap.fromTo(menu.querySelectorAll("nav a, .menu-kontak > *:not(.goresan), .kecil"), { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.9, ease: "ksa", stagger: 0.04, delay: 0.1 });
        const foto = menu.querySelector(".menu-foto");
        if (foto) gsap.fromTo(foto, { clipPath: "inset(0% 0% 100% 0%)" }, { clipPath: "inset(0% 0% 0% 0%)", duration: 1.2, ease: "ksa", delay: 0.18 });
        menu.querySelectorAll(".goresan").forEach((g) => g.classList.add("tergores"));
      }
    } else lepasGulir();
  });
  // tautan jangkar di menu: tutup menu dulu, lalu gulir
  menu.querySelectorAll<HTMLAnchorElement>("a[href*='#']").forEach((a) =>
    a.addEventListener("click", () => (menu as any).hidePopover?.()),
  );
}

/* ---------- Goresan kampung: dilukis sekali saat masuk layar ---------- */
function pasangGoresan() {
  if (!gerak) return;
  const io = new IntersectionObserver(
    (es) => es.forEach((e) => {
      if (!e.isIntersecting) return;
      e.target.classList.add("tergores");
      io.unobserve(e.target);
    }),
    { rootMargin: "0px 0px -12% 0px" },
  );
  document.querySelectorAll(".goresan").forEach((g) => {
    if (!g.closest("#menu")) io.observe(g);
  });
}

pasangHeader();
pasangProgres();
pasangGoresan();
pasangGulirHero();
pasangReveal();
pasangHalamanDalam();
pasangNyala();
pasangParallax();
pasangGeser();
pasangAngka();
pasangMenu();

// tata letak berubah saat font selesai dimuat: hitung ulang posisi pemicu
document.fonts?.ready.then(() => ScrollTrigger.refresh());
void dapatLenis;
