"""Sumber data Google Maps. Semuanya mengembalikan tempat dalam bentuk yang sama supaya penyaringan tidak peduli asalnya.

- SerpApi  : utama. Paket gratis tanpa kartu kredit, satuan kuota = 1 pencarian (maks. 20 tempat).
- Apify    : cadangan. Kredit gratis $5/bulan tanpa kartu, satuan kuota = 1 tempat.
- Google   : Places API resmi. Untuk akun Indonesia perlu deposit dulu.
"""
import time

import httpx


class ApiError(Exception):
    pass


class QuotaStop(Exception):
    """Rem kuota aplikasi atau jatah layanan tercapai."""


def _tempat(*, id, nama, alamat, telepon_intl=None, telepon=None, website=None, rating=None, ulasan=0,
            maps_url=None, tutup=False, kategori=None, lat=None, lng=None):
    return {"id": id, "nama": nama or "(tanpa nama)", "alamat": alamat or "", "telepon_intl": telepon_intl,
            "telepon": telepon, "website": website, "rating": rating, "ulasan": int(ulasan or 0),
            "maps_url": maps_url, "tutup": bool(tutup), "kategori": kategori or "", "lat": lat, "lng": lng}


def _http_error(nama, e):
    return ApiError(f"Tidak bisa terhubung ke {nama} ({type(e).__name__}). Periksa koneksi internet.")


# ---------------- SerpApi ----------------

class SerpApi:
    kode, label, satuan = "serpapi", "SerpApi", "pencarian"
    URL = "https://serpapi.com/search.json"

    def __init__(self, key):
        self.key = key
        self.sisa = None

    def _get(self, url, params):
        try:
            r = httpx.get(url, params={**params, "api_key": self.key}, timeout=60)
        except httpx.HTTPError as e:
            raise _http_error("SerpApi", e) from e
        try:
            data = r.json()
        except ValueError as e:
            raise ApiError(f"SerpApi mengembalikan respons yang tidak dikenal ({r.status_code}).") from e
        err = data.get("error") if isinstance(data, dict) else None
        if err:
            low = err.lower()
            if "hasn't returned any results" in low or "no results" in low:
                return {}
            if "run out of searches" in low or ("plan" in low and "searches" in low):
                raise QuotaStop("Jatah pencarian SerpApi bulan ini habis.")
            if r.status_code == 429 or "hourly" in low or "throughput" in low:
                raise QuotaStop("Batas pencarian SerpApi per jam tercapai. Coba lagi satu jam lagi.")
            if "api key" in low or r.status_code == 401:
                raise ApiError(f"API key SerpApi ditolak: {err}")
            raise ApiError(f"SerpApi: {err}")
        return data

    def akun(self):
        """Gratis, tidak memotong kuota."""
        try:
            r = httpx.get("https://serpapi.com/account.json", params={"api_key": self.key}, timeout=30)
        except httpx.HTTPError as e:
            raise _http_error("SerpApi", e) from e
        data = r.json() if r.headers.get("content-type", "").startswith("application/json") else {}
        if r.status_code != 200 or data.get("error"):
            raise ApiError(f"API key SerpApi ditolak: {data.get('error') or r.status_code}")
        return data

    def tes(self):
        a = self.akun()
        return (f"SerpApi aktif. Sisa {a.get('total_searches_left', a.get('plan_searches_left', '?'))} pencarian "
                f"dari {a.get('searches_per_month', '?')} per bulan.")

    def halaman(self, teks, maks_halaman):
        """Generator: setiap next() = 1 pencarian. Menghasilkan (daftar tempat, biaya)."""
        ll = None
        for i in range(maks_halaman):
            params = {"engine": "google_maps", "type": "search", "q": teks, "hl": "id", "google_domain": "google.co.id"}
            if i:
                params["start"] = i * 20
                if ll:
                    params["ll"] = ll
            data = self._get(self.URL, params)
            items = data.get("local_results") or ([data["place_results"]] if data.get("place_results") else [])
            yield [self._norm(p) for p in items if p.get("place_id") or p.get("data_id")], 1
            if len(items) < 20:
                return
            koordinat = [p["gps_coordinates"] for p in items if p.get("gps_coordinates")]
            if not ll and koordinat:
                lat = sum(k["latitude"] for k in koordinat) / len(koordinat)
                lng = sum(k["longitude"] for k in koordinat) / len(koordinat)
                ll = f"@{lat:.6f},{lng:.6f},13z"

    @staticmethod
    def _norm(p):
        pid = p.get("place_id") or p.get("data_id")
        state = (p.get("open_state") or "").lower()
        gps = p.get("gps_coordinates") or {}
        return _tempat(
            id=pid, nama=p.get("title"), alamat=p.get("address"), telepon=p.get("phone"), website=p.get("website"),
            rating=p.get("rating"), ulasan=p.get("reviews"),
            maps_url=f"https://www.google.com/maps/place/?q=place_id:{p['place_id']}" if p.get("place_id") else None,
            tutup=any(w in state for w in ("permanen", "permanently", "sementara", "temporarily")),
            kategori=p.get("type"), lat=gps.get("latitude"), lng=gps.get("longitude"),
        )


# ---------------- Apify ----------------

class Apify:
    kode, label, satuan = "apify", "Apify", "tempat"
    URL = "https://api.apify.com/v2/acts/compass~crawler-google-places/run-sync-get-dataset-items"

    def __init__(self, token):
        self.token = token
        self.sisa = None  # maksimal tempat yang boleh diambil (diisi pemanggil dari rem kuota)

    def _headers(self):
        return {"Authorization": f"Bearer {self.token}"}

    def tes(self):
        try:
            r = httpx.get("https://api.apify.com/v2/users/me", headers=self._headers(), timeout=30)
        except httpx.HTTPError as e:
            raise _http_error("Apify", e) from e
        if r.status_code != 200:
            raise ApiError("Token Apify ditolak. Salin ulang dari Settings > API & Integrations.")
        nama = r.json().get("data", {}).get("username", "")
        pesan = f"Apify aktif (akun {nama})."
        try:
            lim = httpx.get("https://api.apify.com/v2/users/me/limits", headers=self._headers(), timeout=30)
            if lim.status_code == 200:
                d = lim.json().get("data", {})
                pakai = d.get("current", {}).get("monthlyUsageUsd")
                maks = d.get("limits", {}).get("maxMonthlyUsageUsd")
                if pakai is not None and maks is not None:
                    pesan += f" Kredit terpakai bulan ini ${pakai:.2f} dari ${maks:.2f}."
        except (httpx.HTTPError, ValueError):
            pass
        return pesan

    def halaman(self, teks, maks_halaman):
        """Satu kali jalan Actor untuk satu pencarian. Biaya = jumlah tempat yang didapat."""
        maks = maks_halaman * 20
        if self.sisa is not None:
            maks = max(1, min(maks, self.sisa))
        body = {
            "searchStringsArray": [teks], "maxCrawledPlacesPerSearch": maks, "language": "id",
            "skipClosedPlaces": False, "scrapePlaceDetailPage": False, "maxReviews": 0, "maxImages": 0,
            "scrapeContacts": False,
        }
        try:
            r = httpx.post(self.URL, params={"timeout": 280, "format": "json"}, json=body, headers=self._headers(),
                           timeout=320)
        except httpx.TimeoutException as e:
            raise ApiError("Apify terlalu lama merespons. Coba kurangi kedalaman pencarian.") from e
        except httpx.HTTPError as e:
            raise _http_error("Apify", e) from e
        if r.status_code == 401:
            raise ApiError("Token Apify ditolak.")
        if r.status_code in (402, 403):
            raise QuotaStop("Kredit gratis Apify bulan ini habis.")
        if r.status_code == 408:
            raise ApiError("Pencarian Apify melewati batas waktu. Coba kurangi kedalaman pencarian.")
        if r.status_code >= 400:
            raise ApiError(f"Apify mengembalikan error {r.status_code}: {r.text[:200]}")
        data = r.json()
        items = data if isinstance(data, list) else []
        yield [self._norm(p) for p in items if p.get("placeId")], len(items)

    @staticmethod
    def _norm(p):
        loc = p.get("location") or {}
        return _tempat(
            id=p["placeId"], nama=p.get("title"), alamat=p.get("address"), telepon=p.get("phone") or p.get("phoneUnformatted"),
            website=p.get("website"), rating=p.get("totalScore"), ulasan=p.get("reviewsCount"), maps_url=p.get("url"),
            tutup=p.get("permanentlyClosed") or p.get("temporarilyClosed"), kategori=p.get("categoryName"),
            lat=loc.get("lat"), lng=loc.get("lng"),
        )


# ---------------- Google Places API (resmi) ----------------

class GooglePlaces:
    kode, label, satuan = "google", "Google Places API", "request"
    URL = "https://places.googleapis.com/v1/places:searchText"
    FIELD_MASK = ",".join([
        "places.id", "places.displayName", "places.formattedAddress", "places.nationalPhoneNumber",
        "places.internationalPhoneNumber", "places.websiteUri", "places.rating", "places.userRatingCount",
        "places.googleMapsUri", "places.businessStatus", "places.primaryTypeDisplayName", "places.location",
        "nextPageToken",
    ])

    def __init__(self, key):
        self.key = key
        self.sisa = None

    def _post(self, teks, token=None, field_mask=FIELD_MASK, page_size=20):
        body = {"textQuery": teks, "languageCode": "id", "regionCode": "ID", "pageSize": page_size}
        if token:
            body["pageToken"] = token
        headers = {"X-Goog-Api-Key": self.key, "X-Goog-FieldMask": field_mask, "Content-Type": "application/json"}
        try:
            r = httpx.post(self.URL, json=body, headers=headers, timeout=30)
        except httpx.HTTPError as e:
            raise _http_error("Google", e) from e
        if r.status_code == 200:
            return r.json()
        try:
            err = r.json().get("error", {})
        except ValueError:
            err = {}
        status, msg = err.get("status", ""), err.get("message", r.text[:200])
        if r.status_code == 429 or status == "RESOURCE_EXHAUSTED":
            raise QuotaStop("Batas kuota di Google Cloud tercapai (aman, tidak ada tagihan). Lanjutkan besok.")
        if "billing" in msg.lower():
            raise ApiError("Billing Google Cloud belum aktif (untuk akun Indonesia perlu deposit dulu).")
        if r.status_code in (400, 403) and ("API key" in msg or "API_KEY" in msg or status == "PERMISSION_DENIED"):
            raise ApiError(f"API key ditolak Google: {msg}")
        raise ApiError(f"Google mengembalikan error {r.status_code}: {msg}")

    def tes(self):
        # Hanya meminta ID tempat (SKU IDs Only), tidak memakai kuota berbayar
        n = len(self._post("laundry di Banjarmasin", field_mask="places.id", page_size=1).get("places", []))
        return f"API key Google berfungsi. Google mengembalikan {n} hasil uji."

    def halaman(self, teks, maks_halaman):
        token = None
        for i in range(maks_halaman):
            if i:
                time.sleep(1.2)
            data = self._post(teks, token)
            yield [self._norm(p) for p in data.get("places", [])], 1
            token = data.get("nextPageToken")
            if not token:
                return

    @staticmethod
    def _norm(p):
        loc = p.get("location") or {}
        return _tempat(
            id=p["id"], nama=(p.get("displayName") or {}).get("text"), alamat=p.get("formattedAddress"),
            telepon_intl=p.get("internationalPhoneNumber"), telepon=p.get("nationalPhoneNumber"),
            website=p.get("websiteUri"), rating=p.get("rating"), ulasan=p.get("userRatingCount"),
            maps_url=p.get("googleMapsUri"),
            tutup=p.get("businessStatus") in ("CLOSED_PERMANENTLY", "CLOSED_TEMPORARILY"),
            kategori=(p.get("primaryTypeDisplayName") or {}).get("text"),
            lat=loc.get("latitude"), lng=loc.get("longitude"),
        )


SUMBER = {"serpapi": (SerpApi, "serpapi_key"), "apify": (Apify, "apify_token"), "google": (GooglePlaces, "api_key")}
LABEL = {k: v[0].label for k, v in SUMBER.items()}
SATUAN = {k: v[0].satuan for k, v in SUMBER.items()}


def buat(kode, settings):
    cls, key_name = SUMBER[kode]
    key = settings.get(key_name) or ""
    if not key:
        raise ValueError(f"Kunci {cls.label} belum diisi. Buka Pengaturan untuk mengisinya.")
    return cls(key)
