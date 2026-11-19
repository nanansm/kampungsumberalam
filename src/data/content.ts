/**
 * Satu sumber kebenaran untuk seluruh situs.
 *
 * Semua konstanta di bawah SUDAH TERVERIFIKASI terhadap website lama
 * resort-kampungsumberalam.com dan bio Instagram (12 Agu 2026).
 * Jangan karang variasinya, jangan ganti tanpa sumber baru.
 */

export const SITE = "https://kampungsumberalam.com";
export const NAMA = "Kampung Sumber Alam";
export const NAMA_PANJANG = "Kampung Sumber Alam Resort";

/* ---------- Kontak & booking (terverifikasi) ---------- */

/** Booking engine DIP. keyid ini dipakai 12 tombol BOOK NOW di situs lama. */
export const BOOKING_URL =
  "https://be.dip.id/booking/cekrooms?keyid=9dd581618cf12284f0e72f99c9316523";

/** WhatsApp reservasi KSA: 0811 1211 7838 (Data Master KSA FINAL 9 Nov 2026,
 *  bab 01 §2; sama dengan flyer dan katalog WhatsApp Business KSA).
 *  Sebelumnya 6281110557838 dari situs lama — perlu konfirmasi KSA. */
export const WA = "6281112117838";
export const TELEPON = "+62262238000";
export const TELEPON_TAMPIL = "(0262) 238000";
export const TELEPON_ALT_TAMPIL = "(0262) 237700";
/** Data Master KSA bab 01 §2. Sebelumnya sumberalamresort@gmail.com. */
export const EMAIL = "reservation@resort-kampungsumberalam.com";
export const TRAVELOKA_URL = "https://trv.lk/7f628e23";
/** Listing Agoda dipakai bersama KSA + Sibentang (Nanan 19 Nov 2026). */
export const AGODA_URL = "https://www.agoda.com/sibentang-wellness-private-villa/hotel/garut-id.html";
export const IG_URL = "https://www.instagram.com/kampungsumberalam/";
export const FB_URL = "https://www.facebook.com/profile.php?id=362576157243377";
export const TIKTOK_URL = "https://www.tiktok.com/@kampungsumberalamresort";
export const IG_HANDLE = "@kampungsumberalam";

/** Villa Sibentang punya situsnya sendiri — ditautkan, bukan dijual di sini. */
export const SIBENTANG_URL = "https://sibentang.kampungsumberalam.com";

/* ---------- Lokasi ---------- */

export const ALAMAT = {
  jalan: "Jl. Raya Cipanas No. 122",
  kecamatan: "Tarogong Kaler",
  kota: "Garut",
  provinsi: "Jawa Barat",
  kodePos: "44151",
  negara: "ID",
} as const;

export const ALAMAT_SATU_BARIS =
  "Jl. Raya Cipanas No. 122, Tarogong Kaler, Garut, Jawa Barat 44151";

export const GEO = { lat: -7.1785, lng: 107.8736 } as const;

export const MAPS_URL =
  "https://www.google.com/maps/search/?api=1&query=-7.1785,107.8736";

/**
 * Tautan WhatsApp dengan pesan pre-fill berbeda per titik.
 * Tujuannya atribusi tanpa JavaScript — kita tahu tamu datang dari mana
 * dari kalimat pembuka yang dia kirim.
 */
export function waLink(pesan: string): string {
  return `https://wa.me/${WA}?text=${encodeURIComponent(pesan)}`;
}

/* ---------- Tipe akomodasi ----------
 * Sumber: Data Master KSA FINAL (9 Nov 2026) bab 03 §1–5, dari Publish Rate
 * Catalog KSA 27 Agu 2026. 14 nama unit, 80 kamar.
 * `kelas` = nama kelas di Room Rate Catalog KSA hlm 25 (dipasangkan lewat
 * harga yang identik). Harga = Publish Rate per kamar per malam, sudah
 * termasuk pajak & pelayanan. Weekday = check-in Minggu–Jumat, weekend =
 * check-in Sabtu/libur. KSA memakai dynamic pricing: harga di DIP bisa beda.
 */

export type Kamar = {
  slug: string;
  nama: string;
  /** nama kelas Room Rate, ditulis persis seperti katalog KSA */
  kelas: string;
  unit: number;
  /** kapasitas maksimum, dalam orang dewasa */
  pax: number;
  kelompok: "bungalow" | "suite" | "rombongan" | "villa";
  /** fakta pendek, bukan kalimat jualan */
  fakta: { id: string; en: string }[];
  /** Publish Rate, rupiah tanpa "Rp" */
  harga: { weekday: string; weekend: string };
  airPanasPribadi: boolean;
  situsLain?: string;
};

export const KAMAR: Kamar[] = [
  {
    slug: "kawung", nama: "Kawung", kelas: "Thermal Studio", unit: 10, pax: 2, kelompok: "bungalow",
    fakta: [
      { id: "Tempat tidur di lantai atas, ruang lesehan di lantai bawah", en: "Bed upstairs, floor-seating lounge downstairs" },
      { id: "±70 m dari Lobby", en: "±70 m from the Lobby" },
    ],
    harga: { weekday: "1.189.000", weekend: "1.989.000" }, airPanasPribadi: true,
  },
  {
    slug: "pondok-kalapa", nama: "Pondok Kalapa", kelas: "Thermal Bungalow", unit: 4, pax: 2, kelompok: "bungalow",
    fakta: [
      { id: "Bungalow satu lantai", en: "Single-storey bungalow" },
      { id: "±60 m dari Lobby", en: "±60 m from the Lobby" },
    ],
    harga: { weekday: "1.489.000", weekend: "2.239.000" }, airPanasPribadi: true,
  },
  {
    slug: "bungalow-1-14", nama: "Bungalow 1-14", kelas: "Thermal Bungalow", unit: 14, pax: 2, kelompok: "bungalow",
    fakta: [
      { id: "Bungalow satu lantai, tiga deret", en: "Single-storey bungalows in three rows" },
      { id: "±100 m dari Lobby", en: "±100 m from the Lobby" },
    ],
    harga: { weekday: "1.489.000", weekend: "2.239.000" }, airPanasPribadi: true,
  },
  {
    slug: "bungalow-siceeh", nama: "Bungalow Siceeh", kelas: "Thermal Bungalow", unit: 26, pax: 2, kelompok: "bungalow",
    fakta: [
      { id: "Satu atau dua lantai seperti rumah panggung, twin bed", en: "One or two storeys like a stilt house, twin beds" },
      { id: "±250 m dari Lobby", en: "±250 m from the Lobby" },
    ],
    harga: { weekday: "1.489.000", weekend: "2.239.000" }, airPanasPribadi: true,
  },
  {
    slug: "bungalow-arileu", nama: "Bungalow Arileu", kelas: "Grand Thermal Bungalow", unit: 6, pax: 4, kelompok: "bungalow",
    fakta: [
      { id: "Dua lantai, ruang lesehan, tempat tidur bertirai", en: "Two storeys, floor-seating lounge, curtained beds" },
      { id: "±130 m dari Lobby", en: "±130 m from the Lobby" },
    ],
    harga: { weekday: "1.969.000", weekend: "3.529.000" }, airPanasPribadi: true,
  },
  {
    slug: "suite-couple", nama: "Suite Couple", kelas: "Thermal Pool Suite", unit: 2, pax: 4, kelompok: "suite",
    fakta: [
      { id: "Kamar privat di bawah, kamar terbuka di atas", en: "Private room downstairs, open room upstairs" },
      { id: "Private whirlpool · ±30 m dari Lobby", en: "Private whirlpool · ±30 m from the Lobby" },
    ],
    harga: { weekday: "2.849.000", weekend: "4.789.000" }, airPanasPribadi: true,
  },
  {
    slug: "suite-room", nama: "Suite Room", kelas: "Thermal Pool Suite", unit: 2, pax: 4, kelompok: "suite",
    fakta: [
      { id: "Kamar privat di bawah, kamar terbuka di atas", en: "Private room downstairs, open room upstairs" },
      { id: "Private whirlpool · ±100 m dari Lobby", en: "Private whirlpool · ±100 m from the Lobby" },
    ],
    harga: { weekday: "2.849.000", weekend: "4.789.000" }, airPanasPribadi: true,
  },
  {
    slug: "suite-arileu", nama: "Suite Arileu", kelas: "Thermal Pool Suite", unit: 2, pax: 4, kelompok: "suite",
    fakta: [
      { id: "Kamar privat di bawah, kamar terbuka di atas", en: "Private room downstairs, open room upstairs" },
      { id: "Private whirlpool · ±130 m dari Lobby", en: "Private whirlpool · ±130 m from the Lobby" },
    ],
    harga: { weekday: "2.849.000", weekend: "4.789.000" }, airPanasPribadi: true,
  },
  {
    slug: "junior-suite", nama: "Junior Suite", kelas: "Thermal Pool Suite", unit: 2, pax: 4, kelompok: "suite",
    fakta: [
      { id: "Kamar privat di bawah, kamar terbuka di atas", en: "Private room downstairs, open room upstairs" },
      { id: "Private whirlpool · ±250 m dari Lobby", en: "Private whirlpool · ±250 m from the Lobby" },
    ],
    harga: { weekday: "2.849.000", weekend: "4.789.000" }, airPanasPribadi: true,
  },
  {
    slug: "deluxe-suite", nama: "Deluxe Suite", kelas: "Grand Thermal Pool Suite", unit: 1, pax: 6, kelompok: "suite",
    fakta: [
      { id: "Tiga kamar tidur privat", en: "Three private bedrooms" },
      { id: "Private pool dan pendopo · dekat area memancing", en: "Private pool and pendopo · near the fishing pond" },
    ],
    harga: { weekday: "4.969.000", weekend: "8.649.000" }, airPanasPribadi: true,
  },
  {
    slug: "babakan-siluhur-1", nama: "Babakan Siluhur 1", kelas: "Signature Estate 1", unit: 1, pax: 18, kelompok: "rombongan",
    fakta: [
      { id: "Satu kompleks berisi 3 bungalow", en: "One compound of 3 bungalows" },
      { id: "Private whirlpool, gazebo, dan pendopo", en: "Private whirlpool, gazebo and pendopo" },
    ],
    harga: { weekday: "11.519.000", weekend: "16.629.000" }, airPanasPribadi: true,
  },
  {
    slug: "babakan-siluhur-2", nama: "Babakan Siluhur 2", kelas: "Signature Estate 2", unit: 1, pax: 12, kelompok: "rombongan",
    fakta: [
      { id: "Satu kompleks berisi 2 bungalow berhadapan", en: "One compound of 2 facing bungalows" },
      { id: "Private whirlpool, gazebo, dan pendopo", en: "Private whirlpool, gazebo and pendopo" },
    ],
    harga: { weekday: "8.659.000", weekend: "12.399.000" }, airPanasPribadi: true,
  },
  {
    slug: "villa-sibentang-1br", nama: "Villa Sibentang 1 BR", kelas: "Signature Private Villa - 1", unit: 4, pax: 2, kelompok: "villa",
    fakta: [{ id: "Private pool air panas, mini pantry", en: "Private hot spring pool, mini pantry" }],
    harga: { weekday: "4.199.000", weekend: "4.629.000" }, airPanasPribadi: true, situsLain: SIBENTANG_URL,
  },
  {
    slug: "villa-sibentang-2br", nama: "Villa Sibentang 2 BR", kelas: "Signature Private Villa - 2", unit: 5, pax: 4, kelompok: "villa",
    fakta: [{ id: "Private pool air panas, mini pantry", en: "Private hot spring pool, mini pantry" }],
    harga: { weekday: "5.859.000", weekend: "7.009.000" }, airPanasPribadi: true, situsLain: SIBENTANG_URL,
  },
];

/** Isi Publish Rate (Data Master bab 03 §2). */
export const TERMASUK_KAMAR = {
  weekday: {
    id: "Harga weekday untuk check-in Minggu sampai Jumat sudah termasuk sarapan, tiket kolam renang dan Kamar Rendam, serta pajak dan pelayanan.",
    en: "The weekday rate, for check-in from Sunday to Friday, includes breakfast, swimming pool and Kamar Rendam access, tax and service.",
  },
  weekend: {
    id: "Harga check-in Sabtu yang dipesan lewat WhatsApp reservasi sudah termasuk sarapan, makan malam, live music, paket pancingan, tiket kolam renang dan Kamar Rendam, serta pajak dan pelayanan.",
    en: "The Saturday check-in rate, booked through WhatsApp reservations, includes breakfast, dinner, live music, a fishing package, swimming pool and Kamar Rendam tickets, tax and service.",
  },
} as const;

/** Sibentang Thermal Reset Journey (Data Master bab 09 §9.4). Harga sengaja
 *  tidak ditulis: keputusan 9 Agu 2026, harga paket dijawab lewat WhatsApp. */
export const THERMAL_RESET = [
  { nama: "Thermal Reset", durasi: "2D1N", janji: "A Gentle Escape to Pause, Restore & Reconnect",
    isi: { id: "Thermal Reset berlangsung satu malam di villa, dengan Private Thermal Soak Ritual, Sunset Tea Reflection, spa, yoga, aquatic therapy, dan Slow Dining Experience.", en: "Thermal Reset is one night in the villa, with Private Thermal Soak Ritual, Sunset Tea Reflection, spa, yoga, aquatic therapy and Slow Dining Experience." } },
  { nama: "Deep Reset", durasi: "3D2N", janji: "A Deeper Journey to Pause, Restore & Reconnect",
    isi: { id: "Deep Reset berlangsung dua malam. Hari kedua menjadi inti perjalanan dan memuat Sundanese Cultural Touch.", en: "Deep Reset runs for two nights. Day two is the heart of the journey and includes the Sundanese Cultural Touch." } },
  /* Janji Integration Reset memuat kata "Sanctuary". Bunyi itu kutipan resmi
     PDF KSA, dan Data Master bab 09 §9.8 meminta kutipan resmi dipakai apa adanya. */
  { nama: "Integration Reset", durasi: "4D3N", janji: "A Deeper Sanctuary Escape to Pause, Restore & Reconnect",
    isi: { id: "Integration Reset berlangsung tiga malam dengan jadwal paling longgar. Thermal Restoration menjadi inti perjalanannya.", en: "Integration Reset runs for three nights on the most relaxed schedule. Thermal Restoration is the heart of the journey." } },
] as const;

/** Datang tanpa menginap (Data Master bab 04 §2–3, flyer resmi KSA 2026). */
export const DAY_VISIT = [
  { nama: "Tiket Kolam Renang", harga: { id: "Rp40.000 weekday · Rp50.000 weekend per orang", en: "Rp40,000 weekday · Rp50,000 weekend per person" },
    isi: { id: "Berenang di Kolam Renang Tasik Madu yang berair panas.", en: "Swim in the hot spring water of Kolam Renang Tasik Madu." } },
  { nama: "Kamar Rendam", harga: { id: "Rp50.000 per 25 menit", en: "Rp50,000 per 25 minutes" },
    isi: { id: "Berendam privat, sudah dengan sabun, sampo, handuk, dan bandrek atau bajigur.", en: "A private soak, with soap, shampoo, towel and bandrek or bajigur." } },
  { nama: "Paket MABAR", harga: { id: "Rp69.000 atau Rp99.000 per orang, minimal 6 orang", en: "Rp69,000 or Rp99,000 per person, minimum 6" },
    isi: { id: "Makan dan Berenang Bareng: berenang ditambah satu menu utama.", en: "Makan dan Berenang Bareng (eat and swim together): a swim plus one main course." } },
  { nama: "Swim & Grill", harga: { id: "Rp100.000 per orang, minimal 4 orang", en: "Rp100,000 per person, minimum 4" },
    isi: { id: "Tiket kolam ditambah satu set Suki & Grill di Restoran Tunjung Balebat, weekday, 3 jam.", en: "Pool entry plus a Suki & Grill set at Restoran Tunjung Balebat, weekdays, 3 hours." } },
  { nama: "Exclusive Swim & Grill at Private Villa Sibentang", harga: { id: "Rp120.000 per orang, minimal 6 orang", en: "Rp120,000 per person, minimum 6" },
    isi: { id: "Akses Private Villa Sibentang ditambah satu set Suki & Grill, weekday, 3 jam, saat villa kosong.", en: "Private Villa Sibentang access plus a Suki & Grill set, weekdays, 3 hours, when the villa is free." } },
] as const;

/* ---------- Makan ----------
 * Data Master bab 06 §1 dan §3. */
export const OUTLET_MAKAN = ["Restoran Tunjung Balebat", "Restoran Ligar Wangi", "Saung Tegal Pangulinan", "Coffee House", "Cafetaria"] as const;
export const MENU_SUNDA = [
  { nama: "Nasi Liwet 4 Orang", harga: "350.000" },
  { nama: "Nasi Lulun Botram 4 Orang", harga: "300.000" },
  { nama: "Nasi Tutug Oncom 4 Orang", harga: "230.000" },
  { nama: "Nasi Bakar", harga: "75.000" },
  { nama: "Secang", harga: "25.000" },
] as const;

/* ---------- Fasilitas ----------
 * Sumber: situs lama + halaman OTA. Sengaja TIDAK menyebut kecepatan WiFi
 * dan TIDAK menjanjikan AC di semua unit — dua hal itu keluhan berulang
 * di ulasan Tripadvisor. Jangan janjikan apa yang jadi keluhan.
 */

export const FASILITAS = [
  { id: "Kolam air panas alami", en: "Natural hot spring pool" },
  { id: "Tiga tempat makan", en: "Three dining outlets" },
  { id: "Ruang pertemuan", en: "Meeting rooms" },
  { id: "Area bermain anak", en: "Children's playground" },
  /* "Kolam anak" dibuang 20 Nov 2026: tidak ada di Data Master bab 02 §4.
     Gantinya Kamar Rendam, bilik berendam air panas yang tercatat di Catalog KSA. */
  { id: "Kamar Rendam", en: "Kamar Rendam private hot spring soaking rooms" },
  { id: "Pemancingan", en: "Fishing pond" },
  { id: "Pitaloka Spa", en: "Pitaloka Spa" },
  { id: "WiFi", en: "WiFi" },
  { id: "Parkir gratis", en: "Free parking" },
] as const;

/* ---------- Nama tempat di dalam resort (terverifikasi dari materi klien) ---------- */

export const RESTORAN = "Tunjung Balebat";
export const SPA = "Pitaloka Spa";
/** Data Master hanya mencatat "live music", dan live music termasuk di
 *  Publish Rate check-in Sabtu (bab 03 §2). Jangan klaim tampil tiap malam. */
export const MUSIK = "live music";

/* ---------- Ulasan ----------
 * Data Master KSA bab 01 §9, diambil 30 Okt 2026.
 * Ditulis sebagai TEKS dengan menyebut platformnya. JANGAN dipakai sebagai
 * markup aggregateRating: ulasan ini milik platform lain, bukan situs ini.
 */

export const ULASAN = [
  {
    sumber: "Google Maps",
    nilai: "4,5",
    dari: "5",
    jumlah: "9.902",
    catatan: { id: "Platform dengan ulasan terbanyak", en: "The platform with the most reviews" },
  },
  {
    sumber: "Tripadvisor",
    nilai: "4,7",
    dari: "5",
    jumlah: "1.413",
    catatan: { id: "Travelers' Choice 2025", en: "Travelers' Choice 2025" },
  },
] as const;

/* ---------- Ruang pertemuan ----------
 * Data Master KSA bab 05 §1 (Catalog KSA hlm 21–25).
 * null = susunan itu tidak tersedia. "tanya" = kapasitas belum tercatat,
 * dipastikan ke reservasi. */

type Kap = number | null | "tanya";
export const RUANG_MICE: { nama: string; theater: Kap; kelas: Kap; uShape: Kap; bundar: Kap }[] = [
  { nama: "Purba Dewata Full", theater: 350, kelas: "tanya", uShape: 160, bundar: "tanya" },
  { nama: "Purba Dewata 1", theater: 200, kelas: "tanya", uShape: 90, bundar: 60 },
  { nama: "Purba Dewata 2", theater: 150, kelas: "tanya", uShape: 70, bundar: 50 },
  { nama: "Intan Dewata Full", theater: "tanya", kelas: "tanya", uShape: 70, bundar: 54 },
  { nama: "Intan Dewata 1", theater: "tanya", kelas: 60, uShape: 40, bundar: 30 },
  { nama: "Intan Dewata 2", theater: 50, kelas: 40, uShape: 30, bundar: 24 },
  { nama: "Gambir Wangi", theater: null, kelas: null, uShape: null, bundar: 15 },
];

/* ---------- Tarif paket rombongan ----------
 * Data Master KSA bab 05 §3–4. Harga per orang, termasuk pajak & pelayanan.
 * Fullboard Meeting dan Outing Family Gathering punya tabel SENDIRI-SENDIRI.
 */

type Baris = { isi: { id: string; en: string }; weekday: string; weekend: string };
const OKUPANSI = {
  single: { id: "Single Occupied (satu orang)", en: "Single Occupied (one guest)" },
  twin: { id: "Twin Share (dua orang)", en: "Twin Share (two guests)" },
  triple: { id: "Triple Share (tiga orang, +1 extra bed)", en: "Triple Share (three guests, +1 extra bed)" },
  quadra: { id: "Quadra (empat orang, +2 extra bed)", en: "Quadra (four guests, +2 extra beds)" },
};

export const TARIF_FULLBOARD: Baris[] = [
  { isi: OKUPANSI.single, weekday: "2.201.000", weekend: "2.590.000" },
  { isi: OKUPANSI.twin, weekday: "1.433.000", weekend: "1.557.000" },
  { isi: OKUPANSI.triple, weekday: "1.241.000", weekend: "1.330.000" },
  { isi: OKUPANSI.quadra, weekday: "1.143.000", weekend: "1.156.000" },
];

export const TARIF_OUTING: Baris[] = [
  { isi: OKUPANSI.single, weekday: "2.540.000", weekend: "2.782.000" },
  { isi: OKUPANSI.twin, weekday: "1.772.000", weekend: "1.802.000" },
  { isi: OKUPANSI.triple, weekday: "1.556.000", weekend: "1.676.000" },
  { isi: OKUPANSI.quadra, weekday: "1.482.000", weekend: "1.570.000" },
];

export const TERMASUK_SEMUA = [
  { id: "Menginap satu malam di kamar Bungalow", en: "One night in a Bungalow room" },
  { id: "Buffet breakfast, lunch, dan dinner", en: "Buffet breakfast, lunch and dinner" },
  { id: "Kolam renang dan Kamar Rendam", en: "Swimming pool and Kamar Rendam" },
  { id: "Pajak dan pelayanan", en: "Tax and service" },
] as const;

export const TERMASUK_MEETING = [
  { id: "2 kali coffee break", en: "Two coffee breaks" },
  { id: "Ruang pertemuan dengan notebook, pensil, permen, air mineral, AC, proyektor, dan layar", en: "Meeting room with notebooks, pencils, sweets, mineral water, AC, a projector and a screen" },
] as const;

export const TERMASUK_OUTING = [
  { id: "1 kali coffee break", en: "One coffee break" },
  { id: "Entertainment oleh 1 singer dan 1 player, pukul 18.30–22.00", en: "Entertainment by 1 singer and 1 player, 6:30–10 pm" },
  { id: "Fun games", en: "Fun games" },
] as const;

/** Rombongan tanpa menginap dan Babakan Siluhur (Data Master bab 04 §8, bab 05 §4). */
export const PAKET_TANPA_MENGINAP = [
  { nama: "Non Residental Meeting", harga: { id: "Rp484.000–Rp847.000 per orang", en: "Rp484,000–Rp847,000 per person" },
    isi: { id: "Non Residental Meeting tersedia dalam pilihan Halfday Rp484.000, Full Day Rp605.000, dan One Day Rp847.000 per orang. Setiap pilihan sudah termasuk makan, coffee break, ruang pertemuan, pajak, dan pelayanan.", en: "Non Residental Meeting comes as Halfday at Rp484,000, Full Day at Rp605,000 or One Day at Rp847,000 per person. Every option includes meals, coffee breaks, the meeting room, tax and service." } },
  { nama: "Fullday Gathering", harga: { id: "Rp1.023.000", en: "Rp1,023,000" },
    isi: { id: "Fullday Gathering sudah termasuk buffet lunch, coffee break, venue resto, fun games, entertainment, kolam renang, Kamar Rendam, pajak, dan pelayanan.", en: "Fullday Gathering includes a buffet lunch, a coffee break, the restaurant venue, fun games, entertainment, the swimming pool, Kamar Rendam, tax and service." } },
  { nama: "Siluhur Private Meeting · Siluhur Private Gathering", harga: { id: "mulai Rp8.659.000 per kompleks", en: "from Rp8,659,000 per compound" },
    isi: { id: "Tim kecil dapat rapat dan menginap di kompleks Babakan Siluhur sendiri.", en: "A small team can meet and stay in its own Babakan Siluhur compound." } },
] as const;

/* ---------- Paket acara ----------
 * Nama dan harga dicek ulang ke Data Master KSA bab 05 §5–6 (19 Nov 2026):
 * nama paket resmi tidak diterjemahkan, Birthday Rp146.000, paket Bulan madu
 * dibuang karena tidak ada di materi resmi KSA 2026.
 * Sumber awal: halaman EVENTS resort-kampungsumberalam.com beserta sembilan
 * halaman paketnya, dibaca lewat REST API situs lama pada 13 Agu 2026.
 * Angka disalin persis. Ejaan sumbernya yang keliru (Kampug, menginp,
 * Sibentan, Birtday) dirapikan, angkanya tidak disentuh.
 *
 * ⚠️ Situs lama tidak menanggalkan daftar ini. Halaman WAJIB menyebut bahwa
 * tarif dikonfirmasi ulang saat pemesanan. Jangan hapus catatan itu.
 *
 * Pre Wedding di situs lama satu halaman berisi dua tarif. Di sini dipecah
 * jadi dua kartu supaya tamu tidak perlu membaca paragraf untuk tahu
 * bedanya cuma akses Villa Sibentang.
 */

export type Acara = {
  slug: string;
  nama: { id: string; en: string };
  /** rupiah, tanpa "Rp", format Indonesia */
  harga: string;
  satuan: "orang" | "paket";
  /** minimum pemesanan dalam orang; null kalau paketnya borongan */
  minimal: number | null;
  termasuk: { id: string; en: string }[];
  tambahan: { id: string; en: string }[];
  catatan?: { id: string; en: string };
  foto: string;
  w: number;
  h: number;
  alt: string;
};

export const ACARA: Acara[] = [
  {
    slug: "engagement",
    nama: { id: "Engagement Package", en: "Engagement Package" },
    harga: "180.000",
    satuan: "orang",
    minimal: 50,
    termasuk: [
      { id: "Prasmanan", en: "Buffet" },
      { id: "Dekorasi", en: "Decoration" },
      { id: "Perias (MUA)", en: "Make-up artist (MUA)" },
      { id: "Sound system dan tempat acara", en: "Sound system and venue" },
    ],
    tambahan: [
      { id: "MC", en: "MC" },
      { id: "Foto", en: "Photography" },
    ],
    catatan: {
      id: "Engagement Package, paket untuk acara lamaran, dapat digelar di ruang pertemuan atau di restoran.",
      en: "Engagement Package, for engagement ceremonies, can be held in a meeting room or in the restaurant.",
    },
    foto: "/images/restoran-tunjung.webp",
    w: 819,
    h: 544,
    alt: "Ruang makan Restoran Tunjung Balebat berdinding kayu menghadap kolam",
  },
  {
    slug: "akad",
    nama: { id: "Akad Package", en: "Akad Package" },
    harga: "205.000",
    satuan: "orang",
    minimal: 100,
    termasuk: [
      { id: "Prasmanan", en: "Buffet" },
      { id: "Dekorasi", en: "Decoration" },
      { id: "Perias (MUA)", en: "Make-up artist (MUA)" },
      { id: "Sound system dan tempat acara", en: "Sound system and venue" },
    ],
    tambahan: [
      { id: "MC", en: "MC" },
      { id: "Foto", en: "Photography" },
    ],
    catatan: {
      id: "Akad Package dapat digelar di ruang pertemuan atau di restoran.",
      en: "Akad Package can be held in a meeting room or in the restaurant.",
    },
    foto: "/images/taman-kampung.webp",
    w: 1200,
    h: 501,
    alt: "Taman terbuka Kampung Sumber Alam dengan deretan pohon dan bangunan beratap ijuk",
  },
  {
    slug: "intimate-wedding",
    nama: { id: "Intimate Wedding Package", en: "Intimate Wedding Package" },
    harga: "260.000",
    satuan: "orang",
    minimal: 100,
    termasuk: [
      { id: "Prasmanan", en: "Buffet" },
      { id: "Dekorasi", en: "Decoration" },
      { id: "Perias (MUA)", en: "Make-up artist (MUA)" },
      { id: "Sound system dan tempat acara", en: "Sound system and venue" },
    ],
    tambahan: [
      { id: "MC", en: "MC" },
      { id: "Foto", en: "Photography" },
    ],
    catatan: {
      id: "Intimate Wedding Package dapat digelar di ruang pertemuan atau di restoran.",
      en: "Intimate Wedding Package can be held in a meeting room or in the restaurant.",
    },
    foto: "/images/purba-dewata.webp",
    w: 819,
    h: 544,
    alt: "Ruang Purba Dewata ditata dengan meja bundar berkain",
  },
  {
    slug: "pre-wedding",
    nama: { id: "Pre Wedding Package · Paket 1", en: "Pre Wedding Package · Paket 1" },
    harga: "800.000",
    satuan: "paket",
    minimal: null,
    termasuk: [
      { id: "Ruang make up", en: "Make-up room" },
      { id: "Light meal dan welcome drink untuk 4 orang", en: "Light meal and welcome drink for 4 people" },
      { id: "Lokasi foto di seluruh area Kampung Sumber Alam", en: "Photo locations across Kampung Sumber Alam" },
    ],
    tambahan: [],
    catatan: {
      id: "Pre Wedding Package Paket 1 tidak mencakup akses ke Villa Sibentang.",
      en: "Pre Wedding Package Paket 1 does not include access to Villa Sibentang.",
    },
    foto: "/images/kampung-teratai.webp",
    w: 999,
    h: 756,
    alt: "Kolam teratai berbunga dengan bungalow beratap ijuk di belakangnya",
  },
  {
    slug: "pre-wedding-sibentang",
    nama: { id: "Pre Wedding Package · Paket 2", en: "Pre Wedding Package · Paket 2" },
    harga: "1.500.000",
    satuan: "paket",
    minimal: null,
    termasuk: [
      { id: "Ruang make up", en: "Make-up room" },
      { id: "Makan siang", en: "Lunch" },
      { id: "Light meal dan welcome drink untuk 4 orang", en: "Light meal and welcome drink for 4 people" },
      { id: "Lokasi foto di seluruh area, termasuk Private Villa Sibentang", en: "Photo locations across the grounds, including Private Villa Sibentang" },
    ],
    tambahan: [],
    foto: "/images/kolam-privat-putih.webp",
    w: 1200,
    h: 675,
    alt: "Kolam pribadi berdinding putih di halaman villa",
  },
  {
    slug: "ulang-tahun",
    nama: { id: "Birthday Package", en: "Birthday Package" },
    harga: "146.000",
    satuan: "orang",
    minimal: 50,
    termasuk: [
      { id: "Prasmanan", en: "Buffet" },
      { id: "Kue", en: "Cake" },
      { id: "Sound system dan tempat acara", en: "Sound system and venue" },
    ],
    tambahan: [
      { id: "Dekorasi", en: "Decoration" },
      { id: "MC", en: "MC" },
    ],
    /* Catatan "Untuk remaja dan dewasa" dibuang 20 Nov 2026: tidak ada di
       flyer maupun Data Master bab 05 §6. */
    foto: "/images/keluarga-taman.webp",
    w: 819,
    h: 546,
    alt: "Keluarga duduk di bangku taman Kampung Sumber Alam",
  },
  {
    slug: "ulang-tahun-anak",
    nama: { id: "Kids Birthday Package", en: "Kids Birthday Package" },
    harga: "126.000",
    satuan: "orang",
    minimal: 50,
    termasuk: [
      { id: "Menu anak", en: "Kids menu" },
      { id: "Goodie bag", en: "Goodie bag" },
      { id: "Kue", en: "Cake" },
      { id: "Sound system dan tempat acara", en: "Sound system and venue" },
    ],
    tambahan: [
      { id: "Dekorasi", en: "Decoration" },
      { id: "MC dan pesulap", en: "MC and magician" },
      { id: "Badut", en: "Clown" },
    ],
    foto: "/images/bermain-anak.webp",
    w: 819,
    h: 544,
    alt: "Anak-anak bermain di area bermain Kampung Sumber Alam",
  },
  {
    slug: "arisan-sibentang",
    nama: { id: "Social Event at Private Villa Sibentang", en: "Social Event at Private Villa Sibentang" },
    harga: "160.000",
    satuan: "orang",
    minimal: 6,
    termasuk: [
      { id: "Prasmanan", en: "Buffet" },
      { id: "Private pool Villa Sibentang", en: "Private pool at Villa Sibentang" },
    ],
    tambahan: [],
    catatan: {
      id: "Social Event at Private Villa Sibentang dipakai untuk arisan, gathering, reuni, dan acara sosial lain tanpa perlu menginap.",
      en: "Social Event at Private Villa Sibentang suits arisan (a social savings circle), gatherings, reunions and other social occasions, with no overnight stay.",
    },
    foto: "/images/suite-gazebo.webp",
    w: 900,
    h: 600,
    alt: "Gazebo kayu di samping kolam pribadi",
  },
  {
    slug: "berenang-sibentang",
    nama: { id: "Swimming at Private Villa Sibentang", en: "Swimming at Private Villa Sibentang" },
    harga: "85.000",
    satuan: "orang",
    minimal: 6,
    termasuk: [
      { id: "Berenang di private pool Villa Sibentang", en: "A swim in the Villa Sibentang private pool" },
      { id: "Light meal", en: "Light meal" },
    ],
    tambahan: [],
    foto: "/images/grotto-privat.webp",
    w: 819,
    h: 546,
    alt: "Kolam air panas pribadi berdinding batu",
  },
];

/* ---------- Waktu tempuh ke tempat di sekitar ----------
 * Data Master KSA FINAL bab 02 §6 (Catalog KSA hlm 27). Nama ditulis persis
 * seperti katalog. Moda perjalanan tidak disebut katalog, jadi situs juga
 * tidak menyebutnya. Waktu dari Jakarta/Bandung TIDAK ada di Data Master:
 * jangan ditaksir sendiri.
 * (Daftar lama 'Di sekitar resort' dari situs lama dibuang 19 Nov 2026:
 * menyebut pemandian pesaing dan tidak ada di Data Master.)
 */
export const JARAK_TEMPUH: { nama: string; menit: number; ket?: { id: string; en: string } }[] = [
  { nama: "CFD Ibrahim Adji", menit: 5 },
  { nama: "Tegal Malaka", menit: 6 },
  { nama: "Pusat Oleh-oleh", menit: 8 },
  { nama: "Pusat Oleh-oleh Chocodot", menit: 9 },
  /* Keterangan dipendekkan 20 Nov 2026 supaya baris keterangan tidak lebih
     panjang daripada nama tempatnya (QA rag: daftar jarak timpang). Stasiun
     tidak diberi keterangan: arah "dari stasiun ke hotel" di katalog sama
     dengan waktu tempuh dari Kampung Sumber Alam yang sudah tertulis di judul daftar. */
  { nama: "Kaki Gunung Guntur", menit: 15, ket: { id: "sumber air panas", en: "hot water source" } },
  { nama: "Stasiun", menit: 19 },
  { nama: "Situ Bagendit", menit: 22 },
  { nama: "Sukaregang", menit: 25 },
  { nama: "Candi Cangkuang", menit: 34 },
  { nama: "Kebun Mawar", menit: 35 },
  { nama: "Talaga Bodas", menit: 75 },
  { nama: "Papandayan", menit: 82 },
];

/* ---------- Meta bawaan ---------- */

export const META_BAWAAN = {
  // Kata kunci di depan, merek di belakang: yang dicari orang adalah
  // "hotel air panas garut", bukan nama propertinya.
  title:
    "Resort Air Panas Alami di Cipanas Garut | Kampung Sumber Alam",
  description:
    "Kampung Sumber Alam adalah resort bergaya kampung Sunda di Cipanas, Garut. Bungalow kayu beratap ijuk berdiri di atas balong, dan setiap kamar dialiri air panas alami Gunung Guntur.",
} as const;
