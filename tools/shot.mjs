/**
 * Screenshot lewat EMULASI DEVICE, bukan --window-size.
 * Chrome di macOS punya lebar jendela minimum sekitar 500 px, jadi
 * --window-size=390 diam diam diabaikan dan yang terpotret adalah
 * layout desktop yang dikrop. Emulasi lewat CDP tidak punya masalah itu.
 *
 * Pakai: node tools/shot.mjs <url> <lebar> <keluaran.png> [--penuh]
 */
import puppeteer from "puppeteer-core";

const [url, lebarArg, keluaran, ...opsi] = process.argv.slice(2);
const lebar = Number(lebarArg) || 390;
const penuh = opsi.includes("--penuh");
const tinggi = lebar < 768 ? 844 : 900;

const KROM = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const browser = await puppeteer.launch({
  executablePath: KROM,
  headless: "new",
  args: ["--hide-scrollbars", "--disable-gpu"],
});

const halaman = await browser.newPage();
await halaman.emulate({
  viewport: {
    width: lebar,
    height: tinggi,
    deviceScaleFactor: 2,
    isMobile: lebar < 768,
    hasTouch: lebar < 768,
  },
  userAgent:
    lebar < 768
      ? "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
      : "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
});

// Gerak berbasis animation-timeline dimatikan supaya isinya terpotret penuh.
await halaman.emulateMediaFeatures([
  { name: "prefers-reduced-motion", value: "reduce" },
]);

// networkidle0 menggantung di situs yang memutar video atau menembak analitik
// terus menerus. Coba yang ketat dulu, lalu turun ke syarat yang longgar.
try {
  await halaman.goto(url, { waitUntil: "networkidle2", timeout: 25000 });
} catch {
  await halaman.goto(url, { waitUntil: "domcontentloaded", timeout: 25000 });
  await new Promise((r) => setTimeout(r, 3500));
}
await halaman.evaluate(() => document.fonts.ready).catch(() => {});

// Gambar loading=lazy tidak pernah dimuat kalau halaman tidak pernah digulir,
// sehingga tangkapan fullPage memperlihatkan bidang kosong di tempat foto.
// Gulir sampai bawah, tunggu semua gambar selesai, lalu balik ke atas.
if (penuh) {
  // Cabut loading=lazy lalu paksa muat ulang. Ini deterministik; menggulir
  // halaman lalu menunggu event load ternyata bisa menggantung.
  await halaman.evaluate(() => {
    for (const g of document.images) {
      g.loading = "eager";
      g.setAttribute("decoding", "sync");
      // menyentuh src memicu pemuatan untuk gambar yang tadinya ditunda
      g.src = g.src;
    }
  });
  await halaman
    .waitForFunction(
      () => Array.from(document.images).every((g) => g.complete),
      { timeout: 15000 }
    )
    .catch(() => console.log("catatan: sebagian gambar belum selesai dimuat"));
  await new Promise((r) => setTimeout(r, 400));
}

const ukur = await halaman.evaluate(() => ({
  lebarGulir: document.documentElement.scrollWidth,
  lebarLayar: window.innerWidth,
  tinggiTotal: document.documentElement.scrollHeight,
}));

console.log(
  `viewport ${ukur.lebarLayar}px | scrollWidth ${ukur.lebarGulir}px | tinggi halaman ${ukur.tinggiTotal}px`
);
if (ukur.lebarGulir > ukur.lebarLayar) {
  console.log(`⚠️  LUBER HORIZONTAL ${ukur.lebarGulir - ukur.lebarLayar}px`);
}

await halaman.screenshot({ path: keluaran, fullPage: penuh });
console.log("tersimpan:", keluaran);

await browser.close();
