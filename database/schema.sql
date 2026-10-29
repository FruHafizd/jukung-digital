-- Struktur database Jukung Digital (MySQL 8)
-- Dijalankan otomatis oleh setup_database.bat; aman dijalankan berulang.

CREATE TABLE IF NOT EXISTS pengaturan (
  k VARCHAR(64) PRIMARY KEY,
  v TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS wilayah (
  kode VARCHAR(13) PRIMARY KEY,
  nama VARCHAR(100) NOT NULL,
  tingkat TINYINT NOT NULL,           -- 1 provinsi, 2 kab/kota, 3 kecamatan
  induk VARCHAR(13) NULL,
  INDEX idx_induk (induk),
  INDEX idx_nama (nama)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS kategori (
  id INT AUTO_INCREMENT PRIMARY KEY,
  slug VARCHAR(60) NOT NULL UNIQUE,
  nama VARCHAR(100) NOT NULL,
  kata_kunci VARCHAR(255) NOT NULL,   -- dipisah koma; tiap kata kunci = 1 pencarian
  tingkat ENUM('tinggi','menengah','khas') NOT NULL DEFAULT 'menengah',
  jam_kirim VARCHAR(40) NOT NULL DEFAULT '09-11,14-16',
  aktif TINYINT NOT NULL DEFAULT 1,
  urutan INT NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS riwayat_scraping (
  id INT AUTO_INCREMENT PRIMARY KEY,
  dibuat DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  selesai DATETIME NULL,
  status ENUM('berjalan','selesai','dibatalkan','gagal') NOT NULL DEFAULT 'berjalan',
  parameter JSON,
  ringkasan VARCHAR(255),
  total_pencarian INT NOT NULL DEFAULT 0,
  pencarian_selesai INT NOT NULL DEFAULT 0,
  request_dipakai INT NOT NULL DEFAULT 0,
  ditemukan INT NOT NULL DEFAULT 0,
  disimpan INT NOT NULL DEFAULT 0,
  lewat_website INT NOT NULL DEFAULT 0,
  lewat_telepon INT NOT NULL DEFAULT 0,
  lewat_tutup INT NOT NULL DEFAULT 0,
  lewat_luar INT NOT NULL DEFAULT 0,
  duplikat INT NOT NULL DEFAULT 0,
  log MEDIUMTEXT,
  pesan_error VARCHAR(500)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS leads (
  id INT AUTO_INCREMENT PRIMARY KEY,
  place_id VARCHAR(255) NOT NULL UNIQUE,
  nama VARCHAR(255) NOT NULL,
  kategori_id INT NULL,
  kategori_google VARCHAR(120),
  alamat VARCHAR(500),
  provinsi_kode VARCHAR(13),
  kabupaten_kode VARCHAR(13),
  kota_nama VARCHAR(120),
  telepon VARCHAR(40),
  wa_nomor VARCHAR(20) NULL,
  website_status ENUM('tidak_ada','hanya_sosmed') NOT NULL,
  website_url VARCHAR(500),
  sosmed_jenis VARCHAR(40),
  rating DECIMAL(2,1) NULL,
  jumlah_ulasan INT NOT NULL DEFAULT 0,
  maps_url VARCHAR(500),
  lat DOUBLE NULL,
  lng DOUBLE NULL,
  skor TINYINT NOT NULL DEFAULT 0,
  status ENUM('baru','dihubungi','membalas','tertarik','deal','ditolak','tidak_merespons') NOT NULL DEFAULT 'baru',
  tahap_followup TINYINT NOT NULL DEFAULT 0,   -- 0 belum, 1 pembuka, 2 kirim contoh, 3 follow-up akhir
  followup_berikutnya DATE NULL,
  catatan TEXT,
  is_demo TINYINT NOT NULL DEFAULT 0,
  job_id INT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_status (status),
  INDEX idx_prov (provinsi_kode),
  INDEX idx_kab (kabupaten_kode),
  INDEX idx_followup (followup_berikutnya),
  CONSTRAINT fk_leads_kategori FOREIGN KEY (kategori_id) REFERENCES kategori(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS riwayat_kontak (
  id INT AUTO_INCREMENT PRIMARY KEY,
  lead_id INT NOT NULL,
  jenis ENUM('wa','telepon','kunjungan','catatan','status') NOT NULL,
  tahap VARCHAR(30),
  isi TEXT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_lead (lead_id),
  INDEX idx_waktu (created_at),
  CONSTRAINT fk_kontak_lead FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS template_pesan (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nama VARCHAR(120) NOT NULL,
  tahap ENUM('pembuka','kirim_contoh','follow_up','penawaran','umum') NOT NULL,
  wilayah ENUM('fokus','luar','semua') NOT NULL DEFAULT 'semua',
  isi TEXT NOT NULL,
  urutan INT NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS jawaban_keberatan (
  id INT AUTO_INCREMENT PRIMARY KEY,
  judul VARCHAR(160) NOT NULL,
  isi TEXT NOT NULL,
  urutan INT NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS penggunaan_api (
  tanggal DATE NOT NULL,
  sumber VARCHAR(20) NOT NULL DEFAULT 'google',   -- serpapi / apify / google
  fokus INT NOT NULL DEFAULT 0,                    -- satuan: pencarian (serpapi), tempat (apify), request (google)
  luar INT NOT NULL DEFAULT 0,
  PRIMARY KEY (tanggal, sumber)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS paket (
  id INT AUTO_INCREMENT PRIMARY KEY,
  kode VARCHAR(30) NOT NULL UNIQUE,
  nama VARCHAR(80) NOT NULL,
  harga BIGINT NOT NULL,
  deskripsi VARCHAR(255),
  fitur_default TEXT,     -- satu item per baris
  materi_default TEXT,    -- satu item per baris
  jatah_revisi INT NOT NULL DEFAULT 3,
  urutan INT NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS proyek (
  id INT AUTO_INCREMENT PRIMARY KEY,
  lead_id INT NULL,
  nama_klien VARCHAR(255) NOT NULL,
  kontak_wa VARCHAR(20),
  paket_id INT NULL,
  harga_deal BIGINT NOT NULL DEFAULT 0,
  tahap ENUM('materi','desain','revisi','online','selesai') NOT NULL DEFAULT 'materi',
  urutan INT NOT NULL DEFAULT 0,
  deadline DATE NULL,
  domain VARCHAR(255),
  tanggal_online DATE NULL,
  tanggal_perpanjangan DATE NULL,
  biaya_perpanjangan BIGINT NOT NULL DEFAULT 0,
  jatah_revisi INT NOT NULL DEFAULT 3,
  is_demo TINYINT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_proyek_lead FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE SET NULL,
  CONSTRAINT fk_proyek_paket FOREIGN KEY (paket_id) REFERENCES paket(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS proyek_tugas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  proyek_id INT NOT NULL,
  jenis ENUM('fitur','materi') NOT NULL DEFAULT 'fitur',
  judul VARCHAR(255) NOT NULL,
  selesai TINYINT NOT NULL DEFAULT 0,
  urutan INT NOT NULL DEFAULT 0,
  CONSTRAINT fk_tugas_proyek FOREIGN KEY (proyek_id) REFERENCES proyek(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS pembayaran (
  id INT AUTO_INCREMENT PRIMARY KEY,
  proyek_id INT NOT NULL,
  jenis ENUM('dp','pelunasan','perpanjangan','lainnya') NOT NULL,
  jumlah BIGINT NOT NULL,
  tanggal DATE NOT NULL,
  catatan VARCHAR(255),
  CONSTRAINT fk_bayar_proyek FOREIGN KEY (proyek_id) REFERENCES proyek(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS revisi (
  id INT AUTO_INCREMENT PRIMARY KEY,
  proyek_id INT NOT NULL,
  isi TEXT NOT NULL,
  selesai TINYINT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_revisi_proyek FOREIGN KEY (proyek_id) REFERENCES proyek(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS catatan (
  id INT AUTO_INCREMENT PRIMARY KEY,
  proyek_id INT NULL,
  judul VARCHAR(255) NOT NULL DEFAULT 'Tanpa judul',
  isi MEDIUMTEXT,
  disematkan TINYINT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_catatan_proyek FOREIGN KEY (proyek_id) REFERENCES proyek(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
