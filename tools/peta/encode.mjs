// Encode hasil tools/peta/bangun.py + uap.py ke public/peta/ (AVIF/WebP).
import sharp from "sharp";
import { readdirSync, existsSync, mkdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const DIR = dirname(fileURLToPath(import.meta.url));
const KERJA = join(DIR, "_kerja");
const OUT = join(DIR, "../../public/peta");
mkdirSync(OUT, { recursive: true });
const kb = (f) => (statSync(f).size / 1024).toFixed(0) + " KB";

const dasar = join(KERJA, "dasar.png");
for (const w of [2560, 1600]) {
  const a = join(OUT, `peta-${w}.avif`), b = join(OUT, `peta-${w}.webp`);
  await sharp(dasar).resize(w).avif({ quality: 58, effort: 6 }).toFile(a);
  await sharp(dasar).resize(w).webp({ quality: 80, effort: 6 }).toFile(b);
  console.log(`peta-${w}`, kb(a), kb(b));
}
let total = 0;
for (const f of readdirSync(KERJA).filter((x) => x.startsWith("ubin-") && x.endsWith(".png")).sort()) {
  const o = join(OUT, f.replace(".png", ".webp"));
  await sharp(join(KERJA, f)).webp({ quality: 80, effort: 6 }).toFile(o);
  total += statSync(o).size;
}
console.log("ubin total", (total / 1024).toFixed(0), "KB");
let lensa = 0;
for (const f of readdirSync(KERJA).filter((x) => x.startsWith("lensa-") && x.endsWith(".png")).sort()) {
  const o = join(OUT, f.replace(".png", ".webp"));
  await sharp(join(KERJA, f)).resize(720).webp({ quality: 78, effort: 6 }).toFile(o);
  lensa += statSync(o).size;
}
console.log("lensa total", (lensa / 1024).toFixed(0), "KB");
for (const n of ["uap-kiri", "uap-kanan", "uap-tengah"]) {
  const src = join(OUT, `${n}.png`);
  if (!existsSync(src)) continue;
  const o = join(OUT, `${n}.webp`);
  await sharp(src).resize(1200).webp({ quality: 70, alphaQuality: 70, effort: 6 }).toFile(o);
  console.log(n, kb(o));
}
