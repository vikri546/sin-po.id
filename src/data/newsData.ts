import { Article, TimelineEvent, TVProgram } from '../types';

export const BREAKING_NEWS: string[] = [
  "BREAKING NEWS: MK Ketuk Palu Putusan Gugatan Sengketa Pilkada Serentak, Sidang Berjalan Kondusif.",
  "BERITA UTAMA: IHSG Menguat Hari Ini Didorong Sektor Finansial dan Teknologi yang Menanjak 2.4%.",
  "DIPLOMASI: Presiden Bertolak ke Jakarta Setelah Kunjungan Bilateral Bahas Kerja Sama Investasi Hijau.",
  "INFO CUACA: BMKG Merilis Peringatan Dini Potensi Hujan Lebat Disertai Angin Kencang di Wilayah Jabodetabek.",
  "BONGKAR: Menelusuri Dugaan Kebocoran Anggaran Daerah Senilai Ratusan Miliar Rupiah di Sektor Transportasi."
];

export const TV_PROGRAMS: TVProgram[] = [
  {
    id: "prog-1",
    title: "Sin Po Menyapa Indonesia Pagi",
    host: "Budi Santoso & Amanda Putri",
    time: "06:00 - 08:30 WIB",
    videoPlaceholderText: "Menyapa Indonesia Pagi - Mengupas isu hangat nusantara langsung bersama narasumber terpercaya di studio.",
    tickerText: "LIVE: Menyoroti Kesiapan Infrastruktur Transportasi Publik Menjelang Libur Nasional Tahun Ini..."
  },
  {
    id: "prog-2",
    title: "Catatan Kriminal Malam",
    host: "Kompol (Purn) Wahyu Utomo",
    time: "21:00 - 22:00 WIB",
    videoPlaceholderText: "Catatan Kriminal Malam - Investigasi mendalam kasus-kasus kejahatan kerah biru dan keadilan hukum.",
    tickerText: "POLRI Berhasil Membongkar Sindikat Kejahatan Siber Internasional Berkedok Investasi Kripto..."
  },
  {
    id: "prog-3",
    title: "BONGKAR Opini Eksklusif",
    host: "Siti Rahmawati",
    time: "19:30 - 20:30 WIB",
    videoPlaceholderText: "BONGKAR Opini Eksklusif - Menguliti dokumen rahasia, melacak aset ilegal, dan menyajikan fakta tanpa sensor.",
    tickerText: "DOKUMEN EKSKLUSIF: Aliran dana siluman kembali terendus ke rekening pejabat daerah..."
  },
  {
    id: "prog-4",
    title: "Ekbis Sepekan",
    host: "Rian Hidayat",
    time: "14:00 - 15:00 WIB",
    videoPlaceholderText: "Ekbis Sepekan - Rangkuman berita ekonomi, pergerakan saham, inflasi global, dan penguatan UMKM lokal.",
    tickerText: "BI Pertahankan Suku Bunga Acuan di Level 5.75% untuk Menjaga Stabilitas Rupiah..."
  }
];

export const TIMELINE_EVENTS: TimelineEvent[] = [
  {
    id: "evt-1",
    date: "15 Juni 2026",
    title: "Temuan Dokumen Tender Siluman",
    description: "Tim Investigasi BONGKAR SinPo.id memperoleh salinan dokumen kontrak ganda pembangunan jembatan senilai Rp 140 Miliar.",
    status: "critical"
  },
  {
    id: "evt-2",
    date: "18 Juni 2026",
    title: "Pemeriksaan Saksi Kunci",
    description: "Mantan Kepala Dinas Pekerjaan Umum dimintai keterangan sebagai saksi oleh komisi anti-korupsi pasca pelaporan publik.",
    status: "ongoing"
  },
  {
    id: "evt-3",
    date: "22 Juni 2026",
    title: "Penyegelan Kantor Kontraktor Utama",
    description: "Aparat berwenang melakukan penyegelan dan menyita puluhan berkas transaksi keuangan serta hard disk server di kawasan bisnis.",
    status: "ongoing"
  },
  {
    id: "evt-4",
    date: "25 Juni 2026",
    title: "Tanggapan Resmi Kementerian",
    description: "Menteri menegaskan tidak akan menoleransi kecurangan dan membekukan sementara izin operasional konsorsium pelaksana.",
    status: "resolved"
  }
];

export const MOCK_ARTICLES: Article[] = [];

export const POPULAR_NEWS: any[] = [];
