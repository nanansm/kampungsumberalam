/**
 * Dasar peta dari foto udara drone (kontrak dengan Penyunting Video).
 *
 * Kalau `public/peta/foto-udara/zona.json` ada saat build, peta kawasan memakai foto
 * udara sebagai dasar. Kalau belum ada, peta memakai ilustrasi isometrik Opsi E.
 * Folder itu milik Penyunting Video: berkas ini hanya MEMBACA, tidak pernah menulis.
 *
 * Kontrak versi 1 (20 Nov 2026), satu plat:
 *   ukuran.berkas = { avif_2560: {src,w,h}, webp_2560, avif_1440, webp_1440, avif_hp, webp_hp, jpg_4800 }
 *   zona = [{ no, x, y, yakin, di_luar_foto?, arah? }]   x/y = PERSEN lebar/tinggi foto
 *   batas_kawasan.poligon = [[[x,y], …], …]              persen, boleh di luar 0–100
 *
 * Kontrak berikutnya (diumumkan 20 Nov): dua plat, plat utama dan plat area belakang.
 *   plat = [{ id|nama, ukuran.berkas|berkas, batas_kawasan? }, …]  dan  zona[].plat = id atau indeks.
 * Pembaca dibuat longgar untuk keduanya: plat tanpa berkas memakai berkas di akar (plat 0),
 * zona tanpa field plat masuk plat 0, zona tanpa x/y atau di_luar_foto tidak digambar di peta
 * (tetap ada di chip dan daftar zona).
 */
import fs from "node:fs";
import path from "node:path";

export type Titik = { x: number; y: number };
export type SumberFoto = { avif?: string; webp?: string; jpg?: string };
export type PlatFoto = {
  id: string;
  lebar: number;
  tinggi: number;
  dk: SumberFoto;
  hp: SumberFoto;
  /** versi lebih tajam, dimuat hanya saat kamera memperbesar */
  tajam: { dk?: string; hp?: string };
  /** garis batas kawasan (satuan dunia plat ini) */
  batas: Titik[][];
};
export type TitikZona = Titik & { plat: number; yakin: boolean };
export type FotoUdara = {
  plat: PlatFoto[];
  /** titik zona per nomor (bisa lebih dari satu), masing-masing dengan platnya */
  titik: Record<string, TitikZona[]>;
  /** zona di luar semua plat: arahnya, dan plat tempat arah itu diukur (null = tidak diketahui) */
  luar: Record<string, { arah: string; plat: number | null }>;
};

const DIR = process.env.KSA_FOTO_UDARA_DIR || path.resolve("public/peta/foto-udara");

const noZona = (v: unknown) => {
  const m = String(v ?? "").match(/\d+/);
  return m ? m[0].padStart(2, "0") : "";
};

type Berkas = Record<string, { src: string; w: number; h: number }>;

function platDari(id: string, berkas: Berkas | undefined, poligon: number[][][] | undefined): PlatFoto | null {
  if (!berkas || typeof berkas !== "object") return null;
  const daftar = Object.entries(berkas).filter(([, b]) => b && typeof b.src === "string");
  const cari = (re: RegExp) => daftar.find(([k]) => re.test(k))?.[1];
  const ada = (b?: { src: string }) => (b && fs.existsSync(path.join(DIR, path.basename(b.src))) ? b.src : undefined);
  const acuan = cari(/2560/) ?? daftar.map(([, b]) => b).filter((b) => b.w && b.h).sort((a, b) => b.w - a.w)[0];
  if (!acuan?.w || !acuan?.h) return null;
  const dk: SumberFoto = { avif: ada(cari(/^avif_2560|avif.*2560/)), webp: ada(cari(/^webp_2560|webp.*2560/)) };
  if (!dk.avif && !dk.webp) dk.jpg = ada(acuan);
  const hpA: SumberFoto = { avif: ada(cari(/^avif_hp|avif.*hp/)), webp: ada(cari(/^webp_hp|webp.*hp/)) };
  const hp = hpA.avif || hpA.webp ? hpA : dk;
  if (!dk.avif && !dk.webp && !dk.jpg) return null;
  const lebar = acuan.w, tinggi = acuan.h;
  const ke = (x: number, y: number) => ({ x: (x / 100) * lebar, y: (y / 100) * tinggi });
  return {
    id,
    lebar,
    tinggi,
    dk,
    hp,
    tajam: { dk: ada(cari(/4800/)) ?? ada(cari(/^jpg/)), hp: dk.avif ?? dk.webp },
    batas: (poligon ?? []).map((pg) => pg.map(([x, y]) => ke(x, y))),
  };
}

export function bacaFotoUdara(): FotoUdara | null {
  const berkasJson = path.join(DIR, "zona.json");
  if (!fs.existsSync(berkasJson)) return null;
  let j: any;
  try {
    j = JSON.parse(fs.readFileSync(berkasJson, "utf8"));
  } catch (e) {
    console.warn(`[peta] zona.json foto udara tidak bisa dibaca, peta isometrik dipakai: ${(e as Error).message}`);
    return null;
  }
  if (!Array.isArray(j.zona)) return null;

  // plat: daftar plat kalau ada, kalau tidak satu plat dari akar
  const akar = platDari("utama", j.ukuran?.berkas ?? j.berkas, j.batas_kawasan?.poligon);
  const plat: PlatFoto[] = [];
  if (Array.isArray(j.plat) && j.plat.length) {
    j.plat.forEach((p: any, i: number) => {
      const id = String(p?.id ?? p?.nama ?? p?.kode ?? i);
      const dibaca = platDari(id, p?.ukuran?.berkas ?? p?.berkas ?? p?.gambar, p?.batas_kawasan?.poligon ?? p?.poligon ?? (i === 0 ? j.batas_kawasan?.poligon : undefined));
      if (dibaca) plat.push(dibaca);
      else if (i === 0 && akar) plat.push({ ...akar, id });
      else console.warn(`[peta] plat "${id}" belum lengkap (berkas foto belum ada), zonanya tidak digambar`);
    });
  } else if (akar) plat.push(akar);
  if (!plat.length) {
    console.warn("[peta] zona.json foto udara belum punya berkas foto yang lengkap, peta isometrik dipakai.");
    return null;
  }

  const indeksPlat = (v: unknown) => {
    if (v == null || v === "") return 0;
    const n = typeof v === "number" ? v : /^\d+$/.test(String(v)) ? Number(v) : NaN;
    if (Number.isFinite(n)) return n < plat.length ? n : -1;
    return plat.findIndex((p) => p.id === String(v));
  };
  const titik: Record<string, TitikZona[]> = {};
  const luar: Record<string, { arah: string; plat: number | null }> = {};
  for (const z of j.zona) {
    const no = noZona(z.no ?? z.id ?? z.zona);
    if (!no) continue;
    const pi = indeksPlat(z.plat);
    const p = plat[pi];
    if (z.di_luar_foto || z.x == null || z.y == null || !p) {
      // arah_dari_plat_<id>: arah zona dilihat dari plat tertentu (kontrak versi 2)
      const kunci = Object.keys(z).find((k) => /^arah_dari_plat_/.test(k));
      const platArah = kunci ? plat.findIndex((q) => q.id === kunci.replace(/^arah_dari_plat_/, "")) : -1;
      luar[no] = { arah: String((kunci ? z[kunci] : z.arah) ?? "kanan"), plat: platArah >= 0 ? platArah : null };
      continue;
    }
    (titik[no] ??= []).push({ x: (Number(z.x) / 100) * p.lebar, y: (Number(z.y) / 100) * p.tinggi, plat: pi, yakin: z.yakin !== false });
  }
  if (!Object.keys(titik).length) return null;
  return { plat, titik, luar };
}
