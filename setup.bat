@echo off
chcp 65001 >nul
cd /d "%~dp0"
title Jukung Digital - Setup

echo.
if not exist config.ini (
  copy config.example.ini config.ini >nul
  echo  config.ini dibuat dari config.example.ini.
  echo  Isi password MySQL Laragon Anda di config.ini, simpan, lalu jalankan setup.bat lagi.
  start notepad config.ini
  pause
  exit /b 1
)

echo  [1/3] Menyiapkan Python...
if not exist .venv\Scripts\python.exe (
  python -m venv .venv || (echo  Python tidak ditemukan. Install Python 3.12+ dari python.org lalu ulangi. & pause & exit /b 1)
)

echo  [2/3] Memasang library...
.venv\Scripts\python.exe -m pip install --quiet --disable-pip-version-check -r requirements.txt || (echo  Gagal memasang library. Periksa koneksi internet. & pause & exit /b 1)

echo  [3/3] Menyiapkan database MySQL...
.venv\Scripts\python.exe -m app.setup_db || (pause & exit /b 1)

echo.
echo  Setup selesai. Jalankan start.bat untuk membuka aplikasi.
echo.
