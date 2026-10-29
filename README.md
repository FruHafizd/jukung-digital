# Jukung Digital

Aplikasi lokal untuk mencari **UMKM yang belum punya website** di Google Maps, menghubungi mereka lewat WhatsApp, lalu mengelola klien yang deal sampai websitenya online. Fokus awalnya Kalimantan Selatan, tapi bisa dipakai untuk seluruh Indonesia.

> *Jukung*: perahu pedagang pasar terapung Banjar yang mengantar dagangan sampai ke pembeli, sama seperti website yang mengantar usaha sampai ke pelanggan.

Aplikasi ini tidak memakai AI saat berjalan. Pencarian, penyaringan, dan penilaian lead adalah script Python biasa.

---

## Fitur

| Halaman | Isi |
|---|---|
| **Dashboard** | Corong lead sampai deal, tingkat deal per jenis usaha dan per kab/kota, uang masuk bulan ini, tenggat proyek, pengingat perpanjangan domain, sisa jatah sumber data |
| **Cari lead** | Pilih provinsi, kab/kota (bisa per kecamatan), dan jenis usaha (24 kategori termasuk usaha khas Kalsel), kata kunci atau lokasi bebas. Ada perkiraan pemakaian jatah, progres langsung, dan log |
| **Daftar lead** | Tabel berskor dengan filter (status, jenis usaha, wilayah, status website, WhatsApp, skor), export Excel, dan laci detail (status, follow-up, catatan, riwayat kontak) |
| **Kirim WhatsApp** | Template terisi otomatis (nama usaha, rating, kota, harga), penanda jam kirim ideal per jenis usaha, penghitung batas aman WA per hari, pencatatan otomatis |
| **Follow-up hari ini** | Pola hari ke-1 (pembuka), hari ke-3 (kirim contoh), hari ke-7 (follow-up terakhir). Berisi daftar yang jatuh tempo, saran lead baru, dan lead yang 3 kali tanpa balasan |
| **Klien & proyek** | Papan kanban (materi → desain → revisi → online → selesai), to-do fitur dan materi otomatis per paket, pembayaran DP dan pelunasan, jatah revisi, data domain dan perpanjangan |
| **Catatan** | Catatan umum dan catatan per klien dengan judul, daftar, dan checklist yang bisa dicentang |
| **Template & jawaban** | Template pesan bertahap (versi Kalsel dan luar daerah), jawaban untuk penolakan yang umum, paket dan harga |
| **Pengaturan** | Profil, sumber data dan kuncinya, rem kuota, wilayah fokus, backup database, data contoh |

### Cara lead disaring

Setiap usaha dari Google Maps dicek berurutan:

1. **Tutup permanen atau sementara**: dibuang.
2. **Punya website sendiri**: dibuang.
3. **"Website"-nya hanya medsos atau marketplace** (Instagram, Facebook, TikTok, Linktree, Shopee, Tokopedia, GoFood, situs `business.site` lama yang sudah mati, dan sebagainya): disimpan dan ditandai sebagai **lead panas**.
4. **Tanpa nomor telepon**: dibuang. Yang tampil hanya usaha yang bisa dihubungi.
5. **Di luar provinsi yang dicari**: dibuang. **Sudah pernah tersimpan**: dilewati.

Nomor HP (`08xx` / `+62 8xx`) ditandai punya WhatsApp. Nomor kantor tetap disimpan dan bisa ditelepon.

**Skor (0–95)** dihitung dari: punya WhatsApp, hanya medsos atau tanpa website, rating, jumlah ulasan (10–300 paling ideal, di atas 1.000 kemungkinan usaha besar), dan prioritas jenis usaha.

---

## Teknologi

- **Backend:** Python 3.12+, FastAPI, PyMySQL, httpx, openpyxl
- **Database:** MySQL 8 (Laragon)
- **Frontend:** Vue 3 (ES module, tanpa build step), CSS sendiri, font Plus Jakarta Sans
- **Sumber data Google Maps:** SerpApi (utama), Apify (cadangan otomatis), Google Places API (New)

---

## Instalasi

### Yang dibutuhkan
- Windows dengan [Laragon](https://laragon.org) (MySQL berjalan lewat **Start All**)
- [Python 3.12+](https://www.python.org/downloads/) (centang "Add python.exe to PATH" saat instalasi)

### Langkah
```bash
git clone https://github.com/<username>/<repo>.git
cd <repo>
```

1. Salin `config.example.ini` menjadi `config.ini`, lalu isi password MySQL Laragon Anda. Kalau Anda langsung menjalankan `setup.bat`, file ini akan dibuatkan dan dibuka otomatis.
2. Jalankan **`setup.bat`**. Script ini membuat virtualenv, memasang library, membuat database `jukung_digital`, dan mengisi data awal.
3. Jalankan **`start.bat`**. Browser akan terbuka di `http://127.0.0.1:8765`.
4. Di aplikasi, buka **Pengaturan**, isi nama Anda, dan tempel kunci SerpApi (panduannya ada di halaman itu).

Database dibuat ulang dengan aman setiap kali `start.bat` jalan: tabel yang sudah ada tidak diubah, dan migrasi dijalankan otomatis.

---

## Sumber data & biaya

| Sumber | Jatah gratis | Kartu kredit | Rem bawaan aplikasi |
|---|---|---|---|
| **SerpApi** (utama) | ±250 pencarian per bulan (1 pencarian = maks. 20 usaha) | Tidak perlu | 240 pencarian per bulan |
| **Apify** (cadangan) | Kredit $5 per bulan (±1.000 usaha) | Tidak perlu | 900 usaha per bulan |
| **Google Places API** | Kuota gratis per SKU, tapi akun Indonesia diminta deposit ≥ Rp500.000 | Perlu | 900 request per bulan, 30 per hari |

- Kalau jatah SerpApi habis di tengah pencarian, aplikasi otomatis beralih ke Apify (bisa dimatikan di Pengaturan).
- Sisa jatah SerpApi dicek lewat Account API, yang gratis dan tidak memotong kuota.
- Kunci API disimpan di **database lokal**, bukan di file repo.

---

## Struktur folder

```
app/
  main.py        API FastAPI + penyaji file web
  scraper.py     penyaringan, skor, rem kuota, menjalankan pencarian
  sumber.py      klien SerpApi / Apify / Google Places (format data diseragamkan)
  db.py          koneksi MySQL (membaca config.ini)
  setup_db.py    membuat database, migrasi, data awal
  seed.py        kategori usaha, paket, template pesan, jawaban penolakan
  demo.py        data contoh [CONTOH]
web/
  index.html, css/app.css
  js/main.js     kerangka aplikasi & router
  js/components.js  modal WA, modal deal, laci lead, editor catatan
  js/pages/*.js  halaman-halaman
  vendor/        Vue 3
  fonts/         Plus Jakarta Sans
database/schema.sql   struktur tabel
data/wilayah.json     kode wilayah Indonesia (provinsi, kab/kota, kecamatan)
setup.bat, start.bat, run_server.py
config.example.ini    contoh konfigurasi (config.ini asli tidak di-commit)
PANDUAN.md            panduan pemakaian harian
```

### Tabel database
`leads`, `riwayat_kontak`, `riwayat_scraping`, `penggunaan_api`, `kategori`, `wilayah`, `template_pesan`, `jawaban_keberatan`, `paket`, `proyek`, `proyek_tugas`, `pembayaran`, `revisi`, `catatan`, `pengaturan`.

---

## Keamanan & privasi

- `config.ini` (password MySQL) dan folder `backups/` (dump database berisi lead dan kunci API) **tidak ikut di-commit**, meskipun repo-nya private.
- Server hanya mendengarkan `127.0.0.1`, sehingga tidak bisa diakses dari perangkat lain.
- Data lead adalah informasi bisnis publik dari Google Maps. Hubungi secara wajar: kirim pesan manual dengan batas sekitar 25 per hari, dan berhenti setelah 3 kali tanpa balasan atau kalau lead menolak.

---

## Rencana berikutnya

- **Tahap 2:** contoh landing page otomatis per lead dari data Google Maps, diunggah ke hosting statis gratis, lalu link-nya dikirim di pesan "kirim contoh website".

---

## Kredit pihak ketiga

- [Vue.js](https://vuejs.org): MIT License
- [Plus Jakarta Sans](https://github.com/tokotype/PlusJakartaSans): SIL Open Font License 1.1
- Data kode wilayah dari [cahyadsn/wilayah](https://github.com/cahyadsn/wilayah) (Kepmendagri No. 300.2.2-2138 Tahun 2025): MIT License
