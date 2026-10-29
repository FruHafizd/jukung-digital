import { api } from '../api.js';
import { store } from '../store.js';
import { rupiah } from '../util.js';

const SUMBER = [
  { kode: 'serpapi', kunci: 'serpapi_key', nama: 'SerpApi', ket: 'Disarankan. Gratis sekitar 250 pencarian per bulan (±5.000 usaha), daftar cukup pakai email, tanpa kartu kredit.' },
  { kode: 'apify', kunci: 'apify_token', nama: 'Apify', ket: 'Cadangan. Kredit gratis $5 per bulan (±1.000 usaha), tanpa kartu kredit.' },
  { kode: 'google', kunci: 'api_key', nama: 'Google Places API', ket: 'Resmi dari Google. Untuk akun Indonesia perlu deposit minimal Rp500.000 dulu.' },
];

export default {
  data() {
    return {
      s: null, kunciBaru: { serpapi_key: '', apify_token: '', api_key: '' }, tes: {}, menguji: '',
      panduan: 'serpapi', backup: null, memproses: false,
    };
  },
  computed: {
    store: () => store,
    daftarSumber: () => SUMBER,
  },
  async created() {
    this.s = await api.get('/pengaturan');
    this.panduan = this.s.sumber_data;
  },
  methods: {
    async muatUlangMeta() { store.meta = await api.get('/meta'); },
    async kirim(body, pesan = 'Pengaturan disimpan') {
      try {
        this.s = await api.put('/pengaturan', body);
        await this.muatUlangMeta();
        if (pesan) store.toast(pesan);
      } catch (e) { store.toast(e.message, true); }
    },
    simpan(keys) {
      const body = {};
      keys.forEach((k) => { body[k] = this.s[k]; });
      this.kirim(body);
    },
    async simpanKunci(nama) {
      const v = this.kunciBaru[nama].trim();
      if (!v) return;
      await this.kirim({ [nama]: v }, 'Kunci disimpan');
      this.kunciBaru[nama] = '';
    },
    async uji(src) {
      if (this.kunciBaru[src.kunci].trim()) await this.simpanKunci(src.kunci);
      this.menguji = src.kode;
      this.tes[src.kode] = null;
      try {
        this.tes[src.kode] = { ok: true, pesan: (await api.post(`/pengaturan/tes/${src.kode}`)).pesan };
      } catch (e) {
        this.tes[src.kode] = { ok: false, pesan: e.message };
      }
      this.menguji = '';
    },
    async hapusKunci(src) {
      if (!confirm(`Hapus kunci ${src.nama} dari aplikasi ini?`)) return;
      this.s = await api.post(`/pengaturan/hapus-kunci/${src.kunci}`);
      await this.muatUlangMeta();
    },
    pilih(kode) { this.s.sumber_data = kode; this.kirim({ sumber_data: kode }, `Sumber data utama: ${SUMBER.find((x) => x.kode === kode).nama}`); },
    togCadangan(e) { this.kirim({ cadangan_apify: e.target.checked ? '1' : '0' }); },
    async buatBackup() {
      this.memproses = true;
      try { this.backup = await api.post('/backup'); store.toast('Backup selesai'); } catch (e) { store.toast(e.message, true); }
      this.memproses = false;
    },
    async isiDemo() {
      const r = await api.post('/demo');
      await this.muatUlangMeta();
      store.toast(r.dibuat ? `${r.dibuat} lead contoh ditambahkan. Coba buka Daftar lead.` : 'Data contoh sudah ada.');
    },
    async hapusDemo() {
      if (!confirm('Hapus semua lead dan proyek bertanda [CONTOH]?')) return;
      await api.del('/demo');
      await this.muatUlangMeta();
      store.toast('Data contoh dihapus');
    },
    rupiah,
  },
  template: `
  <div class="halaman" v-if="s">
    <div class="kepala"><div><h1>Pengaturan</h1><p>Profil Anda, sumber data Google Maps, rem kuota, dan data.</p></div></div>

    <div class="dua-kolom">
      <div class="tumpuk">
        <section class="panel">
          <div class="panel-kepala"><h2>Profil Anda</h2></div>
          <form class="panel-isi kolom-form" @submit.prevent="simpan(['nama_anda','brand','link_portofolio'])">
            <div><label class="label" for="p-nama">Nama Anda</label><input id="p-nama" class="input" v-model="s.nama_anda" placeholder="Nama yang muncul di pesan WhatsApp"></div>
            <div><label class="label" for="p-brand">Nama brand</label><input id="p-brand" class="input" v-model="s.brand"></div>
            <div><label class="label" for="p-porto">Link portofolio (opsional)</label><input id="p-porto" class="input" v-model="s.link_portofolio" placeholder="https://…"></div>
            <div><button class="btn btn-utama">Simpan profil</button></div>
          </form>
        </section>

        <section class="panel">
          <div class="panel-kepala"><h2>Sumber data Google Maps</h2></div>
          <div class="panel-isi kolom-form" style="gap:0;padding-top:4px;padding-bottom:4px">
            <div v-for="src in daftarSumber" :key="src.kode" style="padding:14px 0;border-bottom:1px solid var(--garis)" class="kolom-form">
              <div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start">
                <label class="cek" style="padding:0;align-items:flex-start">
                  <input type="radio" name="sumber" :checked="s.sumber_data===src.kode" @change="pilih(src.kode)" style="margin-top:3px">
                  <span><b>{{ src.nama }}</b><span v-if="s.sumber_data===src.kode" class="tag" style="margin-left:8px">Sumber utama</span><br><span class="kecil redup">{{ src.ket }}</span></span>
                </label>
                <span class="kecil" style="white-space:nowrap" :style="s['ada_' + src.kunci] ? 'color:var(--hijau)' : 'color:var(--tinta-3)'">{{ s['ada_' + src.kunci] ? 'Kunci tersimpan' : 'Belum diisi' }}</span>
              </div>
              <form style="display:flex;gap:8px;flex-wrap:wrap" @submit.prevent="simpanKunci(src.kunci)">
                <input class="input" style="flex:1;min-width:200px" type="password" autocomplete="off" v-model="kunciBaru[src.kunci]"
                       :aria-label="'Kunci ' + src.nama" :placeholder="s['ada_' + src.kunci] ? 'Tersimpan: ' + s[src.kunci] + ' (isi untuk mengganti)' : 'Tempel kunci ' + src.nama">
                <button class="btn btn-utama" :disabled="!kunciBaru[src.kunci].trim()">Simpan</button>
                <button type="button" class="btn" :disabled="menguji===src.kode || (!s['ada_' + src.kunci] && !kunciBaru[src.kunci].trim())" @click="uji(src)">{{ menguji===src.kode ? 'Menguji…' : 'Tes' }}</button>
                <button v-if="s['ada_' + src.kunci]" type="button" class="btn btn-hantu btn-ikon btn-bahaya" @click="hapusKunci(src)" :aria-label="'Hapus kunci ' + src.nama"><Ikon n="hapus"/></button>
              </form>
              <div v-if="tes[src.kode]" :class="tes[src.kode].ok ? 'info' : 'galat'">{{ tes[src.kode].pesan }}</div>
            </div>
            <label class="toggle" style="padding:14px 0">
              <input type="checkbox" :checked="s.cadangan_apify==='1'" @change="togCadangan">
              Pakai Apify otomatis kalau jatah SerpApi bulan ini habis
            </label>
          </div>
        </section>

        <section class="panel">
          <div class="panel-kepala"><h2>Rem kuota</h2></div>
          <form class="panel-isi kolom-form" @submit.prevent="simpan(['batas_bulanan_serpapi','batas_bulanan_apify','batas_bulanan','batas_harian_api','alokasi_fokus_persen'])">
            <p class="kecil redup" style="margin:0">Aplikasi berhenti sendiri saat batas ini tercapai. SerpApi dan Apify tidak terhubung ke kartu, jadi kalau jatah gratisnya habis, pencarian hanya berhenti tanpa tagihan.</p>
            <div class="baris-form">
              <div><label class="label" for="r-serp">SerpApi per bulan</label><input id="r-serp" class="input" type="number" min="0" v-model="s.batas_bulanan_serpapi"><div class="bantuan">pencarian; terpakai {{ s.kuota.serpapi.dipakai }}</div></div>
              <div><label class="label" for="r-apify">Apify per bulan</label><input id="r-apify" class="input" type="number" min="0" v-model="s.batas_bulanan_apify"><div class="bantuan">tempat; terpakai {{ s.kuota.apify.dipakai }}</div></div>
            </div>
            <div class="baris-form">
              <div><label class="label" for="r-g">Google per bulan</label><input id="r-g" class="input" type="number" min="0" v-model="s.batas_bulanan"><div class="bantuan">request; terpakai {{ s.kuota.google.dipakai }}</div></div>
              <div><label class="label" for="r-gh">Google per hari</label><input id="r-gh" class="input" type="number" min="0" v-model="s.batas_harian_api"><div class="bantuan">request</div></div>
            </div>
            <div><label class="label" for="p-alok">Jatah untuk wilayah fokus: {{ s.alokasi_fokus_persen }}%</label><input id="p-alok" type="range" min="50" max="100" step="5" v-model="s.alokasi_fokus_persen" style="width:100%;accent-color:var(--sungai)"><div class="bantuan">Sisanya ({{ 100 - s.alokasi_fokus_persen }}%) untuk pencarian di luar wilayah fokus.</div></div>
            <div><button class="btn btn-utama">Simpan rem kuota</button></div>
          </form>
        </section>

        <section class="panel">
          <div class="panel-kepala"><h2>Wilayah & kebiasaan kerja</h2></div>
          <form class="panel-isi kolom-form" @submit.prevent="simpan(['fokus_provinsi','batas_wa_harian','biaya_perpanjangan'])">
            <div><label class="label" for="p-fokus">Wilayah fokus</label><select id="p-fokus" class="select" v-model="s.fokus_provinsi"><option v-for="p in store.meta.provinsi" :value="p.kode">{{ p.nama }}</option></select></div>
            <div class="baris-form">
              <div><label class="label" for="p-wa">Batas aman WA per hari</label><input id="p-wa" class="input" type="number" min="1" v-model="s.batas_wa_harian"><div class="bantuan">Disarankan 20–30 supaya nomor tidak diblokir.</div></div>
              <div><label class="label" for="p-pj">Biaya perpanjangan default (Rp)</label><input id="p-pj" class="input" type="number" step="1000" v-model="s.biaya_perpanjangan"></div>
            </div>
            <div><button class="btn btn-utama">Simpan</button></div>
          </form>
        </section>

        <section class="panel">
          <div class="panel-kepala"><h2>Data</h2></div>
          <div class="panel-isi kolom-form">
            <div>
              <div class="tebal">Backup database</div>
              <p class="kecil redup" style="margin:2px 0 8px">Menyimpan salinan seluruh data ke folder <code>backups</code> di folder aplikasi. Lakukan seminggu sekali.</p>
              <button class="btn" :disabled="memproses" @click="buatBackup"><Ikon n="unduh"/> {{ memproses ? 'Membuat backup…' : 'Buat backup sekarang' }}</button>
              <div v-if="backup" class="info" style="margin-top:8px">Tersimpan di {{ backup.file }} ({{ backup.ukuran_kb }} KB)</div>
            </div>
            <div>
              <div class="tebal">Data contoh</div>
              <p class="kecil redup" style="margin:2px 0 8px">20 lead dan 1 proyek bertanda [CONTOH] untuk mencoba aplikasi. Nomornya fiktif, jangan dikirimi pesan.</p>
              <div style="display:flex;gap:8px"><button class="btn" @click="isiDemo" :disabled="store.meta.ada_demo">Isi data contoh</button><button class="btn btn-bahaya" @click="hapusDemo" :disabled="!store.meta.ada_demo">Hapus data contoh</button></div>
            </div>
          </div>
        </section>
      </div>

      <section class="panel">
        <div class="panel-kepala"><h2>Panduan mendapatkan kunci</h2>
          <div class="segmen" role="tablist">
            <button v-for="src in daftarSumber" :class="{on: panduan===src.kode}" @click="panduan=src.kode">{{ src.nama.replace(' Places API', '') }}</button>
          </div>
        </div>
        <div class="panel-isi">
          <ol class="panduan" v-if="panduan==='serpapi'">
            <li><div><b>Daftar akun</b><p>Buka <a href="https://serpapi.com/users/sign_up" target="_blank" rel="noopener">serpapi.com/users/sign_up</a>. Daftar dengan email atau akun Google. Tidak perlu kartu kredit.</p></div></li>
            <li><div><b>Verifikasi</b><p>Klik tautan verifikasi di email. Kalau diminta, verifikasi juga nomor HP Anda.</p></div></li>
            <li><div><b>Pilih paket Free</b><p>Kalau ditanya paket, pilih yang gratis (Free Plan). Jangan pilih paket berbayar.</p></div></li>
            <li><div><b>Salin API key</b><p>Buka <a href="https://serpapi.com/manage-api-key" target="_blank" rel="noopener">serpapi.com/manage-api-key</a>, lalu salin "Your Private API Key".</p></div></li>
            <li><div><b>Tempel di sini</b><p>Tempel di baris SerpApi, klik Simpan, lalu Tes. Hasil tes menampilkan sisa jatah pencarian bulan ini, dan pengecekan ini tidak memotong jatah.</p></div></li>
          </ol>
          <ol class="panduan" v-else-if="panduan==='apify'">
            <li><div><b>Daftar akun</b><p>Buka <a href="https://console.apify.com/sign-up" target="_blank" rel="noopener">console.apify.com/sign-up</a>. Daftar dengan email, Google, atau GitHub. Paket Free langsung aktif tanpa kartu kredit.</p></div></li>
            <li><div><b>Salin token</b><p>Buka <a href="https://console.apify.com/settings/integrations" target="_blank" rel="noopener">Settings, lalu API & Integrations</a>, dan salin "Personal API token".</p></div></li>
            <li><div><b>Tempel di sini</b><p>Tempel di baris Apify, klik Simpan, lalu Tes. Hasil tes menampilkan kredit yang sudah terpakai bulan ini.</p></div></li>
            <li><div><b>Cara kerjanya</b><p>Apify membayar per tempat yang diambil, kira-kira $4–5 per 1.000 tempat dari kredit gratis $5. Kalau kreditnya habis, pencarian berhenti dengan sendirinya.</p></div></li>
          </ol>
          <ol class="panduan" v-else>
            <li><div><b>Perlu deposit untuk akun Indonesia</b><p>Google meminta pembayaran awal minimal Rp500.000 sebelum Places API aktif. Uang itu menjadi saldo, tidak hangus. Pakai sumber ini nanti setelah Anda punya pemasukan dari klien.</p></div></li>
            <li><div><b>Aktifkan Places API (New)</b><p>Di <a href="https://console.cloud.google.com" target="_blank" rel="noopener">console.cloud.google.com</a>, buka APIs & Services, lalu Library. Cari "Places API (New)" dan klik Enable.</p></div></li>
            <li><div><b>Buat API key dan kunci</b><p>Di Credentials, buat API key. Di bagian API restrictions, pilih Restrict key dan centang hanya Places API (New).</p></div></li>
            <li><div><b>Pasang rem kuota (wajib)</b><p>Buka Places API (New), tab Quotas. Cari "SearchTextRequest per day", hapus centang Unlimited, dan isi 30.</p></div></li>
            <li><div><b>Jangan klik Upgrade</b><p>Jangan pernah klik "Upgrade" atau "Activate full account" kecuali Anda memang siap membayar.</p></div></li>
          </ol>
        </div>
      </section>
    </div>
  </div>`,
};
