import { api } from './api.js';
import { ikon } from './icons.js';
import { store } from './store.js';
import {
  STATUS_LABEL, TAHAP_PESAN, FOLLOWUP_LABEL, adaKosong, debounce, hariIniISO, isiTemplate, jamIdeal, kelasSkor,
  labelSkor, linkWa, markdown, namaBersih, pratinjauHtml, ratingTeks, relatifHari, rupiah, salin, selisihHari,
  tanggal, toggleBarisCek, waktu, websiteLabel,
} from './util.js';

export const Ikon = {
  props: { n: String },
  computed: { svg() { return ikon[this.n] || ''; } },
  template: `<span class="ikon" v-html="svg" style="display:inline-flex;width:16px;height:16px"></span>`,
};

export const StatusPill = {
  props: { status: String },
  computed: { label() { return STATUS_LABEL[this.status] || this.status; } },
  template: `<span class="pill" :class="'st-' + status">{{ label }}</span>`,
};

export const SkorBadge = {
  props: { skor: Number },
  computed: { kelas() { return kelasSkor(this.skor); }, judul() { return `Skor ${this.skor}: ${labelSkor(this.skor)}`; } },
  template: `<span class="skor" :class="kelas" :title="judul">{{ skor }}</span>`,
};

export const Kosong = {
  props: { judul: String, teks: String },
  template: `<div class="kosong"><div class="motif"></div><h3>{{ judul }}</h3><p v-if="teks">{{ teks }}</p><slot></slot></div>`,
};

/* ---------------- Modal kirim WhatsApp ---------------- */
let templateCache = null;
export async function ambilTemplate(paksa = false) {
  if (!templateCache || paksa) templateCache = await api.get('/templates');
  return templateCache;
}
export function resetTemplateCache() { templateCache = null; }

export const WaModal = {
  components: { Ikon, StatusPill },
  data() {
    return { templates: [], tahap: 'pembuka', templateId: null, teks: '', mengirim: false };
  },
  computed: {
    ctx() { return store.waModal; },
    lead() { return this.ctx?.lead; },
    adaWa() { return !!this.lead?.wa_nomor; },
    isFokus() { return this.lead?.provinsi_kode === store.meta?.fokus?.kode; },
    pilihan() {
      return this.templates.filter((t) => t.tahap === this.tahap
        && (t.wilayah === 'semua' || (t.wilayah === 'fokus') === this.isFokus));
    },
    jam() { return jamIdeal(this.lead?.jam_kirim); },
    kosong() { return adaKosong(this.teks); },
    batas() { return store.meta?.pengaturan?.batas_wa_harian || 25; },
    penuh() { return store.waHariIni >= this.batas; },
    namaKosong() { return !store.meta?.pengaturan?.nama_anda; },
    pratinjau() { return pratinjauHtml(this.teks); },
    TAHAP_PESAN() { return TAHAP_PESAN; },
  },
  watch: {
    lead: { immediate: true, handler(l) { if (l) this.siapkan(); } },
    tahap() { this.templateId = this.pilihan[0]?.id ?? null; this.isi(); },
    templateId() { this.isi(); },
  },
  methods: {
    async siapkan() {
      this.templates = await ambilTemplate();
      const l = this.lead;
      this.tahap = ['membalas', 'tertarik'].includes(l.status) ? 'penawaran'
        : ({ 0: 'pembuka', 1: 'kirim_contoh', 2: 'follow_up' }[l.tahap_followup] || 'umum');
      this.templateId = this.pilihan[0]?.id ?? null;
      this.isi();
    },
    isi() {
      const t = this.templates.find((x) => x.id === this.templateId);
      this.teks = t ? isiTemplate(t.isi, this.lead) : '';
    },
    tutup() { store.waModal = null; },
    async catat(jenis) {
      this.mengirim = true;
      try {
        const lead = await api.post(`/leads/${this.lead.id}/kontak`, { tahap: this.tahap, isi: this.teks, jenis });
        if (jenis === 'wa') store.waHariIni += 1;
        const nxt = lead.followup_berikutnya ? ` Follow-up berikutnya: ${relatifHari(lead.followup_berikutnya).toLowerCase()}.` : '';
        store.toast(`${TAHAP_PESAN[this.tahap]} tercatat.${nxt}`);
        this.ctx.onDone?.(lead);
        this.tutup();
      } catch (e) {
        store.toast(e.message, true);
      } finally {
        this.mengirim = false;
      }
    },
    kirimWa() {
      window.open(linkWa(this.lead.wa_nomor, this.teks), '_blank', 'noopener');
      this.catat('wa');
    },
    salin() { salin(this.teks); },
  },
  template: `
  <div class="modal-latar" @click.self="tutup" @keydown.esc="tutup">
    <div class="modal" role="dialog" aria-modal="true" aria-labelledby="wa-judul" style="width:min(760px,100%)">
      <div class="modal-kepala">
        <div>
          <h2 id="wa-judul">Hubungi {{ lead.nama }}</h2>
          <div class="redup kecil" style="margin-top:3px">{{ lead.telepon }} <span v-if="!adaWa">(telepon kantor, kemungkinan tidak ada WhatsApp)</span></div>
        </div>
        <button class="btn btn-hantu btn-ikon" @click="tutup" aria-label="Tutup"><Ikon n="tutup"/></button>
      </div>
      <div class="modal-isi kolom-form">
        <div class="baris-form">
          <div>
            <label class="label" for="wa-tahap">Tahap pesan</label>
            <select id="wa-tahap" class="select" v-model="tahap">
              <option v-for="(v,k) in TAHAP_PESAN" :value="k">{{ v }}</option>
            </select>
          </div>
          <div>
            <label class="label" for="wa-tpl">Template</label>
            <select id="wa-tpl" class="select" v-model="templateId" :disabled="!pilihan.length">
              <option v-for="t in pilihan" :value="t.id">{{ t.nama }}</option>
              <option v-if="!pilihan.length" :value="null">Tidak ada template untuk tahap ini</option>
            </select>
          </div>
        </div>
        <div class="dua-kolom" style="gap:14px">
          <div>
            <label class="label" for="wa-teks">Isi pesan (boleh diubah)</label>
            <textarea id="wa-teks" class="textarea" v-model="teks" rows="11"></textarea>
          </div>
          <div>
            <span class="label">Pratinjau</span>
            <div class="pratinjau-wa" v-html="pratinjau"></div>
          </div>
        </div>
        <div v-if="namaKosong" class="peringatan">Nama Anda belum diisi, jadi pesan masih memuat [isi nama_anda]. Isi di <a href="#/pengaturan" @click="tutup">Pengaturan</a>.</div>
        <div v-else-if="kosong" class="peringatan">Masih ada bagian bertanda [isi …]. Lengkapi langsung di kotak pesan sebelum mengirim.</div>
        <div v-if="penuh" class="peringatan">Anda sudah mengirim {{ store.waHariIni }} pesan hari ini (batas aman {{ batas }}). Sebaiknya lanjutkan besok supaya nomor WhatsApp Anda tidak diblokir.</div>
      </div>
      <div class="modal-kaki">
        <span class="jam-ideal" :class="jam.ok ? 'ok' : 'tunggu'" style="margin-right:auto">{{ jam.teks }}</span>
        <button class="btn" @click="salin"><Ikon n="salin"/> Salin teks</button>
        <template v-if="adaWa">
          <button class="btn btn-wa" :disabled="mengirim || !teks" @click="kirimWa"><Ikon n="wa"/> Buka WhatsApp & catat</button>
        </template>
        <template v-else>
          <a class="btn" :href="'tel:' + lead.telepon"><Ikon n="telepon"/> Telepon</a>
          <button class="btn btn-utama" :disabled="mengirim" @click="catat('telepon')">Catat sudah ditelepon</button>
        </template>
      </div>
    </div>
  </div>`,
  setup() { return { store }; },
};

/* ---------------- Modal tandai deal ---------------- */
export const DealModal = {
  components: { Ikon },
  data() {
    const paket = store.meta?.paket || [];
    const d = new Date(); d.setDate(d.getDate() + 14);
    return { paketId: paket[0]?.id, harga: paket[0]?.harga || 0, deadline: d.toISOString().slice(0, 10), menyimpan: false };
  },
  computed: {
    lead() { return store.dealModal?.lead; },
    paket() { return store.meta?.paket || []; },
  },
  watch: {
    paketId(id) { const p = this.paket.find((x) => x.id === id); if (p) this.harga = p.harga; },
  },
  methods: {
    tutup() { store.dealModal = null; },
    async simpan() {
      this.menyimpan = true;
      try {
        const r = await api.post(`/leads/${this.lead.id}/deal`, { paket_id: this.paketId, harga_deal: Number(this.harga), deadline: this.deadline });
        store.toast('Selamat! Proyek baru dibuat lengkap dengan to-do fitur dan materi.');
        store.dealModal.onDone?.();
        this.tutup();
        location.hash = `#/proyek/${r.proyek_id}`;
      } catch (e) {
        store.toast(e.message, true);
      } finally {
        this.menyimpan = false;
      }
    },
    rupiah,
  },
  template: `
  <div class="modal-latar" @click.self="tutup">
    <form class="modal" role="dialog" aria-modal="true" aria-labelledby="deal-judul" @submit.prevent="simpan" style="width:min(520px,100%)">
      <div class="modal-kepala">
        <div><h2 id="deal-judul">Tandai deal</h2><div class="redup kecil" style="margin-top:3px">{{ lead.nama }} akan dipindah ke Klien & Proyek.</div></div>
        <button type="button" class="btn btn-hantu btn-ikon" @click="tutup" aria-label="Tutup"><Ikon n="tutup"/></button>
      </div>
      <div class="modal-isi kolom-form">
        <div>
          <span class="label">Paket</span>
          <div class="chips">
            <button type="button" v-for="p in paket" class="chip" :class="{on: paketId===p.id}" @click="paketId=p.id">{{ p.nama }} <span class="n">{{ rupiah(p.harga) }}</span></button>
          </div>
        </div>
        <div class="baris-form">
          <div><label class="label" for="deal-harga">Harga deal (Rp)</label><input id="deal-harga" class="input" type="number" min="0" step="1000" v-model="harga"></div>
          <div><label class="label" for="deal-dl">Target selesai</label><input id="deal-dl" class="input" type="date" v-model="deadline"></div>
        </div>
      </div>
      <div class="modal-kaki">
        <button type="button" class="btn" @click="tutup">Batal</button>
        <button class="btn btn-utama" :disabled="menyimpan">Buat proyek</button>
      </div>
    </form>
  </div>`,
};

/* ---------------- Laci detail lead ---------------- */
export const LeadDrawer = {
  components: { Ikon, StatusPill, SkorBadge },
  props: { leadId: Number },
  emits: ['close', 'changed'],
  data() { return { lead: null, catatan: '', status: '', followup: '', simpanStatus: '' }; },
  computed: {
    statuses() { return store.meta?.statuses || []; },
    tahapLabel() { return FOLLOWUP_LABEL[this.lead?.tahap_followup ?? 0]; },
  },
  watch: { leadId: { immediate: true, handler() { this.muat(); } } },
  created() {
    this.simpanCatatan = debounce(async () => {
      await this.patch({ catatan: this.catatan }, false);
      this.simpanStatus = 'Tersimpan';
    }, 700);
  },
  methods: {
    async muat() {
      if (!this.leadId) return;
      this.lead = await api.get(`/leads/${this.leadId}`);
      this.catatan = this.lead.catatan || '';
      this.status = this.lead.status;
      this.followup = this.lead.followup_berikutnya || '';
    },
    async patch(body, refresh = true) {
      try {
        const l = await api.patch(`/leads/${this.leadId}`, body);
        if (refresh) { this.lead = l; this.status = l.status; this.followup = l.followup_berikutnya || ''; }
        this.$emit('changed', l);
      } catch (e) { store.toast(e.message, true); }
    },
    ubahStatus() { this.patch({ status: this.status }); },
    ubahFollowup() { this.patch({ followup_berikutnya: this.followup || null }); },
    ketikCatatan() { this.simpanStatus = 'Menyimpan…'; this.simpanCatatan(); },
    kirimWa() { store.waModal = { lead: this.lead, onDone: (l) => { this.lead = l; this.status = l.status; this.followup = l.followup_berikutnya || ''; this.$emit('changed', l); } }; },
    deal() { store.dealModal = { lead: this.lead, onDone: () => this.$emit('changed') }; },
    async hapus() {
      if (!confirm(`Hapus ${this.lead.nama} dari daftar lead?`)) return;
      await api.del(`/leads/${this.leadId}`);
      store.toast('Lead dihapus');
      this.$emit('changed');
      this.$emit('close');
    },
    STATUS_LABEL: (s) => STATUS_LABEL[s], tanggal, waktu, websiteLabel, ratingTeks, relatifHari, namaBersih,
    labelRiwayat(r) {
      if (r.jenis === 'status') return r.isi;
      const j = { wa: 'WhatsApp', telepon: 'Telepon', kunjungan: 'Kunjungan', catatan: 'Catatan' }[r.jenis];
      return `${j}: ${TAHAP_PESAN[r.tahap] || r.tahap || ''}`;
    },
  },
  template: `
  <div class="laci-latar" @click="$emit('close')"></div>
  <aside class="laci" role="dialog" aria-label="Detail lead" @keydown.esc="$emit('close')">
    <template v-if="lead">
      <div class="laci-kepala">
        <div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start">
          <div style="min-width:0">
            <div style="display:flex;gap:10px;align-items:center"><SkorBadge :skor="lead.skor"/><h2 style="margin:0;font-size:19px;letter-spacing:-.015em;line-height:1.25">{{ lead.nama }}</h2></div>
            <div class="redup kecil" style="margin-top:6px">{{ lead.kategori_nama || lead.kategori_google || 'Kata kunci bebas' }}, {{ lead.kota_nama || 'wilayah tidak diketahui' }}</div>
          </div>
          <button class="btn btn-hantu btn-ikon" @click="$emit('close')" aria-label="Tutup"><Ikon n="tutup"/></button>
        </div>
        <div style="display:flex;gap:8px;margin-top:14px;flex-wrap:wrap">
          <button v-if="lead.wa_nomor" class="btn btn-wa" @click="kirimWa"><Ikon n="wa"/> Kirim WA</button>
          <button v-else class="btn" @click="kirimWa"><Ikon n="telepon"/> Hubungi</button>
          <a class="btn" :href="lead.maps_url" target="_blank" rel="noopener"><Ikon n="peta"/> Google Maps</a>
          <a v-if="lead.proyek_id" class="btn btn-utama" :href="'#/proyek/' + lead.proyek_id">Buka proyek</a>
          <button v-else class="btn" @click="deal">Tandai deal</button>
        </div>
      </div>
      <div class="laci-isi">
        <section class="baris-form">
          <div>
            <label class="label" for="ld-status">Status</label>
            <select id="ld-status" class="select" v-model="status" @change="ubahStatus">
              <option v-for="s in statuses" :value="s">{{ STATUS_LABEL(s) }}</option>
            </select>
          </div>
          <div>
            <label class="label" for="ld-fu">Follow-up berikutnya</label>
            <input id="ld-fu" type="date" class="input" v-model="followup" @change="ubahFollowup">
            <div class="bantuan">{{ tahapLabel }}</div>
          </div>
        </section>
        <section>
          <div style="display:flex;justify-content:space-between;align-items:baseline"><label class="label" for="ld-cat">Catatan</label><span class="bantuan">{{ simpanStatus }}</span></div>
          <textarea id="ld-cat" class="textarea" rows="4" v-model="catatan" @input="ketikCatatan" placeholder="Contoh: pemiliknya Pak Rahman, minta dihubungi sore"></textarea>
        </section>
        <section>
          <h3 class="h2">Info usaha</h3>
          <dl class="dl">
            <dt>Telepon</dt><dd>{{ lead.telepon }} <span v-if="lead.wa_nomor" class="tag">WhatsApp</span></dd>
            <dt>Website</dt><dd><span class="tag" :class="{'tag-panas': lead.website_status==='hanya_sosmed'}">{{ websiteLabel(lead) }}</span> <a v-if="lead.website_url" :href="lead.website_url" target="_blank" rel="noopener" class="kecil">buka</a></dd>
            <dt>Rating</dt><dd>{{ ratingTeks(lead) }}</dd>
            <dt>Alamat</dt><dd>{{ lead.alamat }}</dd>
            <dt>Ditemukan</dt><dd>{{ tanggal(lead.created_at) }}</dd>
          </dl>
        </section>
        <section>
          <h3 class="h2">Riwayat kontak</h3>
          <ul class="garis-waktu" v-if="lead.riwayat.length">
            <li v-for="r in lead.riwayat" :class="r.jenis"><div><div>{{ labelRiwayat(r) }}</div><div class="redup kecil">{{ waktu(r.created_at) }}</div></div></li>
          </ul>
          <p v-else class="redup kecil" style="margin:0">Belum pernah dihubungi.</p>
        </section>
        <section><button class="btn btn-bahaya btn-kecil" @click="hapus"><Ikon n="hapus"/> Hapus lead ini</button></section>
      </div>
    </template>
  </aside>`,
};

/* ---------------- Editor catatan ---------------- */
export const NoteEditor = {
  components: { Ikon },
  props: { note: Object, ringkas: Boolean },
  emits: ['saved', 'deleted'],
  data() { return { judul: '', isi: '', mode: 'tulis', status: '' }; },
  computed: { html() { return markdown(this.isi); } },
  watch: {
    'note.id': {
      immediate: true,
      handler() {
        this.judul = this.note?.judul || '';
        this.isi = this.note?.isi || '';
        this.status = '';
        this.mode = this.isi ? 'lihat' : 'tulis';
      },
    },
  },
  created() {
    this.simpanNanti = debounce(() => this.simpan(), 700);
  },
  methods: {
    ubah() { this.status = 'Menyimpan…'; this.simpanNanti(); },
    async simpan() {
      try {
        const n = await api.put(`/catatan/${this.note.id}`, { judul: this.judul || 'Tanpa judul', isi: this.isi });
        this.status = 'Tersimpan';
        this.$emit('saved', n);
      } catch (e) { this.status = 'Gagal menyimpan'; store.toast(e.message, true); }
    },
    async sematkan() {
      const n = await api.put(`/catatan/${this.note.id}`, { disematkan: this.note.disematkan ? 0 : 1 });
      this.$emit('saved', n);
    },
    async hapus() {
      if (!confirm('Hapus catatan ini?')) return;
      await api.del(`/catatan/${this.note.id}`);
      this.$emit('deleted', this.note.id);
    },
    klikPratinjau(e) {
      const line = e.target?.dataset?.line;
      if (line !== undefined) { this.isi = toggleBarisCek(this.isi, Number(line)); this.ubah(); }
    },
    sisip(awal, akhir = '') {
      const ta = this.$refs.ta;
      this.mode = 'tulis';
      this.$nextTick(() => {
        const t = this.$refs.ta;
        const [a, b] = [t.selectionStart, t.selectionEnd];
        if (akhir) {
          this.isi = this.isi.slice(0, a) + awal + this.isi.slice(a, b) + akhir + this.isi.slice(b);
        } else {
          const mulai = this.isi.lastIndexOf('\n', a - 1) + 1;
          this.isi = this.isi.slice(0, mulai) + awal + this.isi.slice(mulai);
        }
        this.ubah();
        this.$nextTick(() => { t.focus(); const p = b + awal.length; t.setSelectionRange(p, p); });
      });
      return ta;
    },
  },
  template: `
  <div>
    <input class="editor-judul" v-model="judul" @input="ubah" placeholder="Judul catatan" aria-label="Judul catatan">
    <div class="alat">
      <div class="segmen" role="tablist">
        <button :class="{on: mode==='tulis'}" @click="mode='tulis'">Tulis</button>
        <button :class="{on: mode==='lihat'}" @click="mode='lihat'">Lihat</button>
      </div>
      <button class="btn btn-hantu btn-kecil" @click="sisip('## ')" title="Judul bagian">Judul</button>
      <button class="btn btn-hantu btn-kecil" @click="sisip('**','**')" title="Tebal"><b>B</b></button>
      <button class="btn btn-hantu btn-kecil" @click="sisip('- ')">Daftar</button>
      <button class="btn btn-hantu btn-kecil" @click="sisip('- [ ] ')">Checklist</button>
      <span class="bantuan" style="margin:0 0 0 auto">{{ status }}</span>
      <button class="btn btn-hantu btn-kecil" @click="sematkan" :title="note.disematkan ? 'Lepas sematan' : 'Sematkan di atas'"><Ikon n="pin"/> {{ note.disematkan ? 'Disematkan' : 'Sematkan' }}</button>
      <button class="btn btn-hantu btn-kecil btn-bahaya" @click="hapus" title="Hapus catatan"><Ikon n="hapus"/></button>
    </div>
    <textarea v-show="mode==='tulis'" ref="ta" class="editor-teks" :style="ringkas ? 'min-height:200px' : ''" v-model="isi" @input="ubah"
      placeholder="Tulis di sini. Pakai '## ' untuk judul, '- ' untuk daftar, '- [ ] ' untuk checklist."></textarea>
    <div v-show="mode==='lihat'" class="md" v-html="html || '<p class=redup>Catatan masih kosong.</p>'" @click="klikPratinjau"></div>
  </div>`,
};

export { STATUS_LABEL, rupiah, tanggal, waktu, relatifHari, selisihHari, hariIniISO, namaBersih, websiteLabel, ratingTeks };
