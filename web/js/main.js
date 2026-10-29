import { createApp } from '../vendor/vue.esm-browser.prod.js';
import { api } from './api.js';
import { DealModal, Ikon, Kosong, SkorBadge, StatusPill, WaModal } from './components.js';
import { ikon, jukung } from './icons.js';
import { store, baca, simpan } from './store.js';
import Dashboard from './pages/dashboard.js';
import Cari from './pages/cari.js';
import Leads from './pages/leads.js';
import Followup from './pages/followup.js';
import Proyek from './pages/proyek.js';
import ProyekDetail from './pages/proyek-detail.js';
import Catatan from './pages/catatan.js';
import Template from './pages/template.js';
import Pengaturan from './pages/pengaturan.js';

const ROUTES = {
  '': Dashboard, cari: Cari, leads: Leads, followup: Followup, proyek: Proyek,
  catatan: Catatan, template: Template, pengaturan: Pengaturan,
};

const NAV = [
  { r: '', label: 'Dashboard', ikon: 'dashboard' },
  { r: 'cari', label: 'Cari lead', ikon: 'cari' },
  { r: 'leads', label: 'Daftar lead', ikon: 'daftar' },
  { r: 'followup', label: 'Follow-up hari ini', ikon: 'followup', badge: true },
  { r: 'proyek', label: 'Klien & proyek', ikon: 'proyek' },
  { r: 'catatan', label: 'Catatan', ikon: 'catatan' },
  { r: 'template', label: 'Template & jawaban', ikon: 'template' },
  { r: 'pengaturan', label: 'Pengaturan', ikon: 'pengaturan' },
];

function parseHash() {
  const h = location.hash.replace(/^#\/?/, '');
  const [path, query] = h.split('?');
  const parts = path.split('/').filter(Boolean);
  return { parts, query: new URLSearchParams(query || '') };
}

const App = {
  components: { WaModal, DealModal },
  data() {
    return { route: parseHash(), siap: false, galat: '', tema: baca('jd-theme', '') };
  },
  computed: {
    store: () => store,
    page() {
      const [a, b] = this.route.parts;
      if (a === 'proyek' && b) return ProyekDetail;
      return ROUTES[a || ''] || Dashboard;
    },
    aktif() { return this.route.parts[0] || ''; },
    nav: () => NAV,
    jukung: () => jukung,
    batasWa() { return store.meta?.pengaturan?.batas_wa_harian || 25; },
    pageKey() { return this.route.parts.join('/'); },
    ikonTema() { return this.temaGelap ? ikon.matahari : ikon.bulan; },
    temaGelap() {
      if (this.tema) return this.tema === 'dark';
      return window.matchMedia?.('(prefers-color-scheme: dark)').matches;
    },
  },
  async created() {
    window.addEventListener('hashchange', () => { this.route = parseHash(); window.scrollTo(0, 0); });
    try {
      await this.muatMeta();
      this.siap = true;
    } catch (e) {
      this.galat = e.message || 'Tidak bisa memuat data.';
    }
    setInterval(() => this.muatHitungan(), 60000);
  },
  methods: {
    ikon: (n) => ikon[n],
    async muatMeta() {
      store.meta = await api.get('/meta');
      await this.muatHitungan();
    },
    async muatHitungan() {
      try {
        const d = await api.get(`/dashboard?scope=${store.scope}`);
        store.waHariIni = d.kpi.wa_hari_ini;
        store.followupCount = d.kpi.followup;
      } catch (_) { /* diam saja, akan dicoba lagi */ }
    },
    gantiTema() {
      this.tema = this.temaGelap ? 'light' : 'dark';
      document.documentElement.dataset.theme = this.tema;
      simpan('jd-theme', this.tema);
    },
  },
  template: `
  <div class="shell">
    <aside class="sidebar">
      <a class="brand" href="#/">
        <span v-html="jukung"></span>
        <span><span class="brand-nama">{{ store.meta?.pengaturan?.brand || 'Jukung Digital' }}</span><br><span class="brand-sub">Pencari klien website UMKM</span></span>
      </a>
      <nav class="nav" aria-label="Menu utama">
        <a v-for="n in nav" :href="'#/' + n.r" :class="{aktif: aktif === n.r}" :aria-current="aktif === n.r ? 'page' : null">
          <span v-html="ikon(n.ikon)" style="display:inline-flex"></span>{{ n.label }}
          <span v-if="n.badge && store.followupCount" class="badge">{{ store.followupCount }}</span>
        </a>
      </nav>
      <div class="sidebar-bawah">
        <div class="wa-meter" :class="{penuh: store.waHariIni >= batasWa}">
          <span>WhatsApp terkirim hari ini: <b style="color:#fff">{{ store.waHariIni }}</b> dari {{ batasWa }}</span>
          <div class="bar"><span :style="{width: Math.min(100, store.waHariIni / batasWa * 100) + '%'}"></span></div>
        </div>
        <button class="tema-btn" @click="gantiTema"><span v-html="ikonTema" style="display:inline-flex;width:14px;height:14px;vertical-align:-2px"></span> {{ temaGelap ? 'Mode terang' : 'Mode gelap' }}</button>
      </div>
    </aside>
    <main class="main">
      <div v-if="galat" class="halaman">
        <div class="galat"><b>Aplikasi belum bisa memuat data.</b> {{ galat }}<br>Pastikan Laragon sudah <b>Start All</b> (MySQL berjalan), lalu muat ulang halaman ini.</div>
      </div>
      <component v-else-if="siap" :is="page" :key="pageKey" :route="route"></component>
    </main>
  </div>
  <WaModal v-if="store.waModal"/>
  <DealModal v-if="store.dealModal"/>
  <div class="toast-wrap" aria-live="polite">
    <div v-for="t in store.toasts" :key="t.id" class="toast" :class="{gagal: t.gagal}">{{ t.pesan }}</div>
  </div>`,
};

const app = createApp(App);
app.component('Ikon', Ikon);
app.component('StatusPill', StatusPill);
app.component('SkorBadge', SkorBadge);
app.component('Kosong', Kosong);
app.mount('#app');
