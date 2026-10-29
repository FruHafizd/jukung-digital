# Jukung Digital: panduan pemakaian

Aplikasi untuk mencari UMKM yang belum punya website di Google Maps, menghubungi mereka lewat WhatsApp, lalu mengelola klien yang deal. Semuanya berjalan di komputer Anda, dan datanya tersimpan di MySQL Laragon.

## Menjalankan aplikasi

1. Buka **Laragon**, lalu klik **Start All** supaya MySQL berjalan.
2. Klik dua kali **`start.bat`** di folder ini.
3. Browser akan terbuka sendiri di `http://127.0.0.1:8765`.
4. Jendela hitam yang muncul jangan ditutup selama aplikasi dipakai. Tutup jendela itu kalau sudah selesai.

Pertama kali dijalankan, `start.bat` otomatis menyiapkan Python, library, dan database.

## Langkah awal

1. Buka **Pengaturan**, lalu isi **nama Anda**. Nama ini dipakai di template pesan WhatsApp.
2. Isi kunci **SerpApi** (sumber data utama, gratis tanpa kartu kredit). Ikuti panduan di halaman Pengaturan, lalu klik **Tes**. Kalau mau, isi juga token **Apify** sebagai cadangan, yang otomatis dipakai saat jatah SerpApi bulan itu habis.
3. Mau mencoba dulu tanpa API key? Klik **Isi data contoh** di Pengaturan. Hapus lagi kalau sudah tidak dipakai.

## Alur kerja harian

| Langkah | Halaman |
|---|---|
| Cari lead baru (centang wilayah dan jenis usaha) | Cari lead |
| Kirim pesan pembuka ke lead dengan skor tertinggi | Daftar lead atau Follow-up hari ini |
| Follow-up yang jatuh tempo (hari ke-3 dan ke-7) | Follow-up hari ini |
| Lead setuju, klik **Tandai deal** | Laci detail lead |
| Kerjakan to-do fitur, catat pembayaran dan revisi | Klien & proyek |

Tombol **Buka WhatsApp & catat** membuka WhatsApp dengan pesan yang sudah terisi, lalu otomatis mencatat kontak dan menjadwalkan follow-up berikutnya. Kirim maksimal 20–30 pesan per hari supaya nomor tidak diblokir.

## Sumber data & keamanan biaya

| Sumber | Jatah gratis | Rem bawaan aplikasi |
|---|---|---|
| SerpApi (utama) | ±250 pencarian per bulan, tanpa kartu | 240 pencarian per bulan |
| Apify (cadangan) | Kredit $5 per bulan (±1.000 tempat), tanpa kartu | 900 tempat per bulan |
| Google Places API | Perlu deposit Rp500.000 untuk akun Indonesia | 900 request per bulan, 30 per hari |

- SerpApi dan Apify tidak terhubung ke kartu, jadi kalau jatahnya habis, pencarian hanya berhenti tanpa tagihan.
- Kalau nanti memakai Google, pasang rem kuota di Google Cloud (SearchTextRequest per day = 30), dan jangan klik "Upgrade".
- Kalau rem tercapai, pencarian berhenti sendiri dan Anda tidak ditagih.
- Jangan klik "Upgrade" atau "Activate full account" di Google Cloud.

## Backup

Buka **Pengaturan**, lalu klik **Buat backup sekarang**. File `.sql` tersimpan di folder `backups/`. Untuk memulihkan, impor file itu lewat HeidiSQL di Laragon.

## Kalau ada masalah

| Gejala | Solusi |
|---|---|
| "Tidak bisa terhubung ke MySQL" | Pastikan Laragon sudah Start All, lalu cek password di `config.ini` |
| Pencarian gagal dengan pesan "API key ditolak" | Pastikan Places API (New) sudah di-Enable dan key dibatasi hanya untuk API itu |
| Port 8765 sudah dipakai | Ganti `port` di bagian `[server]` pada `config.ini` |

## Isi folder

| Folder/file | Isi |
|---|---|
| `app/` | Server Python: mesin scraping (`scraper.py`), API (`main.py`), database |
| `web/` | Tampilan aplikasi |
| `database/schema.sql` | Struktur tabel MySQL |
| `data/wilayah.json` | Kode wilayah Indonesia (Kepmendagri 2025, dari cahyadsn/wilayah, lisensi MIT) |
| `config.ini` | Koneksi database (berisi password, jangan dibagikan) |
