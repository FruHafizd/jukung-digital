"""Data awal: kategori usaha, paket, template pesan, jawaban keberatan, dan pengaturan."""

# (slug, nama, kata kunci, tingkat, jam kirim ideal)
KATEGORI = [
    ("rental_mobil", "Rental mobil", "rental mobil", "tinggi", "09-11,14-16"),
    ("penginapan", "Penginapan & homestay", "homestay,penginapan", "tinggi", "10-12,14-16"),
    ("wedding", "Wedding organizer & dekorasi", "wedding organizer,dekorasi pernikahan", "tinggi", "10-12,14-17"),
    ("service_ac", "Jasa service AC", "service AC", "tinggi", "08-10,14-16"),
    ("kontraktor", "Kontraktor & renovasi", "kontraktor renovasi rumah", "tinggi", "08-10,14-16"),
    ("klinik_kecantikan", "Klinik kecantikan", "klinik kecantikan", "tinggi", "10-12,14-16"),
    ("travel_umroh", "Travel umroh & haji", "travel umroh", "tinggi", "09-11,14-16"),
    ("fotografer", "Fotografer", "fotografer", "tinggi", "10-12,14-17"),
    ("bimbel", "Bimbel & kursus", "bimbel,kursus", "tinggi", "09-11,19-20"),
    ("catering", "Catering", "catering", "tinggi", "14-16,20-21"),
    ("bengkel", "Bengkel", "bengkel mobil,bengkel motor", "menengah", "08-10,15-17"),
    ("salon", "Salon & barbershop", "salon kecantikan,barbershop", "menengah", "09-11,14-16"),
    ("laundry", "Laundry", "laundry", "menengah", "09-11,14-16"),
    ("percetakan", "Percetakan", "percetakan", "menengah", "09-11,14-16"),
    ("konveksi", "Konveksi & sablon", "konveksi sablon", "menengah", "09-11,14-16"),
    ("furniture", "Mebel & furniture", "mebel furniture", "menengah", "09-11,14-16"),
    ("pet", "Pet shop & grooming", "pet shop", "menengah", "10-12,14-16"),
    ("toko_bangunan", "Toko bangunan", "toko bangunan", "menengah", "08-10,14-16"),
    ("permata", "Toko permata & intan", "toko permata intan", "khas", "10-12,14-16"),
    ("sasirangan", "Sasirangan", "sasirangan", "khas", "09-11,14-16"),
    ("oleh_oleh", "Oleh-oleh khas Banjar", "oleh oleh khas banjar", "khas", "09-11,14-16"),
    ("kuliner_banjar", "Kuliner khas Banjar", "rumah makan khas banjar", "khas", "14-16,20-21"),
    ("wisata_klotok", "Wisata klotok & susur sungai", "wisata klotok", "khas", "09-11,14-16"),
    ("alat_berat", "Rental alat berat", "rental alat berat", "khas", "08-10,14-16"),
]

PAKET = [
    {
        "kode": "starter", "nama": "Starter", "harga": 799000, "urutan": 1,
        "deskripsi": "Website 1 halaman + alamat .my.id + hosting 1 tahun",
        "jatah_revisi": 3,
        "fitur": [
            "Halaman beranda & profil usaha", "Daftar layanan atau produk beserta harga",
            "Tombol chat WhatsApp", "Peta lokasi Google Maps", "Galeri foto",
            "Alamat web .my.id terpasang", "Hosting & gembok SSL aktif", "Tampilan rapi di HP",
            "Bonus: QR code siap cetak", "Bonus: rapikan profil Google Maps",
        ],
        "materi": [
            "Logo (kalau ada)", "Foto usaha atau produk (minimal 5)", "Daftar layanan & harga",
            "Jam buka", "Teks profil singkat", "Nomor WhatsApp untuk tombol chat",
        ],
    },
    {
        "kode": "bisnis", "nama": "Bisnis", "harga": 1500000, "urutan": 2,
        "deskripsi": "3–5 halaman, galeri, alamat .com",
        "jatah_revisi": 3,
        "fitur": [
            "Halaman beranda", "Halaman tentang kami", "Halaman layanan lengkap",
            "Halaman galeri", "Halaman kontak + peta", "Testimoni pelanggan", "Tombol chat WhatsApp",
            "Alamat web .com terpasang", "Hosting & gembok SSL aktif", "Tampilan rapi di HP",
            "Bonus: QR code siap cetak", "Bonus: rapikan profil Google Maps",
        ],
        "materi": [
            "Logo", "Foto usaha atau produk (minimal 10)", "Daftar layanan & harga", "Jam buka",
            "Teks profil & sejarah usaha", "Testimoni pelanggan (3–5)", "Nomor WhatsApp & email",
        ],
    },
    {
        "kode": "katalog", "nama": "Katalog", "harga": 3000000, "urutan": 3,
        "deskripsi": "Katalog produk atau menu lengkap",
        "jatah_revisi": 4,
        "fitur": [
            "Halaman beranda", "Katalog produk per kategori", "Halaman detail produk",
            "Tombol pesan via WhatsApp per produk", "Pencarian produk", "Halaman tentang kami",
            "Halaman kontak + peta", "Alamat web .com terpasang", "Hosting & gembok SSL aktif",
            "Tampilan rapi di HP", "Bonus: QR code siap cetak", "Bonus: rapikan profil Google Maps",
        ],
        "materi": [
            "Logo", "Daftar produk (nama, harga, deskripsi)", "Foto tiap produk",
            "Kategori produk", "Teks profil usaha", "Nomor WhatsApp untuk pesanan",
        ],
    },
]

TEMPLATE = [
    ("Pembuka (Kalsel)", "pembuka", "fokus",
     "Assalamu'alaikum, {sapaan}. Apakah benar ini dengan {nama_usaha}? 🙏\n\n"
     "Saya {nama_anda} dari {brand}, pembuat website untuk UMKM di Kalimantan Selatan. "
     "Saya lihat usaha pian {ulasan_maps}, tapi belum punya website sendiri.\n\n"
     "Kebetulan saya sudah buatkan contoh website gratis untuk {nama_usaha}. "
     "Boleh saya kirimkan untuk dilihat dulu?"),
    ("Pembuka (luar daerah)", "pembuka", "luar",
     "Assalamu'alaikum, {sapaan}. Apakah benar ini dengan {nama_usaha}? 🙏\n\n"
     "Saya {nama_anda} dari {brand}, pembuat website untuk UMKM. "
     "Saya lihat usaha Bapak/Ibu {ulasan_maps}, tapi belum punya website sendiri.\n\n"
     "Saya sudah buatkan contoh website gratis untuk {nama_usaha}, dan pembayarannya nanti setelah website jadi. "
     "Boleh saya kirimkan contohnya?"),
    ("Kirim contoh website", "kirim_contoh", "semua",
     "{sapaan}, Bapak/Ibu {nama_usaha} 🙏\n\n"
     "Ini contoh website yang saya siapkan khusus untuk usaha Bapak/Ibu:\n{link_demo}\n\n"
     "Di sini pelanggan bisa langsung lihat layanan, lokasi, dan chat lewat WhatsApp. "
     "Kalau ada yang ingin diubah (warna, foto, isi), tinggal bilang saja. "
     "Silakan dilihat dulu, tidak ada kewajiban apa-apa."),
    ("Follow-up terakhir", "follow_up", "semua",
     "{sapaan}, mohon maaf mengganggu lagi 🙏\n\n"
     "Saya hanya ingin memastikan pesan saya soal contoh website {nama_usaha} sudah sampai. "
     "Kalau saat ini belum perlu, tidak apa-apa, saya tidak akan menghubungi lagi. "
     "Terima kasih, sukses selalu untuk usahanya!"),
    ("Penawaran paket (Kalsel)", "penawaran", "fokus",
     "Terima kasih atas balasannya 🙏 Berikut paket website dari {brand}:\n\n"
     "• Starter – Rp{harga_starter}: 1 halaman (profil, layanan, tombol WA, peta), alamat web sendiri + hosting 1 tahun\n"
     "• Bisnis – Rp{harga_bisnis}: 3–5 halaman, galeri foto, alamat .com\n"
     "• Katalog – mulai Rp{harga_katalog}: katalog produk atau menu lengkap\n\n"
     "Bonus semua paket: rapikan profil Google Maps + QR code siap cetak.\n"
     "Pembayaran DP 30%, sisanya setelah website online. Revisi gratis sampai 3 kali.\n\n"
     "Kalau berkenan, saya bisa mampir ke tempat usaha pian untuk ngobrol langsung."),
    ("Penawaran paket (luar daerah)", "penawaran", "luar",
     "Terima kasih atas balasannya 🙏 Berikut paket website dari {brand}:\n\n"
     "• Starter – Rp{harga_starter}: 1 halaman (profil, layanan, tombol WA, peta), alamat web sendiri + hosting 1 tahun\n"
     "• Bisnis – Rp{harga_bisnis}: 3–5 halaman, galeri foto, alamat .com\n"
     "• Katalog – mulai Rp{harga_katalog}: katalog produk atau menu lengkap\n\n"
     "Bonus semua paket: rapikan profil Google Maps + QR code siap cetak.\n"
     "Pembayaran DP 30%, sisanya setelah website online, jadi Bapak/Ibu bisa lihat hasilnya dulu. "
     "Revisi gratis sampai 3 kali.\n\n"
     "Kalau mau ngobrol dulu, kita bisa video call lewat WhatsApp."),
]

KEBERATAN = [
    ("\"Sudah ada Instagram\"",
     "Betul, Instagram bagus untuk pelanggan yang sudah kenal usaha Bapak/Ibu. Tapi orang yang mencari "
     "\"{kategori} di {kota}\" di Google biasanya tidak menemukan akun Instagram. Website justru melengkapi "
     "Instagram: pelanggan baru ketemu lewat Google, lalu bisa lanjut follow Instagram-nya."),
    ("\"Mahal\"",
     "Paket Starter Rp{harga_starter} itu untuk setahun penuh, kira-kira cuma Rp{harga_per_hari} per hari, "
     "lebih murah dari segelas es teh. Kalau perlu, pembayarannya juga bisa dicicil 2 kali."),
    ("\"Saya tidak paham teknis\"",
     "Tidak perlu paham sama sekali, semuanya terima beres. Bapak/Ibu cukup kirim foto dan daftar harga lewat WA. "
     "Kalau nanti ada perubahan harga atau menu, tinggal kabari saya."),
    ("\"Nanti dulu, mau pikir-pikir\"",
     "Tentu, silakan dipikirkan dulu. Contoh websitenya tetap bisa dibuka kapan saja. "
     "Kalau ada pertanyaan, langsung chat saya saja ya."),
    ("\"Takut ditipu\"",
     "Wajar sekali, banyak penipuan online sekarang. Makanya pembayarannya DP 30% saja, sisanya setelah "
     "website online dan Bapak/Ibu puas. Kalau berkenan, saya juga bisa datang langsung ke tempat usaha."),
    ("\"Sudah ada di Google Maps\"",
     "Itu modal yang bagus. Website membuat profil Google Maps lebih lengkap: pelanggan bisa lihat daftar harga, "
     "foto, dan langsung chat. Saya juga bantu rapikan profil Google Maps-nya gratis."),
    ("\"Pelanggan saya sudah banyak\"",
     "Alhamdulillah. Website membantu supaya Bapak/Ibu tidak perlu menjawab pertanyaan yang sama berulang-ulang "
     "(harga, lokasi, jam buka), dan pelanggan dari luar kota juga bisa menemukan usaha Bapak/Ibu."),
]

PENGATURAN = {
    "sumber_data": "serpapi",
    "serpapi_key": "",
    "apify_token": "",
    "cadangan_apify": "1",
    "batas_bulanan_serpapi": "240",   # paket gratis SerpApi 250/bulan, sisakan sedikit
    "batas_bulanan_apify": "900",     # dalam satuan tempat; kredit gratis $5 ~ 1.000 tempat
    "api_key": "",
    "nama_anda": "",
    "brand": "Jukung Digital",
    "link_portofolio": "",
    "fokus_provinsi": "63",
    "batas_bulanan": "900",
    "batas_harian_api": "30",
    "alokasi_fokus_persen": "80",
    "batas_wa_harian": "25",
    "biaya_perpanjangan": "350000",
}
