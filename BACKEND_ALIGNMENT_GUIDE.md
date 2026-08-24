# Panduan Penyesuaian Lengkap SinPo.id (Next.js Frontend ↔ Laravel REST API)

Dokumen ini menjelaskan secara detail seluruh komponen web **SinPo.id** yang perlu disesuaikan dengan backend **Laravel REST API** agar sistem bekerja secara dinamis, otomatis, dan siap produksi.

---

## 1. Kategori & Navigasi (Categories & Channels)

### Pemahaman:
Saat ini menu navigasi di Frontend Next.js di-hardcode. Di backend Laravel, kategori dikelola secara dinamis melalui CMS Admin oleh tim redaksi.

### Skema Endpoint API:
* `GET /api/kategori`
  ```json
  {
    "success": true,
    "data": [
      { "id": 1, "nama": "Politik", "slug": "politik" },
      { "id": 2, "nama": "Hukum & Kriminal", "slug": "hukum-kriminal" },
      { "id": 3, "nama": "Ekonomi & Bisnis", "slug": "ekonomi-bisnis" },
      { "id": 4, "nama": "Nasional", "slug": "nasional" },
      { "id": 5, "nama": "Olahraga", "slug": "olahraga" }
    ]
  }
  ```

### Penyesuaian di Next.js:
Navbar (`<StickyNav />` & `<Header />`) menarik data kategori dari `GET /api/kategori` agar saat admin menambahkan kategori baru di Laravel, menu navigasi Next.js otomatis terupdate tanpa perlu di-deploy ulang.

---

## 2. Running News / Breaking News Ticker

### Pemahaman:
Teks berjalan (ticker) di bagian atas website menampilkan judul berita kilat terbaru.

### Skema Endpoint API:
* `GET /api/berita?limit=5`
  Frontend mengambil 5 judul berita paling baru untuk dimasukkan ke komponen `<BreakingTicker />`.

---

## 3. Berita Populer & Trending (Sidebar)

### Pemahaman:
Sidebar kanan menampilkan berita yang paling banyak dibaca pembaca hari ini.

### Skema Endpoint API:
* `GET /api/berita?sort=popular` atau `GET /api/berita?sort_by=views&order=desc`
  ```json
  {
    "success": true,
    "data": [
      { "id": 10, "judul": "...", "dilihat": 8900 }
    ]
  }
  ```

---

## 4. Kanal Khusus (Kanal BONGKAR, SinPo TV, & Radio)

### Pemahaman:
SinPo.id memiliki rubrik khusus seperti **BONGKAR** (investigasi) serta kanal multimedia **SinPo TV** dan **SinPo Radio**.

### Skema Endpoint API:
* **Berita Investigasi:** `GET /api/berita?kategori=bongkar`
* **Program SinPo TV:** `GET /api/channel/sinpo-tv` atau `GET /api/berita?channel=sinpo-tv`

---

## 5. Sistem Komentar Pembaca (Article Detail View)

### Pemahaman:
Pembaca dapat membaca dan mendaftarkan komentar di setiap detail artikel berita.

### Skema Endpoint API:
* **Membaca Komentar:** `GET /api/berita/{slug}` (mengembalikan detail berita + array `komentars`).
* **Mengirim Komentar Baru:** `POST /api/komentar`
  ```json
  {
    "berita_id": 22,
    "nama": "Ahmad Subagyo",
    "email": "ahmad@gmail.com",
    "komentar": "Berita yang sangat informatif dan aktual!"
  }
  ```

---

## 6. Polling Interaktif (Survei Pembaca)

### Pemahaman:
Komponen polling di sidebar/footer untuk mengukur persepsi pembaca terhadap isu terkini.

### Skema Endpoint API:
* **Mengambil Polling Aktif:** `GET /api/polling`
* **Mengirimkan Suara (Vote):** `POST /api/polling/{id}/vote` (body: `{ option_id: 1 }`).

---

## 7. Banner Iklan Dinamis (Header, In-Feed, Sidebar)

### Pemahaman:
Slot iklan di header atas, sela-sela berita, dan sidebar dikendalikan dari Laravel CMS.

### Skema Endpoint API:
* `GET /api/iklan`
  ```json
  {
    "success": true,
    "data": [
      { "id": 1, "posisi": "header", "gambar": "uploads/iklan/banner.jpg", "url": "https://sinpo.id" }
    ]
  }
  ```

---

## 8. Halaman Statis / Footer Links (Redaksi, Pedoman Siber, dll)

### Pemahaman:
Halaman informasi legal dan perusahaan seperti Susunan Redaksi, Pedoman Media Siber, Hak Jawab, Kebijakan Privasi, dan Hubungi Kami.

### Skema Endpoint API:
* `GET /api/statis/{slug}` (contoh: `/api/statis/redaksi`, `/api/statis/pedoman-siber`).

---

## Ringkasan Alur Kerja Pengembang (Frontend Dev Checklist):
1. **Navigasi:** Ganti data statis kategori di `StickyNav` dengan `apiFetch('/kategori')`.
2. **Detail Artikel:** Panggil `apiFetch('/berita/' + slug)` saat artikel dibuka untuk menambah jumlah `views` dan mengambil komentar terbaru.
3. **Form Komentar:** Gunakan `POST /api/komentar` di komponen `ArticleDetailView`.
4. **Polling:** Gunakan `apiFetch('/polling')` & `POST /api/polling/{id}/vote`.
5. **SEO & ISR:** Terapkan `{ next: { revalidate: 60 } }` pada fetch server-side agar halaman berita di-cache & terindeks cepat oleh Google News.
