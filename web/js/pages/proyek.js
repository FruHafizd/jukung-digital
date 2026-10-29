import { api } from '../api.js';
import { store } from '../store.js';
import { TAHAP_PROYEK, namaBersih, relatifHari, rupiah, selisihHari, tanggal } from '../util.js';

export default {
  data() { return { list: [], seret: null, target: null, formBaru: false, baru: { nama_klien: '', kontak_wa: '', paket_id: null } }; },
  computed: {
    store: () => store,
    lajur() {
      return TAHAP_PROYEK.map((t) => ({ ...t, kartu: this.list.filter((p) => p.tahap === t.kode).sort((a, b) => a.urutan - b.urutan) }));
    },
    nilaiAktif() { return this.list.filter((p) => p.tahap !== 'selesai').reduce((a, p) => a + Number(p.harga_deal), 0); },
    belumDibayar() { return this.list.reduce((a, p) => a + Math.max(0, Number(p.harga_deal) - Number(p.dibayar)), 0); },
  },
  async created() {
    this.baru.paket_id = store.meta.paket[0]?.id;
    await this.muat();
  },
  methods: {
    async muat() { this.list = await api.get('/proyek'); },
    mulaiSeret(p, e) { this.seret = p; e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', String(p.id)); },
    async lepas(tahap, e) {
      const p = this.seret;
      this.target = null;
      this.seret = null;
      if (!p) return;
      // Posisi sisip berdasarkan kartu di bawah kursor
      const kartuEl = e.target.closest?.('[data-id]');
      const ids = this.lajur.find((l) => l.kode === tahap).kartu.map((k) => k.id).filter((id) => id !== p.id);
      const idx = kartuEl ? ids.indexOf(Number(kartuEl.dataset.id)) : -1;
      ids.splice(idx < 0 ? ids.length : idx, 0, p.id);
      const asal = p.tahap;
      p.tahap = tahap;
      ids.forEach((id, i) => { const x = this.list.find((k) => k.id === id); if (x) x.urutan = i; });
      const body = { [tahap]: ids };
      if (asal !== tahap) body[asal] = this.lajur.find((l) => l.kode === asal).kartu.map((k) => k.id);
      await api.post('/proyek/urutan', body);
      if (asal !== tahap) {
        if (tahap === 'online') await api.patch(`/proyek/${p.id}`, { tahap: 'online' });
        store.toast(`${namaBersih(p.nama_klien)} dipindah ke ${TAHAP_PROYEK.find((t) => t.kode === tahap).nama}`);
      }
    },
    async tambah() {
      const r = await api.post('/proyek', this.baru);
      location.hash = `#/proyek/${r.id}`;
    },
    persen(a, b) { return b ? Math.round((a / b) * 100) : 0; },
    rupiah, tanggal, relatifHari, selisihHari, namaBersih,
  },
  template: `
  <div class="halaman" style="max-width:none">
    <div class="kepala">
      <div><h1>Klien & proyek</h1><p>Geser kartu ke tahap berikutnya. Klik kartu untuk membuka to-do fitur, materi, pembayaran, dan catatan klien.</p></div>
      <div class="kepala-aksi"><button class="btn btn-utama" @click="formBaru = !formBaru"><Ikon n="tambah"/> Proyek manual</button></div>
    </div>

    <form v-if="formBaru" class="panel panel-isi baris-form" style="margin-bottom:18px;align-items:end" @submit.prevent="tambah">
      <div><label class="label" for="pb-nama">Nama klien</label><input id="pb-nama" class="input" v-model="baru.nama_klien" required placeholder="Contoh: Toko Kue Bu Ani"></div>
      <div><label class="label" for="pb-wa">Nomor WA (opsional)</label><input id="pb-wa" class="input" v-model="baru.kontak_wa" placeholder="62812..."></div>
      <div><label class="label" for="pb-paket">Paket</label><select id="pb-paket" class="select" v-model="baru.paket_id"><option v-for="p in store.meta.paket" :value="p.id">{{ p.nama }} ({{ rupiah(p.harga) }})</option></select></div>
      <div><button class="btn btn-utama">Buat proyek</button></div>
    </form>

    <div class="strip" style="margin-bottom:18px" v-if="list.length">
      <div><div class="nilai">{{ list.filter(p => p.tahap !== 'selesai').length }}</div><div class="ket">Proyek berjalan</div></div>
      <div><div class="nilai">{{ rupiah(nilaiAktif) }}</div><div class="ket">Nilai proyek berjalan</div></div>
      <div><div class="nilai sorot">{{ rupiah(belumDibayar) }}</div><div class="ket">Belum dibayar klien</div></div>
    </div>

    <div class="papan" v-if="list.length">
      <section v-for="l in lajur" class="lajur" :aria-label="l.nama">
        <div class="lajur-kepala"><h3>{{ l.nama }}</h3><span class="redup kecil">{{ l.kartu.length }}</span></div>
        <div class="lajur-isi" :class="{target: target===l.kode}" @dragover.prevent="target=l.kode" @dragleave="target = target===l.kode ? null : target" @drop.prevent="lepas(l.kode, $event)">
          <a v-for="p in l.kartu" :key="p.id" :data-id="p.id" class="kartu" :class="{seret: seret && seret.id===p.id}" draggable="true"
             @dragstart="mulaiSeret(p, $event)" @dragend="seret=null; target=null" :href="'#/proyek/' + p.id" style="color:inherit;text-decoration:none">
            <div class="kartu-nama">{{ p.nama_klien }}</div>
            <div class="kartu-meta"><span>{{ p.paket_nama || 'Tanpa paket' }}</span><span class="angka">{{ rupiah(p.harga_deal) }}</span></div>
            <div v-if="p.fitur_total">
              <div class="kartu-meta" style="margin-bottom:4px"><span>Fitur {{ p.fitur_selesai }}/{{ p.fitur_total }}</span><span v-if="p.materi_total">Materi {{ p.materi_selesai }}/{{ p.materi_total }}</span></div>
              <div class="progres"><span :style="{width: persen(p.fitur_selesai, p.fitur_total) + '%'}"></span></div>
            </div>
            <div class="kartu-meta">
              <span v-if="p.tahap !== 'selesai' && p.tahap !== 'online' && p.deadline" :class="{lewat: selisihHari(p.deadline) < 0}">Target {{ relatifHari(p.deadline).toLowerCase() }}</span>
              <span v-else-if="p.tanggal_perpanjangan">Perpanjang {{ tanggal(p.tanggal_perpanjangan, {month:'short', year:'numeric'}) }}</span>
              <span v-else></span>
              <span :class="Number(p.dibayar) >= Number(p.harga_deal) ? '' : 'tebal'" :style="Number(p.dibayar) >= Number(p.harga_deal) ? 'color:var(--hijau)' : ''">{{ Number(p.dibayar) >= Number(p.harga_deal) && p.harga_deal > 0 ? 'Lunas' : 'Dibayar ' + persen(p.dibayar, p.harga_deal) + '%' }}</span>
            </div>
          </a>
        </div>
      </section>
    </div>
    <div v-else class="panel"><Kosong judul="Belum ada klien" teks="Saat sebuah lead Anda tandai deal, proyeknya otomatis muncul di sini lengkap dengan to-do fitur sesuai paket."><a class="btn" href="#/leads">Buka daftar lead</a></Kosong></div>
  </div>`,
};
