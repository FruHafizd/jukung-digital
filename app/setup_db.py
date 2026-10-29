"""Membuat database, tabel, dan data awal. Aman dijalankan berulang (data yang sudah ada tidak ditimpa)."""
import json
import re
import sys

from . import db, seed

SCHEMA = db.ROOT / "database" / "schema.sql"
WILAYAH = db.ROOT / "data" / "wilayah.json"


def create_database():
    name = db.db_settings()["name"]
    conn = db.connect(with_db=False)
    with conn.cursor() as cur:
        cur.execute(f"CREATE DATABASE IF NOT EXISTS `{name}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci")
    conn.close()


def create_tables():
    sql = re.sub(r"--[^\n]*", "", SCHEMA.read_text(encoding="utf-8"))
    with db.cursor() as cur:
        for stmt in sql.split(";"):
            if stmt.strip():
                cur.execute(stmt)


def migrate():
    """Perubahan struktur untuk database yang dibuat versi sebelumnya."""
    name = db.db_settings()["name"]
    ada = db.query_one(
        "SELECT COUNT(*) n FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=%s AND TABLE_NAME='penggunaan_api' "
        "AND COLUMN_NAME='sumber'", (name,))["n"]
    if not ada:
        db.execute("ALTER TABLE penggunaan_api ADD COLUMN sumber VARCHAR(20) NOT NULL DEFAULT 'google' AFTER tanggal, "
                   "DROP PRIMARY KEY, ADD PRIMARY KEY (tanggal, sumber)")
        print("  migrasi: penggunaan_api per sumber")


def seed_wilayah():
    if db.query_one("SELECT COUNT(*) n FROM wilayah")["n"] > 0:
        return
    data = json.loads(WILAYAH.read_text(encoding="utf-8"))
    rows = [(k, v, 1, None) for k, v in data["provinsi"].items()]
    rows += [(k, v, 2, k[:2]) for k, v in data["kabupaten"].items()]
    rows += [(k, v, 3, k[:5]) for k, v in data["kecamatan"].items()]
    with db.cursor() as cur:
        cur.executemany("INSERT INTO wilayah (kode, nama, tingkat, induk) VALUES (%s,%s,%s,%s)", rows)
    print(f"  wilayah: {len(rows)} baris")


def seed_data():
    with db.cursor() as cur:
        for i, (slug, nama, kw, tingkat, jam) in enumerate(seed.KATEGORI):
            cur.execute(
                "INSERT IGNORE INTO kategori (slug, nama, kata_kunci, tingkat, jam_kirim, urutan) VALUES (%s,%s,%s,%s,%s,%s)",
                (slug, nama, kw, tingkat, jam, i),
            )
        for p in seed.PAKET:
            cur.execute(
                "INSERT IGNORE INTO paket (kode, nama, harga, deskripsi, fitur_default, materi_default, jatah_revisi, urutan) "
                "VALUES (%s,%s,%s,%s,%s,%s,%s,%s)",
                (p["kode"], p["nama"], p["harga"], p["deskripsi"], "\n".join(p["fitur"]),
                 "\n".join(p["materi"]), p["jatah_revisi"], p["urutan"]),
            )
        cur.execute("SELECT COUNT(*) n FROM template_pesan")
        if cur.fetchone()["n"] == 0:
            for i, (nama, tahap, wilayah, isi) in enumerate(seed.TEMPLATE):
                cur.execute(
                    "INSERT INTO template_pesan (nama, tahap, wilayah, isi, urutan) VALUES (%s,%s,%s,%s,%s)",
                    (nama, tahap, wilayah, isi, i),
                )
        cur.execute("SELECT COUNT(*) n FROM jawaban_keberatan")
        if cur.fetchone()["n"] == 0:
            for i, (judul, isi) in enumerate(seed.KEBERATAN):
                cur.execute("INSERT INTO jawaban_keberatan (judul, isi, urutan) VALUES (%s,%s,%s)", (judul, isi, i))
        for k, v in seed.PENGATURAN.items():
            cur.execute("INSERT IGNORE INTO pengaturan (k, v) VALUES (%s,%s)", (k, v))


def main():
    s = db.db_settings()
    print(f"Menyiapkan database '{s['name']}' di {s['host']}:{s['port']} ...")
    try:
        create_database()
    except Exception as e:  # noqa: BLE001
        print("\nGAGAL terhubung ke MySQL:", e)
        print("Pastikan Laragon sudah 'Start All' dan password di config.ini benar.")
        sys.exit(1)
    create_tables()
    migrate()
    seed_wilayah()
    seed_data()
    print("Database siap.")


if __name__ == "__main__":
    main()
