import { api } from '../api.js';
import { LeadDrawer } from '../components.js';
import { store } from '../store.js';
import { FOLLOWUP_LABEL, STATUS_LABEL, jamIdeal, kotaPendek, relatifHari, selisihHari, tanggal } from '../util.js';

export default {
  components: { LeadDrawer },
  data() { return { d: null, dipilih: null, sekarang: new Date() }; },
  computed: {
    store: () => store,
    batas() { return store.meta.pengaturan.batas_wa_harian; },
    sisaWa() { return Math.max(0, this.batas - store.waHariIni); },
  },
  async created() {
    await this.muat();
    this.jam = setInterval(() => { this.sekarang = new Date(); }, 60000);
  },
  beforeUnmount() { clearInterval(this.jam); },
  methods: {
    async muat() {
      this.d = await api.get(`/followup?scope=${store.scope}`);
      store.followupCount = this.d.jatuh_tempo.length;
    },
    kirim(l) { store.waModal = { lead: l, onDone: () => this.muat() }; },
    async tidakMerespons(l) {
      await api.patch(`/leads/${l.id}`, { status: 'tidak_merespons' });
      store.toast(`${l.nama} ditandai tidak merespons dan tidak akan muncul lagi di sini.`);
      this.muat();
    },
    async ganti(s) { store.setScope(s); await this.muat(); },
    langkah(l) {
      if (['membalas', 'tertarik'].includes(l.status)) return 'Kirim penawaran paket';
      return FOLLOWUP_LABEL[Math.min(3, (l.tahap_followup || 0) + 1)];
    },
    jamIdeal(l) { return jamIdeal(l.jam_kirim, this.sekarang); },
    STATUS_LABEL: (s) => STATUS_LABEL[s], kotaPendek, relatifHari, selisihHari, tanggal,
  },
  template: `
  <div class="halaman" v-if="d">
    <div class="kepala">
      <div>
        <h1>Follow-up hari ini</h1>
        <p>Polanya: hari ke-1 pesan pembuka, hari ke-3 kirim contoh website, hari ke-7 follow-up terakhir, lalu berhenti. Tanggalnya diatur otomatis setiap kali Anda mengirim pesan.</p>
      </div>
      <div class="segmen" role="group" aria-label="Cakupan wilayah">
        <button :class="{on: store.scope==='fokus'}" @click="ganti('fokus')">Fokus: {{ store.fokusNama }}</button>
        <button :class="{on: store.scope==='semua'}" @click="ganti('semua')">Semua wilayah</button>
      </div>
    </div>

    <div class="strip" style="margin-bottom:18px">
      <div><div class="nilai" :class="{sorot: d.jatuh_tempo.length}">{{ d.jatuh_tempo.length }}</div><div class="ket">Jatuh tempo hari ini</div></div>
      <div><div class="nilai">{{ d.mendatang.length }}</div><div class="ket">Dalam 7 hari ke depan</div></div>
      <div><div class="nilai">{{ sisaWa }}</div><div class="ket">Sisa jatah WA aman hari ini (dari {{ batas }})</div></div>
    </div>

    <section class="panel" style="margin-bottom:18px">
      <div class="panel-kepala"><h2>Perlu dihubungi sekarang</h2></div>
      <div class="tabel-wrap" v-if="d.jatuh_tempo.length">
        <table class="tabel">
          <thead><tr><th>Skor</th><th>Usaha</th><th>Status</th><th>Langkah berikutnya</th><th>Jatuh tempo</th><th>Jam kirim</th><th class="num">Aksi</th></tr></thead>
          <tbody>
            <tr v-for="l in d.jatuh_tempo" class="klik" @click="dipilih=l.id">
              <td><SkorBadge :skor="l.skor"/></td>
              <td><div class="nama">{{ l.nama }}</div><div class="sub">{{ l.kategori_nama || l.kategori_google }}, {{ kotaPendek(l.kota_nama) }}</div></td>
              <td><StatusPill :status="l.status"/></td>
              <td class="tebal kecil">{{ langkah(l) }}</td>
              <td class="kecil" :class="selisihHari(l.followup_berikutnya) < 0 ? 'lewat' : ''">{{ relatifHari(l.followup_berikutnya) }}</td>
              <td><span class="jam-ideal" :class="jamIdeal(l).ok ? 'ok' : 'tunggu'">{{ jamIdeal(l).ok ? 'Sekarang' : jamIdeal(l).teks.replace('Lebih baik kirim ', '') }}</span></td>
              <td class="num" @click.stop><button class="btn btn-kecil" :class="l.wa_nomor ? 'btn-wa' : ''" @click="kirim(l)"><Ikon :n="l.wa_nomor ? 'wa' : 'telepon'"/> {{ l.wa_nomor ? 'Kirim' : 'Telepon' }}</button></td>
            </tr>
          </tbody>
        </table>
      </div>
      <Kosong v-else judul="Semua follow-up hari ini sudah beres" teks="Waktunya menyapa lead baru. Daftar saran ada di bawah."/>
    </section>

    <div class="dua-kolom">
      <section class="panel">
        <div class="panel-kepala"><h2>Saran lead baru untuk disapa</h2><span class="redup kecil">skor tertinggi, punya WA</span></div>
        <div class="tabel-wrap" v-if="d.belum_dihubungi.length">
          <table class="tabel"><tbody>
            <tr v-for="l in d.belum_dihubungi" class="klik" @click="dipilih=l.id">
              <td style="width:50px"><SkorBadge :skor="l.skor"/></td>
              <td><div class="nama">{{ l.nama }}</div><div class="sub">{{ l.kategori_nama || l.kategori_google }}, {{ kotaPendek(l.kota_nama) }}</div></td>
              <td class="num" @click.stop><button class="btn btn-wa btn-kecil" @click="kirim(l)"><Ikon n="wa"/> Sapa</button></td>
            </tr>
          </tbody></table>
        </div>
        <p v-else class="redup kecil" style="padding:16px 18px;margin:0">Tidak ada lead baru yang punya WhatsApp.</p>
      </section>

      <div class="tumpuk">
        <section class="panel">
          <div class="panel-kepala"><h2>7 hari ke depan</h2></div>
          <div class="panel-isi">
            <ul class="garis-waktu" v-if="d.mendatang.length">
              <li v-for="l in d.mendatang"><div><a href="javascript:void 0" class="tebal" @click="dipilih=l.id">{{ l.nama }}</a><div class="kecil redup">{{ tanggal(l.followup_berikutnya, {weekday:'long', day:'numeric', month:'short'}) }}: {{ langkah(l) }}</div></div></li>
            </ul>
            <p v-else class="redup kecil" style="margin:0">Belum ada jadwal.</p>
          </div>
        </section>
        <section class="panel" v-if="d.selesai_tanpa_balasan.length">
          <div class="panel-kepala"><h2>Sudah 3 kali tanpa balasan</h2></div>
          <div class="panel-isi">
            <p class="kecil redup" style="margin-top:0">Hormati mereka dengan berhenti menghubungi. Tandai supaya tidak muncul lagi.</p>
            <ul class="garis-waktu">
              <li v-for="l in d.selesai_tanpa_balasan"><div style="display:flex;justify-content:space-between;gap:10px;align-items:center"><span class="tebal kecil">{{ l.nama }}</span><button class="btn btn-kecil" @click="tidakMerespons(l)">Tandai tidak merespons</button></div></li>
            </ul>
          </div>
        </section>
      </div>
    </div>

    <LeadDrawer v-if="dipilih" :lead-id="dipilih" @close="dipilih=null" @changed="muat"/>
  </div>`,
};
