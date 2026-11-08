# Cetak Biru Implementasi Dashboard (Implementation Blueprint)

Status: **disetujui dan dilaksanakan**. Tahap data (M2b) selesai; implementasi UI belum dimulai.
Versi basis metrik: `definitions_version = mvp-4`.
Tanggal: 2026-10-14.

Keputusan peninjau yang sudah final: **Q1=B, Q2=A, Q3=B, Q4=B, Q5=A** (lihat §0.2).

Dokumen ini adalah satu-satunya acuan implementasi UI. Isinya keputusan eksplisit, asumsi,
batasan teknis, kriteria penerimaan, dan rencana pengujian. Tidak ada metrik bisnis baru yang
diciptakan di sini: semua angka berasal dari `data/processed/*.json` yang dihasilkan
`scripts/prepare_dashboard_data.py` dan tervalidasi terhadap
`docs/METRIC_DICTIONARY.md` §12.

---

## 0. Ringkasan keputusan

### 0.1 Keputusan peninjau (final)

| ID | Pertanyaan | Jawaban | Konsekuensi |
|---|---|---|---|
| Q1 | Cakupan filter | **B** — agregasi gabungan | `filter-cubes.json` (period × segmen / sales channel / status order). Filter global: periode, segmen, sales channel, status order |
| Q2 | Tombol ekspor | **Dibatalkan** — fitur ekspor CSV dihapus dari MVP | Tidak ada tombol ekspor di header; analisis lanjutan memakai berkas JSON di `public/data/` |
| Q3 | Tiga metrik tambahan | **B** — ditambahkan ke skrip Python | `time-dimensions.json`: kuartalan (+ per tahun), hari kerja/akhir pekan, rincian status kirim |
| Q4 | Profil pengguna | **B** — dihilangkan | Header: judul dashboard, pencarian, pemilih periode. Tidak ada identitas orang fiktif |
| Q5 | Tujuh metrik tambahan | **A** — semua rumus di Python | `dashboard-summary.derived` + `filter-cubes.json`; frontend tidak menghitung rumus bisnis. Pengecualian tunggal: margin keseluruhan untuk hasil filter dihitung `Σprofit ÷ Σnet_sales` (§3.1) karena semua kombinasi filter tidak mungkin disiapkan di Python |

Keputusan UI (Q4) berlaku pada milestone M3-M5. Keputusan Q2 (ekspor CSV) dibatalkan; fitur
dihapus dari MVP. Keputusan data (Q1, Q3, Q5) sudah
dilaksanakan: `scripts/prepare_dashboard_data.py` menulis 9 berkas, 84 OK / 0 FAIL.

### 0.2 Keputusan blueprint (tetap berlaku)

| ID | Keputusan | Pilihan |
|---|---|---|
| B1 | Cakupan filter | Filter global: periode, segmen, sales channel, status order (dari `filter-cubes.json`). Region dan marketing channel tetap kontrol panel anomali, bukan filter global karena tidak ada agregat revenue-nya |
| B2 | Halaman | Executive Overview, Sales & Profitability, Customer Intelligence, Transaction Explorer (agregat) |
| B3 | Pustaka grafik | **Direvisi (lihat §15.3)**: memakai `recharts` yang sudah terdaftar di `package.json`. Cetak biru awal memilih SVG buatan sendiri tanpa dependensi baru |
| B4 | Routing | Router internal tanpa dependensi (state + History API) |
| B5 | Sumber data | `fetch` 9 berkas JSON statis dari `public/data/`, tanpa backend |
| B6 | Agregasi subset | Jumlahkan baris kubus yang dipilih; margin dihitung ulang berbobot |
| B7 | Ukuran tidak aditif | `customers` dan `avg_transaction_margin_pct` tidak dijumlahkan/dirata-ratakan; hanya untuk satu sel atau subset utuh |
| B8 | Disiplin visual | Tanpa efek dekoratif berlebihan, tanpa emoji, tanpa animasi yang tidak menyampaikan data |

---

## 1. Batasan teknis dan batasan data (wajib dibaca sebelum desain)

1. **Tidak ada data tingkat order di dashboard.** `data/processed/*.json` hanya berisi agregat.
   Tidak ada pencarian nomor order, tidak ada tabel transaksi baris-per-baris, tidak ada
   paginasi data transaksi.
2. **Granularitas waktu terhalus adalah bulan.** Rentang 2021-01 s.d. 2025-12 = 60 titik.
   *Date picker* tingkat tanggal tidak dapat dipenuhi dari data ini.
3. **Tidak ada data produk.** Keputusan D5 mengecualikan `order_items`.
4. **Tidak ada data target/anggaran.** Karena itu tidak ada *progress bar* "pencapaian".
   *Progress bar* hanya boleh berarti "porsi dari total" (mis. porsi profit segmen).
5. **Tidak ada data pengguna dan tidak ada profil di header** (keputusan Q4=B). Header berisi
   judul dashboard, pencarian, dan pemilih periode.
6. **Tidak ada data pemasaran/biaya akuisisi per channel.** ROMI, CAC, ROI tidak dihitung.
7. **CLV dilarang ditampilkan** (`customer_lifetime_value` tidak tervalidasi).
8. **Status pesanan yang tersedia hanya 4**: Completed, Pending, Returned, Cancelled.
   Label "In Progress"/"On Hold" tidak ada di dataset dan tidak boleh dipakai.
9. **Mata uang USD apa adanya.** Tidak ada konversi ke IDR.
10. **Dua basis margin selalu ada.** Metrik utama = margin keseluruhan. Rata-rata margin transaksi
    selalu berlabel dan hanya sebagai pembanding.
11. **Profit diakui untuk semua status pesanan** (D6). Catatan wajib muncul di setiap tempat
    profit per status ditampilkan.
12. **Angka simulasi potensi bukan target.** Setiap angka opportunity gap wajib disertai
    daftar asumsi dan kata "simulasi potensi".
13. **Filter global hanya untuk 4 dimensi** (periode, segmen, sales channel, status order).
    Filter pada satu dimensi **tidak** dipadukan dengan dimensi lain pada panel yang tidak
   punya kubus (mis. memilih segmen VIP tidak mengubah tabel bracket diskon). Panel seperti itu
   diberi badge "Seluruh periode / semua segmen".
14. **`customers` dan `avg_transaction_margin_pct` bukan ukuran aditif.** Jangan dijumlahkan
    atau dirata-ratakan saat filter aktif menggabungkan beberapa bulan.

---

## 2. Peta halaman (page map) dan navigasi

### 2.1 Navigasi utama (sidebar, biru tua/navy)

| # | Label navigasi | Rute | Tujuan |
|---|---|---|---|
| 1 | Executive Overview | `/` | Kinerja ringkas: KPI utama, tren bulanan, komposisi segmen, komposisi status |
| 2 | Sales & Profitability | `/sales` | Tren penjualan-profit, performa tahunan + YoY, dampak bracket diskon |
| 3 | Customer Intelligence | `/customers` | Performa segmen, profit per pelanggan, definisi pelanggan berulang |
| 4 | Transaction Explorer | `/transactions` | Anomali revenue-tinggi margin-rendah, status pesanan, dimensi channel/region/marketing |

### 2.2 Struktur halaman

Setiap halaman memakai urutan tetap: Judul halaman + satu baris deskripsi -> baris KPI (bila
ada) -> panel grafik -> panel tabel -> catatan kaki panel.

**Executive Overview**
- Baris KPI: Net Sales, Profit, Margin Keseluruhan, Orders, AOV, Pelanggan Berulang.
- Panel 1: Area chart tren 60 bulan (`months_by_year`): net sales dan profit, dengan garis
  margin keseluruhan pada sumbu kanan.
- Panel 2: Donut porsi profit per segmen (`segment-performance.json.profit_share_pct`).
- Panel 3: Bar musiman 12 bulan (`monthly-performance.json.months`) + catatan lonjakan Nov-Des.
- Panel 4: Komposisi status pesanan (`dashboard-summary.status_mix`) dengan margin keseluruhan
  per status dan catatan D6.
- Catatan kaki: basis pass-through (pajak, ongkir) sebagai baris terpisah, bukan revenue.

**Sales & Profitability**
- Baris KPI: Gross Sales, Discount Amount, Net Sales, Profit, Margin Keseluruhan, Tingkat Diskon
  Terbobot.
- Panel 1: Area chart tren bulanan (net sales; garis margin keseluruhan).
- Panel 2: Bar tahunan + tabel YoY (`annual-performance.json`, `revenue_yoy_pct`/`profit_yoy_pct`)
  dengan kalimat eksplisit "tren datar ±1% per tahun; ini bukan pertumbuhan".
- Panel 3: Bracket diskon: bar margin keseluruhan per bracket + tabel
  (`orders, net_sales, profit, profit_per_order, loss_orders`).
- Panel 4: Catatan confound ukuran keranjang (kuantitas 4,98 pada 0% vs 7,94 pada 30%+) dan
  larangan klaim "batas diskon optimal".
- Panel 5: Kuartalan (`time-dimensions.quarters`): bar margin keseluruhan vs rata-rata margin
  transaksi per Q1-Q4, catatan "digabung lintas tahun; Q4 terendah 30,22%".
- Panel 6: Hari kerja vs akhir pekan (`time-dimensions.day_types`): order dan margin keseluruhan,
  catatan "akhir pekan 28,55% order tetapi margin hampir sama".
- Panel 7: Statistik tingkat diskon (`dashboard-summary.derived`): terbobot 17,28%, rerata baris
  15,12%, median 12,75%, maksimum 60,02% — dengan penjelasan mengapa keempatnya berbeda.

**Customer Intelligence**
- Baris KPI: Pelanggan Berulang (97,90%, definisi: >1 order), Pelanggan Aktif (24.911 dari
  25.000 master), porsi transaksi margin >20% (92,01%), rating rata-rata (3,677; hanya order
  terkirim).
- Baris KPI tambahan (tersedia mvp-3): Order per Pelanggan (5,544) dan Profit per Pelanggan
  (2.377,76). Denominator pelanggan aktif 24.911 ditampilkan di tooltip; bila filter global
  mencakup lebih dari satu bulan, kedua KPI ini disembunyikan karena denominatornya tidak aditif.
- Panel 1: Tabel kartu per segmen: orders, customers, net_sales, profit, margin keseluruhan,
  porsi profit, profit/pelanggan, order/pelanggan.
- Panel 2: Perbandingan margin keseluruhan vs rata-rata margin transaksi per segmen (dua seri,
  keduanya berlabel) + catatan selisih 3,2-3,6 pp.
- Panel 3: Tingkat diskon per segmen berbasis baris dan berbasis terbobot, berdampingan.
- Panel 4 (batasan): daftar metrik yang tidak ditampilkan (CLV, ROMI, `customer_order_count`,
  `is_repeat_customer`, perbandingan first-time vs repeat) beserta alasannya.

**Transaction Explorer (agregat)**
- Baris KPI: Anomali (12.855 / 9,31%), Revenue Anomali (34.665.272,99), Profit Anomali
  (7.528.760,49), Margin Anomali (agregat 21,72%), Order Rugi 2.530 dan total kerugian
  426.306,80 (`dashboard-summary.derived`).
- Catatan: nilai kerugian ditampilkan sebagai angka absolut berlabel "kerugian", bukan
  pendapatan negatif.
- Panel 1: Ringkasan aturan anomali (p75 revenue 1.552,32; p25 margin 34,12%; operator `>=`
  dan `<=`; ambang global) + dua angka simulasi potensi beserta asumsinya.
- Panel 2: Tabel + bar tingkat anomali per dimensi: sales channel, region, marketing channel
  (orders, anomalies, anomaly rate), dengan kalimat "rentang sempit 9%-10%; bukan masalah satu
  channel/wilayah".
- Panel 3: Status pesanan: tabel status_mix + margin keseluruhan per status + catatan D6.
- Panel 4: Rincian status kirim (`time-dimensions.delivery_status`): bar pangsa per status —
  On Time 62,93%, Cancelled 17,78% (label "tidak dikirim"), Delayed 12,23%, Early 7,06%.
- Panel 5: Kerugian (`dashboard-summary.derived`): 2.530 order profit < 0 dan total kerugian
  426.306,80 (nilai absolut, berlabel "kerugian"). Tingkat retur 6,85%, pembatalan 6,08%,
  tidak dikirim 17,78% ditampilkan sebagai garantis di panel yang sama.

### 2.3 Perilaku navigasi

- Sidebar tetap (fixed) pada >= 1024px; menjadi *drawer* dengan tombol hamburger pada < 1024px.
- Item aktif: latar gradasi violet -> biru, teks putih, indikator batang kiri.
- Judul halaman di `<h1>` per halaman; fokus berpindah ke `<h1>` saat rute berubah.
- Tombol kembali peramban berfungsi (History API): rute dan seluruh filter aktif tersimpan di URL.

---

## 3. Filter dan kontrol

### 3.1 Filter global (periode, segmen, sales channel, status order)

Sumber data: `filter-cubes.json` (agregat `period × dimensi`). Setiap kombinasi filter adalah
penjumlahan baris yang kompatibel, jadi angka selalu konsisten.

| Aspek | Spesifikasi |
|---|---|
| Periode | Rentang bulan 2021-01 s.d. 2025-12 (granularitas bulan) + preset: Semua, 2025, 2024, Q4, Nov-Des |
| Segmen pelanggan | Business, Consumer, Premium, VIP |
| Sales channel | Mobile App, Website, Social Media, Marketplace |
| Status order | Completed, Pending, Returned, Cancelled |
| Cara menghitung | Jumlahkan baris kubus yang lolos semua filter (`Σorders`, `Σnet_sales`, `Σprofit`). Margin = `Σprofit / Σnet_sales x 100` |
| Rekonsiliasi | Bila tidak ada filter, hasil wajib sama dengan `dashboard-summary.totals` (toleransi 0,01). Diuji otomatis |
| Satu dimensi per waktu | Kubus hanya menyimpan `period × satu dimensi`, jadi filter segmen/channel/status **tidak dapat digabung**. Memilih dimensi baru menggantikan dimensi sebelumnya (sudah dijelaskan pada catatan di bawah bilah filter). Kombinasi dua dimensi memerlukan kubus gabungan pada tahap data |
| Subset kecil | Bila jumlah baris terpilih < 3 bulan, tampilkan peringatan "periode pendek; rasio sensitif" |
| Ukuran tidak aditif | `customers` dan `avg_transaction_margin_pct` **tidak** dijumlahkan. Bila filter mencakup lebih dari satu bulan, kartu "pelanggan" dan "rata-rata margin transaksi" disembunyikan atau diganti label "tidak tersedia untuk rentang ini" |
| Panel di luar kubus | Panel yang tidak punya agregat terfilter (bracket diskon, anomali per dimensi, komposisi pengiriman, hari kerja/akhir pekan) menampilkan badge **"Seluruh periode 2021-2025"** atau "Seluruh data" |
| Reset | Tombol "Reset filter" tampil hanya bila filter bukan default |
| Status aktif | Ringkasan filter aktif tampil di bilah filter + badge "Mengikuti filter"/"Seluruh periode" pada setiap panel. Sinkronisasi filter ke URL **belum** dikerjakan (lihat §15.3) |
| Nol hasil | Kombinasi tanpa baris (mis. Pending + Marketplace pada satu bulan tertentu) menampilkan emptystate per panel |

Catatan konsistensi: filter segmen/channel/status mengubah KPI, tren bulanan, dan tabel yang
memakai kubus; panel anomali/delivery/bracket tetap menampilkan angka seluruh periode dan
wajib diberi badge "Seluruh periode" agar tidak dikira ikut tersaring.

> **Diperbarui pada `mvp-5` (lihat §19):** kubus gabungan $Period \times Segment \times Sales\,Channel \times Status\,Order$ menggantikan aturan "satu dimensi per waktu" pada tabel di atas. Filter segmen/channel/status kini dapat dikombinasikan; panel rentang periode (delivery/bracket/hari kerja) disembunyikan saat filter dimensi aktif, bukan diberi badge "Seluruh periode".

### 3.2 Kontrol per-halaman (bukan filter global)

| Halaman | Kontrol | Fungsi |
|---|---|---|
| Sales & Profitability | Sakelar "Bulanan / Kuartalan / Tahunan" pada panel tren | Mengganti deret yang ditampilkan (`months_by_year`, `year_quarters`, `annual-performance`) |
| Sales & Profitability | Sakelar "Hari kerja / Akhir pekan" | Memilih baris `day_types` yang ditampilkan |
| Transaction Explorer | Sakelar dimensi "Sales Channel / Region / Marketing Channel" | Memilih tabel anomali yang tampil (seluruh periode) |
| Transaction Explorer | Sakelar "Jumlah anomali / Tingkat anomali" | Mengganti satuan pada grafik yang sama |
| Customer Intelligence | Tidak ada | Panel sudah memuat seluruh 4 segmen |

### 3.3 Pencarian header (bukan pencarian transaksi)

- Pintasan: `Ctrl/⌘ + K`. Tombol *Esc* menutup.
- Isi: palet perintah untuk berpindah halaman dan melompat ke panel, serta daftar metrik
  (nama + definisi). **Tidak** mencari baris transaksi karena tidak ada data tingkat order.
- Label pada UI: "Cari halaman & metrik", agar tidak dikira pencarian data.
- Aksesibilitas: fokus terperangkap di dialog, `role="dialog"`, `aria-modal="true"`,
  navigasi dengan panah atas/bawah + Enter.

### 3.4 Header

- Judul dashboard sebagai penanda identitas (pengganti profil pengguna, Q4=B).
- Salam statis "Selamat datang" tanpa nama orang.
- Pemilih periode sebagai CTA utama (gradasi violet-biru).
- Tidak ada foto/nama pengguna, tidak ada notifikasi palsu.

---

## 4. Inventaris metrik dan pemetaan ke berkas JSON

Semua nilai di bawah sudah tervalidasi (`docs/METRIC_DICTIONARY.md` §12). Kolom "Sumber"
menunjuk langsung ke berkas JSON siap pakai.

| Metrik tampilan | Sumber JSON | Nilai acuan | Wajib berlabel |
|---|---|---|---|
| Gross sales | `dashboard-summary.totals.gross_sales` | 189.962.560,88 | "sebelum diskon" |
| Discount amount | `dashboard-summary.totals.discount_amount` | 32.819.346,82 | - |
| Net sales | `dashboard-summary.totals.net_sales` | 157.143.214,06 | "basis merchandise" |
| Product cost | `dashboard-summary.totals.product_cost` | 97.910.908,71 | - |
| Profit | `dashboard-summary.totals.profit` | 59.232.305,35 | "di luar pajak" |
| Margin keseluruhan | `dashboard-summary.margins.aggregate_margin_pct` | 37,69% | "metrik utama" |
| Rata-rata margin transaksi | `dashboard-summary.margins.avg_transaction_margin_pct` | 41,16% | "sekunder / rata-rata baris" |
| Pajak dipungut | `dashboard-summary.pass_through.tax_collected` | 16.914.090,41 | "pass-through, bukan revenue" |
| Ongkir ditagih | `dashboard-summary.pass_through.shipping_billed` | 3.076.959,27 | "pass-through" |
| Nilai `as_stored` | `dashboard-summary.as_stored` | 177.134.263,74 / 76.146.395,76 / 42,99% | "bukan KPI; hanya rekonsiliasi" |
| AOV | `dashboard-summary.kpis.avg_order_value` | 1.137,76 | - |
| Rating rata-rata | `dashboard-summary.kpis.mean_rating` | 3,677 | "hanya order terkirim" |
| Pelanggan berulang | `dashboard-summary.kpis.repeat_customer_rate_customer_level_pct` | 97,90% | definisi >1 order |
| Transaksi margin >20% | `dashboard-summary.kpis.high_margin_transaction_share_pct` | 92,01% | "porsi transaksi" |
| Tingkat retur | `dashboard-summary.return_rate_pct` | 6,85% | `order_status` |
| Tingkat pembatalan | `dashboard-summary.cancellation_rate_pct` | 6,08% | `order_status` |
| Tidak dikirim | `dashboard-summary.undelivered_rate_pct` | 17,78% | "tidak dikirim" (bukan dibatalkan) |
| Margin per status | `dashboard-summary.status_margins` | 35,96 / 36,11 / 48,37 / 48,44 | catatan D6 |
| Net sales & profit bulanan | `monthly-performance.months_by_year` | 60 baris | - |
| Musiman per bulan | `monthly-performance.months` | 12 baris (Jan-Des) | "digabung lintas tahun" |
| Bracket diskon | `discount-brackets.brackets` | 5 bracket | basis margin per kolom |
| Performa segmen | `segment-performance.segments` | 4 segmen | margin keseluruhan utama |
| Performa tahunan + YoY | `annual-performance.years` | 5 tahun | "bukan pertumbuhan" |
| Aturan & ringkasan anomali | `anomaly-by-dimension.rule` + `.summary` | 12.855 | simulasi potensi + asumsi |
| Anomali per dimensi | `anomaly-by-dimension.dimensions` | 3 dimensi | - |
| Versi & keputusan | `metadata.json` | `mvp-4` | ditampilkan di footer |
| Kubus filter global | `filter-cubes.json.cubes` | 240 baris × 3 dimensi filter | jumlah = total; `customers` & avg margin tidak aditif |
| Kubus panel (mvp-4) | `filter-cubes.json.panel_dimensions` | 120/240/260/300 baris | rentang periode saja; jumlah = total; tanpa `customers` |
| Kuartalan | `time-dimensions.quarters` | Q1 42,71%; Q2 42,96%; Q3 39,08%; Q4 30,22% | margin keseluruhan |
| Kuartalan per tahun | `time-dimensions.year_quarters` | 20 baris | - |
| Hari kerja / akhir pekan | `time-dimensions.day_types` | 98.686 (37,71%) / 39.430 (37,65%) | margin keseluruhan |
| Rincian status kirim | `time-dimensions.delivery_status` | On Time 62,93%; Delayed 12,23%; Early 7,06%; Cancelled 17,78% | "tidak dikirim" |
| Profit per pelanggan | `dashboard-summary.derived.profit_per_customer` | 2.377,76 | denominator pelanggan aktif 24.911 |
| Order per pelanggan | `dashboard-summary.derived.orders_per_customer` | 5,544 | denominator pelanggan aktif |
| Tingkat diskon terbobot | `dashboard-summary.derived.discount_rate_weighted_pct` | 17,28% | berbeda dari rerata baris |
| Tingkat diskon baris (rerata/median/maks) | `dashboard-summary.derived.discount_rate_row_*` | 15,12% / 12,75% / 60,02% | "per baris" |
| Order rugi & total kerugian | `dashboard-summary.derived.loss_orders` / `.total_loss` | 2.530 / -426.306,80 | kerugian ditampilkan tanpa tanda negatif |

Metrik turunan yang **dihitung di klien** (Q5=A): hanya penjumlahan baris kubus yang dipilih
(`Σorders`, `Σnet_sales`, `Σprofit`) dan satu pembagian margin berbobot `Σprofit / Σnet_sales`.
Tidak ada rumus bisnis lain di sisi UI; semua rumus berada di
`scripts/prepare_dashboard_data.py`. `customers` dan `avg_transaction_margin_pct` tidak
dijumlahkan karena tidak aditif (B7).

### 4.1 Metrik yang TIDAK ditampilkan di MVP dan alasannya

| Tidak ditampilkan | Alasan |
|---|---|
| Tabel/lookup transaksi per order | Tidak ada data tingkat order di JSON |
| Tren harian | Tidak ada agregat harian |
| Metrik produk/kategori/brand | D5: `order_items` belum rekonsiliasi |
| CLV, ROMI, ROI, CAC | Tidak tervalidasi / tidak ada data biaya pemasaran |
| Perbandingan margin first-time vs repeat | Sampel first-time hanya 334 baris (D4) |
| `customer_order_count`, `is_repeat_customer` | Bertentangan dengan hitungan sebenarnya (I-8, I-9) |
| Wilayah/peta pelanggan | Tidak ada agregat geografis; hanya `region` untuk anomali |
| Target/anggaran, "*progress*" pencapaian | Tidak ada data target |
| Kuartalan, hari kerja/akhir pekan, status kirim | **Sudah ada** (mvp-3, Q3=B) — lihat §4.2 |

### 4.2 Metrik tervalidasi yang dulu belum ada — kini tersedia (mvp-3, Q3=B + Q5=A)

Semua metrik di bawah sudah ditulis ke JSON dan lolos rekonsiliasi (112 OK / 0 FAIL). Nilainya
identik dengan kamus metrik; tidak ada yang dihitung ulang di UI.

| Metrik | Sumber JSON | Nilai acuan |
|---|---|---|
| Profit per pelanggan | `dashboard-summary.derived.profit_per_customer` | 2.377,76 |
| Order per pelanggan | `dashboard-summary.derived.orders_per_customer` | 5,544 |
| Tingkat diskon terbobot | `dashboard-summary.derived.discount_rate_weighted_pct` | 17,28% |
| Tingkat diskon baris (rerata/median/maks) | `dashboard-summary.derived.discount_rate_row_*` | 15,12% / 12,75% / 60,02% |
| Kuartalan | `time-dimensions.quarters` | Q1 42,71%; Q2 42,96%; Q3 39,08%; Q4 30,22% |
| Kuartalan per tahun | `time-dimensions.year_quarters` | 20 baris (2021-Q1 .. 2025-Q4) |
| Hari kerja/akhir pekan | `time-dimensions.day_types` | 98.686 (37,71%) / 39.430 (37,65%) |
| Rincian status kirim | `time-dimensions.delivery_status` | On Time 62,93%; Cancelled 17,78%; Delayed 12,23%; Early 7,06% |
| Order rugi & total kerugian | `dashboard-summary.derived.loss_orders` / `.total_loss` | 2.530 / -426.306,80 |
| Kubus filter | `filter-cubes.json.cubes` | 240 baris × 3 dimensi; jumlah = total |
| Kubus panel | `filter-cubes.json.panel_dimensions` | 4 kubus (day_type, delivery_status, discount_bracket, region); rentang periode saja |

Tidak ada metrik tervalidasi yang tertinggal di luar JSON (mvp-4). Kebutuhan baru harus
ditambahkan ke `scripts/prepare_dashboard_data.py` beserta anchor rekonsiliasinya, bukan
dihitung di UI.

---

## 5. Tata letak, gaya, dan token desain

### 5.1 Hierarki layout

```
+--------------+------------------------------------------------------------+
|  SIDEBAR     |  HEADER: judul | pencarian (⌘K) | periode                |
|  (navy)      +------------------------------------------------------------+
|  - Overview  |  RINGKASAN FILTER AKTIF                                    |
|  - Sales     |  BARIS KPI (grid 4 -> 2 -> 1 kolom)                        |
|  - Customers |  GRID PANEL (lebar penuh / 2 kolom pada >= 1280px)         |
|  - Trans.    |    kartu putih: judul + satuan + rentang + grafik/tabel    |
+--------------+------------------------------------------------------------+
```

### 5.2 Token warna

> **Catatan status**: Penyelarasan token mengadopsi spesifikasi desain dari folder `design/` dan
> `docs/DESIGN_BRIEF.MD` §6/§7 (Mode Terang: *Warm Alabaster & Japanese Indigo*, Mode Gelap: *Nocturne Synthwave Luxury*).

#### Mode Terang (Warm Alabaster & Japanese Indigo)
| Token | Nilai | Pemakaian |
|---|---|---|
| `--background` | `#F9F9FF` | Latar area kerja utama |
| `--foreground` | `#131C2B` | Teks utama, judul |
| `--card` | `#FFFFFF` | Permukaan kartu modul |
| `--border` | `#E8E2D8` / `#C4C5D7` | Batas tipis kartu |
| `--sidebar` | `#FBF9F5` | Latar sidebar hangat |
| `--sidebar-fg` | `#131C2B` | Teks menu navigasi |
| `--primary` | `#0037B0` | Japanese Indigo (aksen utama, CTA) |
| `--primary-container` | `#1D4ED8` | Indigo terang (penanda aktif) |
| `--secondary` | `#AC3400` | Terra Cotta (aksen sekunder) |
| `--tertiary` | `#004F38` | Forest Jade (aksen tersier) |
| `--text-primary` | `#131C2B` | Angka KPI, judul |
| `--text-muted` | `#434655` | Catatan kaki, satuan |
| `--positive` | `#00694C` | Completed / status positif |
| `--negative` | `#BA1A1A` | Returned / kerugian |
| `--warning` | `#AC3400` | Pending / anomali |

#### Mode Gelap (Nocturne Synthwave Luxury)
| Token | Nilai | Pemakaian |
|---|---|---|
| `--background` | `#151120` | Obsidian ungu pekat latar utama |
| `--foreground` | `#E8DFF5` | Teks utama lavender kontras tinggi |
| `--card` | `#221D2D` | Permukaan kartu modul gelap |
| `--border` | `rgba(255, 28, 192, 0.18)` | Garis batas beraksen neon halus |
| `--sidebar` | `#100C1B` | Obsidian pekat latar sidebar |
| `--primary` | `#FFAEDA` | Soft Neon Pink (aksen utama) |
| `--primary-container` | `#FF3AC2` | Electric Pink (penanda aktif) |
| `--secondary` | `#E5B4FF` | Lilac Purple |
| `--tertiary` | `#BCC2FF` | Periwinkle Blue |
| `--positive` | `#00FFA3` | Mint cerah (Completed / positif) |
| `--negative` | `#FFB4AB` | Coral Neon (Returned / kerugian) |
| `--warning` | `#FFB59D` | Peach Amber (Pending / anomali) |

Palet grafik (mengikuti tema aktif di `docs/DESIGN_BRIEF.MD`):
- Mode Terang: `--chart-1` `#0037B0`, `--chart-2` `#1D4ED8`, `--chart-3` `#AC3400`, `--chart-4` `#004F38`, `--chart-5` `#747686`
- Mode Gelap: `--chart-1` `#FFAEDA`, `--chart-2` `#FF3AC2`, `--chart-3` `#E5B4FF`, `--chart-4` `#BCC2FF`, `--chart-5` `#00FFA3`

### 5.3 Tipografi

- Sistem Font:
  - Display & Headings: **Space Grotesk** / **Plus Jakarta Sans** (tajuk tegas dan berkarakter kuat).
  - Teks Isi (*Body Text*): **Geist** / **Plus Jakarta Sans** (keterbacaan optimal bagi pengguna awam dan analis).
  - Label & Numerik (*Monospace*): **JetBrains Mono** / `tabular-nums` untuk perataan angka finansial.
- Skala yang dipakai: `display` (36–56px), `h1` (24–36px), `h2` (18–24px), `h3` (15–20px), `body` (14–16px), `caption/label` (10–12px).
- Angka KPI: `font-variant-numeric: tabular-nums` agar seluruh kolom angka rata dan mudah dipindai.

### 5.4 Kartu, batas, sudut, bayangan

- Kartu: latar putih (`--card`), batas 1px `--border`, radius 12px (`var(--radius)`; draf awal 14px diselaraskan ke DESIGN_BRIEF §5.2 pada mvp-4), `box-shadow: 0 1px 2px rgba(15,23,42,0.04), 0 8px 24px -12px rgba(15,23,42,0.12)`.
- Padding kartu: 20px (>=1024px), 16px (di bawah).
- Jarak antar-kartu: 16px (seluler), 24px (desktop).
- Panel grafik punya tinggi minimum 280px; sumbu selalu punya label satuan.
- Tidak ada gradien pada latar kartu; gradien hanya pada elemen aktif/CTA/area chart.

### 5.5 Format angka

- Uang: `$` dengan pemisah ribuan, 2 desimal, locale `en-US` (USD apa adanya).
- Persen: 2 desimal + tanda `%`; selisih antar-basis memakai "pp".
- Jumlah: pemisah ribuan tanpa desimal.
- Angka besar pada kartu KPI boleh disingkat (`$157,1 jt`) **hanya bila** angka penuh tersedia
  di tooltip dan/atau pada panel detail.
- Tanda nilai negatif selalu ditampilkan apa adanya untuk selisih; untuk *total kerugian*
  angka ditampilkan sebagai nilai absolut dengan label "kerugian" agar tidak terbaca sebagai
  pendapatan negatif.

---

## 6. Katalog komponen

Semua komponen ditulis TypeScript dengan tipe eksplisit untuk kontrak data.

### 6.1 Kerangka dan navigasi

| Komponen | Ringkas | Properti utama | Keadaan |
|---|---|---|---|
| `AppShell` | Kerangka sidebar + header + area konten | `children`, `activeRoute`, `onNavigate` | - |
| `SidebarNav` | Menu 4 rute, item aktif bergradasi | `items`, `activeRoute`, `collapsed`, `onToggle` | expanded / collapsed / drawer |
| `TopHeader` | Judul dashboard, pencarian, pemilih periode | `title`, `periodValue`, `onPeriodChange`, `onOpenSearch` | default / periode pendek |
| `CommandPalette` | Palet pencarian halaman & metrik | `open`, `onClose`, `routes`, `metrics` | kosong / ada hasil / tanpa hasil |
| `FilterSummaryBar` | Ringkasan filter aktif (periode, segmen, channel, status) + reset | `filters`, `onReset` | tanpa filter / dengan filter |
| `FilterControls` | Empat kontrol filter global: periode, segmen, sales channel, status order | `filters`, `onChange`, `options` | default / sebagian aktif / tanpa hasil |
| `PageHeader` | Judul + deskripsi + badge periode panel | `title`, `description`, `scopeBadge` | - |

### 6.2 Metrik dan status

| Komponen | Ringkas | Properti utama | Keadaan |
|---|---|---|---|
| `KpiCard` | Kartu KPI: label, nilai, satuan, delta opsional, catatan | `label`, `value`, `unit`, `basisLabel`, `note`, `trend` | default / tanpa delta / memuat / galat |
| `BasisTag` | Label basis: "Margin keseluruhan" vs "Rata-rata transaksi", "Basis C" | `kind`, `tone` | primary / secondary / reconciled |
| `DeltaIndicator` | Naik/turun dengan panah + nilai | `value`, `unit`, `direction`, `isGoodWhenUp` | naik / turun / nol |
| `StatusPill` | Badge status berlatar warna | `status` (4 nilai), `count` | 4 varian |
| `ShareBar` | Bar "porsi dari total" | `value`, `of`, `color`, `label`, `caption` | 0% / sebagian / 100% |
| `DisclaimerNote` | Catatan kaki panel (kecil, ikon info) | `tone`, `title`, `text`, `items` | info / peringatan / larangan klaim |
| `AssumptionList` | Daftar asumsi simulasi potensi | `assumptions` | - |
| `NonAdditiveNotice` | Ganti nilai yang tidak aditif saat filter mencakup >1 bulan | `reason`, `metric` | aktif / tidak aktif |
| `MetricDefinition` | *Popover* definisi metrik dari kamus | `metricId`, `name`, `formula`, `grain`, `limitations` | - |

### 6.3 Grafik

| Komponen | Ringkas | Properti utama | Keadaan |
|---|---|---|---|
| `TrendAreaChart` | Area bergradasi 1-2 seri + garis sumbu kanan opsional | `points`, `series`, `xKey`, `yFormat`, `rightAxis` | data / kosong / satu titik |
| `SeasonalityBarChart` | Bar 12 bulan | `data`, `valueKey`, `highlightKeys` | default / ada sorotan |
| `GroupedBarChart` | Dua seri berdampingan (mis. margin keseluruhan vs rata-rata) | `categories`, `series` | - |
| `DonutChart` | Komposisi dengan label porsi | `slices`, `centerLabel`, `showLegend` | 4 irisan / tanpa data |
| `DimensionRateChart` | Batang horizontal tingkat anomali per dimensi | `rows`, `unit`, `threshold` | ada data / tanpa data |
| `QuarterBarChart` | Bar 4 kuartal (margin keseluruhan + margin rata-rata transaksi) | `data`, `series` | ada data / tanpa data |
| `DayTypeChart` | Perbandingan hari kerja vs akhir pekan (order + margin) | `rows`, `valueKey` | - |
| `DeliveryStatusBar` | Batang horizontal pangsa status kirim | `rows` | 4 nilai / tanpa data |
| `ChartFrame` | Pembungkus: judul, satuan, rentang, legenda, catatan | `title`, `unit`, `scope`, `note`, `children` | - |

Aturan grafik:

1. Setiap grafik wajib: judul bermakna, satuan pada sumbu, tooltip berisi angka penuh, dan
   catatan basis bila menampilkan margin.
2. Tidak ada grafik 3D, efek glow, atau gradien latar pada plot.
3. Warna tidak boleh menjadi satu-satunya pembeda; legenda + label langsung dipakai.
4. Setiap grafik menyediakan alternatif tabel (`<details>` "Lihat data") untuk pembaca
   layar dan verifikasi angka.

### 6.3.1 Komponen tabel

| Komponen | Ringkas | Keadaan |
|---|---|---|
| `DataTable` | Tabel generik: kolom bertipe, perataan angka kanan, `aria-sort` | default / kosong / memuat |
| `MetricTable` | Tabel metrik dengan header bersatuan + catatan basis di bawah | - |
| `YoYTable` | Tabel tahun + kolom YoY berwarna | positif / negatif / null (2021) |

### 6.4 Keadaan global

| Komponen | Pemakaian |
|---|---|
| `SkeletonPanel` | Memuat JSON; bentuk menyerupai panel akhir |
| `ErrorState` | Gagal memuat JSON atau gagal rekonsiliasi; menampilkan berkas dan sebab |
| `EmptyState` | Panel tanpa data untuk filter/dimensi terpilih |
| `DataProvenanceFooter` | `definitions_version`, `generated_at`, jumlah baris sumber |

---

## 7. Responsif

| Breakpoint | Sidebar | Grid KPI | Grid panel | Tabel | Header |
|---|---|---|---|---|---|
| >= 1280px | Tetap 260px | 4 kolom | 2 kolom | Kolom penuh, semua kolom tampil | Satu baris |
| 1024-1279px | Tetap 232px | 3 kolom | 2 kolom | Semua kolom | Satu baris |
| 768-1023px | Drawer (hamburger) | 2 kolom | 1 kolom | Gulir horizontal + kolom kunci dibekukan | Dua baris |
| < 768px | Drawer | 1 kolom | 1 kolom | Gulir horizontal; alternatif daftar kartu untuk tabel utama | Ringkas: judul, pencarian, periode |

Aturan tambahan:

- Tinggi grafik menyesuaikan (280px seluler, 320px desktop).
- Tidak ada horizontal scroll pada level halaman; hanya pada kontainer tabel.
- Target sentuh minimal 44x44px.
- Perbesaran teks 200% tidak boleh memotong konten atau menyembunyikan kontrol.

---

## 8. Aksesibilitas

1. Kontras teks minimal 4,5:1; teks pada sidebar navy memakai warna terang.
2. Navigasi keyboard penuh: Tab, Shift+Tab, Enter, Esc, panah pada palet dan tab.
3. Fokus terlihat jelas (outline 2px `--chart-2`, offset 2px) dan tidak dihapus.
4. `aria-current="page"` pada item navigasi aktif.
5. Grafik: `role="img"` + `aria-label` ringkas berisi judul, satuan, dan nilai ekstrem, serta
   tabel alternatif.
6. `StatusPill` menyertakan teks status; warna bukan satu-satunya informasi.
7. Pengumuman status memuat/galat memakai `aria-live="polite"`.
8. Menghormati `prefers-reduced-motion`; transisi maksimum 150ms dan dapat dimatikan.
9. Judul halaman unik per rute; `lang="id"` pada dokumen (antarmuka berbahasa Indonesia).

---

## 9. Struktur proyek (aktual per M3)

```
src/
  app/                       DataProvider (fetch + rekonsiliasi), FilterProvider (state filter),
                             router.tsx (History API, tanpa dependensi), routes.ts (4 rute)
  components/layout/         AppShell, SidebarNav, TopHeader, PageHeader, GlobalFilterBar, SelectField
  components/metrics/        KpiCard, StatTile, BasisTag, StatusPill, ShareBar
  components/charts/         ChartCard, TrendAreaChart, SeasonalityBarChart, ProfitShareDonut
  components/table/          DataTable (fondasi gaya tabel generik)
  components/feedback/       AsyncStates (PanelSkeleton, ErrorState, EmptyState)
  components/ui/             button, card, select, tooltip (bawaan repo; dipakai ulang)
  data/                      types.ts (kontrak 9 JSON), loadDashboardData.ts (fetch + reconcile)
  lib/                       format.ts (format angka/tanggal), filter.ts (state filter, agregasi, label)
  features/
    executive-overview/      ExecutiveOverviewPage.tsx
    placeholder/             PlaceholderPage.tsx (rute yang belum dibangun, tanpa angka rekaan)
  index.css                  token tema dashboard
  App.tsx, main.tsx
```

Catatan: `src/App.css`, `src/assets/hero.png`, `react.svg`, dan `vite.svg` adalah sisa template Vite.
Sejak M3 berkas-berkas itu **tidak lagi diimpor**, tetapi masih ada di disk; penghapusannya
dijadwalkan pada M6.

Komponen pada §6 yang belum ada (mis. `CommandPalette`, `DeltaIndicator`,
`GroupedBarChart`, `YoYTable`) tetap rencana untuk M4/M5.

---

## 10. Pemuatan data dan pemeriksaan integritas

1. Pemuatan: `fetch('/data/<nama>.json')` untuk 9 berkas JSON dari `public/data/`, dijalankan
   paralel saat aplikasi dimulai; tampilkan `SkeletonPanel` selama memuat.
2. Validasi bentuk: cek keberadaan field wajib. Jika ada yang hilang -> `ErrorState`.
3. Pemeriksaan versi: `metadata.json.definitions_version` harus sama di seluruh berkas; jika
   berbeda -> `ErrorState` dengan pesan versi tidak konsisten.
4. Pemeriksaan rekonsiliasi saat dimuat (jaminan tampilan):
   - `totals.net_sales - totals.discount_amount` konsisten dengan pembilang/penyebut margin
     agregat (toleransi 0,01).
   - `margins.aggregate_margin_pct` = `profit / net_sales x 100` (toleransi 0,01 pp).
   - Jumlah `months_by_year.net_sales` = `totals.net_sales` (toleransi 0,01).
   - Jumlah `months.net_sales` = `totals.net_sales` (toleransi 0,01).
   - Jumlah `segments.profit` = `totals.profit`; jumlah porsi profit = 100% (toleransi 0,05).
   - Jumlah `status_margins[*].orders` = `totals.orders`.
   - Jumlah seluruh baris setiap kubus (`filter-cubes.json`) = `totals` yang sama
     (uang 0,01; jumlah 0).
   - Setiap agregat terfilter memakai margin berbobot `Σprofit / Σnet_sales x 100`.
   Kegagalan -> panel menampilkan `ErrorState` dan tidak menampilkan angka yang tidak
   terverifikasi.
5. Pemeriksaan tambahan yang sudah aktif di M3: keseragaman `definitions_version` di 9 berkas,
   jumlah `months_by_year` = `totals`, jumlah tiap kubus = `totals`, jumlah porsi profit segmen =
   100%, dan jumlah `status_margins[*].orders` = `totals.orders`. Kegagalan mana pun menampilkan
   `ErrorState` beserta daftar temuan, bukan angka.
6. Tanpa backend, tanpa localStorage untuk data. Pada M3 filter disimpan di state React
   (`FilterProvider`); **sinkronisasi filter ke URL belum dikerjakan** sehingga tampilan belum
   dapat dibagikan lewat tautan. Rute (halaman) tetap dapat diakses langsung karena memakai
   History API.

---

## 11. Kriteria penerimaan (acceptance criteria)

Setiap butir harus dapat diperiksa ulang. "Sumber acuan" menunjuk cara verifikasi.

| ID | Kriteria | Cara verifikasi |
|---|---|---|
| AC-01 | `npm run build` berhasil tanpa galat TypeScript | jalankan `npm run build` |
| AC-02 | Empat halaman dapat diakses lewat sidebar dan URL langsung | uji manual 4 rute |
| AC-03 | Setiap metrik di layar dapat ditelusuri ke field JSON pada §4 | pemeriksaan manual satu per satu |
| AC-04 | Semua angka KPI sama dengan `data/processed` dalam toleransi 0,01 | uji otomatis rekonsiliasi |
| AC-05 | Setiap nilai margin disertai label basis (agregat / rata-rata transaksi) | uji otomatis mencari teks basis pada kartu margin |
| AC-06 | Filter global (periode, segmen, sales channel, status order) mengubah KPI dan tren; panel di luar kubus menampilkan badge "Seluruh periode" | uji manual + uji komponen |
| AC-07 | Tanpa filter, angka identik dengan kondisi apa pun; kombinasi filter selalu = jumlah baris kubus yang dipilih | uji otomatis |
| AC-08 | Setiap angka simulasi potensi disertai daftar asumsi dan kata "simulasi" | uji otomatis pencarian teks |
| AC-09 | Tidak ada metrik dari daftar larangan §4.1 yang muncul di UI | uji otomatis pencarian istilah terlarang (CLV, ROMI, `customer_order_count`, `is_repeat_customer`) |
| AC-10 | Tidak ada tombol/kontrol tanpa aksi nyata | uji manual per kontrol |
| AC-11 | Setiap grafik memiliki padanan tabel alternatif dengan angka penuh | uji manual |
| AC-12 | Keadaan memuat, galat, dan kosong tampil benar untuk setiap panel | uji komponen + uji manual |
| AC-13 | Navigasi keyboard penuh; tidak ada perangkap fokus | uji manual (Tab/Shift+Tab/Esc) |
| AC-14 | Kontras teks >= 4,5:1 pada semua teks | uji otomatis kontras |
| AC-15 | Layout benar pada 375px, 768px, 1024px, 1440px | matriks uji responsif |
| AC-16 | `definitions_version` tampil di footer tiap halaman | uji manual |
| AC-17 | `npm run build` menghasilkan halaman statis tanpa galat konsol | uji manual konsol peramban |
| AC-18 | Angka di tooltip, tabel, dan kartu konsisten satu sama lain | uji otomatis antar-komponen |
| AC-19 | Filter S=VIP + November menunjukkan VIP pada November, bukan campuran total | uji otomatis membandingkan hasil dengan jumlah baris kubus |
| AC-21 | Tidak ada foto/nama/profil pengguna fiktif di UI | uji otomatis pencarian istilah profil |

Peninjau diminta menyetujui atau merevisi daftar ini sebelum implementasi.

---

## 11.1 Rencana pengujian

| Lapis | Cakupan | Cara |
|---|---|---|
| Uji rekonsiliasi data | 9 berkas JSON terhadap anchor `METRIC_DICTIONARY.md` §12 | Uji otomatis TypeScript membaca seluruh JSON dan memeriksa toleransi (uang 0,01; persen 0,01 pp; jumlah 0) |
| Uji agregasi filter | Jumlah baris kubus = total; margin berbobot; ukuran tidak aditif tidak dijumlahkan | Uji unit fungsi agregasi |
| Uji komponen | Setiap komponen pada tabel §6: keadaan default/memuat/galat/kosong | Uji render dengan properti terkontrol |
| Uji larangan konten | Istilah terlarang tidak muncul; label basis selalu ada | Uji otomatis pemindaian teks render |
| Uji visual terarah | Grafik dan tata letak pada 4 lebar layar | Pemeriksaan peramban manual + tangkapan layar |
| Uji aksesibilitas | Navigasi keyboard, urutan fokus, `aria-label`, kontras, 200% zoom | Pemeriksaan manual + perkakas aksesibilitas |
| Uji sambungan produksi | `npm run build` lalu `npm run preview`; pastikan `dist/data` terisi | Perintah build + pemeriksaan peramban |
| Uji regresi dokumen | Angka di markdown = angka di UI | Skrip pembanding teks terhadap JSON |

Ambang lulus: seluruh uji rekonsiliasi dan larangan konten wajib lulus 100%. Uji lain boleh
memiliki temuan kosmetik yang dicatat, tetapi tidak boleh menyentuh angka.

---

## 12. Rencana milestone (ringkas)

| Milestone | Isi | Kriteria lulus |
|---|---|---|
| M1 (selesai) | Audit, keputusan D1-D7, notebook selaras, JSON tervalidasi | 52 OK / 0 FAIL; build sukses |
| M2 (selesai) | Cetak biru implementasi | Disetujui peninjau; Q1-Q5 dijawab |
| M2b (selesai) | `definitions_version` mvp-3: blok `derived`, `filter-cubes.json`, `time-dimensions.json` + gembok rekonsiliasi baru | 84 OK / 0 FAIL; salinan byte-identik di `data/processed`, `public/data`, `dist/data` |
| M3 (selesai) | Cangkang visual: AppShell, sidebar, header (tanpa profil), token, bilah filter global, KPI card, kartu grafik, fondasi tabel, tata letak Ringkasan Eksekutif, responsif | `npm run build` sukses; 36 OK / 0 FAIL uji agregasi filter; angka di layar sama dengan `data/processed`; layout terukur di 1422px dan 489px (lihat §15) |
| M4 | 4 halaman lengkap + grafik + tabel + panel kuartalan/hari kerja/delivery | Kriteria AC-07 s.d. AC-14 lulus |
| M5 | QA: responsif, aksesibilitas, keadaan galat | Kriteria AC-15 s.d. AC-18 lulus |
| M6 | Pembersihan sisa template (README, `dist/`, aset Vite) dan penyiapan deployment statis | README memuat sumber data & batasan; build bersih |

Milestone M3 sudah selesai (lihat §15). Berikutnya M4 (halaman analitik lengkap), kecuali bila
peninjau meminta perubahan lebih dulu.

---

## 13. Asumsi, risiko, dan keterbatasan cetak biru ini

1. **Bentuk JSON tidak berubah** selama M3-M5. Setiap perubahan bentuk berarti `definitions_version`
   baru dan pembaruan dokumen ini.
2. **Filter global terbatas pada 4 dimensi** (periode, segmen, sales channel, status order).
   `region` dan `marketing_channel` bukan filter global karena tidak ada agregat revenue-nya;
   `region` hanya tersedia sebagai kubus panel yang mengikuti rentang periode (mvp-4).
   Filter pada panel anomali hanya mengubah panel itu.
3. **Tanpa data tingkat order**, halaman Transaction Explorer hanya agregat. Nama halaman
   dipertahankan sesuai PRD dengan penambahan "(agregat)" agar tidak menjanjikan lebih.
4. **Pemilih periode bulanan**, bukan harian; ini keterbatasan data, bukan pilihan desain.
5. **`dist/`, `README.MD`, aset Vite, dan `src/App.css` masih sisa template** dan belum dibersihkan;
   dijadwalkan pada M6.
6. **Tanpa autentikasi dan tanpa profil pengguna** (Q4=B). Header menampilkan identitas proyek.
7. **Ekspor CSV dibatalkan** (Q2 diputuskan ulang); tidak ada tombol ekspor di antarmuka.
8. **Ukuran tidak aditif** (`customers`, `avg_transaction_margin_pct`) hanya valid untuk satu
   sel/satu rentang bulan; ini batas kebenaran data, bukan kelalaian UI.
9. **Bahasa antarmuka: Indonesia**, dengan istilah teknis Inggris yang sudah lazim
   (net sales, profit, margin, order).
10. Blueprint ini tidak menetapkan jumlah jam kerja atau urutan pengiriman di luar milestone.
11. **Sinkronisasi filter ke URL belum ada** (M3). Filter hidup di state React; tautan yang
    dibagikan belum membawa filter.
12. **Preset periode** (Semua, 2025, 2024, Q4, Nov-Des) dan **peringatan "periode pendek"** pada §3.1
    belum diimplementasikan; M3 hanya menyediakan pemilih "Dari bulan"/"Sampai bulan".
13. **Grafik memakai Recharts** sehingga bundel JS menjadi 820 KB (249 KB gzip). Bila ukuran
    bundel menjadi masalah, alternatifnya adalah kembali ke SVG buatan sendiri (keputusan B3 lama).
14. **Alternatif tabel untuk setiap grafik** (aturan §6.3 butir 4) belum diimplementasikan pada M3.

---

## 15. Status implementasi M3 (cangkang visual + Ringkasan Eksekutif)

### 15.1 Yang sudah dikerjakan

| Area | Hasil |
|---|---|
| Kerangka | `AppShell` (rel navy + area kerja), `SidebarNav` navy dengan 4 rute + badge "segera" untuk rute yang belum dibangun dan mode **bisa dilipat** di desktop (§15.6), `TopHeader` sticky berisi identitas halaman + versi metrik + rentang tanggal (tanpa profil pengguna) |
| Filter global | `GlobalFilterBar` + `SelectField` (reuse `components/ui/select`): "Dari bulan", "Sampai bulan", "Segmen pelanggan", "Sales channel", "Status order", tombol Reset yang nonaktif saat tanpa filter |
| KPI | `KpiCard` (4 kartu: net sales, profit, margin keseluruhan berbasis `BasisTag`, order) + `StatTile` untuk angka seluruh periode (AOV, pelanggan aktif, pelanggan berulang, transaksi margin > 20%) |
| Grafik | `ChartCard` (pembungkus + badge cakupan), `TrendAreaChart` (area net sales/profit + garis margin sumbu kanan), `SeasonalityBarChart` (12 bulan kalender), `ProfitShareDonut` (porsi profit per segmen) |
| Tabel | `DataTable` generik (header, perataan angka kanan, gulir horizontal) dipakai untuk rekap status order |
| Keadaan | `PanelSkeleton`, `ErrorState` (termasuk galat rekonsiliasi + daftar temuan), `EmptyState` |
| Responsif | Sidebar tetap di >=1024px dan drawer + hamburger di bawahnya; grid KPI 4/2/1 kolom; grid panel 3/1 kolom |
| Desain | Latar terang `#f3f5fa`, kartu putih berbatas tipis, sidebar navy `#0b1224`, aksen gradasi violet→biru→pink pada item aktif dan batang musiman |

### 15.2 Perbedaan nama komponen dari §6

| Rencana (§6) | Yang dipakai di M3 | Alasan |
|---|---|---|
| `ChartFrame` | `ChartCard` | Nama lebih pendek; fungsi sama |
| `FilterControls` + `FilterSummaryBar` | `GlobalFilterBar` + `SelectField` | Satu komponen mengelola baris filter dan ringkasan cakupan |
| `SkeletonPanel` | `PanelSkeleton` | Dikelompokkan dalam `feedback/AsyncStates.tsx` bersama `ErrorState`/`EmptyState` |
| `DisclaimerNote` | `HintPopover` (awalnya `MetricNote`) | Catatan kecil kini di balik popover klik di kartu KPI dan kartu grafik |
| `DonutChart` | `ProfitShareDonut` | Komponen khusus segmen; varian donut generik menyusul bila diperlukan |

### 15.3 Keputusan yang menyimpang dari blueprint

1. **B3 (pustaka grafik)**: memakai **Recharts**, bukan SVG buatan sendiri. Recharts sudah ada di
   `package.json` dan diminta eksplisit pada instruksi implementasi M3. Tidak ada dependensi baru
   yang dipasang. Konsekuensi: bundel lebih besar (§13 butir 13).
2. **URL filter**: belum disinkronkan (state React saja), lihat §13 butir 11.
3. **Preset periode dan peringatan periode pendek**: belum ada, lihat §13 butir 12.
4. **Batasan satu dimensi**: pemilih dimensi bersifat saling menggantikan karena kubus hanya
   `period × satu dimensi`. Ini konsekuensi data, dituliskan pada catatan di bawah bilah filter.
5. **Ringkasan Eksekutif** memuat: KPI, ringkasan seluruh periode, tren bulanan, komposisi profit
   per segmen, musiman kalender, status pengiriman, dan rekap status order. Panel kuartal,
   hari kerja vs akhir pekan, dan bracket diskon dipindahkan ke halaman Sales & Profitabilitas (M4)
   agar Ringkasan tidak menjadi salinan halaman itu.
6. **Pencarian di header** (§2.1, §3.3) dan palet pencarian belum diimplementasikan pada M3; header
   hanya memuat identitas halaman, versi metrik, dan rentang tanggal.
7. **Gradasi pada grafik**: gradient dipakai sebagai isian area data (net sales, profit) dan batang
   musiman, bukan sebagai latar plot. Ini mengikuti arah desain peninjau (aksen gradasi violet/biru/pink)
   tanpa melanggar larangan latar bergradasi pada §6.3 butir 2.

### 15.4 Bukti verifikasi M3

| Uji | Hasil |
|---|---|
| `npm run build` (`tsc -b && vite build`) | Sukses tanpa galat TypeScript |
| Uji agregasi filter terhadap JSON asli | **36 OK / 0 FAIL**: tanpa filter = total dataset; jumlah setiap nilai dimensi = total; satu bulan x satu dimensi = baris kubus; rentang bulan; label & opsi |
| `npm run preview` | `/`, `/sales` (fallback SPA) = HTTP 200; 9 berkas `/data/*.json` = HTTP 200 |
| Render di peramban headless | Angka nyata tampil: `$157.143.214`, `$59.232.305`, `37,69%`, `138.116`, `$1.137,76`, `24.911`, `97,90%`, `92,01%`; 3 grafik SVG; 4 baris tabel; tidak ada `ErrorState` |
| Tata letak terukur (computed style) | 1422px: sidebar 264px `#0b1224`, KPI 4 kolom, panel 3 kolom. 489px: `aside` disembunyikan, KPI 1 kolom, panel 1 kolom, tanpa gulir horizontal |
| Tangkapan layar | Dibuat untuk desktop 1440px, seluler 390px, dan `/sales` — **belum diperiksa secara visual** (lihat §15.5) |

### 15.5 Batasan verifikasi yang belum tertutup

1. Tangkapan layar sudah diambil, tetapi **belum ada pemeriksaan visual mata** (estetika, potongan
   teks, kontras). Ini perlu ditinjau manusia atau perkakas.
2. Kontras warna, navigasi keyboard, urutan fokus, dan perbesaran 200% **belum diuji**.
3. Perilaku interaksi filter lewat klik pada kontrol bilah filter masih belum diuji. Yang sudah
   diuji: fungsi agregasi terhadap JSON asli (skrip ad-hoc di luar repo) dan render halaman pada
   tiga cakupan filter (`tests/executive-overview.test.tsx`, status filter disuntikkan langsung).
4. Lebar 375px, 768px, dan 1024px belum diuji tepat pada angka itu; yang terukur 1422px dan 489px.

### 15.6 Penyempurnaan visual setelah tinjauan

Peninjau meminta tampilan dipercantik memakai contoh komponen dashboard ber-sidebar yang bisa
dilipat. Contoh itu dipakai sebagai **acuan tata letak saja**; isinya (data contoh, notifikasi,
avatar/profil) **tidak diadopsi** karena bertentangan dengan §13 butir 6 (tanpa profil pengguna).
Tombol mode gelap dari contoh itu awalnya juga tidak diadopsi (desain terang sudah disetujui);
pada mvp-4 sakelar tema **diadopsi** karena PRD §2.2 mensyaratkannya — lihat §17.

| Perubahan | Berkas | Alasan |
|---|---|---|
| Sidebar dapat dilipat (264px → 76px) di desktop, preferensi disimpan di `localStorage` | `layout/SidebarNav.tsx`, `layout/AppShell.tsx` | Melaksanakan kontrak `SidebarNav.collapsed`/`onToggle` yang sudah ada di §6 |
| Grid cangkang `264px + 1fr` diganti flex agar lebar rel dapat dianimasikan | `layout/AppShell.tsx` | Lebar kolom grid tidak dianimasikan; flex memungkinkan transisi lebar |
| Kartu KPI, kartu grafik, dan `StatTile` mendapat transisi + elevasi saat hover | `metrics/KpiCard.tsx`, `charts/ChartCard.tsx`, `metrics/StatTile.tsx` | Umpan balik interaksi 150–200ms (checklist UI/UX) |
| `prefers-reduced-motion` menonaktifkan animasi/transisi | `index.css` | Aksesibilitas |
| `cursor: pointer` untuk tombol aktif | `index.css` | Elemen yang dapat diklik harus menampilkan kursor pointer |
| Ikon rute "segera" menjadi titik merah saat rel dilipat; label tetap terbaca pembaca layar (`sr-only`) | `layout/SidebarNav.tsx` | Menjaga nama aksesibel saat label disembunyikan |

Tidak ada metrik, rumus, atau angka baru. Tidak ada dependensi baru. Bukti verifikasi menyusul:

| Uji | Hasil |
|---|---|
| `npm run build` | Sukses (bundel JS 822 KB / 250 KB gzip) |
| `npm run lint` | 0 galat / 6 peringatan (sama seperti M3) |
| Probe DOM headless 1440px (terbuka) | `aside` 264px `#0b1224`, KPI 4 kolom, panel 3 kolom, 3 grafik, tanpa `ErrorState`, tanpa gulir horizontal |
| Probe DOM headless 1440px (dilipat) | `aside` 76px, tombol "Perluas navigasi" ada, KPI 4 kolom, panel 3 kolom, tanpa gulir horizontal |
| Probe DOM headless 390px | `aside` `display:none`, KPI 1 kolom, panel 1 kolom, tanpa gulir horizontal |
| Konsol peramban | Tanpa `Uncaught`/`ERROR:CONSOLE` |
| Tangkapan layar | `new-expanded-1440.png`, `new-collapsed-1440.png`, `new-mobile-390.png` di `%TEMP%\opencode\render` — belum diperiksa mata (lihat §15.5 butir 1) |

---

## 16. Verifikasi pipeline data dan uji integritas JSON

Bagian ini mencatat hasil eksekusi aktual `scripts/prepare_dashboard_data.py` dan keputusan yang
diambil setelahnya. Tidak ada rumus, tolok ukur, atau definisi metrik yang diubah.

### 16.1 Bukti eksekusi

| Item | Hasil |
|---|---|
| Perintah | `.venv/Scripts/python.exe scripts/prepare_dashboard_data.py` |
| Kode keluar | 0 |
| Rekonsiliasi internal | 84 OK / 0 FAIL |
| Keluaran | 9 JSON di `data/processed/` dan `public/data/` (235,9 KB total) |
| `data/source/` | tidak berubah (SHA256 dan `LastWriteTimeUtc` 5 CSV identik sebelum/sesudah) |
| Determinisme | output lama versus baru hanya berbeda pada `generated_at` |
| `data/processed` = `public/data` | byte-identical (SHA256 9/9) |
| `dist/data` setelah `npm run build` | byte-identical dengan `public/data` |

Pemeriksa independen (skrip sementara di luar repo, membaca ulang JSON hasil dan CSV sumber,
tidak memakai klaim skrip): 70 OK / 0 FAIL. Cakupan: 23 anchor `METRIC_DICTIONARY.md` Bagian 10,
anchor `EDA_VALIDATION.md` Bagian 3 dan 5, konsistensi jumlah antarberkas, integritas tiga kubus,
kesesuaian versi, dan rekomputasi basis C langsung dari CSV sumber.

### 16.2 Uji permanen

`tests/data_integrity.test.ts` (103 tes) menjadikan pemeriksaan di atas bagian dari `npm run test`:
daftar 9 berkas kontrak, salinan byte-for-byte, `definitions_version`, keputusan metrik yang
terkunci di `metadata.json`, anchor ANC-01…ANC-27 dan anchor `EDA_VALIDATION.md`, konsistensi
jumlah antarberkas, integritas 7 kubus (termasuk jumlah order per nilai tiap kubus panel), serta
penjaga metrik terlarang (CLV, ROMI, `customer_order_count`, `is_repeat_customer`). Rekomputasi
dari CSV 48 MB tetap di pipeline Python agar pengujian tetap cepat.

`tests/executive-overview.test.tsx` (3 tes) merender halaman Ringkasan Eksekutif dengan
`DataProvider` asli (JSON asli lewat stub `fetch`, jadi pemeriksaan rekonsiliasi ikut berjalan)
untuk tiga cakupan: tanpa filter, rentang 2024-01…2024-12, dan filter dimensi tanpa rentang.
Angka harapan diambil dari rekonsiliasi independen, bukan dari halaman.

| Pemeriksaan | Hasil |
|---|---|
| `npm run test` | 3 berkas / 108 tes lulus |
| Kendali negatif | `net_sales` digeser $1,00 membuat tepat 2 tes gagal (ANC-03 dan kesamaan byte), lalu berkas dikembalikan identik |
| `npm run typecheck` | bersih |
| `npm run lint` | 0 galat / 6 peringatan |
| `npm run format:check` | bersih |
| `npm run build` | sukses (CSS 52,08 KB, JS 823,81 KB / 250,72 KB gzip) |

### 16.3 Keputusan setelah verifikasi

1. Permintaan menyalin ke `public/data/dashboard_data.json` tidak dijalankan: `DATA_CONTRACT.md`
   menetapkan 9 berkas, dan frontend membaca 9 berkas itu. Disetujui tetap 9 berkas, tanpa
   sumber kebenaran kedua.
2. Agregat filter yang belum disiapkan awalnya **tidak** ditambahkan dan dicatat sebagai
   keterbatasan yang sudah dinyatakan di UI (label cakupan "seluruh periode" dan catatan pada
   bilah filter).
3. **Opsi B dipilih (mvp-4)**: empat kubus panel $Period \times$ `day_type`/`delivery_status`/
   `discount_bracket`/`region` ditambahkan ke `filter-cubes.json`, sehingga panel status kirim dan
   rekap status order mengikuti rentang bulan (dan panel serupa di halaman berikutnya). Konsekuensi
   ukuran: `filter-cubes.json` 200,5 → 430,8 KB; `public/data` 235,9 → 466,5 KB. Tidak ada metrik,
   rumus, atau angka yang berubah: setiap baris adalah agregat ulang basis C, diuji menjumlah ke
   total resmi dan mereproduksi jumlah order per nilai yang sudah tampil di panel global.
   Kombinasi rentang $\times$ dimensi filter $\times$ dimensi panel tetap tidak tersedia, dan itu
   dituliskan di lencana serta catatan panel (lihat §16.4).

### 16.4 Agregat filter yang belum tersedia (diperbarui untuk mvp-4)

| Sel yang belum ada | Akibat |
|---|---|
| Kubus dua dimensi atau lebih (`segment × sales_channel`, …) | Filter global hanya satu dimensi sekaligus; memilih dimensi baru menggantikan yang lama |
| `period × dimensi filter × dimensi panel` | Panel status kirim/status order/bracket diskon/wilayah mengikuti rentang periode saja; filter dimensi tidak berlaku di sana (dicatat di lencana cakupan dan catatan panel) |
| `period × marketing_channel` | Sebaran anomali per marketing channel selalu seluruh periode |
| Metode pembayaran, metode kirim, gudang, negara pelanggan | Belum ada agregat sama sekali (tidak termasuk kontrak) |

Empat baris tabel versi mvp-3 (`period × day_type`, `period × delivery_status`,
`period × discount_bracket`, `period × region`) **sudah selesai** dan tidak lagi menjadi keterbatasan.

### 16.5 Eksekusi ulang mvp-4 (opsi B)

| Item | Hasil |
|---|---|
| Perintah | `.venv/Scripts/python.exe scripts/prepare_dashboard_data.py` |
| Kode keluar | 0 |
| Rekonsiliasi internal | **112 OK / 0 FAIL** (84 lama + 12 jumlah tiap kubus panel + 16 jumlah order per nilai) |
| Keluaran | 9 JSON di `data/processed/` dan `public/data/` (466,5 KB mentah / **51,9 KB gzip**; `filter-cubes.json` 430,8 KB mentah / 44,2 KB gzip, 1.640 baris kubus) |
| `data/source/` | tidak berubah |
| Determinisme | eksekusi ulang berikutnya hanya mengubah `generated_at` di `dashboard-summary.json` dan `metadata.json`; 9 berkas lain identik |
| `data/processed` = `public/data` = `dist/data` | byte-identical (SHA256 9/9) |
| Uji agregasi filter (skrip sementara di luar repo) | **224 OK / 0 FAIL**: 4 rentang bulan × (status kirim, status order) dibandingkan dengan rekomputasi basis C langsung dari CSV sumber, rentang penuh dibandingkan dengan payload global, dan filter dimensi terbukti tidak mengubah panel |
| Uji permanen | `npm run test` 3 berkas / 108 tes lulus |
| Kendali negatif 1 | satu baris kubus `delivery_status` dinaikkan +1 order di `public/data` → tepat 3 tes gagal (salinan byte-for-byte, jumlah kubus, jumlah per nilai); berkas dikembalikan identik |
| Kendali negatif 2 | geseran yang sama di `data/processed` → halaman menampilkan galat rekonsiliasi dan 3 tes integrasi gagal; berkas dikembalikan identik (SHA256 9/9 cocok lagi) |
| Probe DOM headless (`--dump-dom`, build produksi) | 8 lencana "Seluruh periode 2021-2025", 0 lencana "Mengikuti rentang periode" (benar, tanpa filter), angka `$157.143.214` / `$59.232.305` / `37,69%` / `138.116`, caption status kirim `62,93% · 86.916 order`, empat baris tabel status (35,96% / 36,11% / 48,37% / 48,44%), tanpa `ErrorState`, konsol tanpa galat |

---

## 17. Fondasi desain dan tema ganda (mvp-4, tanpa perubahan data)

Implementasi fondasi desain: token, tema gelap, tipografi, radius, kontrol bersama. Tidak ada
angka bisnis yang berubah; `data/source/`, `data/processed/`, dan `public/data/` tidak disentuh.

### 17.1 Mekanisme

| Aspek | Implementasi |
|---|---|
| Token | `src/index.css`: `:root` (terang) + `.dark` (gelap) dengan daftar nama yang identik; dipetakan ke utilitas Tailwind melalui `@theme inline` |
| Sakelar | Kelas `.dark` + `data-theme` + `style.colorScheme` pada `<html>`; hanya warna berubah, dimensi & radius sama |
| Preferensi | `localStorage["dashboard.theme"]` = `light` \| `dark` \| `system` (bawaan `system`, ikut `prefers-color-scheme`) |
| Tanpa kilasan | Skrip inline `index.html` di `<head>` menerapkan tema sebelum paint; logika duplikatnya dijaga tes |
| Kontrol | `ThemeToggle` di `TopHeader`: Terang → Gelap → Sistem dengan `aria-label` mode aktif dan berikutnya |
| Skala tipe | Token `text-display/h1/h2/h3/body/caption/micro` (DESIGN_BRIEF §4); radius `12/10/16px`; fokus `ring-2 ring-ring` |

### 17.2 Berkas

| Berkas | Perubahan |
|---|---|
| `src/index.css` | Token terang+gelap lengkap, `--primary-hover`, skala tipe, skala radius, `prefers-reduced-motion`, `@utility` gradasi tetap |
| `src/lib/theme.ts`, `src/app/ThemeProvider.tsx` | Resolusi mode, penyimpanan, pemantauan `matchMedia`, `applyTheme` |
| `src/components/layout/ThemeToggle.tsx` | Tombol siklus tema tiga mode |
| `src/components/ui/input.tsx` | Gaya input bersama (h-9, `border-input`, `bg-card`, fokus `ring-2`) — sebelumnya belum ada |
| `src/components/ui/button.tsx` | `hover:bg-primary-hover` dan fokus `ring-2 ring-ring` (sebelumnya `ring-3 ring-ring/50` dan hover `/80`) |
| `src/components/ui/{card,select}.tsx` | Radius kartu 16,8 → 12px; isi dropdown 12px; fokus select `ring-2 ring-ring` |
| `KpiCard`, `SelectField`, `ChartCard`, `TopHeader`, `AppShell`, `GlobalFilterBar` | Memakai token tipe (`text-display`, `text-caption`, `text-micro`) |
| `index.html` | Skrip tema pra-paint |
| `vitest.config.ts` | `test.css: true` agar tes token bisa membaca `src/index.css?raw` |
| `tests/theme.test.tsx`, `tests/design_tokens.test.ts` | 8 + 14 tes baru (paritas token, kontras, skrip pra-paint) |
| `docs/DESIGN_BRIEF.MD` §6/§7/§15 | Nilai implementasi, deviasi, status, kontras terukur |
| `docs/IMPLEMENTATION_BLUEPRINT.md` §5.2/§5.3/§5.4/§15.6/§17 | Status token, skala tipe, radius, sakelar tema |

### 17.3 Verifikasi

| Item | Hasil |
|---|---|
| `npm run test` | 5 berkas / **130 tes lulus** (tidak ada tes lama yang diubah) |
| `npm run typecheck` | bersih |
| `npm run lint` | 0 galat, 7 peringatan `react-refresh/only-export-components` (pola lama + `ThemeProvider`) |
| `npm run format:check` | bersih |
| `npm run build` | sukses; CSS 53,10 kB (gzip 10,38 kB), JS 826,47 kB (gzip 251,49 kB) |
| `dist/data` = `public/data` | SHA256 identik |
| Probe peramban (Chrome headless, build produksi) | Tema gelap: `class="dark"`, body `rgb(9,13,22)`/`rgb(248,250,252)`, kartu `rgb(15,23,42)` radius 12px; tema terang: body `rgb(243,245,250)`, kartu putih radius 12px |
| Dimensi antar tema | Tinggi kartu KPI 171px, tombol 32px, select/input 36px, radius 12/10/10px, angka KPI 30px/33px/-0,75px/600 — **identik** di kedua tema |
| Siklus tombol tema (klik nyata) | Terang → Gelap (`class="dark"`, `stored=dark`) → Sistem (mengikuti `prefers-color-scheme` peramban, terbukti tetap gelap karena peramban headless memilih gelap) |
| Grafik | Stop gradien `rgb(124,58,237)` (terang) vs `rgb(167,139,250)` (gelap); stroke kurva `chart-1`/`chart-2`/`chart-3` sesuai tema; panjang jalur identik antar tema |
| Dropdown | `opacity` terhitung = 1, latar `rgb(255,255,255)` / `rgb(15,23,42)`, radius 12px |
| Tangkapan layar | 1440px terang & gelap, 390px gelap, dua tangkapan dropdown — diperiksa manual |
| Kontras | Semua pasangan teks ≥ 4,5:1 dan non-teks ≥ 3:1 di kedua tema, kecuali batas kontrol tema terang (1,35:1, deviasi sengaja; DESIGN_BRIEF §15.4) |

### 17.4 Sisa dan batasan

1. Batas kontrol tema terang `--input` (1,35:1) di bawah WCAG 1.4.11, deviasi sengaja dan dijaga tes.
2. Zoom 200%, urutan Tab nyata, dan pembaca layar belum diuji; verifikasi fokus baru sebatas
   keadaan `:focus-visible` lewat `focus({focusVisible:true})`.
3. Kilasan tema diverifikasi struktural (urutan skrip + tes), bukan perekaman first paint.
4. Tangkapan headless kadang membekukan animasi masuk (Recharts, fade dropdown); keadaan akhir
   dipastikan lewat *computed style*, bukan lewat tangkapan.

---

## 18. Halaman Ringkasan Eksekutif: tren terpisah, wawasan bisnis, perbaikan donut (mvp-4)

Revisi tata letak halaman Ringkasan Eksekutif sesuai permintaan milestone. Tidak ada angka bisnis
atau berkas data yang berubah: `data/source/`, `data/processed/`, dan `public/data/` tetap
byte-identik, dan seluruh perhitungan tetap memakai payload pipeline yang sama.

### 18.1 Perubahan

| Aspek | Sebelum | Sesudah |
|---|---|---|
| Tren | Satu panel "Tren bulanan net sales & profit" | Dua panel: "Tren penjualan bersih bulanan" (area net sales + garis margin putus-putus di sumbu kanan) dan "Tren laba bulanan" (area profit) |
| Legenda | Tidak ada (hanya tooltip) | Baris legenda eksplisit di atas plot; bentuk (area vs garis putus-putus) jadi pembeda utama, warna hanya pendukung |
| Tooltip | Net sales + profit + margin + rata-rata transaksi + order | Metrik panel + margin keseluruhan + rata-rata transaksi (sekunder) + order; judul "Bulan Tahun" |
| Wawasan bisnis | Belum ada | Panel "Wawasan bisnis" berisi 4 kartu: bulan net sales tertinggi, bulan laba tertinggi, status order dominan, dan segmen penyumbang laba terbesar |
| Keadaan kosong | Hanya panel tren | Panel tren (2×), status pengiriman, tabel status order, dan wawasan bisnis sama-sama punya `EmptyState` |
| Urutan panel | KPI → ringkasan → tren+k donat → musiman+pengiriman → tabel status | KPI → ringkasan seluruh periode → tren net sales → tren laba → komposisi + musiman → status pengiriman + tabel status order → wawasan bisnis |
| Donut segmen | Tata letak baris pada kolom 1/3: wadah plot terhimpit 48px (cacat lama) | Tumpuk vertikal: plot 240×220 penuh, legenda di bawah |

Aturan angka pada panel wawasan: hanya **pemeringkatan nilai yang sudah tersedia** (argmax dari
kubus bulanan terfilter) dan **porsi tampilan Σbagian ÷ Σtotal** (`sharePct`). Tidak ada proyeksi,
perbandingan antar-periode, atau persentase pertumbuhan. Setiap kartu mencantumkan cakupannya
sendiri (`Mengikuti filter` / `Mengikuti rentang periode` / `Seluruh periode 2021-2025`) karena
kubus bulanan mengikuti filter, sedangkan status order period-only dan segmen whole-period.
Berkas: `src/features/executive-overview/insights.ts` (fungsi murni, teruji) dan
`BusinessInsights.tsx` (penyajian).

### 18.2 Berkas yang berubah

| Berkas | Perubahan |
|---|---|
| `src/components/charts/TrendAreaChart.tsx` | Parameter `metric: 'net_sales' \| 'profit'`; garis margin hanya pada net sales; legenda eksplisit; tooltip mengikuti metrik |
| `src/features/executive-overview/insights.ts` | Baru: `buildInsights()` (pemeringkatan + porsi, tanpa angka baru) |
| `src/features/executive-overview/BusinessInsights.tsx` | Baru: kartu wawasan + pill cakupan per kartu + keadaan kosong |
| `src/features/executive-overview/ExecutiveOverviewPage.tsx` | Dua panel tren, urutan panel, `EmptyState` tambahan, panel wawasan |
| `src/components/charts/ProfitShareDonut.tsx` | Tata letak donut ditumpuk (perbaikan cacat wadah 48px) |
| `tests/executive-overview.test.tsx` | 5 tes baru (tren terpisah + legenda, wawasan vs payload, cakupan 2024, keadaan kosong, larangan kosakata pertumbuhan) |
| `docs/PRD.md` §5.1 D | Catatan status implementasi tata letak |

### 18.3 Verifikasi

| Item | Hasil |
|---|---|
| `npm test` | 5 berkas / **135 tes lulus** (8 di antaranya tes halaman Ringkasan Eksekutif) |
| `npm run typecheck` / `format:check` | bersih |
| `npm run lint` | 0 galat, 7 peringatan lama (tidak bertambah) |
| `npm run build` | sukses; CSS 53,62 kB (gzip 10,45), JS 829,96 kB (gzip 252,37) |
| Verifier independen (`verify_exec_overview.py`) | **58 OK / 0 FAIL**: monthly = summary = rekonsiliasi CSV (`panel-ranges.json`), margin keseluruhan 37,69 = Σprofit ÷ Σnet sales, kubus status/kirim cocok untuk 4 rentang uji, kubus segmen = kubus bulanan |
| Probe DOM Chrome headless (build produksi) | Terang & gelap: **12/12** nilai (4 KPI + 4 pasang nilai/detail wawasan) sama persis dengan `expected.json` yang dihitung dari `data/processed/` |
| Urutan & judul panel | Terbukti dari DOM: Ringkasan seluruh periode → Tren net sales → Tren laba → Komposisi → Musiman → Status pengiriman → Status order → Wawasan bisnis |
| Tema & geometri | Terang: body `rgb(243,245,250)`, kartu putih, stroke `rgb(124,58,237)`/`rgb(236,72,153)`; gelap: body `rgb(9,13,22)`, kartu `rgb(15,23,42)`, stroke `rgb(167,139,250)`/`rgb(244,114,182)`; tinggi kartu KPI 171px, legenda 11px, plot tren 300px — identik antar tema |
| Kosakata pertumbuhan | `hasGrowthWords=false` di kedua tema (regex pertumbuhan/meningkat/menurun/naik/turun/YoY) |
| Donut | Wadah plot 48×220 → **240×220**; cincin penuh terlihat di tangkapan terang & gelap |
| Tangkapan layar | 1440px terang & gelap, 390px gelap — diperiksa manual |

### 18.4 Sisa dan batasan

1. Grafik belum punya alternatif tabel per bulan atau nilai yang dapat difokuskan lewat papan tik;
   tooltip masih khusus penunjuk tetikus. Kandidat item berikutnya (belum diminta).
2. Tick sumbu net sales memakai rentang otomatis Recharts ($0/$2 jt/$3 jt/$5 jt/$6 jt), belum
   langkah seragam; masih terbaca, dapat dibuat manual bila diminta.
3. Wawasan sengaja hanya memeringkat dan menghitung porsi; tidak ada perbandingan periode karena
   data pembanding per rentang arbitrer belum divalidasi.
4. Tangkapan headless masih bisa membekukan animasi masuk Recharts; keadaan akhir dipastikan lewat
   probe DOM (`wrapper` 240×220, legenda, nilai teks), bukan hanya piksel.

---

## 19. Filter global gabungan: kubus `combined` (mvp-5)

### 19.1 Keputusan

1. Kubus gabungan $Period \times Segment \times Sales\,Channel \times Status\,Order$ (`cubes.combined`, 3.666 baris berisi order; 174 kombinasi kosong tidak ditulis) menjadi sumber tunggal semua kombinasi filter global. Ukuran dibatasi pada yang aditif: `orders`, `net_sales`, `profit`.
2. Kubus satu-dimensi (`segment`, `sales_channel`, `order_status`) tetap ada sebagai marginal terverifikasi; pipeline mewajibkan marginalnya sama persis dengan kubus gabungan, sehingga angka terfilter dan tak terfilter tidak mungkin berbeda.
3. Kubus panel (`day_type`, `delivery_status`, `discount_bracket`, `region`) tetap hanya mengikuti rentang bulan; saat filter dimensi aktif, panelnya disembunyikan dengan penjelasan, bukan ditampilkan tanpa filter di samping KPI terfilter.
4. Ukuran non-aditif (`customers`, `avg_transaction_margin_pct`) tidak dibawa kubus gabungan: panel "Ringkasan seluruh periode" tetap acuan seluruh dataset berlabel, dan rata-rata margin transaksi sekunder disembunyikan saat ada filter dimensi aktif.
5. Tahun tidak disimpan ganda; nilainya diturunkan dari rentang bulan (`rangeYear`). Opsi "Rentang kustom" selalu ter-mount (nonaktif + tersembunyi) karena basis-ui me-reset pilihan ke nilai awal bila item terpilih dilepas dari daftar saat popup terbuka.

### 19.2 Berkas yang berubah

- Data: `scripts/prepare_dashboard_data.py` (builder `build_combined_cube`, definisi kubus, DECISIONS `cross_filter_source`/`combined_cube_measures`, catatan kubus), keluaran `mvp-5` di `data/processed/` + `public/data/` (identik byte).
- Frontend: `src/lib/filter.ts` (state filter 5 bidang, `selectScopedRows`, pembangun tren/segmen/musiman), `src/app/FilterProvider.tsx`, `src/components/layout/GlobalFilterBar.tsx` (+ `SelectField.tsx`), `src/features/executive-overview/ExecutiveOverviewPage.tsx` + `insights.ts` + ketiga grafik panel, tipe `FilterCubes.combined` di `src/lib/types.ts` dan `loadDashboardData.ts`.
- Tes: `tests/global-filter.test.tsx` (baru, 18 tes), `tests/executive-overview.test.tsx` (ditulis ulang, 13 tes), `tests/data_integrity.test.ts` (mvp-5 + integritas kubus gabungan).
- Dokumen: `docs/DATA_CONTRACT.md` (§1.1 riwayat versi, §3.9, §4.1–4.2, decisions), `docs/PRD.md` (§4.1–4.2, §5.1 E/F, §7.1–7.2, §8), `docs/METRIC_DICTIONARY.md` (`ANC-28`–`ANC-32`).

### 19.3 Verifikasi

| Item | Hasil |
|---|---|
| Pipeline (`prepare_dashboard_data.py`) | **119 OK / 0 FAIL**; pemeriksaan kubus gabungan: total = anchor global, marginal per bulan/segmen/channel/status = kubus satu-dimensi; `filter-cubes.json` 1.313.725 B (gzip 109.185 B), total 9 berkas 1.350.461 B (gzip 117.324 B) |
| Verifier independen (`verify_filters.py`) | anchor CSV: VIP 13.957 / 15.931.220,10 / 5.634.959,06; Website 48.237 / 54.871.164,50 / 20.722.164,95; Completed 113.559 / 127.907.006,57 / 45.998.727,67; combo 2024+Consumer+Website+Completed 4.340 / 4.815.590,47 / 1.824.763,78; combo 2023+Premium+Mobile App+Returned 194 / 251.269,28 / 117.687,74 |
| `npm test` | 6 berkas / **164 tes lulus** (18 tes filter global, 13 tes halaman Ringkasan Eksekutif) |
| `npm run typecheck` / `format:check` | bersih |
| `npm run lint` | 0 galat, 7 peringatan lama (tidak bertambah) |
| `npm run build` | sukses; CSS 53,54 kB (gzip 10,45), JS 833,40 kB (gzip 253,13); `dist/data` identik byte dengan `public/data` (9/9 SHA-256 sama) |
| Probe DOM + tangkapan Chrome headless (build produksi) | KPI default cocok anchor (157.143.214 / 59.232.305 / 37,69% / 138.116, format id-ID); bar filter 6 kontrol tampil di tema terang & gelap; penanda "Tanpa filter" dengan tombol hapus nonaktif; tanpa spanduk keadaan kosong |

### 19.4 Batasan yang tersisa

- Interaksi filter penuh (kombinasi, keadaan kosong, hapus filter, KPI vs tren) diverifikasi lewat tes RTL dengan data nyata; probe headless hanya memeriksa tampilan awal.
- Kubus panel tetap tidak dapat digabungkan dengan filter dimensi; dimensi lain (Marketing Channel, metode pembayaran/kirim, gudang, negara) menunggu kubus tambahan sebelum bisa difilter.
- Rata-rata margin transaksi sekunder dan panel status pengiriman disembunyikan saat filter dimensi aktif (bukan dihitung ulang dari data mentah).

---

## 14. Cara peninjau memeriksa dokumen ini

1. Keputusan Q1-Q5 sudah final (§0.2) dan sudah dilaksanakan pada tahap data (M2b). Cek hanya
   bila ada yang ingin diubah.
2. Periksa §3: cakupan filter global dan pengaruhnya ke tiap panel.
3. Periksa §4, §4.1, §4.2: daftar metrik yang ditampilkan, yang tidak ditampilkan, dan yang baru
   tersedia.
4. Periksa §5: token warna dan gaya kartu.
5. Periksa §11: kriteria penerimaan dan rencana pengujian.
6. Rujuk silang: `docs/PRD.md`, `docs/METRIC_DICTIONARY.md`, `docs/DATA_CONTRACT.md`,
   `docs/EDA_VALIDATION.md`.
