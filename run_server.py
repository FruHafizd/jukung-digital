"""Menjalankan server Jukung Digital dan membuka browser."""
import threading
import webbrowser

import uvicorn

from app.db import load_config

if __name__ == "__main__":
    port = int(load_config().get("server", "port", fallback="8765"))
    url = f"http://127.0.0.1:{port}"
    print(f"\n  Jukung Digital berjalan di {url}\n  Tutup jendela ini untuk menghentikan aplikasi.\n")
    threading.Timer(1.5, lambda: webbrowser.open(url)).start()
    uvicorn.run("app.main:app", host="127.0.0.1", port=port, log_level="warning")
