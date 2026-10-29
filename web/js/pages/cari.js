import { api } from '../api.js';
import { store } from '../store.js';
import { debounce, waktu } from '../util.js';

const GRUP = [
  { kode: 'tinggi', nama: 'Prioritas tinggi', ket: 'Pelanggannya mencari lewat Google dan nilai transaksinya besar' },
  { kode: 'menengah', nama: 'Menengah', ket: 'Masih butuh website, tapi budget biasanya lebih kecil' },
  { kode: 'khas', nama: 'Khas Kalimantan Selatan', ket: 'Usaha khas daerah dengan persaingan jasa website yang masih sedikit' },
];

export default {
  data() {
    return {
      provinsi: store.meta.fokus?.kode || '63',
      kabList: [], kab: [], perKecamatan: false, kecList: [], kec: [],
      kategori: [], kataKunci: '', lokasiBebas: '', maksHalaman: 3,
      est: null, job: null, riwayat: [], memulai: false, timer: null,
    };
  },
  computed: {
    store: () => store,
    grup: () => GRUP,
    kategoriPerGrup() {
      const m = {};
      store.meta.kategori.forEach((k) => { (m[k.tingkat] ||= []).push(k); });
      return m;
    },
    params() {
      const pisah = (s) => s.split(',').map((x) => x.trim()).filter(Boolean);
      return {
        kabupaten: this.kab, per_kecamatan: this.perKecamatan, kecamatan: this.perKecamatan ? this.kec : [],
        kategori_ids: this.kategori, kata_kunci_bebas: pisah(this.kataKunci), lokasi_bebas: pisah(this.lokasiBebas),
        maks_halaman: this.maksHalaman,
      };
    },
    sisa() { return this.est ? this.est.kuota.batas_bulanan - this.est.kuota.dipakai : 0; },
    berjalan() { return this.job?.status === 'berjalan'; },
    progres() { return this.job ? (this.job.pencarian_selesai / Math.max(1, this.job.total_pencarian)) * 100 : 0; },
    adaKey() { return store.meta.pengaturan.ada_api_key; },
  },
  watch: {
    provinsi: { immediate: true, async handler(p) { this.kabList = await api.get(`/wilayah/${p}/anak`); this.kab = []; } },
    async perKecamatan(v) { if (v) await this.muatKec(); },
    async kab() { if (this.perKecamatan) await this.muatKec(); },
    params: { deep: true, handler() { this.hitung(); } },
  },
  async created() {
    let urutan = 0;  // abaikan jawaban lama yang datang terlambat
    this.hitung = debounce(async () => {
      const n = ++urutan;
      const r = await api.post('/scrape/estimasi', this.params);
      if (n === urutan) this.est = r;
    }, 250);
    this.hitung();
    await this.muatRiwayat();
    const jalan = this.riwayat.find((r) => r.status === 'berjalan');
    if (jalan) this.pantau(jalan.id);
  },
  beforeUnmount() { clearInterval(this.timer); },
  methods: {
    async muatKec() {
      const rows = await Promise.all(this.kab.map((k) => api.get(`/wilayah/${k}/anak`)));
      this.kecList = rows.flat();
      this.kec = this.kec.filter((k) => this.kecList.some((x) => x.kode === k));
    },
    semuaKab(on) { this.kab = on ? this.kabList.map((k) => k.kode) : []; },
    togGrup(kode) {
      const ids = (this.kategoriPerGrup[kode] || []).map((k) => k.id);
      const semua = ids.every((id) => this.kategori.includes(id));
      this.kategori = semua ? this.kategori.filter((id) => !ids.includes(id)) : [...new Set([...this.kategori, ...ids])];
    },
    togKat(id) { this.kategori = this.kategori.includes(id) ? this.kategori.filter((x) => x !== id) : [...this.kategori, id]; },
    async muatRiwayat() { this.riwayat = await api.get('/scrape/jobs'); },
    async mulai() {
      this.memulai = true;
      const namaKab = this.kab.length === this.kabList.length ? 'semua kab/kota' : `${this.kab.length} kab/kota`;
      const ringkasan = `${this.kategori.length + this.params.kata_kunci_bebas.length} jenis usaha di ${namaKab}`
        + (this.params.lokasi_bebas.length ? ` + ${this.params.lokasi_bebas.join(', ')}` : '');
      try {
        const r = await api.post('/scrape', { ...this.params, ringkasan });
        this.pantau(r.id);
      } catch (e) {
        store.toast(e.message, true);
      } finally {
        this.memulai = false;
      }
    },
    pantau(id) {
      clearInterval(this.timer);
      const tarik = async () => {
        this.job = await api.get(`/scrape/jobs/${id}`);
        this.$nextTick(() => { const el = this.$refs.log; if (el) el.scrollTop = el.scrollHeight; });
        if (this.job.status !== 'berjalan') {
          clearInterval(this.timer);
          this.muatRiwayat();
          this.hitung();
          if (this.job.status === 'selesai') store.toast(`Selesai: ${this.job.disimpan} lead baru tersimpan.`);
        }
      };
      tarik();
      this.timer = setInterval(tarik, 1200);
    },
    async hentikan() { await api.post(`/scrape/jobs/${this.job.id}/batal`); store.toast('Menghentikan pencarian…'); },
    waktu,
    labelStatus(s) { return { berjalan: 'Berjalan', selesai: 'Selesai', dibatalkan: 'Dihentikan', gagal: 'Gagal' }[s]; },
  },
  template: `
  <div class="halaman">
    <div class="kepala">
      <div>
        <h1>Cari lead</h1>
        <p>Pilih wilayah dan jenis usaha. Aplikasi mencari di Google Maps, lalu hanya menyimpan usaha yang <b>belum punya website</b> dan <b>punya nomor telepon</b>.</p>
      </div>
    </div>

    <div v-if="!adaKey" class="peringatan" style="margin-bottom:18px">Kunci {{ store.meta.pengaturan.sumber_label }} belum diisi, jadi pencarian belum bisa dijalankan. Ikuti panduan di <a href="#/pengaturan">Pengaturan</a>. Sementara itu Anda bisa mencoba aplikasi dengan data contoh.</div>

    <section v-if="job" class="panel" style="margin-bottom:18px">
      <div class="panel-kepala">
        <h2>{{ berjalan ? 'Sedang mencari…' : 'Hasil pencarian terakhir' }}</h2>
        <button v-if="berjalan" class="btn btn-bahaya btn-kecil" @click="hentikan">Hentikan</button>
        <button v-else class="btn btn-kecil" @click="job=null">Tutup</button>
      </div>
      <div class="panel-isi kolom-form">
        <div>
          <div style="display:flex;justify-content:space-between;margin-bottom:6px" class="kecil"><span>{{ job.pencarian_selesai }} dari {{ job.total_pencarian }} pencarian</span><span class="redup">{{ job.request_dipakai }} jatah terpakai</span></div>
          <div class="progres"><span :style="{width: progres + '%'}"></span></div>
        </div>
        <div class="statgrid">
          <div><div class="nilai" style="color:var(--sungai)">{{ job.disimpan }}</div><div class="ket">Lead baru disimpan</div></div>
          <div><div class="nilai">{{ job.ditemukan }}</div><div class="ket">Usaha ditemukan</div></div>
          <div><div class="nilai">{{ job.lewat_website }}</div><div class="ket">Dilewati: sudah punya website</div></div>
          <div><div class="nilai">{{ job.lewat_telepon }}</div><div class="ket">Dilewati: tanpa telepon</div></div>
          <div><div class="nilai">{{ job.lewat_tutup }}</div><div class="ket">Dilewati: sudah tutup</div></div>
          <div><div class="nilai">{{ job.duplikat + job.lewat_luar }}</div><div class="ket">Duplikat atau di luar wilayah</div></div>
        </div>
        <div v-if="job.pesan_error" :class="job.status === 'gagal' ? 'galat' : 'peringatan'">{{ job.pesan_error }}</div>
        <div class="log" ref="log">{{ job.log }}</div>
        <div v-if="!berjalan && job.disimpan"><a class="btn btn-utama" href="#/leads">Lihat {{ job.disimpan }} lead baru</a></div>
      </div>
    </section>

    <div class="grid-cari">
      <div class="panel">
        <div class="langkah">
          <span class="langkah-no">1</span>
          <div>
            <h2>Wilayah</h2>
            <p>Default-nya wilayah fokus Anda. Untuk kota besar, centang "per kecamatan" supaya hasilnya lebih banyak.</p>
            <div class="baris-form" style="margin-bottom:12px">
              <div><label class="label" for="c-prov">Provinsi</label>
                <select id="c-prov" class="select" v-model="provinsi"><option v-for="p in store.meta.provinsi" :value="p.kode">{{ p.nama }}{{ p.kode === store.meta.fokus?.kode ? ' (fokus)' : '' }}</option></select>
              </div>
            </div>
            <div style="display:flex;gap:14px;align-items:center;margin-bottom:6px;flex-wrap:wrap">
              <label class="toggle"><input type="checkbox" :checked="kab.length && kab.length===kabList.length" @change="semuaKab($event.target.checked)"> Pilih semua kab/kota</label>
              <label class="toggle"><input type="checkbox" v-model="perKecamatan"> Cari per kecamatan</label>
            </div>
            <div class="cek-grid">
              <label v-for="k in kabList" class="cek"><input type="checkbox" :value="k.kode" v-model="kab"> {{ k.nama }}</label>
            </div>
            <div v-if="perKecamatan && kab.length" style="margin-top:14px">
              <span class="label">Kecamatan <span class="redup" style="font-weight:500">(kosongkan untuk semua {{ kecList.length }} kecamatan)</span></span>
              <div class="cek-grid" style="max-height:220px;overflow:auto;border:1px solid var(--garis);border-radius:var(--radius-s);padding:6px">
                <label v-for="k in kecList" class="cek"><input type="checkbox" :value="k.kode" v-model="kec"> {{ k.nama }}</label>
              </div>
            </div>
            <div style="margin-top:14px">
              <label class="label" for="c-lok">Lokasi bebas <span class="redup" style="font-weight:500">(opsional, pisahkan dengan koma)</span></label>
              <input id="c-lok" class="input" v-model="lokasiBebas" placeholder="Contoh: Palangka Raya, Samarinda">
              <div class="bantuan">Lokasi bebas memakai jatah kuota "luar wilayah fokus".</div>
            </div>
          </div>
        </div>
        <div class="langkah">
          <span class="langkah-no">2</span>
          <div>
            <h2>Jenis usaha</h2>
            <p>Setiap jenis usaha dicari terpisah di setiap wilayah.</p>
            <div v-for="g in grup" style="margin-bottom:16px">
              <div style="display:flex;gap:10px;align-items:baseline;margin-bottom:8px;flex-wrap:wrap">
                <span class="tebal">{{ g.nama }}</span><span class="redup kecil">{{ g.ket }}</span>
                <button class="btn btn-hantu btn-kecil" style="margin-left:auto" @click="togGrup(g.kode)">Pilih semua</button>
              </div>
              <div class="chips">
                <button v-for="k in kategoriPerGrup[g.kode]" class="chip" :class="{on: kategori.includes(k.id)}" @click="togKat(k.id)" :aria-pressed="kategori.includes(k.id)">{{ k.nama }}</button>
              </div>
            </div>
            <label class="label" for="c-kw">Kata kunci sendiri <span class="redup" style="font-weight:500">(opsional, pisahkan dengan koma)</span></label>
            <input id="c-kw" class="input" v-model="kataKunci" placeholder="Contoh: toko kue, jasa sedot WC">
          </div>
        </div>
        <div class="langkah">
          <span class="langkah-no">3</span>
          <div>
            <h2>Kedalaman pencarian</h2>
            <p>Satu halaman berisi hingga 20 usaha dan memakai 1 jatah pencarian (di Apify dihitung per usaha). Halaman berikutnya biasanya berisi usaha yang lebih kecil.</p>
            <div class="segmen">
              <button v-for="n in [1,2,3]" :class="{on: maksHalaman===n}" @click="maksHalaman=n">{{ n }} halaman ({{ n*20 }} usaha)</button>
            </div>
          </div>
        </div>
      </div>

      <aside class="ringkas tumpuk">
        <section class="panel">
          <div class="panel-isi kolom-form">
            <div>
              <div class="redup kecil">Perkiraan pemakaian</div>
              <div class="besar">{{ est ? est.maks_request : 0 }} <span style="font-size:15px;font-weight:600" class="redup">{{ est ? est.kuota.satuan : 'pencarian' }} maks.</span></div>
              <div class="kecil redup" style="margin-top:4px">{{ est ? est.pencarian : 0 }} kombinasi jenis usaha × wilayah, lewat {{ est ? est.kuota.label : '' }}</div>
            </div>
            <div v-if="est">
              <div class="kecil" style="display:flex;justify-content:space-between;margin-bottom:6px"><span>Sisa jatah bulan ini</span><b>{{ sisa }} {{ est.kuota.satuan }}</b></div>
              <div class="progres"><span :style="{width: Math.min(100, est.kuota.dipakai / Math.max(1, est.kuota.batas_bulanan) * 100) + '%'}"></span></div>
              <div v-if="est.kuota.batas_harian" class="bantuan">Hari ini sudah {{ est.kuota.hari_ini }} dari batas {{ est.kuota.batas_harian }} {{ est.kuota.satuan }}.</div>
            </div>
            <div v-if="est && est.maks_request > sisa" class="peringatan">Perkiraan melebihi sisa jatah. Pencarian akan berhenti otomatis saat rem kuota tercapai, tanpa tagihan.</div>
            <div v-else-if="est && est.kuota.batas_harian && est.maks_request > est.kuota.batas_harian - est.kuota.hari_ini" class="peringatan">Melebihi batas harian. Sebagian akan berhenti hari ini dan bisa dilanjutkan besok.</div>
            <button class="btn btn-utama" style="padding:11px" :disabled="!adaKey || !est || !est.pencarian || berjalan || memulai" @click="mulai">
              <Ikon n="cari"/> {{ berjalan ? 'Sedang berjalan…' : 'Mulai cari lead' }}
            </button>
          </div>
        </section>
        <section class="panel">
          <div class="panel-kepala"><h3>Riwayat pencarian</h3></div>
          <div class="panel-isi" style="padding-top:8px">
            <ul class="garis-waktu" v-if="riwayat.length">
              <li v-for="r in riwayat.slice(0,8)"><div><div class="kecil tebal">{{ r.ringkasan }}</div><div class="kecil redup">{{ waktu(r.dibuat) }}: {{ labelStatus(r.status) }}, {{ r.disimpan }} lead baru, {{ r.request_dipakai }} jatah terpakai</div></div></li>
            </ul>
            <p v-else class="redup kecil" style="margin:0">Belum pernah mencari.</p>
          </div>
        </section>
      </aside>
    </div>
  </div>`,
};
