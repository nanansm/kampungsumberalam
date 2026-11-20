/**
 * Rapihkan rag: kelompok makna yang tidak boleh terpisah di akhir baris
 * (nama tempat, nama produk, angka + satuan) disambung spasi tak putus.
 * Dipakai untuk teks yang tampil di peta, panel, dan peta perjalanan.
 */
const NAMA = [
  "Kolam Renang Tasik Madu", "Restoran Tunjung Balebat", "Restoran Ligar Wangi", "Kampung Sumber Alam",
  "Saung Tegal Pangulinan", "Tegal Pangulinan", "Babakan Siluhur", "Purba Dewata", "Intan Dewata", "Ligar Wangi",
  "Pondok Kalapa", "Suite Couple", "Suite Room", "Suite Arileu", "Junior Suite", "Jr Suite", "Bungalow Siceeh",
  "Bungalow Arileu", "Villa Sibentang", "Villa Kawung", "Kamar Rendam", "Gunung Guntur", "Jl. Raya Cipanas",
  "Tasik Madu", "Tunjung Balebat", "private pool", "private whirlpool", "Thermal Reset 2D1N", "Swim & Grill",
  "Suki & Grill", "fun games", "mini outbond", "connecting door", "Pintu masuk", "Mount Guntur",
  "Wilujeng Sumping", "di antara",
];
const NBSP = " ";
const pola = new RegExp(NAMA.map((n) => n.replace(/[.*+?^${}()|[\]\\&]/g, "\\$&")).join("|"), "g");

/** rentang (Minggu–Jumat, 15–40, 60–70 m) tidak boleh patah di tanda pisahnya */
const WJ = "\u2060";
const rentang = (t: string) => t.replace(/(\S)–(\S)/g, `$1${WJ}–${WJ}$2`);

/** angka + satuan dan rentang saja; dipakai untuk paragraf isi di kolom sempit
 *  (menyambung nama panjang di paragraf justru membuat sisi kanan timpang) */
export function lekatAngka(t: string): string {
  return rentang(t)
    .replace(/(±?\d[\d.,:–\u2060-]*) (m|menit|min|jam|hr|orang|dewasa|adults|unit|units|villa|villas|WIB|am|pm|noon)\b/g, `$1${NBSP}$2`)
    .replace(/\b(Rp|pukul) (\d)/g, `$1${NBSP}$2`)
    .replace(/ · /g, `${NBSP}· `);
}

export function lekat(t: string): string {
  // nama tidak dipatah, angka + satuan tidak dipatah, dan baris terakhir tidak berisi satu kata
  return ekor(lekatAngka(t.replace(pola, (m) => m.replace(/ /g, NBSP))));
}

/**
 * Cegah kata yatim: dua kata terakhir disambung spasi tak putus, jadi baris
 * terakhir tidak pernah berisi satu kata saja (berlaku juga di Safari yang
 * belum mendukung text-wrap: pretty). Kata terakhir yang panjang dibiarkan.
 */
export function ekor(t: string): string {
  const i = t.lastIndexOf(" ");
  if (i < 0 || t.lastIndexOf(NBSP) > i) return t; // sudah tersambung: jangan menyambung kata ketiga
  const akhir = t.slice(i + 1);
  if (akhir.length > 14) return t;
  return t.slice(0, i) + NBSP + akhir;
}
/**
 * Judul satu kalimat pendek: seperti lekat, tetapi selalu menyisakan satu titik patah.
 * "Wilujeng Sumping, welcome." setelah nama dan ekor disambung menjadi satu blok utuh
 * yang meluber di layar sempit; lebih baik patah di koma daripada keluar kolom.
 */
export function lekatJudul(t: string): string {
  const r = lekat(t);
  if (r.includes(" ") || r.length <= 18) return r;
  return lekatAngka(t.replace(pola, (m) => m.replace(/ /g, NBSP)));
}
/**
 * Judul dua baris menurut makna: semua spasi di tiap kelompok disambung, satu titik patah
 * tersisa tepat sesudah `pemisah`. "Kampung Sumber Alam" / "berada di Cipanas, Garut".
 * Kalau pemisah tidak ditemukan, jatuh ke lekat() biasa.
 */
export function duaBaris(t: string, pemisah: string): string {
  const i = t.indexOf(pemisah);
  if (i < 0) return lekat(t);
  const a = t.slice(0, i + pemisah.length).trim(), b = t.slice(i + pemisah.length).trim();
  if (!b) return lekat(t);
  const sambung = (x: string) => lekatAngka(x).replace(/ /g, NBSP);
  return `${sambung(a)} ${sambung(b)}`;
}
/**
 * Judul yang patahnya diatur per kelompok makna: spasi di dalam tiap frasa `grup` disambung
 * spasi tak putus, jadi text-wrap: balance hanya boleh mematahkan baris di antara kelompok.
 * Kata-katanya tidak berubah. Frasa yang tidak ditemukan diabaikan (teks berganti: jatuh ke lekat).
 */
export function kelompokJudul(t: string, grup: string[] = []): string {
  let r = t;
  let kena = 0;
  for (const g of grup) {
    if (!r.includes(g)) continue;
    kena++;
    r = r.replace(g, g.replace(/ /g, NBSP));
  }
  return kena ? lekatAngka(r) : lekatJudul(t);
}
/** lekat + ekor: untuk judul, keterangan foto, dan baris pendek */
export const rapi = (t: string) => ekor(lekat(t));
/** untuk paragraf isi: angka & rentang disambung, nama boleh patah, tanpa kata yatim */
export const rapiIsi = (t: string) => ekor(lekatAngka(t));
