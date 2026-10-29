"""Koneksi MySQL sederhana. Setiap pemanggilan membuka koneksi sendiri supaya aman dipakai di thread scraping."""
import configparser
from contextlib import contextmanager
from pathlib import Path

import pymysql
from pymysql.cursors import DictCursor

ROOT = Path(__file__).resolve().parent.parent
CONFIG_PATH = ROOT / "config.ini"


def load_config():
    cfg = configparser.ConfigParser()
    cfg.read(CONFIG_PATH, encoding="utf-8")
    return cfg


def db_settings():
    d = load_config()["database"]
    return {
        "host": d.get("host", "127.0.0.1"),
        "port": int(d.get("port", "3306")),
        "user": d.get("user", "root"),
        "password": d.get("password", ""),
        "name": d.get("name", "jukung_digital"),
    }


def connect(with_db=True):
    s = db_settings()
    return pymysql.connect(
        host=s["host"], port=s["port"], user=s["user"], password=s["password"],
        database=s["name"] if with_db else None,
        charset="utf8mb4", cursorclass=DictCursor, autocommit=True,
    )


@contextmanager
def cursor():
    conn = connect()
    try:
        with conn.cursor() as cur:
            yield cur
    finally:
        conn.close()


def query(sql, params=None):
    with cursor() as cur:
        cur.execute(sql, params or ())
        return cur.fetchall()


def query_one(sql, params=None):
    with cursor() as cur:
        cur.execute(sql, params or ())
        return cur.fetchone()


def execute(sql, params=None):
    """Menjalankan perintah tulis dan mengembalikan id baris baru (kalau ada)."""
    with cursor() as cur:
        cur.execute(sql, params or ())
        return cur.lastrowid


def get_setting(key, default=""):
    row = query_one("SELECT v FROM pengaturan WHERE k=%s", (key,))
    return row["v"] if row and row["v"] is not None else default


def get_settings():
    return {r["k"]: r["v"] for r in query("SELECT k, v FROM pengaturan")}


def set_setting(key, value):
    execute(
        "INSERT INTO pengaturan (k, v) VALUES (%s, %s) ON DUPLICATE KEY UPDATE v=VALUES(v)",
        (key, "" if value is None else str(value)),
    )
