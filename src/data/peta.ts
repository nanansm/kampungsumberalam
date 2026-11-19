/**
 * Data peta kawasan interaktif di beranda.
 *
 * Sumber semua nama, jarak, kapasitas, dan harga: Data Master KSA FINAL
 * (9 Nov 2026) bab 02 §3 (21 zona), bab 03 (kamar), bab 04 §2–3 (kolam),
 * bab 05 §1 (ruang meeting), bab 06 (makan), bab 09 (Sibentang).
 * Koordinat titik: src/data/peta-titik.json, dibangun tools/peta/bangun.py
 * dari Peta Ilustrasi KSA Opsi E (satuan = unit SVG dari pojok potongan).
 *
 * Aturan yang dijaga di sini:
 * - Nama zona dan nama produk ditulis persis seperti Data Master.
 * - Kamar KSA induk boleh "mulai Rp…" (Publish Rate weekday) + WhatsApp.
 * - Villa Sibentang TANPA harga (Data Master bab 09 §9.3), tombolnya ke situs Sibentang.
 * - Zona 19 (Bungalow 15–40) tidak disebut Bungalow Siceeh: pasangan itu
 *   baru disimpulkan MOTE dan masih di Daftar Konfirmasi ke KSA (no. 17).
 */
import titikJson from "./peta-titik.json";
import { KAMAR, SIBENTANG_URL } from "./content";

export type Dua = { id: string; en: string };
export type Kelompok = "kedatangan" | "fasilitas" | "penginapan";
/** posisi label nama terhadap kepala titik */
export type Arah = "kanan" | "kiri" | "atas" | "bawah";

export type Zona = {
  no: string;
  slug: string;
  /** nama zona persis Data Master bab 02 §3 */
  nama: string;
  /** nama pendek untuk label di atas peta */
  label: string;
  kelompok: Kelompok;
  henti: number;
  arah: Arah;
  isi: Dua;
  fakta: Dua[];
  /** slug KAMAR di content.ts kalau zona ini kamar KSA induk */
  kamar?: string;
  /** false = kamar tidak dijual di booking engine DIP (Data Master bab 03 §6) */
  dip?: boolean;
  cta: "wa" | "sibentang" | "rapat";
  /** kunci foto di src/assets/peta/ (tanpa ekstensi); kosong = lensa peta */
  foto?: string;
  fotoAlt?: Dua;
  /** titik tambahan (zona yang tersebar), indeks di peta-titik.json */
  x: number;
  y: number;
  titikLain?: { x: number; y: number }[];
};

export type Henti = {
  id: string;
  label: Dua;
  judul: Dua;
  teks: Dua;
  /** pusat pandang kamera dan ukuran kotak yang harus muat di layar, unit SVG */
  cx: number;
  cy: number;
  vw: number;
  vh: number;
  foto: string;
  fotoAlt: Dua;
};

type Titik = { no: string; x: number; y: number };
const T = titikJson.titik as Titik[];
const pakai = (no: string, ke = 0) => {
  const t = T.filter((p) => p.no === no);
  if (!t[ke]) throw new Error(`Titik zona ${no}#${ke} tidak ada di peta-titik.json`);
  return t[ke];
};
const lain = (no: string, kecuali: number) => T.filter((p) => p.no === no).filter((_, i) => i !== kecuali).map(({ x, y }) => ({ x, y }));

export const DUNIA = { lebar: titikJson.lebar, tinggi: titikJson.tinggi, kolom: titikJson.kolom, baris: titikJson.baris };
export const PINTU_MASUK = titikJson.pintuMasuk;

const z = (no: string, ke: number, d: Omit<Zona, "no" | "x" | "y" | "titikLain">): Zona => {
  const p = pakai(no, ke);
  const tl = lain(no, ke);
  return { no, x: p.x, y: p.y, ...(tl.length ? { titikLain: tl } : {}), ...d };
};

const jarak = (m: string): Dua => ({ id: `±${m} m jalan kaki dari Lobby`, en: `±${m} m on foot from the Lobby` });

export const ZONA: Zona[] = [
  /* ---------- 1 · Datang ---------- */
  z("06", 0, {
    slug: "area-parkir", nama: "Area Parkir", label: "Area Parkir", kelompok: "kedatangan", henti: 0, arah: "kiri",
    isi: {
      id: "Mobil masuk lewat gerbang pergola kayu di Jl. Raya Cipanas, lalu parkir gratis di halaman berlantai paving yang menghadap Lobby.",
      en: "Cars come in through the timber pergola gate on Jl. Raya Cipanas and park for free on the paved yard facing the Lobby.",
    },
    fakta: [
      { id: "Free Parking Area", en: "Free Parking Area" },
      { id: "Gerbang: lajur masuk di sisi barat, lajur keluar di sisi timur", en: "Gate: entry lane on the west side, exit lane on the east" },
    ],
    cta: "wa",
  }),
  z("01", 0, {
    slug: "lobby", nama: "Lobby", label: "Lobby", kelompok: "kedatangan", henti: 0, arah: "kanan",
    isi: {
      id: "Lobby berdiri sedikit lebih tinggi dari parkir, jadi tamu naik dulu lewat tangga tengah atau ramp di sisi barat. Lantai bawah Lobby berdinding bata merah, lantai atasnya papan kayu, dan atapnya ijuk bertingkat. Resepsionis Lobby buka 24 jam.",
      en: "The Lobby sits a little above the car park, so guests walk up the central steps or the ramp on the west side. Its lower floor is red brick, its upper floor timber boards, and its roof tiered ijuk (palm-fibre thatch). The Lobby reception is open 24 hours.",
    },
    fakta: [
      { id: "Check-in 14.00 WIB · check-out 12.00 WIB", en: "Check-in 14.00 WIB · check-out 12.00 WIB" },
      { id: "24 Hour Concierge", en: "24 Hour Concierge" },
    ],
    cta: "wa",
  }),
  z("05", 0, {
    slug: "saung-sunyaruri", nama: "Saung Sunyaruri", label: "Saung Sunyaruri", kelompok: "fasilitas", henti: 0, arah: "bawah",
    isi: {
      id: "Saung Sunyaruri berupa satu saung di tengah yang dikelilingi saung-saung kecil, di antara Villa Kawung, Lobby, dan Area Parkir.",
      en: "Saung Sunyaruri is one central saung (an open-sided hut) ringed by smaller ones, between Villa Kawung, the Lobby and the car park.",
    },
    fakta: [{ id: "Gugus saung terbuka", en: "A cluster of open-sided huts" }],
    cta: "wa",
  }),
  z("07", 0, {
    slug: "villa-kawung", nama: "Villa Kawung 1–5 · 6–10", label: "Villa Kawung", kelompok: "penginapan", henti: 0, arah: "atas",
    isi: {
      id: "Kawung punya dua lantai: tempat tidur di atas, ruang duduk lesehan di bawah. Dari Kawung, kolam renang dan Kamar Rendam tinggal jalan kaki.",
      en: "Kawung has two floors: the bed upstairs, a floor-seating lounge (lesehan) downstairs. From Kawung, the swimming pool and Kamar Rendam are a short walk away.",
    },
    fakta: [
      { id: "10 unit · 2 dewasa · Queen Size", en: "10 units · 2 adults · Queen Size" },
      jarak("70"),
      { id: "Kelas kamar: Thermal Studio", en: "Room class: Thermal Studio" },
    ],
    kamar: "kawung", cta: "wa", foto: "kawung",
    fotoAlt: { id: "Lorong di antara deret Kawung, dengan kolam ikan kecil di tengahnya", en: "The walkway between the Kawung rows, with a small fish pond down the middle" },
  }),
  z("08", 0, {
    slug: "pondok-kalapa", nama: "Pondok Kalapa 1–4", label: "Pondok Kalapa", kelompok: "penginapan", henti: 0, arah: "atas",
    isi: {
      id: "Pondok Kalapa terdiri dari empat bungalow satu lantai di area depan, dekat kolam renang dan Kamar Rendam.",
      en: "Pondok Kalapa is four single-storey bungalows at the front of the grounds, close to the swimming pool and Kamar Rendam.",
    },
    fakta: [
      { id: "4 unit · 2 dewasa · Queen Size", en: "4 units · 2 adults · Queen Size" },
      jarak("60"),
      { id: "Kelas kamar: Thermal Bungalow", en: "Room class: Thermal Bungalow" },
    ],
    kamar: "pondok-kalapa", cta: "wa", foto: "pondok-kalapa",
    fotoAlt: { id: "Bungalow kayu Pondok Kalapa dengan teras dan tanaman", en: "A Pondok Kalapa timber bungalow with its terrace and plants" },
  }),

  /* ---------- 2 · Berendam ---------- */
  z("02", 0, {
    slug: "kolam-tasik-madu", nama: "Kolam Renang Tasik Madu", label: "Kolam Renang Tasik Madu", kelompok: "fasilitas", henti: 1, arah: "kanan",
    isi: {
      id: "Kolam Renang Tasik Madu berisi air panas alami dan terbuka untuk umum. Tamu yang menginap sudah dapat tiket kolam renang dan Kamar Rendam.",
      en: "Kolam Renang Tasik Madu is filled with natural hot spring water and open to the public. Overnight guests already have swimming pool and Kamar Rendam tickets.",
    },
    fakta: [
      { id: "Tiket Kolam Renang: Rp40.000 weekday · Rp50.000 weekend per orang", en: "Tiket Kolam Renang: Rp40,000 weekday · Rp50,000 weekend per person" },
      { id: "Kamar Rendam: Rp50.000 per 25 menit, sudah dengan bandrek atau bajigur", en: "Kamar Rendam: Rp50,000 per 25 minutes, with bandrek or bajigur (warm Sundanese drinks)" },
    ],
    cta: "wa", foto: "kolam-tasik-madu",
    fotoAlt: { id: "Kolam Renang Tasik Madu berkanopi dengan Gunung Guntur di belakangnya", en: "Kolam Renang Tasik Madu under its canopy, with Mount Guntur behind it" },
  }),
  z("03", 0, {
    slug: "restoran-tunjung-balebat", nama: "Restoran Tunjung Balebat", label: "Restoran Tunjung Balebat", kelompok: "fasilitas", henti: 1, arah: "kiri",
    isi: {
      id: "Restoran Tunjung Balebat berdiri di tepi kolam renang. Paket Swim & Grill juga berlangsung di Restoran Tunjung Balebat: berenang dulu, lalu makan satu set Suki & Grill.",
      en: "Restoran Tunjung Balebat stands on the edge of the swimming pool. Swim & Grill also happens at Restoran Tunjung Balebat: a swim first, then a Suki & Grill set.",
    },
    fakta: [
      { id: "Resto & Room Service 06.30–21.30", en: "Resto & Room Service 06.30–21.30" },
      { id: "Swim & Grill: Rp100.000 per orang, minimal 4 orang, weekday, 3 jam", en: "Swim & Grill: Rp100,000 per person, minimum 4, weekdays, 3 hours" },
    ],
    cta: "wa", foto: "restoran-tunjung",
    fotoAlt: { id: "Ruang makan Restoran Tunjung Balebat berdinding kayu", en: "The timber-walled dining room of Restoran Tunjung Balebat" },
  }),
  z("04", 0, {
    slug: "ruang-intan-dewata", nama: "Ruang Intan Dewata", label: "Ruang Intan Dewata", kelompok: "fasilitas", henti: 1, arah: "bawah",
    isi: {
      id: "Ruang Intan Dewata berada di sisi kolam renang dan bisa dipakai separuh (Intan Dewata 1 atau 2) atau penuh.",
      en: "Ruang Intan Dewata sits beside the swimming pool and can be used in halves (Intan Dewata 1 or 2) or as one full room.",
    },
    fakta: [
      { id: "Intan Dewata Full: U-Shape 70 · Round Table 54 · Standing 150", en: "Intan Dewata Full: U-Shape 70 · Round Table 54 · Standing 150" },
      { id: "Intan Dewata 2: Theatre 50 · Classroom 40", en: "Intan Dewata 2: Theatre 50 · Classroom 40" },
    ],
    cta: "rapat",
  }),
  z("09", 0, {
    slug: "suite-couple", nama: "Suite Couple 1 & 2", label: "Suite Couple", kelompok: "penginapan", henti: 1, arah: "atas",
    isi: {
      id: "Suite Couple terdiri dari dua suite bersebelahan dengan connecting door. Tiap suite punya kamar privat di bawah, kamar terbuka di atas, dan private whirlpool. Dari semua kamar, Suite Couple paling dekat ke kolam renang dan Kamar Rendam.",
      en: "Suite Couple is two side-by-side suites with a connecting door. Each suite has a private room downstairs, an open room upstairs and a private whirlpool. Of all the rooms, Suite Couple is closest to the pool and Kamar Rendam.",
    },
    fakta: [
      { id: "2 unit · 4 dewasa · Queen Size", en: "2 units · 4 adults · Queen Size" },
      jarak("30"),
      { id: "Kelas kamar: Thermal Pool Suite", en: "Room class: Thermal Pool Suite" },
    ],
    kamar: "suite-couple", dip: false, cta: "wa", foto: "suite-couple",
    fotoAlt: { id: "Suite Couple beratap ijuk dengan jalan setapak di atas balong", en: "Suite Couple under its thatched roof, with a path over the balong" },
  }),

  /* ---------- 3 · Di atas balong ---------- */
  z("10", 1, {
    slug: "bungalow-1-14", nama: "Bungalow 1–4 · 5–8 · 9–14", label: "Bungalow 1–14", kelompok: "penginapan", henti: 2, arah: "kiri",
    isi: {
      id: "Bungalow 1–14 berupa bungalow satu lantai dalam tiga deret yang berdiri di atas balong. Dari teras, kamu turun ke jalan setapak di antara kolam.",
      en: "Bungalow 1–14 are single-storey bungalows in three rows, standing over the balong. From the terrace you step down onto the paths between the ponds.",
    },
    fakta: [
      { id: "14 unit · 2 dewasa · Queen Size", en: "14 units · 2 adults · Queen Size" },
      jarak("100"),
      { id: "Kelas kamar: Thermal Bungalow", en: "Room class: Thermal Bungalow" },
    ],
    kamar: "bungalow-1-14", cta: "wa", foto: "bungalow-1-14",
    fotoAlt: { id: "Deret Bungalow 1-14 di atas balong berdaun teratai", en: "A row of Bungalow 1-14 over a balong covered in lily pads" },
  }),
  z("11", 0, {
    slug: "suite-room", nama: "Suite Room 1 & 2", label: "Suite Room", kelompok: "penginapan", henti: 2, arah: "bawah",
    isi: {
      id: "Suite Room terdiri dari dua suite dengan connecting door, dekat koridor kolam. Tiap suite punya kamar privat di bawah, kamar terbuka di atas, dan private whirlpool.",
      en: "Suite Room is two suites with a connecting door, near the pool corridor. Each suite has a private room downstairs, an open room upstairs and a private whirlpool.",
    },
    fakta: [
      { id: "2 unit · 4 dewasa · Queen Size", en: "2 units · 4 adults · Queen Size" },
      jarak("100"),
      { id: "Kelas kamar: Thermal Pool Suite", en: "Room class: Thermal Pool Suite" },
    ],
    kamar: "suite-room", cta: "wa", foto: "suite-room",
    fotoAlt: { id: "Suite Room beratap ijuk di antara pepohonan", en: "Suite Room under its thatched roof among the trees" },
  }),
  z("12", 0, {
    slug: "taman-sangkuriang", nama: "Taman Sangkuriang", label: "Taman Sangkuriang", kelompok: "fasilitas", henti: 2, arah: "atas",
    isi: {
      id: "Taman Sangkuriang berupa lapangan rumput di antara deret Bungalow 5–8 dan Bungalow 9–14.",
      en: "Taman Sangkuriang is a grass lawn between the Bungalow 5–8 and Bungalow 9–14 rows.",
    },
    fakta: [{ id: "Lapangan rumput terbuka", en: "An open lawn" }],
    cta: "wa",
  }),
  z("13", 0, {
    slug: "bungalow-arileu", nama: "Bungalow Arileu 1–6", label: "Bungalow Arileu", kelompok: "penginapan", henti: 2, arah: "kanan",
    isi: {
      id: "Bungalow Arileu punya dua lantai dan muat empat orang. Tempat tidur di Bungalow Arileu dibatasi tirai, dan ruang duduknya lesehan di lantai bawah.",
      en: "Bungalow Arileu has two floors and sleeps four. Its beds are screened with curtains, and its lounge downstairs is floor seating (lesehan).",
    },
    fakta: [
      { id: "6 unit · 4 dewasa", en: "6 units · 4 adults" },
      jarak("130"),
      { id: "Kelas kamar: Grand Thermal Bungalow", en: "Room class: Grand Thermal Bungalow" },
    ],
    kamar: "bungalow-arileu", cta: "wa", foto: "bungalow-arileu",
    fotoAlt: { id: "Bungalow Arileu dua lantai di atas balong", en: "A two-storey Bungalow Arileu over the balong" },
  }),
  z("14", 0, {
    slug: "suite-arileu", nama: "Suite Arileu 1 & 2", label: "Suite Arileu", kelompok: "penginapan", henti: 2, arah: "kanan",
    isi: {
      id: "Suite Arileu terdiri dari dua suite di pojok area depan. Tiap suite punya kamar privat di bawah, kamar terbuka di atas, ruang duduk lesehan, dan private whirlpool.",
      en: "Suite Arileu is two suites in the corner of the front area. Each suite has a private room downstairs, an open room upstairs, a lesehan lounge and a private whirlpool.",
    },
    fakta: [
      { id: "2 unit · 4 dewasa · Queen Size", en: "2 units · 4 adults · Queen Size" },
      jarak("130"),
      { id: "Kelas kamar: Thermal Pool Suite", en: "Room class: Thermal Pool Suite" },
    ],
    kamar: "suite-arileu", cta: "wa", foto: "suite-arileu",
    fotoAlt: { id: "Suite Arileu beratap ijuk di tepi balong", en: "Suite Arileu under its thatched roof at the edge of the balong" },
  }),

  /* ---------- 4 · Villa Sibentang ---------- */
  z("21", 0, {
    slug: "villa-sibentang", nama: "Villa Sibentang", label: "Villa Sibentang", kelompok: "penginapan", henti: 3, arah: "kanan",
    isi: {
      id: "Villa Sibentang terdiri dari sembilan private villa, masing-masing dengan private pool berair panas alami di halamannya. Villa Sibentang punya situs, paket, dan WhatsApp sendiri.",
      en: "Villa Sibentang is nine private villas, each with a private pool of natural hot spring water in its yard. Villa Sibentang has its own website, packages and WhatsApp line.",
    },
    fakta: [
      { id: "4 villa One Bedroom · 5 villa Two Bedroom", en: "4 One Bedroom villas · 5 Two Bedroom villas" },
      jarak("130"),
      { id: "Paket: Thermal Reset 2D1N · Deep Reset 3D2N · Integration Reset 4D3N", en: "Packages: Thermal Reset 2D1N · Deep Reset 3D2N · Integration Reset 4D3N" },
    ],
    cta: "sibentang", foto: "villa-sibentang",
    fotoAlt: { id: "Villa Sibentang dengan private pool di halaman depannya", en: "A Villa Sibentang with the private pool in its front yard" },
  }),

  /* ---------- 5 · Kumpul ---------- */
  z("15", 0, {
    slug: "tegal-pangulinan", nama: "Tegal Pangulinan Mini Outbond", label: "Tegal Pangulinan", kelompok: "fasilitas", henti: 4, arah: "kanan",
    isi: {
      id: "Tegal Pangulinan berupa lapangan luas di antara area depan dan area belakang. Rombongan main fun games dan mini outbond di Tegal Pangulinan, lalu makan di Saung Tegal Pangulinan.",
      en: "Tegal Pangulinan is a wide field between the front and back of the grounds. Groups play fun games and mini outbound on Tegal Pangulinan, then eat at Saung Tegal Pangulinan.",
    },
    fakta: [
      { id: "Fun games dan mini outbond termasuk paket rombongan", en: "Fun games and mini outbound come with the group packages" },
      { id: "Saung Tegal Pangulinan", en: "Saung Tegal Pangulinan" },
    ],
    cta: "rapat",
  }),
  z("16", 0, {
    slug: "purba-dewata-ligar-wangi", nama: "Ruang Meeting Purba Dewata & Restoran Ligar Wangi", label: "Purba Dewata & Ligar Wangi", kelompok: "fasilitas", henti: 4, arah: "kiri",
    isi: {
      id: "Ruang Purba Dewata dan Restoran Ligar Wangi ada di gedung besar di tengah kawasan. Purba Dewata muat 350 orang dengan susunan theatre.",
      en: "Purba Dewata and Restoran Ligar Wangi share the large building in the middle of the grounds. Purba Dewata seats 350 theatre style.",
    },
    fakta: [
      { id: "Purba Dewata Full: Theatre 350 · U-Shape 160 · Standing 350", en: "Purba Dewata Full: Theatre 350 · U-Shape 160 · Standing 350" },
      { id: "Purba Dewata 1: Theatre 200 · Purba Dewata 2: Theatre 150", en: "Purba Dewata 1: Theatre 200 · Purba Dewata 2: Theatre 150" },
    ],
    cta: "rapat", foto: "purba-dewata",
    fotoAlt: { id: "Ruang Purba Dewata ditata dengan meja bundar berkain", en: "Purba Dewata set with round, clothed tables" },
  }),

  /* ---------- 6 · Area belakang ---------- */
  z("18", 0, {
    slug: "babakan-siluhur-2", nama: "Babakan Siluhur B1, B2 + gazebo", label: "Babakan Siluhur 2", kelompok: "penginapan", henti: 5, arah: "kiri",
    isi: {
      id: "Babakan Siluhur 2 berisi dua bungalow yang saling berhadapan, lengkap dengan gazebo, pendopo, dan private whirlpool. Babakan Siluhur 2 muat 12 orang dalam satu pemesanan.",
      en: "Babakan Siluhur 2 is two bungalows facing each other, with a gazebo, a pendopo (open pavilion) and a private whirlpool. Babakan Siluhur 2 takes 12 people in a single booking.",
    },
    fakta: [
      { id: "Babakan Siluhur 2 · 12 dewasa", en: "Babakan Siluhur 2 · 12 adults" },
      jarak("250"),
      { id: "Kelas kamar: Signature Estate 2", en: "Room class: Signature Estate 2" },
    ],
    kamar: "babakan-siluhur-2", cta: "wa", foto: "babakan-siluhur-2",
    fotoAlt: { id: "Kolam pribadi Babakan Siluhur 2 di antara dua bungalow", en: "The private pool of Babakan Siluhur 2 between its two bungalows" },
  }),
  z("17", 0, {
    slug: "babakan-siluhur-1", nama: "Babakan Siluhur A1, A2, A3 + gazebo", label: "Babakan Siluhur 1", kelompok: "penginapan", henti: 5, arah: "kanan",
    isi: {
      id: "Babakan Siluhur 1 berisi tiga bungalow, gazebo, pendopo, dan private whirlpool dalam satu kompleks. Babakan Siluhur 1 muat 18 orang dalam satu pemesanan.",
      en: "Babakan Siluhur 1 is one compound of three bungalows with a gazebo, a pendopo and a private whirlpool. Babakan Siluhur 1 takes 18 people in a single booking.",
    },
    fakta: [
      { id: "Babakan Siluhur 1 · 18 dewasa", en: "Babakan Siluhur 1 · 18 adults" },
      jarak("250"),
      { id: "Kelas kamar: Signature Estate 1", en: "Room class: Signature Estate 1" },
    ],
    kamar: "babakan-siluhur-1", dip: false, cta: "wa", foto: "babakan-siluhur-1",
    fotoAlt: { id: "Bungalow kayu Babakan Siluhur 1 di tepi balong", en: "Babakan Siluhur 1 timber bungalows at the edge of the balong" },
  }),
  z("20", 0, {
    slug: "jr-suite", nama: "Jr Suite 1 & 2", label: "Jr Suite", kelompok: "penginapan", henti: 5, arah: "atas",
    isi: {
      id: "Jr Suite terdiri dari dua Junior Suite bersebelahan di area belakang. Tiap suite punya kamar privat di bawah, kamar terbuka di atas, ruang duduk lesehan, dan private whirlpool.",
      en: "Jr Suite is two Junior Suites side by side at the back. Each suite has a private room downstairs, an open room upstairs, a lesehan lounge and a private whirlpool.",
    },
    fakta: [
      { id: "2 unit · 4 dewasa · Queen Size", en: "2 units · 4 adults · Queen Size" },
      jarak("250"),
      { id: "Kelas kamar: Thermal Pool Suite", en: "Room class: Thermal Pool Suite" },
    ],
    kamar: "junior-suite", cta: "wa", foto: "jr-suite",
    fotoAlt: { id: "Junior Suite beratap ijuk di atas balong berdaun teratai", en: "A thatched Junior Suite over a balong covered in lily pads" },
  }),
  z("19", 4, {
    slug: "bungalow-15-40", nama: "Bungalow 15–18 · 19–24 · 25–30 · 31–32 · 33–36 · 37–40", label: "Bungalow 15–40", kelompok: "penginapan", henti: 5, arah: "bawah",
    isi: {
      id: "Ada 26 bungalow di area belakang, tersebar dalam enam deret. Deret 37–40 berada paling utara.",
      en: "There are 26 bungalows at the back of the grounds, spread over six rows. Row 37–40 is the northernmost.",
    },
    fakta: [
      { id: "26 bungalow", en: "26 bungalows" },
      jarak("250"),
      { id: "Kamar di area belakang: Bungalow Siceeh (twin bed), Junior Suite, Babakan Siluhur 1 dan 2", en: "Rooms at the back: Bungalow Siceeh (twin beds), Junior Suite, Babakan Siluhur 1 and 2" },
    ],
    cta: "wa",
  }),
];

export const HENTI: Henti[] = [
  {
    id: "datang",
    label: { id: "Datang", en: "Arrive" },
    judul: { id: "Wilujeng sumping di Kampung Sumber Alam", en: "Wilujeng sumping, welcome to Kampung Sumber Alam" },
    teks: {
      id: "Kamu masuk dari Jl. Raya Cipanas, parkir di depan Lobby, lalu naik ke terasnya. Kawung dan Pondok Kalapa cuma ±60–70 m dari Lobby.",
      en: "You turn in from Jl. Raya Cipanas, park in front of the Lobby and walk up to its terrace. Kawung and Pondok Kalapa are only ±60–70 m from the Lobby.",
    },
    cx: 395, cy: 1396, vw: 520, vh: 330,
    foto: "henti-datang",
    fotoAlt: { id: "Tamu menarik koper di jalan setapak di atas balong menuju bungalow", en: "Guests pull their luggage along a path over the balong towards a bungalow" },
  },
  {
    id: "berendam",
    label: { id: "Berendam", en: "Soak" },
    judul: { id: "Kolam Renang Tasik Madu berisi air panas alami", en: "Kolam Renang Tasik Madu is filled with natural hot spring water" },
    teks: {
      id: "Kolam Renang Tasik Madu ada di belakang Lobby, dan Restoran Tunjung Balebat ada di tepinya. Dari semua kamar, Suite Couple paling dekat ke kolam renang dan Kamar Rendam.",
      en: "Kolam Renang Tasik Madu sits behind the Lobby, with Restoran Tunjung Balebat on its edge. Of all the rooms, Suite Couple is closest to the pool and Kamar Rendam.",
    },
    cx: 688, cy: 1350, vw: 420, vh: 300,
    foto: "henti-berendam",
    fotoAlt: { id: "Kolam Renang Tasik Madu berkanopi dengan Gunung Guntur di belakangnya", en: "Kolam Renang Tasik Madu under its canopy, with Mount Guntur behind it" },
  },
  {
    id: "balong",
    label: { id: "Menginap", en: "Stay" },
    judul: { id: "Bungalow kayu berdiri di atas balong", en: "Timber bungalows stand over the balong" },
    teks: {
      id: "Balong itu kolam ikan, dan bungalow kayu Kampung Sumber Alam berdiri di atasnya. Jalan setapak menghubungkan satu bungalow dengan bungalow lain, sementara tiap kamar punya bak rendam yang dialiri air panas alami dari Gunung Guntur.",
      en: "A balong is a Sundanese fish pond, and the timber bungalows of Kampung Sumber Alam stand over it. Footpaths link one bungalow to the next, while every room has a soaking tub fed by natural hot spring water from Mount Guntur.",
    },
    cx: 985, cy: 1440, vw: 430, vh: 420,
    foto: "henti-balong",
    fotoAlt: { id: "Bungalow kayu beratap ijuk berdiri di atas balong berdaun teratai", en: "A thatched timber bungalow standing over a balong covered in lily pads" },
  },
  {
    id: "sibentang",
    label: { id: "Villa Sibentang", en: "Villa Sibentang" },
    judul: { id: "Tiap villa punya private pool di halamannya sendiri", en: "Every villa has a private pool in its own yard" },
    teks: {
      id: "Sembilan private villa, masing-masing dengan private pool berair panas alami. Villa Sibentang punya situs dan paket menginap sendiri, termasuk Thermal Reset 2D1N.",
      en: "Nine private villas, each with a private pool of natural hot spring water. Villa Sibentang has its own website and stay packages, including Thermal Reset 2D1N.",
    },
    cx: 889, cy: 1010, vw: 380, vh: 260,
    foto: "henti-sibentang",
    fotoAlt: { id: "Tamu duduk di tepi private pool Villa Sibentang", en: "A guest sitting at the edge of a Villa Sibentang private pool" },
  },
  {
    id: "kumpul",
    label: { id: "Kumpul", en: "Gather" },
    judul: { id: "Rombongan bisa main, rapat, dan makan tanpa keluar kawasan", en: "Groups can play, meet and eat without leaving the grounds" },
    teks: {
      id: "Rombongan main fun games di Tegal Pangulinan, lalu rapat atau makan tanpa pindah gedung, karena Ruang Purba Dewata dan Restoran Ligar Wangi ada di satu gedung di tengah kawasan.",
      en: "Groups play fun games on Tegal Pangulinan, then meet or eat without changing buildings, because Purba Dewata and Restoran Ligar Wangi share one building in the middle of the grounds.",
    },
    cx: 1310, cy: 1078, vw: 400, vh: 370,
    foto: "henti-kumpul",
    fotoAlt: { id: "Keluarga berjalan di jalan setapak taman Kampung Sumber Alam", en: "A family walking along a garden path at Kampung Sumber Alam" },
  },
  {
    id: "belakang",
    label: { id: "Area belakang", en: "The back" },
    judul: { id: "Area belakang berjarak ±250 m dari Lobby", en: "The back of the grounds is ±250 m from the Lobby" },
    teks: {
      id: "Area belakang berisi Bungalow Siceeh, Junior Suite, dan dua kompleks Babakan Siluhur untuk keluarga besar atau tim kantor.",
      en: "The back holds Bungalow Siceeh, Junior Suite and the two Babakan Siluhur compounds for extended families or office teams.",
    },
    cx: 1455, cy: 876, vw: 700, vh: 430,
    foto: "henti-belakang",
    fotoAlt: { id: "Bungalow Siceeh dua lantai berdiri berhadapan di atas balong", en: "Two-storey Bungalow Siceeh houses facing each other over the balong" },
  },
];

/** Pandangan awal: seluruh pelat kawasan dan Gunung Guntur. */
export const PANDANG_AWAL = { cx: 1011, cy: 985, vw: 1900, vh: 1880 };

export const TEKS_PETA = {
  penanda: { id: "Peta kawasan", en: "Site map" },
  judul: { id: "Lihat Kampung Sumber Alam dari atas", en: "See Kampung Sumber Alam from above" },
  ajak: { id: "Gulir pelan\u2011pelan. Kami ajak kamu keliling dari pintu masuk sampai area belakang.", en: "Keep scrolling. We'll walk you from the gate to the back of the grounds." },
  keliling: { id: "Keliling", en: "Explore" },
  lewati: { id: "Lewati peta", en: "Skip the map" },
  pintu: { id: "Pintu masuk", en: "Entrance" },
  dekat: { id: "Di dekatnya", en: "Nearby" },
  tutup: { id: "Tutup", en: "Close" },
  zona: { id: "Zona", en: "Zone" },
  daftar: { id: "Daftar semua zona", en: "All zones on the map" },
  mulai: { id: "Mulai", en: "From" },
  malam: { id: "per kamar per malam, weekday", en: "per room per night, weekday" },
  weekend: { id: "Weekend (check-in Sabtu)", en: "Weekend (Saturday check-in)" },
  termasukWeekday: { id: "Sudah termasuk sarapan, tiket kolam renang dan Kamar Rendam, pajak, dan pelayanan.", en: "Breakfast, swimming pool and Kamar Rendam tickets, tax and service are included." },
  dinamis: { id: "Harga mengikuti tanggal. Angka pastinya muncul setelah tanggal dipilih.", en: "Rates follow the date. The exact figure shows once dates are picked." },
  tanyaWa: { id: "Tanya lewat WhatsApp", en: "Ask on WhatsApp" },
  cekKamar: { id: "Cek kamar kosong", en: "Check available rooms" },
  keSibentang: { id: "Buka situs Villa Sibentang", en: "Visit the Villa Sibentang site" },
  keRapat: { id: "Lihat paket rapat dan outing", en: "See meeting and outing packages" },
  noSibentang: { id: "Harga dan paket Villa Sibentang ada di situsnya sendiri.", en: "Villa Sibentang rates and packages are on its own site." },
  penutup: { id: "Kamar paling belakang cuma ±250 m jalan kaki dari Lobby", en: "The farthest room is only a ±250 m walk from the Lobby" },
  kelompok: {
    kedatangan: { id: "Kedatangan", en: "Arrival" },
    fasilitas: { id: "Fasilitas", en: "Facilities" },
    penginapan: { id: "Penginapan", en: "Rooms" },
  } as Record<Kelompok, Dua>,
};

export const SIBENTANG = SIBENTANG_URL;

/** Harga kamar KSA induk dari content.ts (satu sumber). */
export function hargaZona(zn: Zona) {
  if (!zn.kamar) return undefined;
  const k = KAMAR.find((x) => x.slug === zn.kamar);
  if (!k) throw new Error(`Kamar ${zn.kamar} tidak ada di content.ts`);
  if (k.kelompok === "villa") return undefined; // Sibentang tanpa harga
  return k.harga;
}

/** Zona lain yang paling dekat (jarak garis lurus di peta), untuk daftar "Di dekatnya". */
export function dekatnya(zn: Zona, n = 4): Zona[] {
  const sama = ZONA.filter((o) => o.henti === zn.henti && o.no !== zn.no);
  const lainnya = ZONA.filter((o) => o.henti !== zn.henti)
    .map((o) => ({ o, d: Math.hypot(o.x - zn.x, o.y - zn.y) }))
    .sort((a, b) => a.d - b.d)
    .map((x) => x.o);
  return [...sama, ...lainnya].slice(0, n);
}
