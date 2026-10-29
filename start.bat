@echo off
chcp 65001 >nul
cd /d "%~dp0"
title Jukung Digital

if not exist config.ini (call setup.bat & exit /b)
if not exist .venv\Scripts\python.exe call setup.bat

.venv\Scripts\python.exe -m app.setup_db >nul 2>&1 || (
  echo.
  echo  Tidak bisa terhubung ke MySQL.
  echo  Buka Laragon, klik "Start All", lalu jalankan start.bat lagi.
  echo  Kalau masih gagal, periksa password di config.ini.
  echo.
  pause
  exit /b 1
)

.venv\Scripts\python.exe run_server.py
pause
