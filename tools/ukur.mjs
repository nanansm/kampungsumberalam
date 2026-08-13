/**
 * Ukur luber horizontal + elemen yang melewati tepi viewport.
 * Pakai: node ukur.mjs <base-url>
 */
import puppeteer from "puppeteer-core";

const BASE = process.argv[2] || "http://127.0.0.1:4321";
const KROM = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const RUTE = ["/", "/accommodation/", "/meetings/", "/events/", "/gallery/", "/location/", "/about/"];
const LEBAR = [390, 393, 768, 1440];

const browser = await puppeteer.launch({
  executablePath: KROM,
  headless: "new",
  args: ["--hide-scrollbars", "--disable-gpu"],
});

let masalah = 0;
for (const rute of RUTE) {
  const baris = [];
  for (const lebar of LEBAR) {
    const p = await browser.newPage();
    await p.emulate({
      viewport: { width: lebar, height: lebar < 768 ? 844 : 900, deviceScaleFactor: 1, isMobile: lebar < 768, hasTouch: lebar < 768 },
      userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
    });
    await p.goto(BASE + rute, { waitUntil: "networkidle0" });
    const hasil = await p.evaluate(() => {
      const de = document.documentElement;
      const luber = de.scrollWidth - de.clientWidth;
      const pelaku = [];
      if (luber > 0) {
        for (const el of document.querySelectorAll("body *")) {
          const r = el.getBoundingClientRect();
          if (r.width === 0) continue;
          if (r.right > de.clientWidth + 1 || r.left < -1) {
            pelaku.push(`${el.tagName.toLowerCase()}.${(el.className || "").toString().split(" ").slice(0, 3).join(".")} L${Math.round(r.left)} R${Math.round(r.right)}`);
          }
        }
      }
      const gambarPecah = [...document.images].filter((i) => i.naturalWidth === 0).map((i) => i.getAttribute("src"));
      return { luber, pelaku: pelaku.slice(0, 4), gambarPecah, tinggi: de.scrollHeight };
    });
    baris.push({ lebar, ...hasil });
    await p.close();
  }
  const buruk = baris.filter((b) => b.luber > 0 || b.gambarPecah.length);
  if (buruk.length) masalah++;
  console.log(
    rute.padEnd(16),
    baris.map((b) => `${b.lebar}:${b.luber === 0 ? "ok" : "LUBER " + b.luber}${b.gambarPecah.length ? " IMG404 " + b.gambarPecah.length : ""}`).join("  ")
  );
  for (const b of buruk) for (const x of b.pelaku) console.log("   ", b.lebar, "->", x);
  for (const b of buruk) for (const x of b.gambarPecah) console.log("    img 404:", x);
}

await browser.close();
console.log(masalah === 0 ? "SEMUA BERSIH" : `${masalah} rute bermasalah`);
