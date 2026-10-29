import { api } from '../api.js';
import { resetTemplateCache } from '../components.js';
import { store } from '../store.js';
import { DAFTAR_VARIABEL, TAHAP_PESAN, isiTemplate, pratinjauHtml, rupiah, salin } from '../util.js';

const CONTOH_LEAD = {
  nama: 'Laundry Bersih Jaya', kategori_nama: 'Laundry', kota_nama: 'Kota Banjarbaru', rating: 4.7, jumlah_ulasan: 128,
};

export default {
  data() { return { tab: 'template', templates: [], keberatan: [], paket: [], buka: null, simpanTeks: '' }; },
  computed: {
    store: () => store,
    tahapPesan: () => TAHAP_PESAN,
    variabel: () => DAFTAR_VARIABEL,
    labelWilayah() { return { fokus: `Lead ${store.fokusNama}`, luar: 'Lead luar daerah', semua: 'Semua lead' }; },
  },
  async created() {
    [this.templates, this.keberatan] = await Promise.all([api.get('/templates'), api.get('/keberatan')]);
    this.paket = store.meta.paket.map((p) => ({ ...p }));
  },
  methods: {
    pratinjau(isi) { return pratinjauHtml(isiTemplate(isi, CONTOH_LEAD)); },
    sisipVar(t, v, refName) {
      const el = this.$refs[refName]?.[0] || this.$refs[refName];
      const pos = el ? el.selectionStart : t.isi.length;
      t.isi = t.isi.slice(0, pos) + `{${v}}` + t.isi.slice(pos);
    },
    async simpanTemplate(t) {
      const r = await api.put(`/templates/${t.id}`, t);
      Object.assign(t, r);
      resetTemplateCache();
      store.toast('Template disimpan');
    },
    async tambahTemplate() {
      const t = await api.post('/templates', { nama: 'Template baru', tahap: 'umum', wilayah: 'semua', isi: '{sapaan}, ' });
      this.templates.push(t);
      this.buka = 't' + t.id;
      resetTemplateCache();
    },
    async hapusTemplate(t) {
      if (!confirm(`Hapus template "${t.nama}"?`)) return;
      await api.del(`/templates/${t.id}`);
      this.templates = this.templates.filter((x) => x.id !== t.id);
      resetTemplateCache();
    },
    async simpanKeberatan(k) { Object.assign(k, await api.put(`/keberatan/${k.id}`, k)); store.toast('Jawaban disimpan'); },
    async tambahKeberatan() {
      const k = await api.post('/keberatan', { judul: '"Keberatan baru"', isi: '' });
      this.keberatan.push(k);
      this.buka = 'k' + k.id;
    },
    async hapusKeberatan(k) {
      if (!confirm(`Hapus jawaban ${k.judul}?`)) return;
      await api.del(`/keberatan/${k.id}`);
      this.keberatan = this.keberatan.filter((x) => x.id !== k.id);
    },
    salinJawaban(k) { salin(isiTemplate(k.isi, CONTOH_LEAD)); },
    async simpanPaket(p) {
      const r = await api.put(`/paket/${p.id}`, { ...p, harga: Number(p.harga), jatah_revisi: Number(p.jatah_revisi) });
      Object.assign(p, r);
      const i = store.meta.paket.findIndex((x) => x.id === p.id);
      store.meta.paket[i] = { ...r };
      store.toast(`Paket ${p.nama} disimpan`);
    },
    rupiah,
  },
  template: `
  <div class="halaman">
    <div class="kepala">
      <div><h1>Template & jawaban</h1><p>Kalimat yang dipakai saat menghubungi lead. Teks dalam kurung kurawal seperti {nama_usaha} otomatis diganti data tiap lead.</p></div>
      <div class="segmen" role="tablist">
        <button :class="{on: tab==='template'}" @click="tab='template'">Template pesan</button>
        <button :class="{on: tab==='keberatan'}" @click="tab='keberatan'">Jawaban penolakan</button>
        <button :class="{on: tab==='paket'}" @click="tab='paket'">Paket & harga</button>
      </div>
    </div>

    <template v-if="tab==='template'">
      <div class="tumpuk">
        <section v-for="t in templates" :key="t.id" class="panel">
          <div class="panel-kepala" style="cursor:pointer" @click="buka = buka==='t'+t.id ? null : 't'+t.id">
            <div><h3>{{ t.nama }}</h3><div class="kecil redup">{{ tahapPesan[t.tahap] }}, {{ labelWilayah[t.wilayah] }}</div></div>
            <span class="kecil redup">{{ buka==='t'+t.id ? 'Tutup' : 'Ubah' }}</span>
          </div>
          <div class="panel-isi">
            <div v-if="buka==='t'+t.id" class="dua-kolom">
              <div class="kolom-form">
                <div class="baris-form">
                  <div><label class="label">Nama</label><input class="input" v-model="t.nama"></div>
                  <div><label class="label">Tahap</label><select class="select" v-model="t.tahap"><option v-for="(v,k) in tahapPesan" :value="k">{{ v }}</option></select></div>
                  <div><label class="label">Untuk</label><select class="select" v-model="t.wilayah"><option v-for="(v,k) in labelWilayah" :value="k">{{ v }}</option></select></div>
                </div>
                <div><label class="label">Isi pesan</label><textarea :ref="'ta'+t.id" class="textarea" rows="10" v-model="t.isi"></textarea></div>
                <div><span class="label">Sisipkan data lead</span><div class="chips" style="gap:5px"><button v-for="v in variabel" class="var-chip" @click="sisipVar(t, v, 'ta'+t.id)">{{ '{' + v + '}' }}</button></div></div>
                <div style="display:flex;gap:8px"><button class="btn btn-utama" @click="simpanTemplate(t)">Simpan</button><button class="btn btn-bahaya" @click="hapusTemplate(t)">Hapus</button></div>
              </div>
              <div><span class="label">Pratinjau dengan lead contoh</span><div class="pratinjau-wa" v-html="pratinjau(t.isi)"></div></div>
            </div>
            <div v-else class="pratinjau-wa" style="margin-left:0;max-width:72ch" v-html="pratinjau(t.isi)"></div>
          </div>
        </section>
        <div><button class="btn" @click="tambahTemplate"><Ikon n="tambah"/> Template baru</button></div>
      </div>
    </template>

    <template v-if="tab==='keberatan'">
      <p class="redup" style="margin-top:-8px">Saat lead menolak, cari jawabannya di sini lalu salin ke WhatsApp.</p>
      <div class="tumpuk">
        <section v-for="k in keberatan" :key="k.id" class="panel">
          <div class="panel-kepala"><h3>{{ k.judul }}</h3><div style="display:flex;gap:6px"><button class="btn btn-kecil" @click="salinJawaban(k)"><Ikon n="salin"/> Salin</button><button class="btn btn-hantu btn-kecil" @click="buka = buka==='k'+k.id ? null : 'k'+k.id">{{ buka==='k'+k.id ? 'Tutup' : 'Ubah' }}</button></div></div>
          <div class="panel-isi">
            <div v-if="buka==='k'+k.id" class="kolom-form">
              <div><label class="label">Keberatan</label><input class="input" v-model="k.judul"></div>
              <div><label class="label">Jawaban</label><textarea class="textarea" rows="5" v-model="k.isi"></textarea></div>
              <div style="display:flex;gap:8px"><button class="btn btn-utama" @click="simpanKeberatan(k)">Simpan</button><button class="btn btn-bahaya" @click="hapusKeberatan(k)">Hapus</button></div>
            </div>
            <p v-else style="margin:0;max-width:80ch">{{ k.isi }}</p>
          </div>
        </section>
        <div><button class="btn" @click="tambahKeberatan"><Ikon n="tambah"/> Jawaban baru</button></div>
      </div>
    </template>

    <template v-if="tab==='paket'">
      <p class="redup" style="margin-top:-8px">Harga ini dipakai di template penawaran. Daftar fitur dan materi menjadi to-do otomatis saat lead deal.</p>
      <div class="tumpuk">
        <section v-for="p in paket" :key="p.id" class="panel">
          <div class="panel-kepala"><h3>{{ p.nama }}</h3><span class="tebal">{{ rupiah(p.harga) }}</span></div>
          <div class="panel-isi kolom-form">
            <div class="baris-form">
              <div><label class="label">Nama paket</label><input class="input" v-model="p.nama"></div>
              <div><label class="label">Harga (Rp)</label><input class="input" type="number" step="1000" v-model="p.harga"></div>
              <div><label class="label">Jatah revisi gratis</label><input class="input" type="number" min="0" v-model="p.jatah_revisi"></div>
            </div>
            <div><label class="label">Deskripsi singkat</label><input class="input" v-model="p.deskripsi"></div>
            <div class="baris-form">
              <div><label class="label">To-do fitur (satu per baris)</label><textarea class="textarea" rows="8" v-model="p.fitur_default"></textarea></div>
              <div><label class="label">Materi yang diminta dari klien (satu per baris)</label><textarea class="textarea" rows="8" v-model="p.materi_default"></textarea></div>
            </div>
            <div><button class="btn btn-utama" @click="simpanPaket(p)">Simpan paket</button></div>
          </div>
        </section>
      </div>
    </template>
  </div>`,
};
