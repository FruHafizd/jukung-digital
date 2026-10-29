"""Mesin pencari lead: mengambil data Google Maps lewat sumber yang dipilih (SerpApi / Apify / Google),
menyaring, memberi skor, lalu menyimpan ke MySQL.

Murni script biasa, tanpa AI. Satu pencarian = "<kata kunci> di <lokasi>", maksimal 3 halaman x 20 hasil.
"""
import json
import re
import threading
from datetime import datetime
from urllib.parse import urlparse

from . import db, sumber
from .sumber import ApiError, QuotaStop  # noqa: F401  (dipakai juga oleh main.py)

# Domain yang dianggap "bukan website sendiri" -> lead panas
SOSMED_DOMAINS = {
    "instagram.com": "Instagram", "facebook.com": "Facebook", "fb.com": "Facebook", "fb.me": "Facebook",
    "tiktok.com": "TikTok", "linktr.ee": "Linktree", "wa.me": "WhatsApp", "whatsapp.com": "WhatsApp",
    "wa.link": "WhatsApp", "shopee.co.id": "Shopee", "tokopedia.com": "Tokopedia", "tokopedia.link": "Tokopedia",
    "bukalapak.com": "Bukalapak", "lazada.co.id": "Lazada", "youtube.com": "YouTube", "twitter.com": "X/Twitter",
    "x.com": "X/Twitter", "linkedin.com": "LinkedIn", "bit.ly": "Link pendek", "s.id": "Link pendek",
    "lynk.id": "Lynk.id", "beacons.ai": "Beacons", "gofood.co.id": "GoFood", "gofood.link": "GoFood",
    "grab.com": "GrabFood", "food.grab.com": "GrabFood", "business.site": "Situs Google (sudah mati)",
    "blogspot.com": "Blog gratis", "wordpress.com": "Blog gratis", "sites.google.com": "Google Sites",
    "wixsite.com": "Wix gratis", "carrd.co": "Carrd", "taplink.cc": "Taplink", "msha.ke": "Link bio",
}

_cancel_flags: dict[int, threading.Event] = {}


# ---------- Penyaringan & skor ----------

def classify_website(url):
    """Mengembalikan (status, jenis). status None berarti punya website sungguhan (dilewati)."""
    if not url:
        return "tidak_ada", None
    host = (urlparse(url if "://" in url else "http://" + url).hostname or "").lower()
    host = host[4:] if host.startswith("www.") else host
    for dom, jenis in SOSMED_DOMAINS.items():
        if host == dom or host.endswith("." + dom):
            return "hanya_sosmed", jenis
    return None, None


def normalize_phone(intl, national):
    """Mengembalikan (nomor tampil, nomor WA atau None). Nomor WA hanya untuk HP (62 8xx)."""
    raw = intl or national or ""
    digits = re.sub(r"\D", "", raw)
    if not digits:
        return None, None
    if digits.startswith("0"):
        digits = "62" + digits[1:]
    elif not digits.startswith("62") and digits.startswith("8"):
        digits = "62" + digits
    shown = national or intl
    wa = digits if digits.startswith("628") and 10 <= len(digits) <= 15 else None
    return shown, wa


def hitung_skor(*, wa, website_status, rating, ulasan, tingkat):
    # Maksimal 95: punya WA (25), hanya medsos (15), rating >= 4.5 (8), 10-300 ulasan (12), niche prioritas (10)
    skor = 25
    if wa:
        skor += 25
    skor += 15 if website_status == "hanya_sosmed" else 8
    if rating is not None:
        if rating >= 4.5:
            skor += 8
        elif rating >= 4.0:
            skor += 5
        elif rating < 3.5:
            skor -= 10
    if ulasan == 0:
        skor -= 5
    elif ulasan < 10:
        skor += 3
    elif ulasan <= 300:
        skor += 12
    elif ulasan <= 1000:
        skor += 4
    else:
        skor -= 15  # kemungkinan usaha besar atau jaringan
    skor += {"tinggi": 10, "khas": 10, "menengah": 4}.get(tingkat, 0)
    return max(0, min(100, skor))


# ---------- Kuota (per sumber) ----------

BATAS_KEY = {"serpapi": "batas_bulanan_serpapi", "apify": "batas_bulanan_apify", "google": "batas_bulanan"}


def sumber_aktif():
    return db.get_setting("sumber_data", "serpapi")


def usage_this_month(kode):
    row = db.query_one(
        "SELECT COALESCE(SUM(fokus),0) fokus, COALESCE(SUM(luar),0) luar FROM penggunaan_api "
        "WHERE sumber=%s AND tanggal >= DATE_FORMAT(CURDATE(), '%%Y-%%m-01')", (kode,))
    today = db.query_one("SELECT fokus + luar n FROM penggunaan_api WHERE sumber=%s AND tanggal=CURDATE()", (kode,))
    return {"fokus": int(row["fokus"]), "luar": int(row["luar"]), "hari_ini": int(today["n"]) if today else 0}


def quota_status(kode=None):
    s = db.get_settings()
    kode = kode or s.get("sumber_data", "serpapi")
    u = usage_this_month(kode)
    batas = int(s.get(BATAS_KEY[kode]) or 0)
    alokasi = int(s.get("alokasi_fokus_persen") or 80)
    return {
        "sumber": kode, "label": sumber.LABEL[kode], "satuan": sumber.SATUAN[kode],
        "dipakai": u["fokus"] + u["luar"], "dipakai_fokus": u["fokus"], "dipakai_luar": u["luar"],
        "hari_ini": u["hari_ini"], "batas_bulanan": batas,
        # Rem harian hanya untuk Google (kuota gratisnya dihitung per hari di Cloud Console)
        "batas_harian": int(s.get("batas_harian_api") or 30) if kode == "google" else None,
        "batas_luar": batas * (100 - alokasi) // 100, "alokasi_fokus_persen": alokasi,
    }


def check_quota(kode, is_fokus):
    """Mengembalikan sisa satuan yang boleh dipakai, atau QuotaStop kalau rem tercapai."""
    q = quota_status(kode)
    sisa = q["batas_bulanan"] - q["dipakai"]
    if sisa <= 0:
        raise QuotaStop(f"Rem kuota bulanan {q['label']} tercapai ({q['dipakai']}/{q['batas_bulanan']} {q['satuan']}).")
    if q["batas_harian"] is not None:
        if q["hari_ini"] >= q["batas_harian"]:
            raise QuotaStop(f"Rem kuota harian tercapai ({q['hari_ini']}/{q['batas_harian']} {q['satuan']}). Lanjutkan besok.")
        sisa = min(sisa, q["batas_harian"] - q["hari_ini"])
    if not is_fokus:
        sisa_luar = q["batas_luar"] - q["dipakai_luar"]
        if sisa_luar <= 0:
            raise QuotaStop(f"Jatah kuota untuk luar wilayah fokus habis ({q['dipakai_luar']}/{q['batas_luar']}).")
        sisa = min(sisa, sisa_luar)
    return sisa


def record_usage(kode, is_fokus, n=1):
    if n <= 0:
        return
    col = "fokus" if is_fokus else "luar"
    db.execute(
        f"INSERT INTO penggunaan_api (tanggal, sumber, {col}) VALUES (CURDATE(), %s, %s) "
        f"ON DUPLICATE KEY UPDATE {col}={col}+VALUES({col})", (kode, n))


def tes_sumber(kode):
    return sumber.buat(kode, db.get_settings()).tes()


# ---------- Rencana pencarian ----------

def _wilayah_map():
    rows = db.query("SELECT kode, nama, tingkat, induk FROM wilayah WHERE tingkat <= 2")
    return {r["kode"]: r for r in rows}


def build_queries(params):
    """Menyusun daftar pencarian dari parameter halaman Cari Lead."""
    kategori = {k["id"]: k for k in db.query("SELECT * FROM kategori")}
    keywords = []  # (kata kunci, kategori_id, tingkat)
    for kid in params.get("kategori_ids", []):
        k = kategori.get(int(kid))
        if k:
            for kw in [x.strip() for x in k["kata_kunci"].split(",") if x.strip()]:
                keywords.append((kw, k["id"], k["tingkat"]))
    for kw in params.get("kata_kunci_bebas", []):
        if kw.strip():
            keywords.append((kw.strip(), None, None))

    wil = _wilayah_map()
    locations = []  # (teks lokasi, provinsi_kode, kabupaten_kode)
    kab_codes = params.get("kabupaten", [])
    kec_codes = params.get("kecamatan", [])
    if params.get("per_kecamatan") and kab_codes:
        rows = db.query(
            "SELECT kode, nama, induk FROM wilayah WHERE tingkat=3 AND induk IN (" + ",".join(["%s"] * len(kab_codes)) + ")",
            kab_codes,
        )
        if kec_codes:
            rows = [r for r in rows if r["kode"] in set(kec_codes)]
        for r in rows:
            kab = wil[r["induk"]]
            prov = wil[kab["induk"]]
            locations.append((f"Kecamatan {r['nama']}, {kab['nama']}, {prov['nama']}", prov["kode"], kab["kode"]))
    else:
        for code in kab_codes:
            kab = wil.get(code)
            if kab:
                prov = wil[kab["induk"]]
                locations.append((f"{kab['nama']}, {prov['nama']}", prov["kode"], kab["kode"]))
    for teks in params.get("lokasi_bebas", []):
        if teks.strip():
            locations.append((teks.strip(), None, None))

    return [
        {"q": f"{kw} di {loc}", "kategori_id": kid, "tingkat": tingkat, "prov": prov, "kab": kab}
        for (loc, prov, kab) in locations for (kw, kid, tingkat) in keywords
    ]


def estimate(params):
    queries = build_queries(params)
    pages = max(1, min(3, int(params.get("maks_halaman", 3))))
    kuota = quota_status()
    # Apify dihitung per tempat, sumber lain per pencarian/halaman
    maks = len(queries) * pages * (20 if kuota["sumber"] == "apify" else 1)
    return {"pencarian": len(queries), "maks_request": maks, "kuota": kuota}


# ---------- Deteksi wilayah dari alamat ----------

class RegionMatcher:
    def __init__(self):
        rows = db.query("SELECT kode, nama, tingkat, induk FROM wilayah WHERE tingkat <= 2")
        self.prov = sorted([(r["kode"], r["nama"].lower()) for r in rows if r["tingkat"] == 1], key=lambda x: -len(x[1]))
        self.kab = {}
        for r in rows:
            if r["tingkat"] == 2:
                self.kab.setdefault(r["induk"], []).append((r["kode"], r["nama"]))
        for lst in self.kab.values():
            lst.sort(key=lambda x: -len(x[1]))  # nama terpanjang dulu: "Kota Banjarmasin" sebelum "Banjar"

    def match(self, alamat):
        # Tanpa spasi, karena Google kadang menulis "Kota Banjar Baru" untuk Kota Banjarbaru
        a = (alamat or "").lower().replace(" ", "")
        prov = next((k for k, n in self.prov if n.replace(" ", "") in a), None)
        if not prov:
            return None, None, None
        for kode, nama in self.kab.get(prov, []):
            n = nama.lower()
            if n.replace(" ", "") in a or n.replace("kabupaten ", "kab.").replace(" ", "") in a:
                return prov, kode, nama
        return prov, None, None


# ---------- Menjalankan pekerjaan ----------

class Job:
    def __init__(self, job_id, params):
        self.id = job_id
        self.params = params
        self.lines = []
        self.stats = dict(request_dipakai=0, ditemukan=0, disimpan=0, lewat_website=0, lewat_telepon=0,
                          lewat_tutup=0, lewat_luar=0, duplikat=0, pencarian_selesai=0)
        self.cancel = threading.Event()

    def log(self, msg):
        self.lines.append(f"[{datetime.now():%H:%M:%S}] {msg}")
        self.flush()

    def flush(self):
        sets = ", ".join(f"{k}=%s" for k in self.stats)
        db.execute(f"UPDATE riwayat_scraping SET {sets}, log=%s WHERE id=%s",
                   (*self.stats.values(), "\n".join(self.lines[-400:]), self.id))


def _cadangan(settings, kode_sekarang):
    """Apify sebagai cadangan kalau SerpApi habis (kalau diaktifkan dan tokennya ada)."""
    if kode_sekarang == "serpapi" and settings.get("cadangan_apify") == "1" and settings.get("apify_token"):
        return sumber.buat("apify", settings)
    return None


def start_job(params):
    queries = build_queries(params)
    if not queries:
        raise ValueError("Pilih minimal satu wilayah dan satu jenis usaha (atau isi kata kunci dan lokasi bebas).")
    settings = db.get_settings()
    src = sumber.buat(settings.get("sumber_data", "serpapi"), settings)
    if db.query_one("SELECT id FROM riwayat_scraping WHERE status='berjalan'"):
        raise ValueError("Masih ada pencarian yang berjalan. Tunggu selesai atau hentikan dulu.")
    ringkasan = params.get("ringkasan") or f"{len(queries)} pencarian"
    job_id = db.execute(
        "INSERT INTO riwayat_scraping (parameter, ringkasan, total_pencarian) VALUES (%s,%s,%s)",
        (json.dumps({**params, "sumber": src.kode}, ensure_ascii=False), ringkasan[:255], len(queries)),
    )
    job = Job(job_id, params)
    _cancel_flags[job_id] = job.cancel
    threading.Thread(target=_run, args=(job, queries, src, _cadangan(settings, src.kode)), daemon=True).start()
    return job_id


def cancel_job(job_id):
    ev = _cancel_flags.get(job_id)
    if ev:
        ev.set()
        return True
    # Pekerjaan yatim (misal aplikasi ditutup saat berjalan)
    db.execute("UPDATE riwayat_scraping SET status='dibatalkan', selesai=NOW() WHERE id=%s AND status='berjalan'", (job_id,))
    return False


def mark_orphans():
    db.execute("UPDATE riwayat_scraping SET status='dibatalkan', selesai=NOW(), "
               "pesan_error='Aplikasi ditutup saat pencarian berjalan' WHERE status='berjalan'")


def _sisa_layanan(src):
    """Sisa jatah langsung dari layanan (gratis dicek). None kalau tidak diketahui."""
    if src.kode == "serpapi":
        try:
            a = src.akun()
            return int(a.get("total_searches_left", a.get("plan_searches_left", 0)))
        except (ApiError, ValueError, TypeError):
            return None
    return None


def _run(job, queries, src, cadangan=None):
    fokus = db.get_setting("fokus_provinsi", "63")
    pages = max(1, min(3, int(job.params.get("maks_halaman", 3))))
    matcher = RegionMatcher()
    status, error = "selesai", None
    sisa_layanan = _sisa_layanan(src)
    job.log(f"Mulai lewat {src.label}: {len(queries)} pencarian, maksimal {pages} halaman per pencarian."
            + (f" Sisa jatah {src.label}: {sisa_layanan}." if sisa_layanan is not None else ""))
    i = 0
    try:
        while i < len(queries):
            q = queries[i]
            if job.cancel.is_set():
                status = "dibatalkan"
                break
            is_fokus = q["prov"] == fokus  # lokasi bebas dihitung sebagai luar wilayah fokus
            try:
                baru_q, halaman = 0, 0
                gen = src.halaman(q["q"], pages)
                while not job.cancel.is_set():
                    src.sisa = check_quota(src.kode, is_fokus)
                    if sisa_layanan is not None and sisa_layanan <= 0:
                        raise QuotaStop(f"Jatah {src.label} bulan ini habis.")
                    try:
                        places, biaya = next(gen)
                    except StopIteration:
                        break
                    record_usage(src.kode, is_fokus, biaya)
                    if sisa_layanan is not None:
                        sisa_layanan -= biaya
                    job.stats["request_dipakai"] += biaya
                    halaman += 1
                    for place in places:
                        baru_q += _process_place(job, place, q, matcher)
                job.stats["pencarian_selesai"] += 1
                job.log(f"“{q['q']}”: {baru_q} lead baru")
                i += 1
            except QuotaStop as e:
                if cadangan:
                    job.log(f"{e} Beralih ke cadangan {cadangan.label}.")
                    src, cadangan, sisa_layanan = cadangan, None, None
                    continue  # ulangi pencarian yang sama dengan sumber cadangan
                raise
    except QuotaStop as e:
        status, error = "selesai", str(e)
        job.log("Berhenti: " + str(e))
    except ApiError as e:
        status, error = "gagal", str(e)
        job.log("Gagal: " + str(e))
    except Exception as e:  # noqa: BLE001
        status, error = "gagal", f"{type(e).__name__}: {e}"
        job.log("Gagal: " + error)
    finally:
        if status == "dibatalkan" or job.cancel.is_set():
            status = "dibatalkan"
            job.log("Dihentikan oleh Anda.")
        job.log(f"Selesai. {job.stats['disimpan']} lead baru disimpan.")
        db.execute("UPDATE riwayat_scraping SET status=%s, selesai=NOW(), pesan_error=%s WHERE id=%s",
                   (status, error, job.id))
        _cancel_flags.pop(job.id, None)


def _process_place(job, place, q, matcher):
    """Menyaring satu tempat (bentuk seragam dari sumber.py). Mengembalikan 1 kalau disimpan sebagai lead baru."""
    job.stats["ditemukan"] += 1
    if place["tutup"]:
        job.stats["lewat_tutup"] += 1
        return 0
    web_status, sosmed = classify_website(place["website"])
    if web_status is None:
        job.stats["lewat_website"] += 1
        return 0
    telepon, wa = normalize_phone(place["telepon_intl"], place["telepon"])
    if not telepon:
        job.stats["lewat_telepon"] += 1
        return 0
    alamat = place["alamat"]
    prov, kab, kab_nama = matcher.match(alamat)
    if q["prov"]:
        if prov and prov != q["prov"]:
            job.stats["lewat_luar"] += 1
            return 0
        prov = q["prov"]
        if not kab:
            kab = q["kab"]
            kab_nama = (db.query_one("SELECT nama FROM wilayah WHERE kode=%s", (kab,)) or {}).get("nama")
    pid = place["id"]
    if db.query_one("SELECT id FROM leads WHERE place_id=%s", (pid,)):
        job.stats["duplikat"] += 1
        return 0
    skor = hitung_skor(wa=wa, website_status=web_status, rating=place["rating"], ulasan=place["ulasan"],
                       tingkat=q["tingkat"])
    db.execute(
        "INSERT IGNORE INTO leads (place_id, nama, kategori_id, kategori_google, alamat, provinsi_kode, kabupaten_kode, "
        "kota_nama, telepon, wa_nomor, website_status, website_url, sosmed_jenis, rating, jumlah_ulasan, maps_url, "
        "lat, lng, skor, job_id) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)",
        (pid, place["nama"][:255], q["kategori_id"], place["kategori"][:120], alamat[:500], prov, kab, kab_nama,
         telepon, wa, web_status, (place["website"] or "")[:500] or None, sosmed, place["rating"], place["ulasan"],
         place["maps_url"], place["lat"], place["lng"], skor, job.id),
    )
    job.stats["disimpan"] += 1
    return 1
