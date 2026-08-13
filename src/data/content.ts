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

export const WA = "6281112117838";
export const TELEPON = "+62262238000";
export const TELEPON_TAMPIL = "(0262) 238000";
export const TELEPON_ALT_TAMPIL = "(0262) 237700";
export const EMAIL = "reservation@resort-kampungsumberalam.com";
export const TRAVELOKA_URL = "https://trv.lk/7f628e23";
export const IG_URL = "https://www.instagram.com/kampungsumberalam/";
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
 * Sumber: halaman ACCOMODATION resort-kampungsumberalam.com (12 Agu 2026).
 * `harga` sengaja null di semua tipe — daftar resmi belum turun dari klien.
 * JANGAN isi dari angka OTA: itu belum termasuk pajak dan dinamis.
 */

export type Kamar = {
  slug: string;
  nama: string;
  /** kapasitas maksimum, dalam orang */
  pax: number;
  kelompok: "bungalow" | "suite" | "rombongan" | "villa";
  /** fakta pendek, bukan kalimat jualan */
  fakta: { id: string; en: string }[];
  /** null selama daftar resmi belum dikonfirmasi klien */
  harga: number | null;
  /** true kalau unitnya punya air panas alami sendiri */
  airPanasPribadi: boolean;
  /** dipakai untuk unit yang dijual di situs terpisah */
  situsLain?: string;
  catatan?: string;
};

export const KAMAR: Kamar[] = [
  {
    slug: "bungalow",
    nama: "Bungalow",
    pax: 2,
    kelompok: "bungalow",
    fakta: [
      { id: "40 unit tersedia", en: "40 units available" },
      { id: "Tersedia extra bed", en: "Extra bed available" },
    ],
    harga: null,
    airPanasPribadi: true,
    catatan: "Situs lama menyebutnya Bungalow 1–14.",
  },
  {
    slug: "bungalow-siceeh",
    nama: "Bungalow Siceeh",
    pax: 2,
    kelompok: "bungalow",
    fakta: [
      { id: "200 meter dari lobi", en: "200 metres from the lobby" },
      { id: "Tersedia extra bed", en: "Extra bed available" },
    ],
    harga: null,
    airPanasPribadi: true,
  },
  {
    slug: "bungalow-sipipir",
    nama: "Bungalow Sipipir",
    pax: 2,
    kelompok: "bungalow",
    fakta: [{ id: "Tanpa sarapan", en: "Room only, breakfast not included" }],
    harga: null,
    airPanasPribadi: true,
  },
  {
    slug: "bungalow-arileu",
    nama: "Bungalow Arileu",
    pax: 4,
    kelompok: "bungalow",
    fakta: [
      { id: "Dua lantai", en: "Two storeys" },
      { id: "Dua tempat tidur double", en: "Two double beds" },
    ],
    harga: null,
    airPanasPribadi: true,
  },
  {
    slug: "pondok-kalapa",
    nama: "Pondok Kalapa",
    pax: 2,
    kelompok: "bungalow",
    fakta: [
      { id: "Dekat lobi", en: "Close to the lobby" },
      { id: "Bak air panas alami", en: "Natural hot spring tub" },
    ],
    harga: null,
    airPanasPribadi: true,
  },
  {
    slug: "kawung",
    nama: "Kawung",
    pax: 2,
    kelompok: "bungalow",
    fakta: [
      { id: "Studio dua lantai", en: "Two-storey studio" },
      { id: "Air panas alami", en: "Natural hot spring water" },
    ],
    harga: null,
    airPanasPribadi: true,
  },
  {
    slug: "junior-suite",
    nama: "Junior Suite",
    pax: 4,
    kelompok: "suite",
    fakta: [
      { id: "Menghadap kolam ikan", en: "Overlooking the fish pond" },
      { id: "Bak air panas alami", en: "Natural hot spring tub" },
    ],
    harga: null,
    airPanasPribadi: true,
  },
  {
    slug: "suite-arileu",
    nama: "Suite Arileu",
    // ⚠️ Situs lama menulis 2 pax di halaman akomodasi, sumber lain menulis 4.
    // Angka 2 dipakai karena halaman akomodasi lebih dekat ke klien.
    // WAJIB dikonfirmasi sebelum tayang.
    pax: 2,
    kelompok: "suite",
    fakta: [
      { id: "Dua lantai", en: "Two storeys" },
      { id: "Dua tempat tidur king", en: "Two king beds" },
      { id: "Kolam kecil pribadi", en: "Private mini pool" },
    ],
    harga: null,
    airPanasPribadi: true,
    catatan: "Kapasitas perlu konfirmasi klien: 2 atau 4 orang.",
  },
  {
    slug: "suite-room",
    nama: "Suite Room",
    pax: 4,
    kelompok: "suite",
    fakta: [],
    harga: null,
    airPanasPribadi: true,
    catatan: "Perlu konfirmasi: apakah terpisah dari Suite Couple di daftar lama.",
  },
  {
    slug: "deluxe-suite",
    nama: "Deluxe Suite",
    pax: 6,
    kelompok: "suite",
    fakta: [
      { id: "Dua lantai, tiga kamar tidur", en: "Two storeys, three bedrooms" },
      { id: "Kolam pribadi dan gazebo", en: "Private pool and gazebo" },
    ],
    harga: null,
    airPanasPribadi: true,
  },
  {
    slug: "babakan-siluhur-1",
    nama: "Babakan Siluhur 1",
    pax: 18,
    kelompok: "rombongan",
    fakta: [{ id: "Kolam air panas alami", en: "Natural hot spring pool" }],
    harga: null,
    airPanasPribadi: true,
  },
  {
    slug: "babakan-siluhur-2",
    nama: "Babakan Siluhur 2",
    pax: 12,
    kelompok: "rombongan",
    fakta: [
      { id: "Dua bungalow", en: "Two bungalows" },
      { id: "Kolam air panas pribadi", en: "Private hot spring pool" },
    ],
    harga: null,
    airPanasPribadi: true,
  },
  {
    slug: "villa-sibentang-1br",
    nama: "Villa Sibentang 1 Kamar",
    pax: 2,
    kelompok: "villa",
    fakta: [{ id: "Kolam air panas pribadi", en: "Private hot spring pool" }],
    harga: null,
    airPanasPribadi: true,
    situsLain: SIBENTANG_URL,
  },
  {
    slug: "villa-sibentang-2br",
    nama: "Villa Sibentang 2 Kamar",
    pax: 4,
    kelompok: "villa",
    fakta: [{ id: "Kolam air panas pribadi", en: "Private hot spring pool" }],
    harga: null,
    airPanasPribadi: true,
    situsLain: SIBENTANG_URL,
  },
];

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
  { id: "Kolam anak", en: "Children's pool" },
  { id: "Pemancingan", en: "Fishing pond" },
  { id: "Spa dan pijat", en: "Spa and massage" },
  { id: "WiFi", en: "WiFi" },
  { id: "Parkir gratis", en: "Free parking" },
] as const;

/* ---------- Nama tempat di dalam resort (terverifikasi dari materi klien) ---------- */

export const RESTORAN = "Tunjung Balebat";
export const SPA = "Pitaloka Spa";
export const MUSIK = "Kacapi Suling";

/* ---------- Ulasan ----------
 * Ditulis sebagai TEKS dengan menyebut platformnya. JANGAN dipakai sebagai
 * markup aggregateRating: ulasan ini milik Tripadvisor dan Traveloka, bukan
 * dikumpulkan situs ini, dan memarkupnya melanggar kebijakan Google.
 */

export const ULASAN = [
  {
    sumber: "Tripadvisor",
    nilai: "4",
    dari: "5",
    jumlah: "1.211",
    catatan: {
      id: "Peringkat 2 dari 15 hotel di Garut",
      en: "Ranked 2nd of 15 hotels in Garut",
    },
  },
  {
    sumber: "Traveloka",
    nilai: "8,3",
    dari: "10",
    jumlah: "1.642",
    catatan: { id: "Predikat Mengesankan", en: "Rated Impressive" },
  },
] as const;

/* ---------- Ruang pertemuan ----------
 * Sumber: flyer resmi Fullboard Meeting dari klien. Angka kapasitas, bukan
 * janji komersial. null berarti tata letak itu tidak dilayani di ruang tsb.
 */

export const RUANG_MICE = [
  { nama: "Purba Dewata Full", theater: 350, kelas: 250, uShape: 160, bundar: 100 },
  { nama: "Purba Dewata 1", theater: 200, kelas: 150, uShape: 90, bundar: 60 },
  { nama: "Purba Dewata 2", theater: 150, kelas: 100, uShape: 70, bundar: 50 },
  { nama: "Intan Dewata Full", theater: 150, kelas: 100, uShape: 70, bundar: 54 },
  { nama: "Intan Dewata 1", theater: 100, kelas: 60, uShape: 40, bundar: 30 },
  { nama: "Intan Dewata 2", theater: 50, kelas: 40, uShape: 30, bundar: 24 },
  { nama: "Gambir Wangi", theater: null, kelas: null, uShape: null, bundar: 15 },
] as const;

/* ---------- Tarif paket ----------
 * Sumber: flyer resmi klien untuk Fullboard Meeting dan Outing serta Family
 * Gathering. Kedua flyer memakai tabel tarif yang sama.
 * ⚠️ FLYERNYA TIDAK BERTANGGAL. Halaman WAJIB menyebut bahwa tarif
 * dikonfirmasi ulang saat pemesanan. Jangan hapus catatan itu.
 */

export const TARIF_PAKET = [
  {
    isi: { id: "Sendiri di kamar", en: "Single occupancy" },
    weekday: "1.470.000",
    weekend: "1.855.000",
  },
  {
    isi: { id: "Berdua sekamar", en: "Twin share" },
    weekday: "970.000",
    weekend: "1.105.000",
  },
  {
    isi: { id: "Bertiga sekamar", en: "Triple share" },
    weekday: "865.000",
    weekend: "970.000",
  },
  {
    isi: { id: "Berempat sekamar", en: "Quad share" },
    weekday: "820.000",
    weekend: "900.000",
  },
] as const;

export const TERMASUK_SEMUA = [
  { id: "Menginap satu malam di kamar Bungalow", en: "One night in a Bungalow room" },
  { id: "Sarapan, makan siang, dan makan malam prasmanan", en: "Buffet breakfast, lunch and dinner" },
  { id: "Tiket kolam renang dan kamar rendam", en: "Swimming pool and soaking room access" },
  { id: "Pajak dan pelayanan", en: "Tax and service" },
] as const;

export const TERMASUK_MEETING = [
  { id: "Dua kali rehat kopi", en: "Two coffee breaks" },
  { id: "Ruang pertemuan berikut proyektor, layar, AC, dan air mineral", en: "Meeting room with projector, screen, air conditioning and mineral water" },
] as const;

export const TERMASUK_OUTING = [
  { id: "Satu kali rehat kopi", en: "One coffee break" },
  { id: "Live musik electone, satu penyanyi dan satu pemain, sampai tiga jam", en: "Live electone music, one singer and one player, up to three hours" },
  { id: "Fun games", en: "Fun games" },
] as const;

/* ---------- Meta bawaan ---------- */

export const META_BAWAAN = {
  // Kata kunci di depan, merek di belakang: yang dicari orang adalah
  // "hotel air panas garut", bukan nama propertinya.
  title:
    "Resort Air Panas Alami di Cipanas Garut | Kampung Sumber Alam",
  description:
    "Resort bergaya kampung Sunda di Cipanas, Garut. Bungalow beratap ijuk berdiri di atas kolam, berendam air panas alami dari Gunung Guntur. Booking langsung.",
} as const;
