// Ikon garis sederhana (24x24, stroke currentColor)
const s = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;

export const ikon = {
  dashboard: s('<path d="M4 13h6V4H4zM14 20h6v-9h-6zM4 20h6v-3H4zM14 7h6V4h-6z"/>'),
  cari: s('<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/>'),
  daftar: s('<path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1"/><circle cx="4.5" cy="12" r="1"/><circle cx="4.5" cy="18" r="1"/>'),
  followup: s('<path d="M12 7v5l3 2"/><circle cx="12" cy="12" r="8.5"/>'),
  proyek: s('<rect x="3.5" y="4" width="5" height="16" rx="1.2"/><rect x="10" y="4" width="5" height="10" rx="1.2"/><rect x="16.5" y="4" width="4" height="7" rx="1.2"/>'),
  catatan: s('<path d="M6 3.5h9l4 4V20a.5.5 0 0 1-.5.5h-12A.5.5 0 0 1 6 20z"/><path d="M14.5 3.5V8H19M9 12h6M9 16h4"/>'),
  template: s('<path d="M4 5.5h16v10H9l-5 4z"/><path d="M8 9.5h8M8 12.5h5"/>'),
  pengaturan: s('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>'),
  wa: s('<path d="M4 20l1.3-4A8 8 0 1 1 8 18.7z"/><path d="M9 9.5c.3 2 2.5 4.2 4.5 4.5l1-1.2 2 .9c-.2 1.2-1.2 1.8-2.3 1.6-3-.6-5.4-3-6-6-.2-1.1.4-2.1 1.6-2.3l.9 2z"/>'),
  peta: s('<path d="M12 21s-6.5-5.7-6.5-11a6.5 6.5 0 0 1 13 0c0 5.3-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.3"/>'),
  telepon: s('<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/>'),
  tutup: s('<path d="M6 6l12 12M18 6 6 18"/>'),
  tambah: s('<path d="M12 5v14M5 12h14"/>'),
  unduh: s('<path d="M12 4v11m0 0-4-4m4 4 4-4M5 20h14"/>'),
  salin: s('<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5.5A1.5 1.5 0 0 0 14.5 4h-9A1.5 1.5 0 0 0 4 5.5v9A1.5 1.5 0 0 0 5.5 16H8"/>'),
  hapus: s('<path d="M4.5 7h15M10 11v6M14 11v6M6 7l1 12.5a1.5 1.5 0 0 0 1.5 1.5h7a1.5 1.5 0 0 0 1.5-1.5L18 7M9 7V4.5h6V7"/>'),
  kembali: s('<path d="M15 5l-7 7 7 7"/>'),
  pin: s('<path d="M9 4h6l-1 6 4 3v1.5H6V13l4-3zM12 14.5V21"/>'),
  cek: s('<path d="M5 12.5l4.5 4.5L19 7.5"/>'),
  bulan: s('<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>'),
  matahari: s('<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4"/>'),
  luar: s('<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>'),
};

export const jukung = `<svg width="34" height="34" viewBox="0 0 34 34" aria-hidden="true"><rect width="34" height="34" rx="9" fill="#0E5C57" stroke="rgba(255,255,255,.18)"/><path d="M5 19.5h24l-4.5 6.5h-15z" fill="#E3A21A"/><path d="M5 19.5h24" stroke="#6B3F8F" stroke-width="1.6"/><path d="M16 6.5v12.5M16 7.5l8 9.5h-8" stroke="#fff" stroke-width="1.9" fill="none" stroke-linejoin="round"/><path d="M3 28.5c2.5 0 2.5-1.4 5-1.4s2.5 1.4 5 1.4 2.5-1.4 5-1.4 2.5 1.4 5 1.4 2.5-1.4 5-1.4" stroke="#7FC8BF" stroke-width="1.3" fill="none"/></svg>`;
