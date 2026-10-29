import { api } from '../api.js';
import { store } from '../store.js';
import { rupiah, tanggal, waktu, relatifHari, selisihHari, TAHAP_PESAN, STATUS_LABEL } from '../util.js';

export default {
  data() { return { d: null }; },
  computed: {
    store: () => store,
    maksCorong() { return Math.max(1, this.d?.corong[0]?.n || 1); },
    kuotaPersen() { const k = this.d?.kuota; return k ? Math.min(100, k.dipakai / Math.max(1, k.batas_bulanan) * 100) : 0; },
    sapa() {
      const h = new Date().getHours();
      const s = h < 11 ? 'Selamat pagi' : h < 15 ? 'Selamat siang' : h < 18 ? 'Selamat sore' : 'Selamat malam';
      const n = store.meta?.pengaturan?.nama_anda;
      return n ? `${s}, ${n.split(' ')[0]}` : s;
    },
    kategoriTerbaik() {
      return (this.d?.per_kategori || []).filter((k) => k.dihubungi >= 1).slice(0, 8);
    },
  },
  async created() { await this.muat(); },
  methods: {
    async muat() { this.d = await api.get(`/dashboard?scope=${store.scope}`); },
    async ganti(s) { store.setScope(s); await this.muat(); },
    persen(a, b) { return b ? Math.round((a / b) * 100) : 0; },
    rate(k) { return k.dihubungi ? Math.round((k.deal / k.dihubungi) * 1000) / 10 : 0; },
    rupiah, tanggal, waktu, relatifHari, selisihHari,
    labelAktivitas(a) {
      if (a.jenis === 'status') return `Status diubah: ${STATUS_LABEL[a.tahap] || a.tahap}`;
      return `${a.jenis === 'wa' ? 'WhatsApp' : 'Telepon'}: ${TAHAP_PESAN[a.tahap] || a.tahap}`;
    },
  },
  template: `
  <div class="halaman" v-if="d">
    <div class="kepala">
      <div>
        <h1>{{ sapa }}</h1>
        <p v-if="d.kpi.followup">Ada <b>{{ d.kpi.followup }} lead</b> yang perlu di-follow-up hari ini. <a href="#/followup">Lihat daftarnya</a></p>
        <p v-else-if="d.kpi.total">Tidak ada follow-up yang jatuh tempo. Waktunya menghubungi lead baru.</p>
        <p v-else>Belum ada lead. Mulai dari halaman <a href="#/cari">Cari lead</a>, atau isi data contoh di Pengaturan untuk mencoba.</p>
      </div>
      <div class="segmen" role="group" aria-label="Cakupan wilayah">
        <button :class="{on: store.scope==='fokus'}" @click="ganti('fokus')">Fokus: {{ store.fokusNama }}</button>
        <button :class="{on: store.scope==='semua'}" @click="ganti('semua')">Semua wilayah</button>
      </div>
    </div>

    <div class="strip">
      <div><div class="nilai">{{ d.kpi.total.toLocaleString('id-ID') }}</div><div class="ket">Lead terkumpul</div></div>
      <div><div class="nilai">{{ d.kpi.belum.toLocaleString('id-ID') }}</div><div class="ket">Belum dihubungi</div></div>
      <div><div class="nilai" :class="{sorot: d.kpi.followup}">{{ d.kpi.followup }}</div><div class="ket">Follow-up hari ini</div></div>
      <div><div class="nilai">{{ d.kpi.deal }}</div><div class="ket">Deal</div></div>
      <div><div class="nilai">{{ d.kpi.proyek_aktif }}</div><div class="ket">Proyek berjalan</div></div>
      <div><div class="nilai sorot">{{ rupiah(d.kpi.pendapatan_bulan_ini) }}</div><div class="ket">Uang masuk bulan ini</div></div>
    </div>

    <div class="grid-dash">
      <div class="tumpuk">
        <section class="panel">
          <div class="panel-kepala"><h2>Perjalanan lead sampai deal</h2><span class="redup kecil">{{ store.scope === 'fokus' ? store.fokusNama : 'Semua wilayah' }}</span></div>
          <div class="panel-isi">
            <div class="corong" role="list">
              <div v-for="(c, i) in d.corong" class="corong-baris" role="listitem"
                   :title="c.tahap + ': ' + c.n + (i ? ' (' + persen(c.n, d.corong[i-1].n) + '% dari tahap sebelumnya)' : '')">
                <span class="corong-label">{{ c.tahap }}</span>
                <span class="corong-jalur"><span class="corong-air" :style="{width: (c.n / maksCorong * 100) + '%'}"></span></span>
                <span class="corong-angka">{{ c.n.toLocaleString('id-ID') }}<small v-if="i">{{ persen(c.n, d.corong[i-1].n) }}% lanjut</small></span>
              </div>
            </div>
          </div>
        </section>

        <section class="panel">
          <div class="panel-kepala"><h2>Jenis usaha yang paling mau menerima jasa Anda</h2></div>
          <div class="panel-isi rapat tabel-wrap">
            <table class="tabel" v-if="kategoriTerbaik.length">
              <thead><tr><th>Jenis usaha</th><th class="num">Lead</th><th class="num">Dihubungi</th><th class="num">Membalas</th><th class="num">Deal</th><th style="width:28%">Tingkat deal</th></tr></thead>
              <tbody>
                <tr v-for="k in kategoriTerbaik" :title="k.nama + ': ' + k.deal + ' deal dari ' + k.dihubungi + ' yang dihubungi'">
                  <td class="nama">{{ k.nama }}</td><td class="num">{{ k.total }}</td><td class="num">{{ k.dihubungi }}</td>
                  <td class="num">{{ k.membalas }}</td><td class="num">{{ k.deal }}</td>
                  <td><div style="display:flex;align-items:center;gap:10px"><div class="bar-mini" style="flex:1"><span :style="{width: Math.min(100, rate(k) * 2) + '%'}"></span></div><span class="angka kecil tebal" style="width:44px;text-align:right">{{ String(rate(k)).replace('.', ',') }}%</span></div></td>
                </tr>
              </tbody>
            </table>
            <p v-else class="redup kecil" style="padding:16px 18px;margin:0">Muncul setelah Anda mulai menghubungi lead. Dari sini Anda tahu jenis usaha mana yang paling layak dikejar.</p>
          </div>
        </section>

        <section class="panel">
          <div class="panel-kepala"><h2>Per {{ store.scope === 'fokus' ? 'kabupaten/kota' : 'provinsi' }}</h2></div>
          <div class="panel-isi rapat tabel-wrap">
            <table class="tabel" v-if="d.per_wilayah.length">
              <thead><tr><th>Wilayah</th><th class="num">Lead</th><th class="num">Dihubungi</th><th class="num">Membalas</th><th class="num">Deal</th><th class="num">Tingkat deal</th></tr></thead>
              <tbody><tr v-for="w in d.per_wilayah"><td class="nama">{{ w.nama }}</td><td class="num">{{ w.total }}</td><td class="num">{{ w.dihubungi }}</td><td class="num">{{ w.membalas }}</td><td class="num">{{ w.deal }}</td><td class="num">{{ String(rate(w)).replace('.', ',') }}%</td></tr></tbody>
            </table>
            <p v-else class="redup kecil" style="padding:16px 18px;margin:0">Belum ada data.</p>
          </div>
        </section>
      </div>

      <div class="tumpuk">
        <section class="panel">
          <div class="panel-kepala"><h2>Jatah {{ d.kuota.label }} bulan ini</h2><a class="kecil" href="#/pengaturan">Atur rem</a></div>
          <div class="panel-isi">
            <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:8px">
              <span><span class="uang-besar">{{ d.kuota.dipakai }}</span> <span class="redup">dari {{ d.kuota.batas_bulanan }} {{ d.kuota.satuan }}</span></span>
              <span v-if="d.kuota.batas_harian" class="kecil redup">hari ini {{ d.kuota.hari_ini }}/{{ d.kuota.batas_harian }}</span>
            </div>
            <div class="progres" :class="{kunyit: kuotaPersen > 80}"><span :style="{width: kuotaPersen + '%'}"></span></div>
            <p class="bantuan" style="margin-top:8px">Aplikasi berhenti sendiri sebelum melewati jatah gratis, jadi tidak ada tagihan.</p>
          </div>
        </section>

        <section class="panel">
          <div class="panel-kepala"><h2>Tenggat proyek</h2><a class="kecil" href="#/proyek">Papan proyek</a></div>
          <div class="panel-isi">
            <ul class="garis-waktu" v-if="d.tenggat.length">
              <li v-for="p in d.tenggat"><div><a :href="'#/proyek/' + p.id" class="tebal">{{ p.nama_klien }}</a><div class="kecil" :class="selisihHari(p.deadline) < 0 ? 'lewat' : 'redup'">Target {{ tanggal(p.deadline) }} ({{ relatifHari(p.deadline).toLowerCase() }})</div></div></li>
            </ul>
            <p v-else class="redup kecil" style="margin:0">Tidak ada proyek yang mendekati tenggat dalam 14 hari.</p>
          </div>
        </section>

        <section class="panel">
          <div class="panel-kepala"><h2>Perpanjangan domain</h2></div>
          <div class="panel-isi">
            <ul class="garis-waktu" v-if="d.perpanjangan.length">
              <li v-for="p in d.perpanjangan"><div><a :href="'#/proyek/' + p.id" class="tebal">{{ p.nama_klien }}</a><div class="kecil redup">{{ p.domain || 'domain belum dicatat' }}: {{ tanggal(p.tanggal_perpanjangan) }}, tagih {{ rupiah(p.biaya_perpanjangan) }}</div></div></li>
            </ul>
            <p v-else class="redup kecil" style="margin:0">Pengingat muncul 30 hari sebelum domain klien jatuh tempo. Ini pemasukan rutin Anda.</p>
          </div>
        </section>

        <section class="panel">
          <div class="panel-kepala"><h2>Aktivitas terakhir</h2></div>
          <div class="panel-isi">
            <ul class="garis-waktu" v-if="d.aktivitas.length">
              <li v-for="a in d.aktivitas" :class="a.jenis"><div><div class="tebal kecil">{{ a.nama }}</div><div class="kecil redup">{{ labelAktivitas(a) }}, {{ waktu(a.created_at) }}</div></div></li>
            </ul>
            <p v-else class="redup kecil" style="margin:0">Belum ada aktivitas.</p>
          </div>
        </section>
      </div>
    </div>
  </div>`,
};
