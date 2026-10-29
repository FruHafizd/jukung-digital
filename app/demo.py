"""Data contoh untuk mencoba tampilan sebelum API key diisi. Semua ditandai [CONTOH] dan is_demo=1."""
import random
from datetime import date, timedelta

from . import db, scraper

# (nama, slug kategori, kab/kota, website, medsos, rating, ulasan, punya WA)
CONTOH = [
    ("Laundry Bersih Jaya", "laundry", "Kota Banjarbaru", None, None, 4.7, 128, True),
    ("Catering Dapur Acil", "catering", "Kota Banjarmasin", "https://instagram.com/dapuracil", "Instagram", 4.8, 212, True),
    ("Rental Mobil Barito Trans", "rental_mobil", "Kota Banjarmasin", None, None, 4.5, 87, True),
    ("Permata Intan Cahaya", "permata", "Kabupaten Banjar", "https://facebook.com/intancahaya", "Facebook", 4.6, 54, True),
    ("Sasirangan Galuh Banjar", "sasirangan", "Kota Banjarmasin", "https://shopee.co.id/galuhsasirangan", "Shopee", 4.9, 301, True),
    ("Bengkel Motor Sinar Teknik", "bengkel", "Kabupaten Tanah Laut", None, None, 4.2, 33, True),
    ("Klinik Kecantikan Bungas", "klinik_kecantikan", "Kota Banjarbaru", "https://linktr.ee/klinikbungas", "Linktree", 4.6, 176, True),
    ("Travel Umroh Al-Martapura", "travel_umroh", "Kabupaten Banjar", None, None, 4.8, 95, True),
    ("Service AC Dingin Sejuk", "service_ac", "Kota Banjarbaru", None, None, 4.4, 41, True),
    ("Homestay Lanting Sungai", "penginapan", "Kota Banjarmasin", "https://business.site/lanting", "Situs Google (sudah mati)", 4.5, 63, True),
    ("Fotografer Kilau Studio", "fotografer", "Kota Banjarbaru", "https://instagram.com/kilaustudio", "Instagram", 4.9, 48, True),
    ("Bimbel Cerdas Mandiri", "bimbel", "Kabupaten Tabalong", None, None, 4.3, 22, True),
    ("Wadai Banjar Ummi", "oleh_oleh", "Kota Banjarmasin", None, None, 4.7, 410, True),
    ("Percetakan Sumber Ilmu", "percetakan", "Kabupaten Hulu Sungai Tengah", None, None, 4.1, 18, False),
    ("Toko Bangunan Karya Baru", "toko_bangunan", "Kabupaten Tanah Bumbu", None, None, 3.9, 12, False),
    ("Wisata Klotok Siring", "wisata_klotok", "Kota Banjarmasin", "https://tiktok.com/@klotoksiring", "TikTok", 4.6, 89, True),
    ("Rental Alat Berat Batulicin", "alat_berat", "Kabupaten Tanah Bumbu", None, None, 4.0, 9, True),
    ("Salon Galuh Cantik", "salon", "Kabupaten Hulu Sungai Selatan", None, None, 4.5, 37, True),
    ("Konveksi Sablon Kandangan", "konveksi", "Kabupaten Hulu Sungai Selatan", None, None, 4.4, 26, True),
    ("Pet Shop Kucing Manis", "pet", "Kota Banjarbaru", "https://instagram.com/kucingmanis", "Instagram", 4.8, 150, True),
]

# (status, tahap follow-up, selisih hari follow-up berikutnya)
ALUR = [
    ("baru", 0, None), ("dihubungi", 1, 0), ("dihubungi", 2, 0), ("membalas", 1, 1), ("tertarik", 2, 0),
    ("baru", 0, None), ("dihubungi", 1, 2), ("deal", 2, None), ("baru", 0, None), ("ditolak", 1, None),
    ("tertarik", 2, 3), ("baru", 0, None), ("dihubungi", 3, None), ("baru", 0, None), ("baru", 0, None),
    ("membalas", 1, 0), ("baru", 0, None), ("dihubungi", 1, -1), ("baru", 0, None), ("baru", 0, None),
]


def isi():
    if db.query_one("SELECT id FROM leads WHERE is_demo=1 LIMIT 1"):
        return 0
    kat = {r["slug"]: r for r in db.query("SELECT id, slug, tingkat FROM kategori")}
    kab = {r["nama"]: r["kode"] for r in db.query("SELECT kode, nama FROM wilayah WHERE induk='63'")}
    rnd = random.Random(63)
    today = date.today()
    for i, (nama, slug, kota, web, sosmed, rating, ulasan, punya_wa) in enumerate(CONTOH):
        k = kat[slug]
        wa = f"628120000{i:04d}" if punya_wa else None
        telp = f"0812-0000-{i:04d}" if punya_wa else f"0511-000{i:03d}"
        status, tahap, hari = ALUR[i]
        skor = scraper.hitung_skor(wa=wa, website_status="hanya_sosmed" if web else "tidak_ada",
                                   rating=rating, ulasan=ulasan, tingkat=k["tingkat"])
        lid = db.execute(
            "INSERT INTO leads (place_id, nama, kategori_id, kategori_google, alamat, provinsi_kode, kabupaten_kode, "
            "kota_nama, telepon, wa_nomor, website_status, website_url, sosmed_jenis, rating, jumlah_ulasan, maps_url, "
            "skor, status, tahap_followup, followup_berikutnya, is_demo) "
            "VALUES (%s,%s,%s,%s,%s,'63',%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,1)",
            (f"demo-{i}", f"[CONTOH] {nama}", k["id"], "", f"Jl. Contoh No. {rnd.randint(1, 120)}, {kota}, Kalimantan Selatan",
             kab.get(kota), kota, telp, wa, "hanya_sosmed" if web else "tidak_ada", web, sosmed, rating, ulasan,
             "https://maps.google.com", skor, status, tahap,
             today + timedelta(days=hari) if hari is not None else None),
        )
        if status != "baru":
            db.execute("INSERT INTO riwayat_kontak (lead_id, jenis, tahap, isi, created_at) VALUES (%s,'wa','pembuka',%s,%s)",
                       (lid, "Pesan pembuka (contoh)", f"{today - timedelta(days=rnd.randint(0, 5))} 10:15:00"))
        if status == "deal":
            from .main import _create_proyek
            paket = db.query_one("SELECT id FROM paket WHERE kode='starter'")
            pid = _create_proyek({"lead_id": lid, "nama_klien": f"[CONTOH] {nama}", "kontak_wa": wa,
                                  "paket_id": paket["id"], "is_demo": 1})
            db.execute("UPDATE proyek SET tahap='desain' WHERE id=%s", (pid,))
            db.execute("INSERT INTO pembayaran (proyek_id, jenis, jumlah, tanggal, catatan) VALUES (%s,'dp',240000,%s,'DP 30%%')",
                       (pid, today))
            db.execute("UPDATE proyek_tugas SET selesai=1 WHERE proyek_id=%s AND jenis='materi' AND urutan < 4", (pid,))
            db.execute("INSERT INTO catatan (proyek_id, judul, isi) VALUES (%s,%s,%s)",
                       (pid, "Hasil ngobrol pertama",
                        "## Permintaan klien\n- Warna utama hijau tua\n- [x] Pakai foto etalase\n- [ ] Tambah daftar harga kiloan\n\n"
                        "Pemilik minta **tombol WA besar** di bagian atas."))
    return len(CONTOH)


def hapus():
    db.execute("DELETE FROM proyek WHERE is_demo=1")
    db.execute("DELETE FROM leads WHERE is_demo=1")
