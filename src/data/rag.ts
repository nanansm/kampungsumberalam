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
];
const NBSP = " ";
const pola = new RegExp(NAMA.map((n) => n.replace(/[.*+?^${}()|[\]\\&]/g, "\\$&")).join("|"), "g");

export function lekat(t: string): string {
  return t
    .replace(pola, (m) => m.replace(/ /g, NBSP))
    .replace(/(±?\d[\d.,–-]*) (m|menit|min|jam|hr|orang|dewasa|adults|unit|units|villa|villas)\b/g, `$1${NBSP}$2`)
    .replace(/ · /g, `${NBSP}· `);
}
