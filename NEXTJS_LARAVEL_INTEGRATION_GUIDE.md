# Panduan Integrasi Next.js & Laravel REST API (SinPo.id)

Dokumen ini berisi panduan standar produksi untuk menghubungkan Frontend **Next.js** (App Router) ke Backend **Laravel REST API** (SinPo.id) dengan aman, cepat, dan rapi.

---

## 1. Format Respons API (Standardized Response Contract)

Backend Laravel SinPo.id telah dikonfigurasi menggunakan format JSON standar:

```json
{
  "success": true,
  "message": "Daftar berita berhasil diambil",
  "data": [
    {
      "id": 1,
      "title": "Berita Utama SinPo",
      "slug": "berita-utama-sinpo",
      "category": { "id": 1, "name": "Politik", "slug": "politik" },
      "image_url": "http://localhost:8000/storage/berita/sample.jpg"
    }
  ],
  "meta": {
    "current_page": 1,
    "last_page": 10,
    "per_page": 10,
    "total": 100
  }
}
```

### Akses Data di Next.js (TypeScript):
* **`res.data`**: Berisi objek atau array data utama.
* **`res.meta`**: Informasi paginasi halaman (jika ada).
* **`res.success`**: Indikator boolean status keberhasilan request.

---

## 2. Pengaturan CORS & URL Environment

Agar browser tidak memblokir request (*CORS Policy*), pastikan konfigurasi environment disesuaikan:

### Di Laravel Backend (`.env`):
```ini
APP_URL=http://localhost:8000
FRONTEND_URL=http://localhost:3000
SANCTUM_STATEFUL_DOMAINS=localhost:3000
```

### Di Next.js Frontend (`.env.local`):
```ini
NEXT_PUBLIC_API_URL=http://localhost:8000/api
NEXT_PUBLIC_STORAGE_URL=http://localhost:8000/storage
```

---

## 3. Autentikasi (Laravel Sanctum Bearer Token)

API SinPo.id menggunakan **Laravel Sanctum Bearer Token** untuk fitur terproteksi (seperti profil user, admin, atau kirim komentar terautentikasi):

1. **Login User:** Kirim `POST /api/login` dengan `email`/`username` dan `password`.
2. **Terima Token:** Backend mengembalikan JSON berisi `token` (plain text string).
3. **Penyimpanan Token:** Frontend Next.js menyimpan token di `Cookies` atau `localStorage`.
4. **Header Request:** Setiap mengakses endpoint terproteksi (`/api/me`, `/api/user`), sertakan header:
   ```http
   Authorization: Bearer <TOKEN_ANDA>
   Accept: application/json
   ```

---

## 4. Penanganan Gambar di Next.js (`next.config.mjs`)

Daftarkan domain Laravel di `next.config.mjs` agar komponen `<Image />` dari Next.js dapat merender gambar berita dari backend Laravel tanpa error security:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '8000',
        pathname: '/**',
      },
      {
        protocol: 'http',
        hostname: '127.0.0.1',
        port: '8000',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'sinpo.id',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.sinpo.id',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
```

---

## 5. Strategi Data Fetching (SEO & Performance Portal Berita)

Di Next.js (App Router), gunakan kombinasi **Server Components (SSR/ISR)** dan **Client Components**:

### A. Halaman Berita / Homepage / Kategori (Server Components - SEO Friendly)
Gunakan Incremental Static Regeneration (ISR) agar halaman terbuka cepat dan optimal untuk SEO Google News:

```typescript
// app/page.tsx (Server Component)
import { apiFetch } from '@/lib/apiClient';
import { NewsItem } from '@/types/api';

export default async function HomePage() {
  const res = await apiFetch<NewsItem[]>('/berita', {
    revalidate: 60, // Cache & otomatis di-refresh tiap 60 detik (ISR)
  });

  const newsList = res.data;

  return (
    <main>
      <h1>SinPo.id - Berita Terkini</h1>
      <ul>
        {newsList.map((item) => (
          <li key={item.id}>{item.title}</li>
        ))}
      </ul>
    </main>
  );
}
```

### B. Kirim Komentar / Vote Polling / Search Bar (Client Components)
Gunakan `fetch` atau client helper di komponen Client (`'use client'`):

```typescript
'use client';

import { useState } from 'react';
import { apiFetch } from '@/lib/apiClient';

export default function CommentForm({ beritaId }: { beritaId: number }) {
  const [nama, setNama] = useState('');
  const [email, setEmail] = useState('');
  const [komentar, setKomentar] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await apiFetch('/komentar', {
        method: 'POST',
        revalidate: false,
        body: JSON.stringify({ berita_id: beritaId, nama, email, komentar }),
      });
      alert(res.message);
    } catch (err: any) {
      alert(err.message || 'Gagal mengirim komentar');
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <input value={nama} onChange={(e) => setNama(e.target.value)} placeholder="Nama Anda" required />
      <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" required />
      <textarea value={komentar} onChange={(e) => setKomentar(e.target.value)} placeholder="Komentar Anda" required />
      <button type="submit">Kirim Komentar</button>
    </form>
  );
}
```

---

## 6. Dokumentasi Lengkap untuk Tim Frontend Next.js

Tim Frontend Next.js dapat melihat skema tipe data (TypeScript type definition) dan menguji semua endpoint secara langsung melalui:

* **Dokumentasi UI Interactive (Scramble UI):**  
  `http://localhost:8000/docs/api`
* **JSON Schema (OpenAPI Spec):**  
  `http://localhost:8000/docs/api.json`  
  *(Dapat diimpor ke OpenAPI Client Generator / Orval / openapi-typescript untuk menghasilkan tipe TypeScript secara otomatis!)*
