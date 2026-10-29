import { reactive } from '../vendor/vue.esm-browser.prod.js';

function baca(key, def) {
  try { return localStorage.getItem(key) ?? def; } catch (_) { return def; }
}
function simpan(key, val) {
  try { localStorage.setItem(key, val); } catch (_) { /* penyimpanan browser tidak tersedia */ }
}

export const store = reactive({
  meta: null,
  scope: baca('jd-scope', 'fokus'),
  toasts: [],
  waModal: null,      // lead yang sedang dikirimi WA
  dealModal: null,    // lead yang sedang ditandai deal
  waHariIni: 0,
  followupCount: 0,

  setScope(s) {
    this.scope = s;
    simpan('jd-scope', s);
  },
  toast(pesan, gagal = false) {
    const id = Date.now() + Math.random();
    this.toasts.push({ id, pesan, gagal });
    setTimeout(() => { this.toasts = this.toasts.filter((t) => t.id !== id); }, gagal ? 6000 : 3200);
  },
  get fokusNama() {
    return this.meta?.fokus?.nama || 'wilayah fokus';
  },
});

export { baca, simpan };
