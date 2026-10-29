import { api } from '../api.js';
import { NoteEditor } from '../components.js';
import { store } from '../store.js';
import { TAHAP_PROYEK, hariIniISO, linkWa, namaBersih, relatifHari, rupiah, selisihHari, tanggal } from '../util.js';

const JENIS_BAYAR = { dp: 'DP', pelunasan: 'Pelunasan', perpanjangan: 'Perpanjangan domain', lainnya: 'Lainnya' };

export default {
  components: { NoteEditor },
  props: { route: Object },
  data() {
    return {
      p: null, fiturBaru: '', materiBaru: '', revisiBaru: '', catatanAktif: null,
      bayar: { jenis: 'dp', jumlah: '', tanggal: hariIniISO(), catatan: '' },
    };
  },
  computed: {
    id() { return Number(this.route.parts[1]); },
    store: () => store,
    tahapList: () => TAHAP_PROYEK,
    jenisBayar: () => JENIS_BAYAR,
    fitur() { return this.p.tugas.filter((t) => t.jenis === 'fitur'); },
    materi() { return this.p.tugas.filter((t) => t.jenis === 'materi'); },
    dibayar() { return this.p.pembayaran.filter((b) => b.jenis !== 'perpanjangan').reduce((a, b) => a + Number(b.jumlah), 0); },
    sisa() { return Math.max(0, Number(this.p.harga_deal) - this.dibayar); },
    revisiTerpakai() { return this.p.revisi.length; },
  },
  async created() { await this.muat(); },
  methods: {
    async muat() {
      this.p = await api.get(`/proyek/${this.id}`);
      if (!this.catatanAktif && this.p.catatan.length) this.catatanAktif = this.p.catatan[0];
    },
    async simpan(field, val) {
      try {
        const p = await api.patch(`/proyek/${this.id}`, { [field]: val });
        Object.assign(this.p, p);
        store.toast('Tersimpan');
      } catch (e) { store.toast(e.message, true); }
    },
    async tugas(t, selesai) { t.selesai = selesai ? 1 : 0; await api.patch(`/tugas/${t.id}`, { selesai: t.selesai }); },
    async tambahTugas(jenis) {
      const judul = jenis === 'fitur' ? this.fiturBaru : this.materiBaru;
      if (!judul.trim()) return;
      const t = await api.post(`/proyek/${this.id}/tugas`, { jenis, judul });
      this.p.tugas.push(t);
      if (jenis === 'fitur') this.fiturBaru = ''; else this.materiBaru = '';
    },
    async hapusTugas(t) { await api.del(`/tugas/${t.id}`); this.p.tugas = this.p.tugas.filter((x) => x.id !== t.id); },
    async tambahBayar() {
      if (!Number(this.bayar.jumlah)) return;
      this.p = await api.post(`/proyek/${this.id}/pembayaran`, { ...this.bayar, jumlah: Number(this.bayar.jumlah) });
      this.bayar.jumlah = ''; this.bayar.catatan = '';
      store.toast('Pembayaran dicatat');
    },
    async hapusBayar(b) {
      if (!confirm('Hapus catatan pembayaran ini?')) return;
      await api.del(`/pembayaran/${b.id}`);
      await this.muat();
    },
    isiSisa() { this.bayar.jenis = this.dibayar ? 'pelunasan' : 'dp'; this.bayar.jumlah = this.dibayar ? this.sisa : Math.round(this.p.harga_deal * 0.3); },
    async tambahRevisi() {
      if (!this.revisiBaru.trim()) return;
      this.p = await api.post(`/proyek/${this.id}/revisi`, { isi: this.revisiBaru });
      this.revisiBaru = '';
    },
    async revisiSelesai(r, v) { r.selesai = v ? 1 : 0; await api.patch(`/revisi/${r.id}`, { selesai: r.selesai }); },
    async hapusRevisi(r) { await api.del(`/revisi/${r.id}`); this.p.revisi = this.p.revisi.filter((x) => x.id !== r.id); },
    async catatanBaru() {
      const n = await api.post('/catatan', { proyek_id: this.id, judul: 'Catatan ' + tanggal(hariIniISO()), isi: '' });
      this.p.catatan.unshift(n);
      this.catatanAktif = n;
    },
    catatanTersimpan(n) {
      const i = this.p.catatan.findIndex((x) => x.id === n.id);
      if (i >= 0) this.p.catatan[i] = n;
      if (this.catatanAktif?.id === n.id) this.catatanAktif = n;
    },
    catatanTerhapus(id) { this.p.catatan = this.p.catatan.filter((x) => x.id !== id); this.catatanAktif = this.p.catatan[0] || null; },
    async hapusProyek() {
      if (!confirm(`Hapus proyek ${this.p.nama_klien} beserta to-do, pembayaran, dan catatannya?`)) return;
      await api.del(`/proyek/${this.id}`);
      location.hash = '#/proyek';
    },
    chatKlien() { window.open(linkWa(this.p.kontak_wa), '_blank', 'noopener'); },
    persen(a, b) { return b ? Math.round((a / b) * 100) : 0; },
    rupiah, tanggal, relatifHari, selisihHari, namaBersih,
  },
  template: `
  <div class="halaman" v-if="p">
    <a href="#/proyek" class="kecil" style="display:inline-flex;gap:4px;align-items:center;margin-bottom:10px;text-decoration:none"><Ikon n="kembali"/> Papan proyek</a>
    <div class="kepala">
      <div>
        <h1>{{ p.nama_klien }}</h1>
        <p>Paket {{ p.paket_nama || 'tanpa paket' }}, {{ rupiah(p.harga_deal) }}<template v-if="p.lead">. {{ p.lead.kota_nama }}</template></p>
      </div>
      <div class="kepala-aksi">
        <div class="segmen" role="group" aria-label="Tahap proyek">
          <button v-for="t in tahapList" :class="{on: p.tahap===t.kode}" @click="simpan('tahap', t.kode)">{{ t.nama }}</button>
        </div>
        <button v-if="p.kontak_wa" class="btn btn-wa" @click="chatKlien"><Ikon n="wa"/> Chat klien</button>
      </div>
    </div>

    <div class="grid-proyek">
      <div class="tumpuk">
        <section class="panel">
          <div class="panel-kepala"><h2>To-do fitur website</h2><span class="kecil redup">{{ fitur.filter(t=>t.selesai).length }} dari {{ fitur.length }} selesai</span></div>
          <div class="panel-isi">
            <div class="progres" style="margin-bottom:10px"><span :style="{width: persen(fitur.filter(t=>t.selesai).length, fitur.length) + '%'}"></span></div>
            <ul class="cekl">
              <li v-for="t in fitur" :class="{beres: t.selesai}"><input type="checkbox" :checked="!!t.selesai" @change="tugas(t, $event.target.checked)" :id="'t'+t.id"><label :for="'t'+t.id"><span>{{ t.judul }}</span></label><button class="btn btn-hantu btn-kecil btn-ikon hapus" @click="hapusTugas(t)" aria-label="Hapus"><Ikon n="hapus"/></button></li>
            </ul>
            <form class="tambah-baris" @submit.prevent="tambahTugas('fitur')"><input class="input" v-model="fiturBaru" placeholder="Tambah fitur, misalnya: halaman promo Ramadan"><button class="btn">Tambah</button></form>
          </div>
        </section>

        <section class="panel">
          <div class="panel-kepala"><h2>Materi dari klien</h2><span class="kecil redup">{{ materi.filter(t=>t.selesai).length }} dari {{ materi.length }} diterima</span></div>
          <div class="panel-isi">
            <ul class="cekl">
              <li v-for="t in materi" :class="{beres: t.selesai}"><input type="checkbox" :checked="!!t.selesai" @change="tugas(t, $event.target.checked)" :id="'t'+t.id"><label :for="'t'+t.id"><span>{{ t.judul }}</span></label><button class="btn btn-hantu btn-kecil btn-ikon hapus" @click="hapusTugas(t)" aria-label="Hapus"><Ikon n="hapus"/></button></li>
            </ul>
            <form class="tambah-baris" @submit.prevent="tambahTugas('materi')"><input class="input" v-model="materiBaru" placeholder="Tambah materi yang perlu diminta"><button class="btn">Tambah</button></form>
          </div>
        </section>

        <section class="panel">
          <div class="panel-kepala"><h2>Catatan & ringkasan</h2><button class="btn btn-kecil" @click="catatanBaru"><Ikon n="tambah"/> Catatan baru</button></div>
          <div class="panel-isi">
            <div class="chips" v-if="p.catatan.length > 1" style="margin-bottom:8px">
              <button v-for="n in p.catatan" class="chip" :class="{on: catatanAktif && catatanAktif.id===n.id}" @click="catatanAktif=n">{{ n.judul }}</button>
            </div>
            <NoteEditor v-if="catatanAktif" :note="catatanAktif" ringkas @saved="catatanTersimpan" @deleted="catatanTerhapus"/>
            <p v-else class="redup kecil" style="margin:0">Tulis hasil obrolan, permintaan khusus, atau warna kesukaan klien di sini.</p>
          </div>
        </section>
      </div>

      <div class="tumpuk">
        <section class="panel">
          <div class="panel-kepala"><h2>Pembayaran</h2></div>
          <div class="panel-isi">
            <div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap">
              <div><div class="redup kecil">Sudah dibayar</div><div class="uang-besar" style="color:var(--hijau)">{{ rupiah(dibayar) }}</div></div>
              <div style="text-align:right"><div class="redup kecil">Sisa tagihan</div><div class="uang-besar" :style="sisa ? 'color:var(--st-tertarik)' : ''">{{ sisa ? rupiah(sisa) : 'Lunas' }}</div></div>
            </div>
            <div class="progres" style="margin:10px 0 14px"><span :style="{width: persen(dibayar, p.harga_deal) + '%'}"></span></div>
            <ul class="garis-waktu" v-if="p.pembayaran.length" style="margin-bottom:14px">
              <li v-for="b in p.pembayaran"><div style="display:flex;justify-content:space-between;gap:8px"><span><b>{{ jenisBayar[b.jenis] }}</b> {{ rupiah(b.jumlah) }}<span class="redup kecil">, {{ tanggal(b.tanggal) }}{{ b.catatan ? ', ' + b.catatan : '' }}</span></span><button class="btn btn-hantu btn-kecil btn-ikon" @click="hapusBayar(b)" aria-label="Hapus pembayaran"><Ikon n="hapus"/></button></div></li>
            </ul>
            <form class="kolom-form" @submit.prevent="tambahBayar" style="gap:10px">
              <div class="baris-form" style="grid-template-columns:repeat(auto-fit,minmax(130px,1fr))">
                <select class="select" v-model="bayar.jenis" aria-label="Jenis pembayaran"><option v-for="(v,k) in jenisBayar" :value="k">{{ v }}</option></select>
                <input class="input" type="number" min="0" step="1000" v-model="bayar.jumlah" placeholder="Jumlah (Rp)" aria-label="Jumlah">
                <input class="input" type="date" v-model="bayar.tanggal" aria-label="Tanggal">
              </div>
              <div style="display:flex;gap:8px"><button type="button" class="btn btn-kecil" @click="isiSisa">{{ dibayar ? 'Isi sisa tagihan' : 'Isi DP 30%' }}</button><button class="btn btn-utama btn-kecil" style="margin-left:auto">Catat pembayaran</button></div>
            </form>
          </div>
        </section>

        <section class="panel">
          <div class="panel-kepala"><h2>Revisi</h2><span class="kecil" :class="revisiTerpakai > p.jatah_revisi ? 'lewat' : 'redup'">{{ revisiTerpakai }} dari {{ p.jatah_revisi }} jatah</span></div>
          <div class="panel-isi">
            <ul class="cekl" v-if="p.revisi.length">
              <li v-for="(r,i) in p.revisi" :class="{beres: r.selesai}"><input type="checkbox" :checked="!!r.selesai" @change="revisiSelesai(r, $event.target.checked)" :aria-label="'Revisi ' + (i+1) + ' selesai'"><span>{{ i+1 }}. {{ r.isi }}</span><button class="btn btn-hantu btn-kecil btn-ikon hapus" @click="hapusRevisi(r)" aria-label="Hapus"><Ikon n="hapus"/></button></li>
            </ul>
            <div v-if="revisiTerpakai >= p.jatah_revisi" class="peringatan" style="margin-top:8px">Jatah revisi gratis sudah habis. Revisi berikutnya bisa Anda kenakan biaya tambahan.</div>
            <form class="tambah-baris" @submit.prevent="tambahRevisi"><input class="input" v-model="revisiBaru" placeholder="Isi permintaan revisi"><button class="btn">Catat</button></form>
          </div>
        </section>

        <section class="panel">
          <div class="panel-kepala"><h2>Info & domain</h2></div>
          <div class="panel-isi kolom-form">
            <div class="baris-form">
              <div><label class="label" for="pd-dl">Target selesai</label><input id="pd-dl" class="input" type="date" :value="p.deadline" @change="simpan('deadline', $event.target.value)"></div>
              <div><label class="label" for="pd-harga">Harga deal (Rp)</label><input id="pd-harga" class="input" type="number" step="1000" :value="p.harga_deal" @change="simpan('harga_deal', Number($event.target.value))"></div>
            </div>
            <div><label class="label" for="pd-dom">Alamat website</label><input id="pd-dom" class="input" :value="p.domain" @change="simpan('domain', $event.target.value)" placeholder="contoh: laundrybersih.my.id"></div>
            <div class="baris-form">
              <div><label class="label" for="pd-on">Tanggal online</label><input id="pd-on" class="input" type="date" :value="p.tanggal_online" @change="simpan('tanggal_online', $event.target.value)"></div>
              <div><label class="label" for="pd-pj">Jatuh tempo perpanjangan</label><input id="pd-pj" class="input" type="date" :value="p.tanggal_perpanjangan" @change="simpan('tanggal_perpanjangan', $event.target.value)"></div>
            </div>
            <div class="baris-form">
              <div><label class="label" for="pd-bp">Biaya perpanjangan (Rp)</label><input id="pd-bp" class="input" type="number" step="1000" :value="p.biaya_perpanjangan" @change="simpan('biaya_perpanjangan', Number($event.target.value))"></div>
              <div><label class="label" for="pd-wa">Nomor WA klien</label><input id="pd-wa" class="input" :value="p.kontak_wa" @change="simpan('kontak_wa', $event.target.value)" placeholder="62812..."></div>
            </div>
            <p class="bantuan" style="margin:0">Saat proyek dipindah ke tahap Online, tanggal online dan perpanjangan (1 tahun) terisi otomatis. Simpan password hosting di password manager, bukan di sini.</p>
          </div>
        </section>
        <div><button class="btn btn-bahaya btn-kecil" @click="hapusProyek"><Ikon n="hapus"/> Hapus proyek</button></div>
      </div>
    </div>
  </div>`,
};
