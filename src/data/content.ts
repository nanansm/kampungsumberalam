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

export const WA = "6281110557838";
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

/* ---------- Paket acara ----------
 * Sumber: halaman EVENTS resort-kampungsumberalam.com beserta sembilan
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
    nama: { id: "Tunangan", en: "Engagement" },
    harga: "180.000",
    satuan: "orang",
    minimal: 50,
    termasuk: [
      { id: "Prasmanan", en: "Buffet" },
      { id: "Dekorasi", en: "Decoration" },
      { id: "Perias", en: "Make-up artist" },
      { id: "Tata suara dan tempat", en: "Sound system and venue" },
    ],
    tambahan: [
      { id: "Pembawa acara", en: "MC" },
      { id: "Foto", en: "Photography" },
    ],
    catatan: {
      id: "Berlangsung di ruang pertemuan atau di restoran.",
      en: "Held in a meeting room or in the restaurant.",
    },
    foto: "/images/restoran-tunjung.webp",
    w: 819,
    h: 544,
    alt: "Ruang makan Tunjung Balebat berdinding kayu menghadap kolam",
  },
  {
    slug: "akad",
    nama: { id: "Akad", en: "Akad ceremony" },
    harga: "205.000",
    satuan: "orang",
    minimal: 100,
    termasuk: [
      { id: "Prasmanan", en: "Buffet" },
      { id: "Dekorasi", en: "Decoration" },
      { id: "Perias", en: "Make-up artist" },
      { id: "Tata suara dan tempat", en: "Sound system and venue" },
    ],
    tambahan: [
      { id: "Pembawa acara", en: "MC" },
      { id: "Foto", en: "Photography" },
    ],
    catatan: {
      id: "Berlangsung di ruang pertemuan atau di restoran.",
      en: "Held in a meeting room or in the restaurant.",
    },
    foto: "/images/taman-kampung.webp",
    w: 1200,
    h: 501,
    alt: "Taman terbuka Kampung Sumber Alam dengan deretan pohon dan bangunan beratap ijuk",
  },
  {
    slug: "intimate-wedding",
    nama: { id: "Pernikahan kecil", en: "Intimate wedding" },
    harga: "260.000",
    satuan: "orang",
    minimal: 100,
    termasuk: [
      { id: "Prasmanan", en: "Buffet" },
      { id: "Dekorasi", en: "Decoration" },
      { id: "Perias", en: "Make-up artist" },
      { id: "Tata suara dan tempat", en: "Sound system and venue" },
    ],
    tambahan: [
      { id: "Pembawa acara", en: "MC" },
      { id: "Foto", en: "Photography" },
    ],
    catatan: {
      id: "Berlangsung di ruang pertemuan atau di restoran.",
      en: "Held in a meeting room or in the restaurant.",
    },
    foto: "/images/purba-dewata.webp",
    w: 819,
    h: 544,
    alt: "Ruang Purba Dewata ditata dengan meja bundar berkain",
  },
  {
    slug: "pre-wedding",
    nama: { id: "Foto pra nikah", en: "Pre-wedding shoot" },
    harga: "800.000",
    satuan: "paket",
    minimal: null,
    termasuk: [
      { id: "Ruang rias", en: "Make-up room" },
      { id: "Kudapan dan minuman selamat datang untuk 4 orang", en: "Light meal and welcome drink for 4" },
      { id: "Akses seluruh area resort", en: "Access to the whole resort" },
    ],
    tambahan: [],
    catatan: {
      id: "Villa Sibentang tidak termasuk di paket ini.",
      en: "Villa Sibentang is not included in this package.",
    },
    foto: "/images/kampung-teratai.webp",
    w: 999,
    h: 756,
    alt: "Kolam teratai berbunga dengan bungalow beratap ijuk di belakangnya",
  },
  {
    slug: "pre-wedding-sibentang",
    nama: {
      id: "Foto pra nikah dengan Villa Sibentang",
      en: "Pre-wedding shoot with Villa Sibentang",
    },
    harga: "1.500.000",
    satuan: "paket",
    minimal: null,
    termasuk: [
      { id: "Ruang rias", en: "Make-up room" },
      { id: "Makan siang", en: "Lunch" },
      { id: "Kudapan dan minuman selamat datang untuk 4 orang", en: "Light meal and welcome drink for 4" },
      { id: "Akses seluruh area termasuk Private Villa Sibentang", en: "Access to the whole resort including Private Villa Sibentang" },
    ],
    tambahan: [],
    foto: "/images/kolam-privat-putih.webp",
    w: 1200,
    h: 675,
    alt: "Kolam pribadi berdinding putih di halaman villa",
  },
  {
    slug: "honeymoon",
    nama: { id: "Bulan madu", en: "Honeymoon" },
    harga: "2.100.000",
    satuan: "paket",
    minimal: null,
    termasuk: [
      { id: "Menginap di bungalow", en: "One stay in a bungalow" },
      { id: "Makan malam berteman lilin", en: "Candlelit dinner" },
      { id: "Kue kecil", en: "Mini cake" },
      { id: "Dekorasi kamar", en: "Room decoration" },
    ],
    tambahan: [],
    foto: "/images/suite-kolam-senja.webp",
    w: 960,
    h: 640,
    alt: "Suite dengan kolam pribadi pada sore hari",
  },
  {
    slug: "ulang-tahun",
    nama: { id: "Ulang tahun", en: "Birthday party" },
    harga: "136.000",
    satuan: "orang",
    minimal: 50,
    termasuk: [
      { id: "Prasmanan", en: "Buffet" },
      { id: "Kue", en: "Cake" },
      { id: "Tata suara dan tempat", en: "Sound system and venue" },
    ],
    tambahan: [
      { id: "Dekorasi", en: "Decoration" },
      { id: "Pembawa acara", en: "MC" },
    ],
    catatan: {
      id: "Untuk remaja dan dewasa.",
      en: "For teenagers and adults.",
    },
    foto: "/images/keluarga-taman.webp",
    w: 819,
    h: 546,
    alt: "Keluarga duduk di bangku taman Kampung Sumber Alam",
  },
  {
    slug: "ulang-tahun-anak",
    nama: { id: "Ulang tahun anak", en: "Kids birthday" },
    harga: "126.000",
    satuan: "orang",
    minimal: 50,
    termasuk: [
      { id: "Menu anak", en: "Kids menu" },
      { id: "Bingkisan", en: "Goodie bag" },
      { id: "Kue", en: "Cake" },
      { id: "Tata suara dan tempat", en: "Sound system and venue" },
    ],
    tambahan: [
      { id: "Dekorasi", en: "Decoration" },
      { id: "Pembawa acara dan pesulap", en: "MC and magician" },
      { id: "Badut", en: "Clown" },
    ],
    foto: "/images/bermain-anak.webp",
    w: 819,
    h: 544,
    alt: "Anak anak bermain di area bermain Kampung Sumber Alam",
  },
  {
    slug: "arisan-sibentang",
    nama: {
      id: "Arisan dan reuni di Villa Sibentang",
      en: "Social gathering at Villa Sibentang",
    },
    harga: "160.000",
    satuan: "orang",
    minimal: 6,
    termasuk: [
      { id: "Pemakaian Private Villa Sibentang", en: "Use of Private Villa Sibentang" },
      { id: "Kolam air panas pribadi", en: "Private hot spring pool" },
    ],
    tambahan: [],
    catatan: {
      id: "Tanpa menginap. Cocok untuk arisan, gathering, dan reuni.",
      en: "Day use, no overnight stay. Suits arisan, gatherings and reunions.",
    },
    foto: "/images/suite-gazebo.webp",
    w: 900,
    h: 600,
    alt: "Gazebo kayu di samping kolam pribadi",
  },
  {
    slug: "berenang-sibentang",
    nama: {
      id: "Berenang di Villa Sibentang",
      en: "Swimming at Villa Sibentang",
    },
    harga: "85.000",
    satuan: "orang",
    minimal: 6,
    termasuk: [
      { id: "Kolam air panas pribadi", en: "Private hot spring pool" },
      { id: "Camilan", en: "Snacks" },
    ],
    tambahan: [],
    foto: "/images/grotto-privat.webp",
    w: 819,
    h: 546,
    alt: "Kolam air panas pribadi berdinding batu",
  },
];

/* ---------- Di sekitar resort ----------
 * Sumber: halaman POINT OF INTEREST situs lama, dibaca 13 Agu 2026.
 * Jarak dan waktu tempuh SENGAJA TIDAK ditulis: situs lama tidak menyebutnya
 * dan menaksir sendiri berarti mengarang. Isi angkanya kalau sudah diukur.
 */

export const SEKITAR = [
  {
    nama: "Kebun Mawar Situhapa",
    teks: {
      id: "Taman mawar seluas lima hektar di ketinggian 1.150 mdpl. Hawanya jauh lebih dingin daripada di Cipanas.",
      en: "A five-hectare rose garden at 1,150 metres above sea level. The air up there runs much colder than in Cipanas.",
    },
  },
  {
    nama: "Waterboom Sabda Alam",
    teks: {
      id: "Kolam seluncur yang airnya juga air panas alami dari Gunung Guntur, jadi anak-anak tidak kedinginan walau main air seharian.",
      en: "A waterpark fed by the same natural hot springs from Mount Guntur, so children do not get cold after a full day in the water.",
    },
  },
  {
    nama: "Cilopang Adventure Camp",
    teks: {
      id: "Area kemah di Tarogong Kaler yang juga jadi titik awal pendakian Gunung Guntur.",
      en: "A camping ground in Tarogong Kaler that also serves as a starting point for the Mount Guntur hike.",
    },
  },
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
