/**
 * Teks alternatif foto halaman dalam versi Inggris (formal). Kuncinya bunyi alt Indonesia
 * persis seperti di komponen, jadi data foto tidak perlu diubah bentuknya. Nama tempat dan
 * produk (Restoran Tunjung Balebat, Purba Dewata, Babakan Siluhur, Villa Sibentang,
 * Pitaloka Spa, balong) tidak diterjemahkan.
 *
 * altTeks() menghentikan build kalau satu alt belum punya padanan Inggris, supaya halaman
 * /en/ tidak pernah memuat alt berbahasa Indonesia.
 */
const ALT_EN: Record<string, string> = {
  // Galeri: kampung dan balong
  "Bungalow beratap ijuk berdiri di seberang kolam teratai yang sedang berbunga": "A thatched bungalow across a lotus pond in bloom",
  "Lentera besar menyala di tepi kolam teratai pada malam hari": "A large lantern glowing at the edge of the lotus pond at night",
  "Kabut pagi di atas kolam teratai dan deretan bungalow beratap ijuk": "Morning mist over the lotus pond and a row of thatched bungalows",
  "Kolam teratai berbunga dengan bungalow beratap ijuk di belakangnya": "A lotus pond in bloom with thatched bungalows behind it",
  "Tamu memandang kolam teratai dari dalam paviliun kayu": "A guest looking out at the lotus pond from inside a timber pavilion",
  "Bungalow beratap ijuk di antara pohon palem": "Thatched bungalows among palm trees",
  "Taman dan kolam Kampung Sumber Alam dengan latar pegunungan": "The gardens and ponds of Kampung Sumber Alam with the mountains behind",
  "Gerbang batu menuju area bungalow Babakan Siluhur": "The stone gate leading to the Babakan Siluhur bungalows",
  "Taman terbuka dengan deretan pohon dan bangunan beratap ijuk": "An open garden with rows of trees and thatched buildings",
  // Galeri: air panas dan kolam
  "Kolam air panas berdinding batu menyerupai gua": "A stone-walled hot spring pool shaped like a grotto",
  "Bak rendam air panas alami di dalam kamar dengan lilin di tepinya": "A natural hot spring soaking tub inside a room, with candles along its edge",
  "Kolam air panas pribadi berdinding batu": "A private stone-walled hot spring pool",
  "Kolam pribadi berdinding putih di halaman villa": "A white-walled private pool in a villa courtyard",
  "Kolam renang utama dilihat dari tepi": "The main swimming pool seen from its edge",
  "Kolam renang utama beratap kanopi": "The main swimming pool under its canopy",
  "Kolam renang utama Kampung Sumber Alam pada siang hari": "The main swimming pool of Kampung Sumber Alam in daylight",
  "Tamu duduk di tepi kolam teratai yang rimbun": "A guest sitting at the edge of a lush lotus pond",
  "Halaman berumput di tepi kolam dengan bungalow di kejauhan": "A lawn beside the pond with bungalows in the distance",
  // Galeri dan Menginap: kamar
  "Interior bungalow kayu dengan tempat tidur dan jendela menghadap kolam": "Inside a timber bungalow, with the bed and a window facing the pond",
  "Kamar dengan dua tempat tidur menghadap taman": "A twin room facing the garden",
  "Kamar suite dengan tempat tidur besar dan dinding kayu": "A suite with a large bed and timber walls",
  "Gazebo kayu di samping kolam pribadi suite": "A timber gazebo beside a suite's private pool",
  "Gazebo kayu di samping kolam pribadi": "A timber gazebo beside a private pool",
  "Suite dengan kolam pribadi pada sore hari": "A suite with its private pool in the late afternoon",
  // Galeri: makan, spa, keluarga, rapat
  "Ruang makan Restoran Tunjung Balebat berdinding kayu menghadap kolam": "The timber-walled dining room of Restoran Tunjung Balebat, facing the pool",
  "Sudut restoran dengan meja kayu dan bukaan ke arah taman": "A corner of the restaurant with timber tables and openings onto the garden",
  "Pemusik berbusana Sunda membawakan live music di Kampung Sumber Alam": "Musicians in Sundanese dress performing live music at Kampung Sumber Alam",
  "Terapis memijat tamu di Pitaloka Spa": "A therapist giving a guest a massage at Pitaloka Spa",
  "Perlengkapan pijat tertata di meja spa": "Massage essentials laid out on a spa table",
  "Anak-anak bermain di area bermain Kampung Sumber Alam": "Children at the Kampung Sumber Alam play area",
  "Keluarga duduk di bangku taman Kampung Sumber Alam": "A family sitting on a garden bench at Kampung Sumber Alam",
  "Ruang pertemuan Purba Dewata ditata dengan meja bundar berkain": "The Purba Dewata meeting room set with clothed round tables",
  "Ruang Purba Dewata ditata dengan meja bundar berkain": "Purba Dewata set with clothed round tables",
  // foto pembuka dan foto lepas halaman dalam
  "Taman terbuka Kampung Sumber Alam dengan deretan pohon dan bangunan beratap ijuk": "The open gardens of Kampung Sumber Alam, with rows of trees and thatched buildings",
  "Taman dan kolam Kampung Sumber Alam dengan latar pegunungan Garut": "The gardens and ponds of Kampung Sumber Alam against the mountains of Garut",
  "Bungalow kayu beratap ijuk berdiri di atas balong berdaun teratai": "A thatched timber bungalow standing over a lily-covered balong",
  "Kolam renang utama Kampung Sumber Alam dilihat dari tepi": "The main swimming pool of Kampung Sumber Alam seen from its edge",
  "Kolam air panas pribadi berdinding putih di halaman Villa Sibentang": "A white-walled private hot spring pool in a Villa Sibentang courtyard",
  "Bungalow beratap ijuk berdiri di atas kolam teratai dengan pegunungan Garut di kejauhan": "A thatched bungalow standing over a lotus pond, with the mountains of Garut in the distance",
  "Gerbang batu menuju area penginapan Babakan Siluhur": "The stone gate leading to the Babakan Siluhur lodgings",
};

export function altTeks(id: string, lang: "id" | "en"): string {
  if (lang !== "en") return id;
  const en = ALT_EN[id.replace(/ /g, " ")];
  if (!en) throw new Error(`Alt Inggris belum ada untuk: "${id}" (tambahkan di src/data/alt-en.ts)`);
  return en;
}
