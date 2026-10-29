import { store } from './store.js';

export const STATUS_LABEL = {
  baru: 'Baru', dihubungi: 'Dihubungi', membalas: 'Membalas', tertarik: 'Tertarik',
  deal: 'Deal', ditolak: 'Ditolak', tidak_merespons: 'Tidak merespons',
};
export const TAHAP_PROYEK = [
  { kode: 'materi', nama: 'Kumpulkan materi' }, { kode: 'desain', nama: 'Desain' },
  { kode: 'revisi', nama: 'Revisi' }, { kode: 'online', nama: 'Online' }, { kode: 'selesai', nama: 'Selesai' },
];
export const TAHAP_PESAN = {
  pembuka: 'Pesan pembuka', kirim_contoh: 'Kirim contoh website', follow_up: 'Follow-up terakhir',
  penawaran: 'Penawaran paket', umum: 'Pesan bebas',
};
export const FOLLOWUP_LABEL = ['Belum dihubungi', 'Hari ke-1: pesan pembuka', 'Hari ke-3: kirim contoh', 'Hari ke-7: follow-up terakhir'];

export function rupiah(n, prefix = true) {
  const s = Math.round(Number(n) || 0).toLocaleString('id-ID');
  return prefix ? 'Rp' + s : s;
}

export function tanggal(d, opts = { day: 'numeric', month: 'short', year: 'numeric' }) {
  if (!d) return '–';
  const dt = new Date(String(d).length <= 10 ? d + 'T00:00:00' : d);
  return dt.toLocaleDateString('id-ID', opts);
}

export function waktu(d) {
  if (!d) return '';
  const dt = new Date(d);
  return dt.toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export function hariIniISO() {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

export function selisihHari(d) {
  if (!d) return null;
  const a = new Date(hariIniISO() + 'T00:00:00');
  const b = new Date(String(d).slice(0, 10) + 'T00:00:00');
  return Math.round((b - a) / 86400000);
}

export function relatifHari(d) {
  const s = selisihHari(d);
  if (s === null) return '–';
  if (s === 0) return 'Hari ini';
  if (s === 1) return 'Besok';
  if (s === -1) return 'Kemarin';
  return s > 0 ? `${s} hari lagi` : `${-s} hari lalu`;
}

export function kelasSkor(s) {
  return s >= 75 ? 'skor-panas' : s >= 55 ? 'skor-hangat' : 'skor-dingin';
}
export function labelSkor(s) {
  return s >= 75 ? 'Panas' : s >= 55 ? 'Hangat' : 'Dingin';
}

export function namaBersih(n) {
  return (n || '').replace(/^\[CONTOH\]\s*/, '');
}

export function kotaPendek(k) {
  return (k || '').replace(/^(Kota|Kabupaten)\s+/, '');
}

export function websiteLabel(l) {
  if (l.website_status === 'tidak_ada') return 'Tidak ada';
  return 'Hanya ' + (l.sosmed_jenis || 'medsos');
}

export function ratingTeks(l) {
  if (l.rating == null) return 'Belum ada rating';
  return `${String(l.rating).replace('.', ',')} ★ (${l.jumlah_ulasan} ulasan)`;
}

/* ---------- Jam kirim ideal ---------- */
export function jamIdeal(jamKirim, now = new Date()) {
  const ranges = (jamKirim || '09-11,14-16').split(',').map((r) => r.split('-').map(Number));
  const jam = now.getHours() + now.getMinutes() / 60;
  const jumat = now.getDay() === 5 && jam >= 11.5 && jam < 13.5;
  const teksRange = ranges.map(([a, b]) => `${String(a).padStart(2, '0')}.00–${String(b).padStart(2, '0')}.00`).join(' atau ');
  if (jumat) return { ok: false, teks: 'Sedang waktu Jumatan, kirim setelah 13.30' };
  const ok = ranges.some(([a, b]) => jam >= a && jam < b);
  return ok ? { ok: true, teks: 'Waktu bagus untuk kirim' } : { ok: false, teks: `Lebih baik kirim jam ${teksRange}` };
}

/* ---------- Isi template pesan ---------- */
export function sapaan(now = new Date()) {
  const h = now.getHours();
  return h < 11 ? 'selamat pagi' : h < 15 ? 'selamat siang' : h < 18 ? 'selamat sore' : 'selamat malam';
}

export function variabelLead(lead) {
  const m = store.meta || {};
  const set = m.pengaturan || {};
  const paket = Object.fromEntries((m.paket || []).map((p) => [p.kode, p.harga]));
  const starter = paket.starter || 0;
  const v = {
    sapaan: sapaan(),
    nama_usaha: namaBersih(lead?.nama),
    nama_anda: set.nama_anda,
    brand: set.brand,
    kategori: (lead?.kategori_nama || lead?.kategori_google || 'usaha').toLowerCase(),
    kota: kotaPendek(lead?.kota_nama),
    rating: lead?.rating != null ? String(lead.rating).replace('.', ',') : '',
    ulasan_maps: lead?.rating != null
      ? `punya ulasan bagus di Google Maps (${String(lead.rating).replace('.', ',')}⭐ dari ${lead.jumlah_ulasan} ulasan)`
      : 'sudah terdaftar di Google Maps',
    harga_starter: rupiah(starter, false),
    harga_bisnis: rupiah(paket.bisnis, false),
    harga_katalog: rupiah(paket.katalog, false),
    harga_per_hari: rupiah(Math.ceil(starter / 365 / 100) * 100, false),
    link_portofolio: set.link_portofolio,
    link_demo: '',
  };
  return v;
}

export const DAFTAR_VARIABEL = [
  'sapaan', 'nama_usaha', 'nama_anda', 'brand', 'kategori', 'kota', 'rating', 'ulasan_maps',
  'harga_starter', 'harga_bisnis', 'harga_katalog', 'harga_per_hari', 'link_portofolio', 'link_demo',
];

/** Mengisi {variabel}. Nilai kosong diganti [isi variabel] supaya terlihat sebelum dikirim. */
export function isiTemplate(isi, lead) {
  const v = variabelLead(lead);
  let out = (isi || '').replace(/\{(\w+)\}/g, (m, k) => {
    if (!(k in v)) return m;
    const val = v[k];
    return val === '' || val == null ? `[isi ${k}]` : val;
  });
  // Kapitalkan huruf pertama setiap kalimat yang diawali sapaan
  out = out.replace(/(^|[.!?]\s+|\n)(selamat )/g, (m, a, b) => a + 'S' + b.slice(1));
  return out;
}

export function adaKosong(teks) {
  return /\[isi \w+\]/.test(teks);
}

/** HTML pratinjau gelembung WA: bagian [isi …] yang belum terisi diberi sorotan. */
export function pratinjauHtml(teks) {
  return escapeHtml(teks).replace(/\[isi (\w+)\]/g, '<mark>[isi $1]</mark>');
}

export function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/* ---------- Markdown ringan untuk catatan ---------- */
function inline(s) {
  let t = escapeHtml(s);
  t = t.replace(/`([^`]+)`/g, '<code>$1</code>');
  t = t.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  t = t.replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>');
  t = t.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  t = t.replace(/(^|[\s(])(https?:\/\/[^\s<]+)/g, '$1<a href="$2" target="_blank" rel="noopener">$2</a>');
  return t;
}

/** Mengubah teks catatan menjadi HTML aman. Checklist "- [ ]" bisa diklik (data-line = nomor baris). */
export function markdown(src) {
  const lines = (src || '').split('\n');
  let html = '';
  let list = null;
  let para = [];
  const tutupPara = () => { if (para.length) { html += `<p>${para.join('<br>')}</p>`; para = []; } };
  const tutupList = () => { if (list) { html += `</${list}>`; list = null; } };
  lines.forEach((raw, i) => {
    const line = raw.trimEnd();
    let m;
    if (!line.trim()) { tutupPara(); tutupList(); return; }
    if ((m = line.match(/^(#{1,3})\s+(.*)$/))) {
      tutupPara(); tutupList();
      const n = m[1].length;
      html += `<h${n}>${inline(m[2])}</h${n}>`;
      return;
    }
    if ((m = line.match(/^\s*[-*]\s+\[( |x|X)\]\s*(.*)$/))) {
      tutupPara();
      if (list !== 'ul') { tutupList(); html += '<ul>'; list = 'ul'; }
      const on = m[1].toLowerCase() === 'x';
      html += `<li class="cek-md${on ? ' beres' : ''}"><input type="checkbox" data-line="${i}"${on ? ' checked' : ''}><span>${inline(m[2])}</span></li>`;
      return;
    }
    if ((m = line.match(/^\s*[-*]\s+(.*)$/))) {
      tutupPara();
      if (list !== 'ul') { tutupList(); html += '<ul>'; list = 'ul'; }
      html += `<li>${inline(m[1])}</li>`;
      return;
    }
    if ((m = line.match(/^\s*\d+[.)]\s+(.*)$/))) {
      tutupPara();
      if (list !== 'ol') { tutupList(); html += '<ol>'; list = 'ol'; }
      html += `<li>${inline(m[1])}</li>`;
      return;
    }
    tutupList();
    para.push(inline(line));
  });
  tutupPara(); tutupList();
  return html;
}

export function toggleBarisCek(src, lineNo) {
  const lines = (src || '').split('\n');
  const l = lines[lineNo];
  if (l == null) return src;
  lines[lineNo] = /\[( )\]/.test(l) ? l.replace('[ ]', '[x]') : l.replace(/\[(x|X)\]/, '[ ]');
  return lines.join('\n');
}

export function debounce(fn, ms) {
  let t;
  return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}

export async function salin(teks) {
  try {
    await navigator.clipboard.writeText(teks);
    store.toast('Disalin ke clipboard');
  } catch (_) {
    store.toast('Tidak bisa menyalin otomatis. Blok teksnya lalu tekan Ctrl+C.', true);
  }
}

export function linkWa(nomor, teks = '') {
  return `https://wa.me/${nomor}${teks ? '?text=' + encodeURIComponent(teks) : ''}`;
}
