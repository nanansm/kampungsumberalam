/**
 * Satu bahasa gerak untuk seluruh situs.
 *
 * - Gerak besar (kamera peta, panel, reveal judul): expo-out 1–1,5 dtk.
 * - Gerak kecil (hover, label, tombol): 0,3 dtk ease-out.
 * - Semua dimatikan atau disederhanakan saat prefers-reduced-motion.
 *
 * Modul ini satu-satunya tempat Lenis dan ScrollTrigger dipasang, supaya
 * peta, beranda, dan halaman dalam memakai satu instans yang sama.
 */
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { CustomEase } from "gsap/CustomEase";
import Lenis from "lenis";

gsap.registerPlugin(ScrollTrigger, CustomEase);

/** expo-out yang sama dengan CSS --ease-out: cubic-bezier(.19,1,.22,1) */
CustomEase.create("ksa", "0.19,1,0.22,1");
/** expo-in-out untuk perpindahan di layar: cubic-bezier(.87,0,.13,1) */
CustomEase.create("ksaIO", "0.87,0,0.13,1");

export const GERAK = {
  besar: 1.2,
  sedang: 0.8,
  kecil: 0.3,
};

const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
export const gerakBoleh = () => !mq.matches;
export const bermouse = () => window.matchMedia("(hover: hover) and (pointer: fine)").matches;

ScrollTrigger.config({ ignoreMobileResize: true });

let lenis: Lenis | null = null;

function pasangLenis() {
  if (lenis || !gerakBoleh()) return;
  lenis = new Lenis({
    lerp: 0.12,
    wheelMultiplier: 1,
    anchors: { offset: -64 },
    // gulir sentuh tetap bawaan HP: lebih jujur di jari, dan ringan
    syncTouch: false,
  });
  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add((t) => lenis?.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
}

export function dapatLenis() {
  return lenis;
}

/** Gulir ke posisi y. Lenis kalau ada, bawaan kalau tidak. */
export function gulirKe(y: number, opsi: { cepat?: boolean; durasi?: number } = {}) {
  if (lenis) {
    lenis.scrollTo(y, opsi.cepat ? { immediate: true, force: true } : { duration: opsi.durasi ?? 1.4, easing: (t) => 1 - Math.pow(1 - t, 4), force: true });
  } else {
    window.scrollTo({ top: y, behavior: opsi.cepat || !gerakBoleh() ? "auto" : "smooth" });
  }
}

let kunci = 0;
/** Kunci gulir halaman (dialog, menu). Bisa bertumpuk. */
export function kunciGulir() {
  kunci++;
  if (kunci > 1) return;
  lenis?.stop();
  document.documentElement.classList.add("terkunci");
}
export function lepasGulir() {
  kunci = Math.max(0, kunci - 1);
  if (kunci > 0) return;
  document.documentElement.classList.remove("terkunci");
  lenis?.start();
}

pasangLenis();
mq.addEventListener?.("change", () => {
  if (!gerakBoleh() && lenis) {
    lenis.destroy();
    lenis = null;
  } else pasangLenis();
  ScrollTrigger.refresh();
});

export { gsap, ScrollTrigger };
