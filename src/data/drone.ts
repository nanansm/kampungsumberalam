/**
 * Video drone untuk hero, panel zona, dan klip Cerita beranda, dibaca dari kontrak
 * public/video/drone/manifest.json (diisi Penyunting Video) SAAT BUILD.
 *
 * Aturan: satu berkas baru dipakai kalau berkasnya benar-benar ada di public/.
 * Selama manifest belum lengkap, hero memakai video udara lama
 * (public/video/udara-*) dan panel zona memakai foto atau lensa peta.
 * Isi folder public/video/drone/ milik Penyunting Video, jangan diubah dari sini.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

export type Klip = {
  mp4?: string;
  webm?: string;
  poster?: string;
  posterAvif?: string;
  w: number;
  h: number;
};

const PUBLIK = join(process.cwd(), "public");
const ada = (p?: string | null) => !!p && existsSync(join(PUBLIK, p.replace(/^\//, "")));

function klip(x: any): Klip | undefined {
  if (!x || typeof x !== "object") return undefined;
  const mp4 = ada(x.mp4) ? x.mp4 : undefined;
  const webm = ada(x.webm) ? x.webm : undefined;
  if (!mp4 && !webm) return undefined;
  return {
    mp4,
    webm,
    poster: ada(x.poster) ? x.poster : undefined,
    posterAvif: ada(x.poster_avif) ? x.poster_avif : undefined,
    w: Number(x.w) || 1280,
    h: Number(x.h) || 720,
  };
}

function baca(): any {
  const f = join(PUBLIK, "video/drone/manifest.json");
  if (!existsSync(f)) return {};
  try {
    return JSON.parse(readFileSync(f, "utf8"));
  } catch {
    return {};
  }
}

const M = baca();

/** Cadangan: video udara lama yang sudah tayang di situs. */
const CADANGAN = {
  desktop: { mp4: "/video/udara-dk.mp4", webm: "/video/udara-dk.webm", w: 1280, h: 720 } as Klip,
  hp: { mp4: "/video/udara-hp.mp4", webm: "/video/udara-hp.webm", w: 540, h: 960 } as Klip,
};

const heroDk = klip(M?.hero?.desktop);
const heroDk1280 = klip(M?.hero?.desktop_1280);
const heroHp = klip(M?.hero?.hp);

export const HERO_VIDEO = {
  /** true kalau hero memakai klip drone baru dari manifest */
  baru: !!(heroDk || heroHp),
  desktop: heroDk ?? heroDk1280 ?? CADANGAN.desktop,
  desktopKecil: heroDk1280 ?? heroDk ?? CADANGAN.desktop,
  hp: heroHp ?? CADANGAN.hp,
};

/** Klip per zona, dikunci nomor zona ("02"). Hanya yang berkasnya sudah ada. */
export const KLIP_ZONA: Record<string, { desktop?: Klip; hp?: Klip; poster?: string }> = {};
for (const z of Array.isArray(M?.zona) ? M.zona : []) {
  const no = String(z?.no_zona ?? "").padStart(2, "0");
  if (!/^\d\d$/.test(no)) continue;
  const desktop = klip(z.desktop);
  const hp = klip(z.hp);
  if (!desktop && !hp) continue;
  KLIP_ZONA[no] = { desktop, hp, poster: ada(z.poster) ? z.poster : desktop?.poster ?? hp?.poster };
}

/** Klip Cerita beranda, dikunci nama di manifest `cerita` ("pembuka", "penutup"). Hanya yang berkasnya sudah ada.
 *  Terpisah dari KLIP_ZONA: klip zona tetap dipakai panel peta kawasan. */
export const KLIP_CERITA: Record<string, { desktop?: Klip; hp?: Klip; poster?: string }> = {};
const CERITA = M?.cerita && typeof M.cerita === "object" && !Array.isArray(M.cerita) ? M.cerita : {};
for (const [nama, c] of Object.entries(CERITA as Record<string, any>)) {
  const desktop = klip(c?.desktop);
  const hp = klip(c?.hp);
  if (!desktop && !hp) continue;
  KLIP_CERITA[nama] = { desktop, hp, poster: ada(c?.poster) ? c.poster : desktop?.poster ?? hp?.poster };
}
