import { api, qs } from '../api.js';
import { LeadDrawer } from '../components.js';
import { store } from '../store.js';
import { STATUS_LABEL, debounce, jamIdeal, kotaPendek, relatifHari, selisihHari, websiteLabel } from '../util.js';

export default {
  components: { LeadDrawer },
  props: { route: Object },
  data() {
    const q = this.route.query;
    return {
      f: {
        q: '', status: q.get('status') || '', kategori: '', kabupaten: '', provinsi: '', website: '', wa: false,
        skor_min: 0, sort: 'skor',
      },
      page: 1, perPage: 50, data: { total: 0, items: [], status_counts: {} }, kabList: [], dipilih: null, memuat: false,
    };
  },
  computed: {
    store: () => store,
    statuses: () => store.meta.statuses,
    params() { return { ...this.f, scope: store.scope, page: this.page, per_page: this.perPage }; },
    totalSemua() { return Object.values(this.data.status_counts).reduce((a, b) => a + b, 0); },
    halamanTerakhir() { return Math.max(1, Math.ceil(this.data.total / this.perPage)); },
    linkExport() { const { page, per_page, sort, ...rest } = this.params; return '/api/export/leads.xlsx' + qs(rest); },
  },
  watch: {
    f: { deep: true, handler() { this.page = 1; this.muatNanti(); } },
    page() { this.muat(); },
  },
  async created() {
    this.muatNanti = debounce(() => this.muat(), 250);
    this.kabList = await api.get(`/wilayah/${store.meta.fokus?.kode || '63'}/anak`);
    await this.muat();
  },
  methods: {
    async muat() {
      this.memuat = true;
      try { this.data = await api.get('/leads' + qs(this.params)); } finally { this.memuat = false; }
    },
    async ganti(s) { store.setScope(s); this.f.kabupaten = ''; this.f.provinsi = ''; await this.muat(); },
    setStatus(s) { this.f.status = this.f.status === s ? '' : s; },
    async ubahStatus(l, s) {
      try {
        const baru = await api.patch(`/leads/${l.id}`, { status: s });
        Object.assign(l, baru);
        store.toast(`${l.nama}: ${STATUS_LABEL[s]}`);
        if (s === 'deal') store.dealModal = { lead: baru, onDone: () => this.muat() };
      } catch (e) { store.toast(e.message, true); }
    },
    kirimWa(l) { store.waModal = { lead: l, onDone: (baru) => Object.assign(l, baru) }; },
    STATUS_LABEL: (s) => STATUS_LABEL[s], kotaPendek, websiteLabel, relatifHari, selisihHari, jamIdeal,
  },
  template: `
  <div class="halaman">
    <div class="kepala">
      <div><h1>Daftar lead</h1><p>Usaha tanpa website yang bisa Anda hubungi, diurutkan dari skor tertinggi. Klik baris untuk melihat detail.</p></div>
      <div class="kepala-aksi">
        <div class="segmen" role="group" aria-label="Cakupan wilayah">
          <button :class="{on: store.scope==='fokus'}" @click="ganti('fokus')">Fokus: {{ store.fokusNama }}</button>
          <button :class="{on: store.scope==='semua'}" @click="ganti('semua')">Semua wilayah</button>
        </div>
        <a class="btn" :href="linkExport"><Ikon n="unduh"/> Export Excel</a>
      </div>
    </div>

    <div class="chips" style="margin-bottom:12px">
      <button class="chip" :class="{on: !f.status}" @click="f.status=''">Semua <span class="n">{{ totalSemua }}</span></button>
      <button v-for="s in statuses" class="chip" :class="{on: f.status===s}" @click="setStatus(s)">{{ STATUS_LABEL(s) }} <span class="n">{{ data.status_counts[s] || 0 }}</span></button>
    </div>

    <div class="filter-bar">
      <input class="input" v-model="f.q" placeholder="Cari nama, alamat, atau nomor" aria-label="Cari">
      <select class="select" v-model="f.kategori" aria-label="Jenis usaha">
        <option value="">Semua jenis usaha</option>
        <option v-for="k in store.meta.kategori" :value="k.id">{{ k.nama }}</option>
        <option value="bebas">Kata kunci bebas</option>
      </select>
      <select v-if="store.scope==='fokus'" class="select" v-model="f.kabupaten" aria-label="Kabupaten/kota">
        <option value="">Semua kab/kota</option>
        <option v-for="k in kabList" :value="k.kode">{{ k.nama }}</option>
      </select>
      <select v-else class="select" v-model="f.provinsi" aria-label="Provinsi">
        <option value="">Semua provinsi</option>
        <option v-for="p in store.meta.provinsi" :value="p.kode">{{ p.nama }}</option>
      </select>
      <select class="select" v-model="f.website" aria-label="Status website">
        <option value="">Semua status website</option>
        <option value="tidak_ada">Tidak punya website</option>
        <option value="hanya_sosmed">Hanya medsos/marketplace</option>
      </select>
      <select class="select" v-model.number="f.skor_min" aria-label="Skor minimal">
        <option :value="0">Semua skor</option><option :value="55">Hangat ke atas (55+)</option><option :value="75">Panas saja (75+)</option>
      </select>
      <select class="select" v-model="f.sort" aria-label="Urutkan">
        <option value="skor">Urut: skor tertinggi</option><option value="terbaru">Urut: terbaru</option>
        <option value="ulasan">Urut: ulasan terbanyak</option><option value="followup">Urut: follow-up terdekat</option><option value="nama">Urut: nama</option>
      </select>
      <label class="toggle"><input type="checkbox" v-model="f.wa"> Hanya yang punya WhatsApp</label>
    </div>

    <div class="panel">
      <div class="tabel-wrap" v-if="data.items.length">
        <table class="tabel">
          <thead><tr><th>Skor</th><th>Usaha</th><th>Wilayah</th><th>Website</th><th>Rating</th><th>Status</th><th>Follow-up</th><th class="num">Aksi</th></tr></thead>
          <tbody>
            <tr v-for="l in data.items" :key="l.id" class="klik" :class="{dipilih: dipilih===l.id}" @click="dipilih=l.id">
              <td><SkorBadge :skor="l.skor"/></td>
              <td style="min-width:220px"><div class="nama">{{ l.nama }}</div><div class="sub">{{ l.kategori_nama || l.kategori_google || 'Kata kunci bebas' }}</div></td>
              <td>{{ kotaPendek(l.kota_nama) || '–' }}</td>
              <td><span class="tag" :class="{'tag-panas': l.website_status==='hanya_sosmed'}">{{ websiteLabel(l) }}</span></td>
              <td class="angka" style="white-space:nowrap"><template v-if="l.rating != null">{{ String(l.rating).replace('.', ',') }} ★ <span class="redup kecil">({{ l.jumlah_ulasan }})</span></template><span v-else class="redup">–</span></td>
              <td @click.stop>
                <select class="select status-select" :class="'st-' + l.status" :value="l.status" @change="ubahStatus(l, $event.target.value)" :aria-label="'Status ' + l.nama">
                  <option v-for="s in statuses" :value="s">{{ STATUS_LABEL(s) }}</option>
                </select>
              </td>
              <td class="kecil" style="white-space:nowrap"><span v-if="l.followup_berikutnya" :class="selisihHari(l.followup_berikutnya) <= 0 ? 'lewat' : 'redup'">{{ relatifHari(l.followup_berikutnya) }}</span><span v-else class="redup">–</span></td>
              <td @click.stop>
                <div class="aksi-baris">
                  <button v-if="l.wa_nomor" class="btn btn-wa btn-kecil" @click="kirimWa(l)" :title="jamIdeal(l.jam_kirim).teks"><Ikon n="wa"/> WA</button>
                  <button v-else class="btn btn-kecil" @click="kirimWa(l)" title="Nomor kantor, hubungi lewat telepon"><Ikon n="telepon"/> Telp</button>
                  <a class="btn btn-hantu btn-kecil btn-ikon" :href="l.maps_url" target="_blank" rel="noopener" title="Buka di Google Maps" aria-label="Buka di Google Maps"><Ikon n="peta"/></a>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <Kosong v-else-if="!memuat" judul="Belum ada lead yang cocok" :teks="totalSemua ? 'Coba longgarkan filter di atas.' : 'Jalankan pencarian pertama Anda untuk mengisi daftar ini.'">
        <a v-if="!totalSemua" class="btn btn-utama" href="#/cari">Cari lead</a>
      </Kosong>
      <div class="halaman-nav" v-if="data.total > perPage">
        <span>{{ (page-1)*perPage + 1 }}–{{ Math.min(page*perPage, data.total) }} dari {{ data.total }} lead</span>
        <div style="display:flex;gap:6px"><button class="btn btn-kecil" :disabled="page<=1" @click="page--">Sebelumnya</button><button class="btn btn-kecil" :disabled="page>=halamanTerakhir" @click="page++">Berikutnya</button></div>
      </div>
    </div>

    <LeadDrawer v-if="dipilih" :lead-id="dipilih" @close="dipilih=null" @changed="muat"/>
  </div>`,
};
