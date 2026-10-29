import { api, qs } from '../api.js';
import { NoteEditor } from '../components.js';
import { debounce, waktu } from '../util.js';

export default {
  components: { NoteEditor },
  data() { return { list: [], aktif: null, cari: '' }; },
  watch: { cari() { this.cariNanti(); } },
  async created() {
    this.cariNanti = debounce(() => this.muat(), 250);
    await this.muat();
    this.aktif = this.list[0] || null;
  },
  methods: {
    async muat() { this.list = await api.get('/catatan' + qs({ q: this.cari })); },
    async baru() {
      const n = await api.post('/catatan', { judul: 'Catatan baru', isi: '' });
      this.list.unshift(n);
      this.aktif = n;
    },
    tersimpan(n) {
      const i = this.list.findIndex((x) => x.id === n.id);
      if (i >= 0) this.list[i] = n;
      this.aktif = n;
      this.list.sort((a, b) => (b.disematkan - a.disematkan) || (b.updated_at > a.updated_at ? 1 : -1));
    },
    terhapus(id) { this.list = this.list.filter((x) => x.id !== id); this.aktif = this.list[0] || null; },
    cuplikan(n) { return (n.isi || '').replace(/[#*`\-[\]]/g, '').trim().slice(0, 60) || 'Kosong'; },
    waktu,
  },
  template: `
  <div class="halaman">
    <div class="kepala">
      <div><h1>Catatan</h1><p>Tempat menulis ide, SOP kerja, daftar harga, atau apa saja di luar proyek tertentu. Catatan per klien ada di halaman proyeknya.</p></div>
      <div class="kepala-aksi"><button class="btn btn-utama" @click="baru"><Ikon n="tambah"/> Catatan baru</button></div>
    </div>
    <div class="grid-catatan">
      <aside class="panel">
        <div style="padding:10px 10px 0"><input class="input" v-model="cari" placeholder="Cari catatan" aria-label="Cari catatan"></div>
        <nav class="daftar-catatan" v-if="list.length">
          <button v-for="n in list" :key="n.id" :class="{on: aktif && aktif.id===n.id}" @click="aktif=n">
            <span class="j">{{ n.disematkan ? '📌 ' : '' }}{{ n.judul }}</span>
            <span class="w">{{ cuplikan(n) }}</span>
            <span class="w">{{ waktu(n.updated_at) }}</span>
          </button>
        </nav>
        <p v-else class="redup kecil" style="padding:12px 18px">{{ cari ? 'Tidak ada catatan yang cocok.' : 'Belum ada catatan.' }}</p>
      </aside>
      <section class="panel panel-isi">
        <NoteEditor v-if="aktif" :note="aktif" @saved="tersimpan" @deleted="terhapus"/>
        <Kosong v-else judul="Mulai catatan pertama Anda" teks="Misalnya SOP membalas klien, ide promo, atau daftar harga hosting dari penyedia."><button class="btn btn-utama" @click="baru">Buat catatan</button></Kosong>
      </section>
    </div>
  </div>`,
};
