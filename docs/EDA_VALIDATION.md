# Validasi EDA

Status: Audit Fase 1 selesai. Semua angka di bawah ini dihitung ulang langsung dari file CSV
di `data/source/`, lalu dibandingkan dengan hasil tersimpan dan tulisan Markdown di
`eda_analysis.ipynb` dan `data_profiling.ipynb`.

Cakupan fase ini: hanya audit. Dataset sumber, notebook, dan file frontend tidak diubah.
Belum ada pekerjaan frontend yang dimulai.

## 1. Cara pemeriksaan dan cara mengulangnya

Semua angka di dokumen ini dihitung ulang memakai virtual environment proyek
(`.venv/Scripts/python.exe`, pandas 3.0.6 / numpy 2.5.3) dengan membaca CSV langsung dari
`data/source/`. Skrip bersifat hanya-baca dan dijalankan dari file sementara di luar
repositori:

- `audit_schema.py` — cek skema, grain, kunci, nilai kosong, dan nilai kategori
- `audit_metrics.py` — total, cek rumus, bracket diskon, aturan anomali, segmen,
  pelanggan berulang, bulanan, tahunan
- `audit_items.py` — rekonsiliasi `order_items` dengan tabel fakta, join level produk
- `audit_extra.py` — perilaku diskon Q4, order rugi, selisih definisi margin, CLV
- `audit_formula.py` — penemuan rumus pasti `net_sales` dan `profit`
- `dump_notebook_eda.py` / `dump_prof.py` — ekstraksi Markdown dan output tersimpan notebook

Setiap angka berlabel **Terverifikasi** bisa dihasilkan ulang dari skrip di atas pada file
yang sekarang. Angka yang hanya diambil dari output notebook dan tidak bisa dihitung ulang
diberi label **Belum terverifikasi**.

Keterbatasan lingkungan: `notebook`, `jupyterlab`, dan `jupyter_server` tidak terpasang.
Notebook tidak bisa dijalankan menyeluruh ("Run All" tidak tersedia). Yang bisa diperiksa
hanya resolusi path dan pemuatan CSV di luar notebook.

## 2. Daftar data

| File | Peran | Baris | Kolom | Grain | Kunci |
|---|---|---|---|---|---|
| `data/source/ecommerce_sales_customer_analytics_150k.csv` | Tabel fakta (order) | 138.116 | 46 | 1 baris per order | `order_id` unik, 0 duplikat |
| `data/source/customer_master.csv` | Dimensi pelanggan | 25.000 | 11 | 1 baris per pelanggan | `customer_id` unik, 0 duplikat |
| `data/source/product_catalog.csv` | Dimensi produk | 1.175 | 9 | 1 baris per produk | `product_id` unik, 0 duplikat |
| `data/source/order_items.csv` | Tabel baris pesanan | 397.569 | 12 | 1 baris per baris pesanan (rencana) | `order_id` + `product_id`; ada 87 pasangan duplikat (pelanggaran grain) |
| `data/source/dataset_statistics.csv` | Kartu ringkasan | 1 | 11 field | Satu baris ringkasan | Label sebagian salah (lihat I-6) |

Rentang tanggal terverifikasi: 2021-01-01 sampai 2025-12-31, 1.826 hari berbeda. Tahun 2025
lengkap, bukan sebagian. Jumlah baris per tahun datar: 27.554 / 27.564 / 27.632 / 27.768 / 27.598.

Keutuhan relasi (Terverifikasi, seluruh data):
- `sales.customer_id` yang tidak ada di `customer_master`: 0 baris.
- `order_items.product_id` yang tidak ada di `product_catalog`: 0 baris (1.175 dari 1.175 produk dipakai).
- `order_items.order_id` dan `sales.order_id` cocok 1:1 di kedua arah (138.116 order).
- 24.911 dari 25.000 pelanggan master muncul di tabel fakta; 89 tidak pernah bertransaksi.
- Tidak ada baris duplikat persis di tabel fakta.

## 3. Total keuangan terverifikasi (dihitung ulang dengan float64)

| Metrik | Nilai | Kolom sumber |
|---|---|---|
| Gross sales | 189.962.560,88 | `gross_sales` |
| Discount amount | 32.819.346,82 | `discount_amount` |
| Tax amount | 16.914.090,41 | `tax_amount` |
| Shipping cost | 3.076.959,27 | `shipping_cost` |
| Net sales | 177.134.263,74 | `net_sales` |
| Product cost | 97.910.908,71 | `product_cost` |
| Profit | 76.146.395,76 | `profit` |
| Margin keseluruhan (total profit / total net sales) | 42,99% | turunan |
| Rata-rata margin transaksi (rerata margin per baris) | 45,07% | `profit_margin_percentage` |
| Average order value (net) | 1.282,50 | `net_sales` / jumlah baris |
| Rata-rata rating pelanggan | 3,677 | `customer_rating` |
| Tingkat retur (`order_status == 'Returned'`) | 6,8508% | `order_status` |
| Tingkat pembatalan (`order_status == 'Cancelled'`) | 6,0804% | `order_status` |

`dataset_statistics.csv` cocok dengan total net sales dan profit di atas. Notebook menulis
`177.134.272,00` dan `76.146.400,00` karena memakai `float32`; selisihnya pembulatan
(~$8 dan ~$4), bukan perbedaan data.

## 4. Rumus pasti (hasil penemuan rumus)

Ini ditemukan dengan menguji kandidat rumus baris per baris untuk seluruh 138.116 baris.

- `net_sales = gross_sales - discount_amount + tax_amount + shipping_cost` — eksak,
  simpangan absolut maksimum 0,00 di semua baris.
- `profit = net_sales - product_cost - shipping_cost` — eksak, simpangan absolut maksimum 0,00
  (setara `profit = gross_sales - discount_amount + tax_amount - product_cost`).
- `profit_margin_percentage = profit / net_sales * 100`, disimpan dibulatkan ke 2 desimal
  (simpangan maksimum 0,005; 110.453 baris berbeda karena pembulatan di desimal ke-3).

Akibatnya:

- Dataset tidak mengikuti aturan buku teks "net = gross - discount". Pajak dan ongkir
  ditambahkan ke net sales, dan ongkir dikurangi dari profit. Ongkir jadi pemasukan
  sekaligus biaya di skema ini.
- `eda_analysis.ipynb` cell 6 memperingatkan bahwa
  `net_sales != gross_sales - discount_amount` (simpangan maks $2.135,92) dan
  `profit != net_sales - product_cost` (simpangan maks $149,52). Peringatan itu bukan bukti
  data salah. Itu akibat menguji rumus yang keliru. Dataset konsisten dengan rumus di atas.
- Margin berbasis persentase harus selalu dihitung ulang dari kolomnya; jangan memakai
  rumus revenue buku teks.

## 5. Temuan metrik terverifikasi

### 5.1 Tabel bracket diskon (berhasil direproduksi persis)

Definisi bracket: `discount_rate = discount_amount / gross_sales * 100`, bin
0% / 1-10% / 11-20% / 21-30% / 30%+. Pembagian lengkap dan saling lepas (jumlah bracket =
138.116).

| Bracket | Transaksi | Rata-rata margin transaksi | Profit per transaksi | Baris rugi |
|---|---|---|---|---|
| 0% | 17.864 | 54,11% | 722,12 | 0 |
| 1-10% | 35.031 | 51,05% | 623,79 | 0 |
| 11-20% | 49.198 | 46,66% | 543,42 | 0 |
| 21-30% | 17.729 | 40,34% | 506,00 | 0 |
| 30%+ | 18.294 | 25,06% | 310,94 | 1.296 |

Nilai yang direproduksi sama persis dengan `eda_analysis.ipynb` cell 21. Korelasi antara
`discount_rate` dan `profit_margin_percentage` adalah -0,707 (cell 19, dikonfirmasi).

Fakta tambahan yang belum ditulis di notebook:

- Bracket diskon bukan keranjang yang sebanding: rata-rata kuantitas naik seiring
  kedalaman diskon (4,98 / 4,84 / 5,21 / 6,50 / 7,94 unit) dan rata-rata net sales tidak
  monoton (1.373 / 1.267 / 1.212 / 1.345 / 1.354). Order berdiskon dalam cenderung
  keranjang lebih besar, jadi selisih margin antar bracket sebagian berasal dari komposisi
  keranjang. Korelasi `discount_rate` dengan `quantity` +0,283; dengan `net_sales` hampir
  nol (+0,001).
- Semua 1.296 order rugi (0,94% baris, total rugi -201.225,34) ada di bracket 30%+, di mana
  7,08% baris rugi. Angka total rugi cocok dengan `data_profiling.ipynb` cell 11.
- Lonjakan margin antar bracket: -3,06, -4,39, -6,32, dan -15,29 poin persentase.
  Perubahan tajam ada di 30%+, bukan 20%. Langkah 21-30% ke 30%+ adalah 2,4 kali langkah
  sebelumnya.

### 5.2 Erosi margin di garis diskon 20%

| Subset | Transaksi | Rata-rata margin transaksi | Margin keseluruhan |
|---|---|---|---|
| Diskon <= 20% | 102.093 | 49,47% | 47,85% |
| Diskon > 20% | 36.023 | 32,58% | 30,15% |
| Selisih | | 16,89 pp | 17,70 pp |

Klaim "16,9 poin persentase" di `eda_analysis.ipynb` cell 1 dan 33 Terverifikasi pada basis
rata-rata margin transaksi. Pada basis margin keseluruhan selisihnya 17,70 pp. Notebook baru
menyebut basisnya di cell 23.

### 5.3 Anomali revenue tinggi, margin rendah

Aturan (sesuai kode di `eda_analysis.ipynb` cell 26): `net_sales >= persentil ke-75` DAN
`profit_margin_percentage <= persentil ke-25`. Ambang: $1.744,58 dan 38,88%.

| Varian | Jumlah | Porsi | Revenue | Profit | Rata-rata margin |
|---|---|---|---|---|---|
| Ketat (`>` Q3 dan `<` Q1) | 11.659 | 8,44% | 34,89M | 9,63M | 27,39% |
| Inklusif (`>=` Q3 dan `<=` Q1) | 11.673 | 8,45% | 34,93M | 9,65M | 27,40% |

Kedua jumlah bisa direproduksi. Selisih 14 baris sepenuhnya karena nilai yang tepat berada
di ambang persentil. `data_profiling.ipynb` (ketat, 11.659) dan `eda_analysis.ipynb` cell 26
(inklusif, 11.673) memakai operator berbeda; keduanya konsisten dengan aturannya masing-masing.
Masalahnya adalah kedua dokumen saling bertentangan, bukan salah satu salah.

Perkiraan opportunity gap (angka "profit hilang") bergantung definisi:

| Basis | Nilai |
|---|---|
| Rata-rata margin baris, set ketat (seperti di `data_profiling.ipynb`) | 6,09M |
| Rata-rata margin baris, set inklusif (dihitung ulang) | 6,17M |
| Margin keseluruhan, set inklusif (dihitung ulang) | 5,44M |

Sebaran anomali antar dimensi lemah (Terverifikasi, set inklusif):
- Sales channel: 8,26% (Social Media) sampai 8,76% (Marketplace).
- Region: 6,35% (North) sampai 9,26% (East).
- Marketing channel: 8,06% (Direct) sampai 9,03% (Email Marketing).

Tingkat keseluruhan 8,45%, jadi semua dimensi hanya sekitar +/-1 pp dari tingkat dasar.
Notebook menyebut ini "channel dan region spesifik dengan tingkat anomali tinggi" (cell 41);
sebarannya nyata tetapi kecil, dan tidak ada dimensi di atas 9,3%.

### 5.4 Segmen pelanggan (Terverifikasi, cocok cell 32 dan 33)

| Segmen | Transaksi | Pelanggan | Net sales | Profit | Margin rata-rata | Porsi profit | Rata-rata diskon (rerata baris) |
|---|---|---|---|---|---|---|---|
| Consumer | 75.636 | 13.585 | 97.201.008 | 42.819.792 | 46,09% | 56,23% | 13,70% |
| Premium | 34.746 | 6.275 | 44.269.800 | 18.177.728 | 43,22% | 23,87% | 17,70% |
| Business | 13.777 | 2.515 | 17.760.296 | 7.782.525 | 45,99% | 10,22% | 13,80% |
| VIP | 13.957 | 2.536 | 17.903.164 | 7.366.353 | 43,20% | 9,67% | 17,78% |

- Profit per pelanggan: Consumer 3.151,99; Business 3.094,44; VIP 2.904,71; Premium 2.896,85.
  Consumer tertinggi, bukan Premium/Business (lihat S-2).
- Rata-rata diskon per segmen bergantung definisi: VIP 17,78% sebagai rerata persentase
  per baris dan 20,20% jika dibobot gross sales. Notebook memakai basis rerata baris.
- Margin per segmen di atas adalah rerata margin baris. Margin keseluruhan per segmen tidak
  dilaporkan notebook dan nilainya lebih rendah (selisih gabungan 2,08 pp).

### 5.5 Analisis pelanggan berulang (jumlah Terverifikasi, metode tidak valid)

`is_repeat_customer` bernilai True untuk 137.782 dari 138.116 transaksi (99,76%). Hanya 334
transaksi yang first-time. Perbandingan margin per segmen (cell 37 dan 38) berhasil
direproduksi persis: Business 47,69 / 45,99, Consumer 47,37 / 46,08, Premium 43,57 / 43,22,
VIP 44,35 / 43,19. Selisih repeat dikurangi first-time negatif di keempat segmen
(-1,70, -1,29, -0,34, -1,15 pp).

Batas penafsiran: grup first-time hanya 36, 177, 88, dan 33 transaksi. Sampel sekecil itu
tidak bisa mendukung kesimpulan retensi ke arah mana pun. `customer_type` memberi definisi
kedua yang bertentangan: 129.447 Loyal / 8.335 Returning / 334 New. Jumlah "New" (334) sama
dengan jumlah first-time, tetapi "Returning" (8.335) tidak selaras dengan
`is_repeat_customer` (137.782), jadi kedua kolom tidak bisa disatukan tanpa aturan resmi.

Fakta pelanggan berulang di level pelanggan (Terverifikasi):
- Order per pelanggan: rata-rata 5,544, median 5, minimum 1, maksimum 19.
- Pelanggan dengan lebih dari satu order: 24.387 dari 24.911 (97,90%).
- `customer_order_count` sama dengan jumlah order sebenarnya hanya untuk 62,17% pelanggan
  (rata-rata 6,02 vs sebenarnya 5,54; maksimum 20 vs 19). Kolom ini bukan sumber andal
  untuk jumlah order.

### 5.6 Musiman (Terverifikasi)

Digabung 2021-2025, per bulan:

| Bulan | Net sales | Rata-rata margin transaksi | Margin keseluruhan |
|---|---|---|---|
| Jan-Okt | 12,2M-15,1M per bulan | 46,74%-49,32% | ~47,5% |
| Nov | 21.524.457 | 35,08% | 32,55% |
| Des | 23.298.458 | 35,17% | 32,95% |

- Rata-rata margin transaksi Nov-Des: 35,13%. Jan-Okt: 48,26%. Keduanya Terverifikasi;
  klaim "35%" di cell 13 Terverifikasi pada basis rerata baris.
- Penurunan margin disertai diskon jauh lebih dalam: rata-rata tingkat diskon 27,56% pada
  Nov-Des versus 11,11% pada Jan-Okt (terbobot 30,24% vs 11,71%). Kaitan ini terverifikasi
  secara deskriptif dan tidak diperiksa di notebook.
- Juli juga bulan turun (margin rerata 42,55%, rata-rata tingkat diskon 20,00%). Tidak
  disebut di notebook.
- Margin keseluruhan Kuartal 4 gabungan 38,72% (cell 15), kuartal terendah.

### 5.7 Tren tahunan (Terverifikasi; bertentangan dengan narasi "pertumbuhan")

| Tahun | Transaksi | Net sales | Profit | Margin rata-rata | YoY revenue | YoY profit |
|---|---|---|---|---|---|---|
| 2021 | 27.554 | 35.722.651 | 15.325.652 | 44,95% | - | - |
| 2022 | 27.564 | 35.327.884 | 15.167.980 | 45,01% | -1,11% | -1,03% |
| 2023 | 27.632 | 35.528.144 | 15.247.695 | 45,01% | +0,57% | +0,53% |
| 2024 | 27.768 | 35.466.452 | 15.292.965 | 45,20% | -0,17% | +0,30% |
| 2025 | 27.598 | 35.089.136 | 15.112.104 | 45,16% | -1,06% | -1,18% |

Revenue, profit, dan jumlah transaksi datar dalam kisaran sekitar 1% per tahun. Tidak ada
tren positif di dataset ini. Narasi pertumbuhan harus ditinjau ulang.

### 5.8 Customer lifetime value (Terverifikasi tetapi belum tervalidasi)

- `customer_lifetime_value` konstan per `customer_id`, jadi ini atribut pelanggan, bukan
  metrik transaksi.
- Rata-rata gabungan 7.721,56; median 7.104,24; rentang 22,55 sampai 30.268,44.
- Korelasi dengan profit pelanggan sebenarnya 0,911, dan profit aktual lebih rendah dari
  nilai CLV untuk semua 24.911 pelanggan.
- Asal field ini tidak diketahui; tidak bisa diturunkan dari data transaksi (rata-rata
  profit aktual per pelanggan 3.056,74, kurang dari separuh rata-rata CLV). Perlakukan
  sebagai belum tervalidasi. `customer_master.customer_acquisition_cost` (rentang 5,01
  sampai 79,99 USD) tersedia, tetapi klaim ROI/ROMI butuh aturan atribusi yang resmi.

### 5.9 Rekonsiliasi `order_items` (Terverifikasi; penghambat untuk pemakaian level produk)

- 138.116 dari 138.116 order punya baris pesanan.
- Hanya 126.890 order (91,87%) cocok dengan `sales.net_sales` dalam $0,01. Simpangan
  absolut maksimum 11.139,31; rata-rata simpangan absolut 110,52.
- Total `order_items.net_sales` 192.398.877,29 versus tabel fakta 177.134.263,74 (+8,61%).
  Total `order_items.profit` 82.698.038,55 versus 76.146.395,76 (+8,60%).
- Ada 87 baris `(order_id, product_id)` duplikat; selisih kuantitas maksimum per order 31.
- Analisis level produk layak secara struktur (100% `product_id` nyambung ke katalog, semua
  1.175 produk ada), tetapi total baris pesanan tidak rekonsiliasi dengan tabel fakta.
  Karena itu pendapatan dan profit level produk belum bisa disajikan konsisten dengan KPI
  level order tanpa aturan rekonsiliasi resmi.

### 5.10 Kolom status (Terverifikasi)

- Nilai `order_status`: Completed (113.559), Pending (6.697), Returned (9.462),
  Cancelled (8.398).
- Nilai `delivery_status`: On Time (86.916), Cancelled (24.557), Delayed (16.886),
  Early (9.757). "Cancelled" di sini berarti "tidak dikirim" dan sama dengan jumlah order
  Cancelled + Pending + Returned (24.557), bukan hanya order yang dibatalkan.
- `return_status` hanya terisi untuk order retur (9.462), kosong untuk 128.654 lainnya.
  Turunkan penanda retur dari `order_status`, bukan dari `return_status`.
- Nilai kosong mengelompok secara desain: `return_reason`, `customer_rating`,
  `review_sentiment`, `customer_review`, `delivery_days`, dan `estimated_delivery_days`
  kosong untuk 24.557 order yang tidak dikirim; `campaign_name` kosong untuk 83.233 baris;
  `coupon_code` kosong untuk 110.502 baris.
- Order Returned dan Cancelled tetap membawa profit positif (margin keseluruhan 52,58% dan
  52,61%), jadi tidak ada pembalikan biaya/refund di dataset. Profit diakui untuk semua
  order tanpa melihat status.

## 6. Daftar inkonsistensi

| ID | Masalah | Bukti | Dampak |
|---|---|---|---|
| I-1 | Jumlah anomali berbeda antar dokumen: 11.659 vs 11.673 | `data_profiling.ipynb` cell 13/24 pakai operator ketat; `eda_analysis.ipynb` cell 0/25 menulis 11.659 sedangkan cell 26 mencetak 11.673 | Angka utama ambigu; pilih satu operator dan tulis jelas |
| I-2 | Dua definisi margin dipakai bergantian: keseluruhan 42,99% vs rerata baris 45,07% | `data_profiling.ipynb` cell 11/24 tulis 42,99%; `eda_analysis.ipynb` cell 33/42 tulis 45,07% | Semua KPI margin, margin segmen, dan opportunity gap berubah tergantung basis |
| I-3 | Opportunity gap dilaporkan 6,09M; hitung ulang memberi 6,17M (rerata baris) atau 5,44M (agregat) | `data_profiling.ipynb` cell 13; `eda_analysis.ipynb` cell 33 | Angka "profit hilang" tidak bisa direproduksi dari satu rumus yang jelas |
| I-4 | `eda_analysis.ipynb` cell 6 menandai simpangan rumus sebagai masalah data | Hitung ulang rumus yang benar menunjukkan simpangan 0,00 | Alarm kualitas data palsu; akibat menguji rumus yang salah |
| I-5 | `data_profiling.ipynb` cell 24 klaim "konsistensi 100%" sedangkan `eda_analysis.ipynb` cell 6 mencetak peringatan | Kedua notebook, dataset sama | Klaim "data bersih" tidak bisa direproduksi apa adanya |
| I-6 | Label `dataset_statistics.csv` salah | "Total Products Used 138116" sama dengan jumlah transaksi (padahal 1.175); "Total Customers 24911" adalah pelanggan yang muncul di transaksi (master 25.000); "Date Range" menulis 2021-01-01 sampai 2025-12-31 | Kartu ringkasan tidak bisa dipakai sebagai sumber metrik tanpa koreksi |
| I-7 | Total `order_items` tidak rekonsiliasi dengan tabel fakta | 8,13% order berbeda; +8,61% pada net sales | Metrik level produk tidak bisa digabung ke KPI level order tanpa aturan |
| I-8 | `is_repeat_customer` (99,76% True) bertentangan dengan `customer_type` (8.335 Returning) | Hitung dari seluruh data | Tidak ada segmentasi first-time/repeat yang bisa dipakai |
| I-9 | `customer_order_count` berbeda dari order sebenarnya untuk 37,83% pelanggan | Hitung ulang level pelanggan | Jangan pakai kolom ini sebagai jumlah order |
| I-10 | `delivery_status == 'Cancelled'` tidak sama dengan `order_status == 'Cancelled'` | 24.557 vs 8.398 | Risiko penamaan: metrik "tidak dikirim" harus didefinisikan jelas |
| I-11 | `discount_rate` notebook pakai `discount_amount / gross_sales`; `order_items` punya `discount_percentage` sendiri (0-0,6) | `eda_analysis.ipynb` cell 5; kolom `order_items` | Ada dua definisi diskon; yang level baris pesanan adalah basis berbeda |
| I-12 | `profit_margin_percentage` disimpan dibulatkan ke 2 desimal | Simpangan maksimum 0,005 versus hitung ulang | Hitung ulang margin untuk tampilan presisi tinggi |

## 7. Klaim notebook yang usang atau salah

`eda_analysis.ipynb`:
- S-1 Cell 41: "pelanggan berulang menunjukkan peningkatan margin yang konsisten ...
  memvalidasi investasi retensi". Hitung ulang: selisih negatif di keempat segmen, dan
  sampel first-time hanya 33-177 baris. Klaim tidak didukung.
- S-2 Cell 41: "Segmen Premium dan Business menunjukkan profit per pelanggan yang lebih
  tinggi". Hitung ulang: Consumer 3.151,99 tertinggi; Premium 2.896,85 terendah. Klaim tidak
  didukung.
- S-3 Cell 25: "Sales Channel: Online Store vs Marketplace vs Retail". Nilai di dataset
  adalah Mobile App, Website, Marketplace, Social Media. Label salah dan bertentangan dengan
  output cell 27 di notebook yang sama.
- S-4 Cell 41: ambang alert "tingkat anomali melebihi 12%". Tingkat anomali maksimum 9,26%,
  jadi ambang itu tidak pernah tercapai oleh data ini.
- S-5 Cell 18/24: "batas atas diskon optimal" dan titik belok di 20%. Lonjakan margin
  terbesar ada di 30%+ (-15,29 pp), dan bracket bukan keranjang sebanding. Batas diskon
  "optimal" tidak terbukti dari analisis ini.
- S-6 Cell 24: "Volume increase tidak compensate margin loss" disajikan tanpa perhitungan
  kompensasi volume (kedalaman diskon juga berkorelasi dengan keranjang lebih besar).
- S-7 Cell 13: "lonjakan ini berkorelasi langsung dengan penurunan margin ... didorong oleh
  pola musiman Q4" adalah kaitan deskriptif yang ditulis seperti sebab-akibat; tingkat
  diskon Q4 yang lebih dalam terverifikasi, tetapi klaim sebab-akibatnya tidak.
- S-8 Cell 1: "angka-angka di atas diverifikasi melalui code cells ... (lihat cell 31)".
  Cell perhitungan ringkasan eksekutif sekarang di indeks 33 setelah pengeditan, bukan 31.
- S-9 Cell 0: "tanpa missing values kritis dan tanpa duplikat". Tabel fakta tidak punya
  duplikat, tetapi `order_items` punya 87 baris `(order_id, product_id)` duplikat dan 9
  kolom fakta memang kosong secara desain. Klaim perlu kualifikasi.
- S-10 Cell 42 KPI "Repeat Customer Rate: 99,76%" adalah angka level transaksi dan tidak
  bisa ditindaklanjuti. Angka level pelanggan adalah 97,90% dengan lebih dari satu order.

`data_profiling.ipynb`:
- S-11 Cell 24: "Uji validasi matematika menunjukkan 100% konsistensi" bertentangan dengan
  peringatan `eda_analysis.ipynb` cell 6 (lihat I-4, I-5).
- S-12 Cell 24: angka anomali (11.659 / 8,44% / margin 27,39% / 6,09M) adalah varian ketat;
  judul EDA memakai varian inklusif (I-1, I-3).
- S-13 Cell 23: VIP "17,7%" versus hitung ulang rerata baris 17,78% (pembulatan) dan
  terbobot 20,20%; basis terbobot tidak pernah disebut.

## 8. Terverifikasi vs asumsi vs belum selesai

Fakta terverifikasi (bisa direproduksi dari `data/source/`):
- Grain, kunci, jumlah baris, cakupan tanggal, keutuhan relasi, pola nilai kosong.
- Total keuangan, margin keseluruhan, rata-rata margin transaksi, AOV, rating, tingkat retur dan
  pembatalan.
- Rumus pasti `net_sales` dan `profit`.
- Distribusi bracket diskon, margin, dan profit per transaksi.
- Jumlah order rugi dan total kerugian.
- Kedua varian anomali dan tingkatnya per sales channel, region, dan marketing channel.
- Revenue, profit, margin, porsi profit, dan transaksi per pelanggan tiap segmen.
- Revenue, profit, dan margin bulanan dan tahunan.
- Selisih rekonsiliasi `order_items`; kelayakan join produk.
- Tingkat ketidakcocokan `customer_order_count`; jumlah `is_repeat_customer` dan
  `customer_type`.
- Tabulasi silang kolom status.

Asumsi (dinyatakan, tidak dibuktikan data):
- Dataset bersifat sintetis (harga bulat, nama kota sintetis, 138k dari nominal 150k). Tidak
  ada perusahaan atau periode nyata yang diidentifikasi.
- "Region" berarti North/South/East/West/Central di dataset ini; `customer_state`
  mencampur negara dan negara bagian ("Baden-Württemberg", "Texas"), jadi bukan kolom
  negara bagian AS.
- Mata uang di `currency` (7 nilai) tidak dikonversi; semua kolom uang terlihat berskala
  USD. Ini belum diverifikasi terhadap aturan kurs apa pun.

Isu belum selesai: lihat Bagian 9.

## 9. Pertanyaan data yang belum selesai

1. Basis margin: semua margin yang ditampilkan pakai agregat (total profit / total net sales)
   atau rata-rata margin transaksi? Selisihnya 2,08 pp gabungan. PRD mewajibkan perbedaan
   ini dijelaskan; satu pilihan harus disetujui.
2. Operator anomali: ketat (`>`/`<`) atau inklusif (`>=`/`<=`)? Ini menentukan 11.659 vs
   11.673 dan opportunity gap.
3. Opportunity gap: rumus mana, basis margin mana, dan apakah angka "profit hilang" sebaiknya
   ditampilkan sebagai simulasi potensi di dashboard deskriptif?
4. Pelanggan berulang: adakah definisi yang bisa dipakai, mengingat 99,76% transaksi
   ditandai repeat dan `customer_type` bertentangan? Usulan: hentikan perbandingan
   first-time/repeat, atau definisikan repeat di level pelanggan (lebih dari satu order) dan
   beri catatan bahwa grup 334 baris terlalu kecil.
5. Metrik level produk: bagaimana `order_items` direkonsiliasi ke tabel fakta (selisih
   8,61%), atau apakah tampilan level produk dikecualikan dari MVP?
6. Baris `(order_id, product_id)` duplikat di `order_items`: digabung atau dibuang? Keduanya
   belum divalidasi.
7. Retur dan pembatalan: apakah profit dibalik untuk order Returned/Cancelled, atau
   dilaporkan sebagai diakui untuk semua order dengan status ditampilkan terpisah?
8. `customer_lifetime_value`: sumber, definisi, dan apakah boleh ditampilkan sama sekali.
   Nilainya melebihi profit riil setiap pelanggan dan tidak bisa diturunkan dari data ini.
9. `customer_acquisition_cost`: apakah bisa dipakai untuk metrik akuisisi per segmen atau
   ROMI, dan jendela atribusi serta aturan join apa yang berlaku?
10. `order_items.discount_percentage` (level baris) versus tingkat diskon turunan dari
    `sales`: mana yang jadi acuan jika analisis level baris disetujui?
11. Narasi tren tahunan: dengan revenue dan profit datar, apa kerangka portofolio yang tepat
    (stabilitas, bukan pertumbuhan)?
12. Penanganan mata uang: konfirmasi semua kolom uang adalah USD dan tidak perlu konversi
    untuk tujuh nilai `currency`.
13. Penurunan margin Juli (rerata 42,55%, rata-rata diskon 20,00%) belum dijelaskan dan
    belum diperiksa. Apakah perlu jadi temuan?
14. Asal usul benchmark: `README.MD` dan prompt berisi klaim bisnis ("tren positif",
    "Online Store vs Marketplace vs Retail", target metrik). Ini tidak bisa dilacak ke
    dataset dan jangan disajikan sebagai hasil.

## 10. Rencana persiapan data yang diusulkan

Belum ada output olahan yang dihasilkan di fase ini; menulis angka sebelum definisi metrik
disetujui akan membuat artefak yang tidak bisa diaudit. Urutan yang diusulkan:

1. Setujui keputusan metric dictionary (basis margin, operator anomali, definisi repeat,
   cakupan level produk, perlakuan retur).
2. Implementasikan `scripts/prepare_dashboard_data.py` untuk membaca `data/source/` dan
   menulis JSON ke `data/processed/`, lalu menyalin file yang sama ke `public/data/` untuk
   frontend. Usulan output:
   - `dashboard-summary.json`: total, margin (kedua basis diberi label), AOV, jumlah order,
     jumlah pelanggan, rentang periode, dan komposisi status.
   - `monthly-performance.json`: per bulan, net sales, profit, kedua margin, transaksi
     (plus dimensi tahun jika frontend butuh).
   - `discount-brackets.json`: bracket, transaksi, net sales, profit, kedua margin, profit
     per transaksi.
   - `segment-performance.json`: segmen, transaksi, pelanggan, net sales, profit, kedua
     margin, porsi profit, profit per pelanggan.
   - `anomaly-by-dimension.json`: dimensi, nilai, total, jumlah anomali, tingkat anomali.
   - `annual-performance.json`: tahun, transaksi, pelanggan, net sales, profit, margin, YoY.
   - `metadata.json`: versi dataset, jumlah baris, rentang tanggal, waktu pembuatan, dan
     definisi yang berlaku.
3. Tambahkan langkah validasi di skrip yang memastikan total JSON cocok dengan benchmark
   terverifikasi di Bagian 3 dan Bagian 5 dokumen ini, dengan toleransi yang ditulis
   (pembulatan 2 desimal). Gagal secara jelas jika ada penyimpangan.
4. Jaga `data/source/` tetap hanya-baca. Jangan pernah menulis ke sana. Jangan pernah
   menulis nilai turunan kembali ke notebook.
5. Jangan bangun grafik dashboard sebelum keputusan metrik disetujui dan JSON lolos
   rekonsiliasi.

## 11. Lampiran reproduksi

- Python: `.venv/Scripts/python.exe` (pandas 3.0.6, numpy 2.5.3). Lihat `requirements.txt`.
- Semua skrip membaca CSV dari `data/source/` tanpa menulis apa pun.
- Referensi cell notebook memakai indeks berbasis nol seperti tersimpan di JSON `.ipynb`.
- Anchor benchmark audit awal (basis kolom sumber/`as_stored`): net sales 177.134.263,74;
  profit 76.146.395,76; margin keseluruhan 42,99%; rata-rata margin transaksi 45,07%; transaksi
  138.116; anomali inklusif 11.673 / ketat 11.659; margin bracket 54,11 / 51,05 / 46,66 /
  40,34 / 25,06; order rugi 1.296; total rugi -201.225,34; margin rerata Nov-Des 35,13%.
- Anchor benchmark KPI basis D7 (dipakai `scripts/prepare_dashboard_data.py`): net sales
  157.143.214,06; profit 59.232.305,35; margin keseluruhan 37,69%; rata-rata margin transaksi
  41,16%; anomali inklusif 12.855 (varian ketat 12.855); order rugi 2.530 / -426.306,80.
  Tabel anchor lengkap ada di `docs/METRIC_DICTIONARY.md` Bagian 12.

## 12. Status resolusi setelah perbaikan notebook

Kedua notebook dijalankan ulang end-to-end setelah perbaikan (executor berbasis
`jupyter_client`; tidak ada `nbconvert`/`nbclient` di lingkungan ini). Hasil: 34 sel kode EDA
dan 10 sel kode profiling berjalan tanpa error, 9 gambar EDA ter-render. Semua angka Markdown
sudah dicocokkan dengan output kode terbaru.

Keputusan metrik yang dikunci: lihat Bagian 0 `docs/METRIC_DICTIONARY.md` (D1-D7). Ringkas:
margin keseluruhan utama + rata-rata margin transaksi sekunder; anomali inklusif; opportunity gap
sebagai simulasi potensi dua basis; pelanggan berulang level pelanggan (>1 order);
metrik level produk dikecualikan dari MVP; profit diakui untuk semua status dengan margin per
status ditampilkan.

Daftar inkonsistensi (Bagian 6):

| ID | Status | Catatan |
|---|---|---|
| I-1 | Selesai | Kedua notebook memakai operator inklusif (12.855 pada basis D7); varian ketat juga 12.855 karena tidak ada nilai tepat di ambang |
| I-2 | Selesai | Margin keseluruhan jadi metrik utama; kedua basis dicetak berlabel di cell 21/23/32/33/42 dan profiling 11/22 |
| I-3 | Selesai | Gap dihitung sebagai dua nilai simulasi potensi (basis D7): 6.738.175,54 (rata-rata transaksi) dan 5.537.690,05 (agregat), dengan asumsi eksplisit |
| I-4 | Selesai | Cell 6 memverifikasi rumus kolom sumber (`as_stored`) dengan simpangan 0,00 dan menetapkan basis KPI D7; rumus buku teks ditandai sebagai tidak dapat diterapkan |
| I-5 | Selesai | Profiling cell 20 menambahkan cek rumus keuangan; klaim "100% konsisten" diganti pernyataan berbukti |
| I-6 | Terbuka (dokumen) | Label `dataset_statistics.csv` tetap salah; sudah dicatat di kontrak data sebagai peringatan, tidak diubah |
| I-7 | Terbuka (keputusan D5) | `order_items` tidak direkonsiliasi; metrik level produk dikecualikan dari MVP |
| I-8 | Selesai (keputusan D4) | KPI pelanggan berulang memakai definisi level pelanggan 97,90%; perbandingan first-time/repeat tidak dipublikasikan |
| I-9 | Terbuka (keterbatasan) | `customer_order_count` tetap tidak dipakai; dicatat sebagai keterbatasan di kedua notebook |
| I-10 | Selesai | Label "tidak dikirim" untuk `delivery_status = 'Cancelled'` dipertahankan di kontrak data |
| I-11 | Terbuka (keterbatasan) | Dua definisi diskon tetap ada; level baris tidak dipakai tanpa keputusan |
| I-12 | Selesai | Margin dihitung ulang dari `profit / net_sales`; toleransi pembulatan 0,1% |

Klaim usang atau salah (Bagian 7):

| ID | Status | Catatan |
|---|---|---|
| S-1 | Selesai | Klaim "retensi meningkatkan margin" dihapus; cell 37/38/39/41 menyatakan keterbatasan sampel |
| S-2 | Selesai | Cell 41 menyatakan Consumer profit per pelanggan tertinggi ($2.470,14 pada basis D7) |
| S-3 | Selesai | Label sales channel dibetulkan (Mobile App, Website, Social Media, Marketplace) |
| S-4 | Selesai | Ambang alert 12% diganti usulan berbasis persentil; maksimum anomali 9,88% dicatat |
| S-5 | Selesai | Klaim "batas optimal 20%" dihapus; langkah terbesar >30% (-17,5 pp pada basis D7) dan label deskriptif |
| S-6 | Selesai | Analisis kompensasi volume diganti catatan confound ukuran keranjang (4,98 vs 7,94) |
| S-7 | Selesai | Cell 13 memisahkan Juli/September dan menyatakan kaitan tidak kausal |
| S-8 | Selesai | Rujukan sel diperbarui ke "Executive Summary Calculations" (Fase 5) |
| S-9 | Selesai | Klaim "tanpa missing/duplikat" diberi kualifikasi desain kosong dan duplikat `order_items` |
| S-10 | Selesai | KPI repeat memakai angka level pelanggan 97,90% |
| S-11 | Selesai | Sama dengan I-5 |
| S-12 | Selesai | Angka anomali profiling memakai varian inklusif (12.855 / 9,31% / 21,47% pada basis D7) |
| S-13 | Selesai | Diskon VIP dilabeli "per transaksi" (17,78%); basis terbobot (20,20%) dicatat terpisah |

Pertanyaan data (Bagian 9):

| No | Status | Catatan |
|---|---|---|
| 1 | Terjawab | D1: margin keseluruhan utama, rata-rata transaksi sekunder |
| 2 | Terjawab | D2: inklusif |
| 3 | Terjawab | D3: dua basis sebagai simulasi potensi berlabel |
| 4 | Terjawab | D4: level pelanggan (>1 order); first-time/repeat tidak dipublikasikan |
| 5 | Terjawab | D5: dikecualikan dari MVP |
| 6 | Terbuka | De-duplikasi `order_items` belum perlu untuk MVP |
| 7 | Terjawab sebagian | D6: profit seperti diakui untuk semua status, margin per status ditampilkan; pembalikan menunggu kebijakan |
| 8 | Terjawab | CLV dikeluarkan dari KPI MVP; basis per pelanggan dan per transaksi dicatat di kontrak data |
| 9 | Terbuka | `customer_acquisition_cost` belum dipakai (tidak ada aturan atribusi) |
| 10 | Terbuka | Definisi diskon level baris belum dipakai |
| 11 | Selesai | Narasi tahunan sebagai stabilitas (~1% per tahun), bukan pertumbuhan |
| 12 | Terbuka | Konversi mata uang tetap tidak diverifikasi; semua kolom uang berskala USD |
| 13 | Selesai | Juli (+ September) dijelaskan sebagai periode promo dengan diskon lebih dalam |
| 14 | Selesai | Klaim benchmark dari README/prompt tidak disajikan sebagai hasil |

Perubahan teknis tambahan yang dilakukan pada notebook:

- `eda_analysis.ipynb` cell 4 dan `data_profiling.ipynb` cell 6: kolom keuangan dan
  `profit_margin_percentage` dibaca sebagai `float64`. Sebelumnya `float32` membuat total net
  sales terbaca 177.134.272,00 (selisih ~8 dolar) daripada 177.134.263,74. Ini adalah temuan
  presisi yang mempengaruhi KPI, jadi diperbaiki.
- `eda_analysis.ipynb` cell 42 menambah Bagian 9: cek validasi (jumlah pelanggan, CLV per
  pelanggan dan per transaksi, share CLV > profit riil, margin keseluruhan per status pesanan),
  supaya angka keterbatasan di Markdown punya output pendukung.
- `data_profiling.ipynb` cell 13 diubah ke operator inklusif dan menambahkan profil anomali per
  segmen; cell 20 menambahkan cek rumus keuangan terverifikasi dan cek rentang nilai.
- Klaim memori di `data_profiling.ipynb` (markdown 0 dan 5) diganti angka terukur: baseline
  `pd.read_csv` tanpa penyesuaian tipe = 206,2 MB (`memory_usage(deep=True)`), hasil optimasi
  94,0 MB (turun 54,4%). Sebelumnya tertulis "200-250 MB" dan "~60%" tanpa pengukuran.

## 13. Rumus net sales dataset dan keputusan D7

Rumus kolom sumber diuji langsung pada 138.116 baris:

| Hipotesis | Simpangan maksimum | Baris meleset |
|---|---|---|
| `net_sales = gross_sales - discount_amount + tax_amount + shipping_cost` | **0,0000** | **0** |
| `net_sales = gross_sales - discount_amount` | 2.135,92 | 138.116 |
| `net_sales = gross_sales + tax_amount + shipping_cost` | 6.759,02 | 120.252 |

Kesimpulan:
- Identitas kolom sumber **terkonfirmasi eksak** (D2/rumus as_stored). Simpangan rata-rata
  hipotesis buku teks (144,74) persis sama dengan rata-rata `tax_amount` (122,46) +
  `shipping_cost` (22,28).
- `tax_amount` dihitung dari `gross_sales - discount_amount` pada bucket tarif 5% / 7% / 18% /
  20% (median 7%). Artinya `gross_sales` belum termasuk pajak dan ongkir.
- Substitusi memberi `profit = gross_sales - discount_amount + tax_amount - product_cost`, jadi
  **pajak yang dipungut terhitung sebagai profit** (16.914.090,41 = 22,2% dari profit sumber).
  Ini masalah definisi yang memengaruhi seluruh KPI margin.
- Rumus buku teks `Net Sales = Gross Sales - (Discounts + Returns + Allowances)` **tidak bisa
  dihitung**: tidak ada kolom nilai retur maupun allowance. Retur hanya tersedia sebagai status
  (`order_status` Returned 9.462, Cancelled 8.398, Pending 6.697).

Keputusan (D7): KPI memakai basis C, `net_sales = gross_sales - discount_amount` dan
`profit = net_sales - product_cost`; pajak dan ongkir diperlakukan pass-through dan dilaporkan
terpisah. Nilai kolom sumber tetap dilaporkan sebagai `as_stored` untuk rekonsiliasi.

| Metrik | `as_stored` | Basis C (KPI) |
|---|---|---|
| Net sales | 177.134.263,74 | 157.143.214,06 |
| Profit | 76.146.395,76 | 59.232.305,35 |
| Margin keseluruhan | 42,99% | 37,69% |
| Rata-rata margin transaksi | 45,07% | 41,16% |
| Order rugi / total kerugian | 1.296 / -201.225,34 | 2.530 / -426.306,80 |
| Jumlah anomali | 11.673 | 12.855 |
| Margin keseluruhan anomali | 27,62% | 21,72% |

Diterapkan di `scripts/prepare_dashboard_data.py` dan di `data/processed/`/`public/data/`.
**Sudah diterapkan di notebook**: `eda_analysis.ipynb` dan `data_profiling.ipynb` memuat ulang
kolom keuangan pada basis D7, sementara rumus kolom sumber hanya dipakai sebagai pembanding
`as_stored` pada sel validasi.

Diperluas pada mvp-3 (keputusan peninjau Q1=B, Q3=B, Q5=A): tambah `filter-cubes.json` (kubus
`period × segmen / sales channel / status order`) dan `time-dimensions.json` (kuartalan, hari
kerja/akhir pekan, status kirim), serta blok `derived` di `dashboard-summary.json`. Semua baris
adalah agregat ulang dari basis C; rekonsiliasi 84 OK / 0 FAIL. Tidak ada angka pada tabel di
atas yang berubah.

