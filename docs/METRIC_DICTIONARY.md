# Kamus Metrik Bisnis & Finansial (Metric Dictionary)
## Dasbor Analisis Penjualan E-Commerce (E-Commerce Sales Analytics Dashboard)

- **Status**: Disetujui & Terkunci untuk Implementasi (`definitions_version = mvp-6`)
- **Peran Dokumen**: Spesifikasi Standar Tunggal Kebenaran (*Single Source of Truth*) untuk Seluruh Metrik, Rumus, dan Tolok Ukur Validasi
- **Dasar Rekonsiliasi**: Selaras Penuh dengan [`docs/EDA_VALIDATION.md`](file:///c:/Users/TUF/OneDrive/Semester%205/Proyek/Penjualan_E-Commerce/docs/EDA_VALIDATION.md), [`docs/PRD.md`](file:///c:/Users/TUF/OneDrive/Semester%205/Proyek/Penjualan_E-Commerce/docs/PRD.md), dan [`AGENTS.MD`](file:///c:/Users/TUF/OneDrive/Semester%205/Proyek/Penjualan_E-Commerce/AGENTS.MD)

---

## 0. Keputusan Kunci Metrik MVP (D1–D7)

Sebelum mendefinisikan masing-masing metrik, tabel keputusan berikut mengunci resolusi atas inkonsistensi yang ditemukan pada berkas mentah dan notebook awal:

| ID | Aspek Bisnis | Pilihan yang Dikunci | Alasan & Landasan Analitis | Nilai Dampak Benchmark |
|---|---|---|---|---|
| **D1** | **Basis Margin Utama** | **Margin Keseluruhan** ($\sum \text{Profit} / \sum \text{Net Sales} \times 100$) | Mengukur persentase riil dari total dolar penjualan bersih yang menjadi laba kotor perusahaan. Rata-rata margin per transaksi dilaporkan sebagai metrik sekunder dengan label terpisah. | Keseluruhan: **37,69%** vs Rerata transaksi: **41,16%** |
| **D2** | **Operator Anomali** | **Inklusif** ($\ge$ p75 Revenue dan $\le$ p25 Margin) | Konsisten secara matematis dengan definisi batas persentil inklusif pada distribusi data. | Ambang: $\$1.552,32$ & $34,12\%$; Total: **12.855 pesanan** (9,31%) |
| **D3** | **Opportunity Gap** | **Simulasi potensi** (dengan asumsi eksplisit) | Mencegah penyajian angka simulasi sebagai keuntungan yang hilang secara riil; wajib diberi label simulasi potensi. | Basis transaksi: $\$6.738.175,54$; Basis agregat: $\$5.537.690,05$ |
| **D4** | **Pelanggan Berulang** | **Tingkat Pelanggan** ($\ge 2$ pesanan) | Transaksi berulang $99,76\%$ tidak dapat ditindaklanjuti. Menghindari komparasi first-time vs repeat karena sampel first-time hanya 334 transaksi. | **97,90%** pelanggan aktif ($24.387 / 24.911$) |
| **D5** | **Level Produk** | **Dikecualikan dari MVP (UNVALIDATED)** | Berkas `order_items.csv` memiliki deviasi $+8,61\%$ dan 87 duplikat yang melanggar grain dan belum terekonsiliasi dengan tabel fakta. | Ditunda hingga rekonsiliasi data selesai |
| **D6** | **Retur & Pembatalan** | **Diakui di seluruh status** (dengan catatan pengungkapan pendapatan) | Dataset tidak memuat pembalikan nilai refund; membalik laba secara sepihak akan mengarang data fiktif. | Margin: Completed $35,96\%$, Pending $36,11\%$, Returned $48,37\%$, Cancelled $48,44\%$ |
| **D7** | **Basis Net Sales & Laba** | **Basis C (Merchandise Net)** | Rumus kolom sumber memasukkan pajak dan ongkir ke net sales serta pajak ke laba. Pajak & ongkir wajib diperlakukan sebagai *pass-through*. | Net Sales: **$\$157.143.214,06$**; Laba: **$\$59.232.305,35$** |

---

## 1. Metrik Finansial & Pendapatan Inti (Core Financial Metrics)

### 1.1 Gross Sales (Total Penjualan Kotor)
- **Makna Bisnis**: Total nilai transaksi barang dagangan berdasarkan harga katalog daftar (*list price*) sebelum dikurangi potongan harga (diskon), dan sebelum memperhitungkan pajak serta ongkos kirim.
- **Rumus yang Tepat**: 
  $$\text{Gross Sales} = \sum \text{gross\_sales}$$
- **Kolom atau Tabel Sumber**: Kolom `gross_sales` pada tabel fakta `ecommerce_sales_customer_analytics_150k.csv`.
- **Metode Agregasi**: Penjumlahan sederhana (`SUM`). Aditif di seluruh dimensi dan rentang waktu.
- **Satuan & Format Tampilan**: Dolar Amerika Serikat (USD), format: `$#,##0.00` (contoh: `$189,962,560.88`).
- **Perilaku Filter**: Menjumlahkan baris pada subset terfilter.
- **Penyebut (*Denominator*)**: Tidak ada (ukuran nominal absolut).
- **Penanganan Nilai Null**: 0 baris bernilai null. Tidak ada nilai negatif.
- **Tolok Ukur Validasi**: **$\$189.962.560,88$** pada seluruh $138.116$ pesanan.
- **Keterbatasan yang Diketahui**: Tidak mencerminkan penerimaan kas bersih perusahaan karena belum dikurangi diskon promosi.

---

### 1.2 Discount Amount (Total Nilai Diskon Diberikan)
- **Makna Bisnis**: Total potongan harga nominal yang diberikan kepada pembeli melalui program promosi, potongan kupon, atau penyesuaian harga khusus.
- **Rumus yang Tepat**: 
  $$\text{Discount Amount} = \sum \text{discount\_amount}$$
- **Kolom atau Tabel Sumber**: Kolom `discount_amount` pada tabel fakta `ecommerce_sales_customer_analytics_150k.csv`.
- **Metode Agregasi**: Penjumlahan sederhana (`SUM`). Aditif di seluruh dimensi.
- **Satuan & Format Tampilan**: USD, format: `$#,##0.00` (contoh: `$32,819,346.82`).
- **Perilaku Filter**: Menjumlahkan baris pada subset terfilter.
- **Penyebut (*Denominator*)**: Tidak ada.
- **Penanganan Nilai Null**: 0 baris bernilai null ($17.864$ transaksi bernilai 0 atau tanpa diskon). Nilai tidak pernah negatif dan tidak pernah melebihi `gross_sales`.
- **Tolok Ukur Validasi**: **$\$32.819.346,82$**.
- **Keterbatasan yang Diketahui**: Nilai ini merupakan diskon tingkat pesanan; berbeda basis dengan `discount_percentage` pada tingkat baris SKU `order_items.csv`.

---

### 1.3 Net Sales (Penjualan Bersih Merchandise - Basis C / D7 - KPI Utama)
- **Makna Bisnis**: Pendapatan bersih riil dari penjualan barang dagangan setelah potongan diskon. Merupakan ukuran omzet merchandise utama (*top-line revenue*) yang sah secara akuntansi manajerial.
- **Rumus yang Tepat**: 
  $$\text{Net Sales} = \sum (\text{gross\_sales} - \text{discount\_amount})$$
- **Kolom atau Tabel Sumber**: Kolom `gross_sales` dan `discount_amount` pada tabel fakta `ecommerce_sales_customer_analytics_150k.csv`.
- **Metode Agregasi**: Penjumlahan sederhana (`SUM`). Aditif di seluruh dimensi.
- **Satuan & Format Tampilan**: USD, format: `$#,##0.00` (contoh: `$157,143,214.06` atau `$157.1 jt`).
- **Perilaku Filter**: Menjumlahkan baris pada subset kubus terfilter.
- **Penyebut (*Denominator*)**: Tidak ada.
- **Penanganan Nilai Null**: 0 baris bernilai null.
- **Tolok Ukur Validasi**: **$\$157.143.214,06$**.
- **Keterbatasan yang Diketahui**: Tidak dapat menggunakan rumus buku teks retur/allowance karena ketiadaan kolom nominal retur pada dataset (D6).

---

### 1.4 As-Stored Net Sales (Net Sales Kolom Sumber - BUKAN KPI / REKONSILIASI)
- **Makna Bisnis**: Nilai penjualan bersih sebagaimana tersimpan langsung dalam berkas mentah. Angka ini mencampurkan utang pajak dan tagihan ongkos kirim ke dalam omzet.
- **Rumus yang Tepat**: 
  $$\text{As-Stored Net Sales} = \sum (\text{gross\_sales} - \text{discount\_amount} + \text{tax\_amount} + \text{shipping\_cost})$$
- **Kolom atau Tabel Sumber**: Kolom mentah `net_sales` pada tabel fakta.
- **Metode Agregasi**: Penjumlahan sederhana (`SUM`).
- **Satuan & Format Tampilan**: USD, format: `$#,##0.00` (contoh: `$177,134,263.74`). Wajib berlabel: "Bukan KPI; Rekonsiliasi Sumber".
- **Perilaku Filter**: Tidak ditampilkan di antarmuka dasbor; angka hanya dipakai untuk rekonsiliasi pipeline.
- **Penyebut (*Denominator*)**: Tidak ada.
- **Penanganan Nilai Null**: 0 baris bernilai null.
- **Tolok Ukur Validasi**: **$\$177.134.263,74$** (selisih $+\$19.991.049,68$ akibat pajak dan ongkir).
- **Keterbatasan yang Diketahui**: **Dilarang dijadikan KPI operasional/eksekutif** karena memicu distorsi liabilitas pajak sebagai pendapatan.

---

### 1.5 Product Cost (Biaya Pokok Barang / COGS)
- **Makna Bisnis**: Total biaya pengadaan atau biaya pokok barang dagangan yang dikeluarkan perusahaan untuk menyediakan produk yang terjual.
- **Rumus yang Tepat**: 
  $$\text{Product Cost} = \sum \text{product\_cost}$$
- **Kolom atau Tabel Sumber**: Kolom `product_cost` pada tabel fakta `ecommerce_sales_customer_analytics_150k.csv`.
- **Metode Agregasi**: Penjumlahan sederhana (`SUM`). Aditif.
- **Satuan & Format Tampilan**: USD, format: `$#,##0.00` (contoh: `$97,910,908.71`).
- **Perilaku Filter**: Menjumlahkan baris pada subset terfilter.
- **Penyebut (*Denominator*)**: Tidak ada.
- **Penanganan Nilai Null**: 0 baris bernilai null.
- **Tolok Ukur Validasi**: **$\$97.910.908,71$**.
- **Keterbatasan yang Diketahui**: Merupakan biaya barang tingkat pesanan; tidak mencakup biaya operasional pergudangan atau overhead umum.

---

### 1.6 Profit (Laba Bersih Merchandise - Basis C / D7 - KPI Utama)
- **Makna Bisnis**: Laba kotor merchandise bersih yang diperoleh setelah mengurangkan biaya pokok barang dari penjualan bersih merchandise (di luar pajak dan ongkos kirim).
- **Rumus yang Tepat**: 
  $$\text{Profit} = \sum (\text{net\_sales}_{\text{Basis C}} - \text{product\_cost}) = \sum (\text{gross\_sales} - \text{discount\_amount} - \text{product\_cost})$$
- **Kolom atau Tabel Sumber**: Kolom turunan dari `gross_sales`, `discount_amount`, dan `product_cost` pada tabel fakta.
- **Metode Agregasi**: Penjumlahan sederhana (`SUM`). Aditif di seluruh dimensi.
- **Satuan & Format Tampilan**: USD, format: `$#,##0.00` (contoh: `$59,232,305.35` atau `$59.2 jt`).
- **Perilaku Filter**: Menjumlahkan baris kubus terpilih.
- **Penyebut (*Denominator*)**: Tidak ada.
- **Penanganan Nilai Null**: 0 baris bernilai null ($2.530$ pesanan bernilai negatif/rugi).
- **Tolok Ukur Validasi**: **$\$59.232.305,35$**.
- **Keterbatasan yang Diketahui**: Diakui untuk semua status pesanan termasuk Returned dan Cancelled karena tidak adanya data pembalikan/refund (D6).

---

### 1.7 As-Stored Profit (Laba Kolom Sumber - BUKAN KPI / REKONSILIASI)
- **Makna Bisnis**: Laba kotor sebagaimana tersimpan di berkas mentah. Melalui substitusi aljabar, rumus mentah terbukti memasukkan pajak dipungut ke dalam laba perusahaan.
- **Rumus yang Tepat**: 
  $$\text{As-Stored Profit} = \sum (\text{net\_sales}_{\text{sumber}} - \text{product\_cost} - \text{shipping\_cost}) = \sum (\text{gross} - \text{discount} + \text{tax} - \text{product\_cost})$$
- **Kolom atau Tabel Sumber**: Kolom mentah `profit` pada tabel fakta.
- **Metode Agregasi**: Penjumlahan sederhana (`SUM`).
- **Satuan & Format Tampilan**: USD, format: `$#,##0.00` (contoh: `$76,146,395.76`).
- **Perilaku Filter**: Tidak ditampilkan di antarmuka dasbor; hanya untuk rekonsiliasi Basis C (D7).
- **Penyebut (*Denominator*)**: Tidak ada.
- **Penanganan Nilai Null**: 0 baris null ($1.296$ baris negatif pada basis sumber).
- **Tolok Ukur Validasi**: **$\$76.146.395,76$** (selisih $+\$16.914.090,41$ yang tepat sama dengan total pajak dipungut).
- **Keterbatasan yang Diketahui**: **Dilarang disajikan sebagai KPI bisnis terverifikasi** karena melanggar kepatuhan perpajakan (pajak konsumen diakui sebagai laba).

---

### 1.8 Tax Collected (Pajak Dipungut - Pass-Through)
- **Makna Bisnis**: Nilai pajak pertambahan nilai / penjualan yang dipungut dari konsumen atas nama otoritas perpajakan; merupakan kewajiban/utang (*liability*), bukan pendapatan bisnis.
- **Rumus yang Tepat**: 
  $$\text{Tax Collected} = \sum \text{tax\_amount}$$
- **Kolom atau Tabel Sumber**: Kolom `tax_amount` pada tabel fakta.
- **Metode Agregasi**: Penjumlahan (`SUM`).
- **Satuan & Format Tampilan**: USD, format: `$#,##0.00` (contoh: `$16,914,090.41`). Label wajib: "Pass-through, bukan pendapatan".
- **Perilaku Filter**: Dilaporkan secara mandiri.
- **Penyebut (*Denominator*)**: Tidak ada.
- **Penanganan Nilai Null**: 0 baris null. Dihitung dari bucket tarif 5%, 7%, 18%, 20% terhadap nilai merchandise setelah diskon.
- **Tolok Ukur Validasi**: **$\$16.914.090,41$**.
- **Keterbatasan yang Diketahui**: Tidak masuk dalam perhitungan margin maupun revenue perusahaan.

---

### 1.9 Shipping Billed (Ongkir Ditagih - Pass-Through)
- **Makna Bisnis**: Biaya pengiriman logistik yang ditagihkan kepada konsumen untuk diteruskan kepada mitra kurir logistik.
- **Rumus yang Tepat**: 
  $$\text{Shipping Billed} = \sum \text{shipping\_cost}$$
- **Kolom atau Tabel Sumber**: Kolom `shipping_cost` pada tabel fakta.
- **Metode Agregasi**: Penjumlahan (`SUM`).
- **Satuan & Format Tampilan**: USD, format: `$#,##0.00` (contoh: `$3,076,959.27`).
- **Perilaku Filter**: Dilaporkan mandiri.
- **Penyebut (*Denominator*)**: Tidak ada.
- **Penanganan Nilai Null**: 0 baris null.
- **Tolok Ukur Validasi**: **$\$3.076.959,27$**.
- **Keterbatasan yang Diketahui**: Pada rumus sumber, biaya ini saling meniadakan ($+\text{shipping}$ di net sales dan $-\text{shipping}$ di profit). Pada Basis C, dikeluarkan sepenuhnya dari omzet dan laba.

---

## 2. Metrik Profitabilitas & Margin (Profitability & Margin Metrics)

### 2.1 Aggregate Profit Margin (Margin Laba Keseluruhan — Metrik Utama, D1)
- **Catatan istilah**: Di versi sebelumnya metrik ini disebut **Margin Agregat**. Istilah itu tidak lagi dipakai di antarmuka maupun dokumen; rumus dan angkanya tidak berubah.
- **Makna Bisnis**: Rasio efisiensi laba menyeluruh yang menunjukkan berapa persen dari total nilai penjualan merchandise bersih yang berhasil dikonversi menjadi laba kotor.
- **Rumus yang Tepat**: 
  $$\text{Aggregate Margin \%} = \frac{\sum \text{Profit}}{\sum \text{Net Sales}} \times 100$$
- **Kolom atau Tabel Sumber**: Kolom turunan `profit` dan `net_sales` (Basis C) pada tabel fakta.
- **Metode Agregasi**: Dihitung ulang berbobot (*weighted ratio calculation*). **Bukan rata-rata dari kolom persentase**.
- **Satuan & Format Tampilan**: Persentase, format: `0.00%` (contoh: `37.69%`). Wajib lencana: "Margin Keseluruhan (Utama)".
- **Perilaku Filter**: Dihitung ulang secara dinamis pada setiap kombinasi subset: $\sum \text{profit}_{\text{subset}} / \sum \text{net\_sales}_{\text{subset}} \times 100$.
- **Penyebut (*Denominator*)**: **$\sum \text{Net Sales}$ pada subset yang bersangkutan**.
- **Penanganan Nilai Null**: Jika $\sum \text{Net Sales} = 0$, tampilkan `0.00%` atau `N/A`.
- **Tolok Ukur Validasi**: **$37,69\%$** (pada seluruh dataset).
- **Keterbatasan yang Diketahui**: Berbeda dari rata-rata per transaksi sebesar $3,47\text{ pp}$ karena transaksi bernilai besar memberikan bobot lebih signifikan.

---

### 2.2 Average Transaction Margin (Rata-rata Margin Transaksi - Metrik Sekunder)
- **Makna Bisnis**: Rata-rata aritmatika dari persentase margin per baris pesanan tanpa mempertimbangkan ukuran nominal transaksi (*unweighted transaction average*).
- **Rumus yang Tepat**: 
  $$\text{Average Transaction Margin \%} = \frac{1}{N} \sum_{i=1}^{N} \left(\frac{\text{profit}_i}{\text{net\_sales}_i} \times 100\right)$$
- **Kolom atau Tabel Sumber**: Kolom turunan per baris `profit / net_sales * 100` (Basis C).
- **Metode Agregasi**: Rata-rata baris (`AVG`). **Ukuran tidak aditif (*non-additive*)**.
- **Satuan & Format Tampilan**: Persentase, format: `0.00%` (contoh: `41.16%`). Label wajib: "Rata-rata Margin Transaksi (Sekunder)".
- **Perilaku Filter**: Hanya valid untuk bulan tunggal atau seluruh dataset utuh. Dilarang dirata-ratakan ulang saat filter mencakup beberapa bulan.
- **Penyebut (*Denominator*)**: **Total jumlah baris transaksi ($N$)**.
- **Penanganan Nilai Null**: Baris dengan $\text{net\_sales}_i = 0$ diabaikan.
- **Tolok Ukur Validasi**: **$41,16\%$** (pada seluruh data; as-stored sumber adalah $45,07\%$).
- **Keterbatasan yang Diketahui**: Memberikan bobot setara pada transaksi $\$10$ dan transaksi $\$2.000$, sehingga cenderung membiaskan persepsi profitabilitas lebih tinggi daripada realisasi riil.

---

### 2.3 Median Transaction Margin (Median Margin Transaksi)
- **Makna Bisnis**: Nilai tengah margin transaksi yang membagi populasi pesanan menjadi dua bagian seimbang; kebal terhadap nilai ekstrem/pencilan.
- **Rumus yang Tepat**: 
  $$\text{Median Margin \%} = \text{Percentile}_{50}\left(\frac{\text{profit}_i}{\text{net\_sales}_i} \times 100\right)$$
- **Kolom atau Tabel Sumber**: Kolom turunan margin per baris (Basis C).
- **Metode Agregasi**: Nilai persentil ke-50. Non-aditif.
- **Satuan & Format Tampilan**: Persentase, format: `0.00%` (contoh: `43.30%`).
- **Perilaku Filter**: Dihitung dari subset utuh; tidak dapat diagregasikan dari ringkasan.
- **Penyebut (*Denominator*)**: Posisi tengah deret terurut $N$.
- **Penanganan Nilai Null**: Diabaikan.
- **Tolok Ukur Validasi**: **$43,30\%$**.
- **Keterbatasan yang Diketahui**: Tidak dapat digunakan untuk kalkulasi keuangan agregat.

---

### 2.4 High-Margin Transaction Share (Pangsa Transaksi Margin Tinggi $>20\%$)
- **Makna Bisnis**: Proporsi transaksi yang menghasilkan margin keuntungan sehat di atas batas ambang kelayakan komersial $20\%$.
- **Rumus yang Tepat**: 
  $$\text{High-Margin Share \%} = \frac{\text{Jumlah Transaksi dengan } \text{profit\_margin} > 20\%}{\text{Total Transaksi}} \times 100$$
- **Kolom atau Tabel Sumber**: Kolom turunan margin per baris (Basis C).
- **Metode Agregasi**: Hitung bersyarat dibagi total baris.
- **Satuan & Format Tampilan**: Persentase, format: `0.00%` (contoh: `92.01%`).
- **Perilaku Filter**: Dihitung ulang pada subset terfilter.
- **Penyebut (*Denominator*)**: **Total transaksi pada subset terfilter ($138.116$ pada total)**.
- **Penanganan Nilai Null**: 0.
- **Tolok Ukur Validasi**: **$92,01\%$** ($127.077$ transaksi).
- **Keterbatasan yang Diketahui**: Menunjukkan bahwa mayoritas transaksi sangat sehat, sehingga anomali margin rendah terkonsentrasi pada minoritas transaksi bervolume besar.

---

### 2.5 Loss-Making Orders (Jumlah Pesanan Merugi)
- **Makna Bisnis**: Kuantitas pesanan yang nilai laba bersih merchandise-nya berada di bawah nol ($\text{Profit} < 0$), di mana harga jual setelah diskon tidak mencukupi untuk menutup biaya pokok barang.
- **Rumus yang Tepat**: 
  $$\text{Loss Orders} = \sum_{i=1}^{N} \mathbb{I}(\text{profit}_i < 0)$$
- **Kolom atau Tabel Sumber**: Kolom turunan `profit` per baris (Basis C).
- **Metode Agregasi**: Hitung baris (`COUNT`). Aditif.
- **Satuan & Format Tampilan**: Bilangan bulat dengan pemisah ribuan (contoh: `2,530 pesanan` / `1.83%`).
- **Perilaku Filter**: Menjumlahkan baris pada subset terfilter.
- **Penyebut (*Denominator*)**: Untuk rasio kerugian: **Total pesanan ($138.116$)**.
- **Penanganan Nilai Null**: 0.
- **Tolok Ukur Validasi**: **$2.530$ pesanan** ($1,83\%$ dari total order). Seluruh $2.530$ order rugi terkonsentrasi di bracket diskon $>30\%$.
- **Keterbatasan yang Diketahui**: Pada basis kolom sumber `as_stored`, order rugi hanya $1.296$ karena pajak yang dipungut menutupi sebagian kerugian barang.

---

### 2.6 Total Financial Loss (Total Nilai Kerugian Finansial)
- **Makna Bisnis**: Nilai kerugian absolut yang diderita perusahaan dari seluruh pesanan yang membukukan margin negatif.
- **Rumus yang Tepat**: 
  $$\text{Total Loss} = \sum_{\text{profit} < 0} |\text{profit}|$$
- **Kolom atau Tabel Sumber**: Kolom turunan `profit` pada baris dengan nilai $< 0$.
- **Metode Agregasi**: Penjumlahan nilai absolut (`SUM(ABS)`).
- **Satuan & Format Tampilan**: USD, format: `$#,##0.00` (contoh: `$426,306.80`). Ditampilkan sebagai angka positif berlabel "Total Kerugian" (bukan minus).
- **Perilaku Filter**: Menjumlahkan pada subset terfilter.
- **Penyebut (*Denominator*)**: Tidak ada.
- **Penanganan Nilai Null**: 0.
- **Tolok Ukur Validasi**: **$\$426.306,80$** (pada basis sumber adalah $-\$201.225,34$).
- **Keterbatasan yang Diketahui**: Merupakan kerugian kotor barang dagangan; belum memperhitungkan biaya retur logistik tambahan.

---

## 3. Metrik Volume & Keranjang Belanja (Volume & Basket Metrics)

### 3.1 Total Orders (Volume Transaksi)
- **Makna Bisnis**: Jumlah seluruh transaksi pesanan penjualan yang berhasil dicatat oleh sistem selama horizon periode operasional.
- **Rumus yang Tepat**: 
  $$\text{Total Orders} = \text{Count}(\text{order\_id})$$
- **Kolom atau Tabel Sumber**: Kolom kunci unik `order_id` pada tabel fakta.
- **Metode Agregasi**: Hitung baris (`COUNT`). Aditif penuh.
- **Satuan & Format Tampilan**: Bilangan bulat (contoh: `138,116 pesanan`).
- **Perilaku Filter**: Menjumlahkan baris kubus yang terpilih.
- **Penyebut (*Denominator*)**: Tidak ada.
- **Penanganan Nilai Null**: 0 baris null, 0 duplikat kunci.
- **Tolok Ukur Validasi**: **$138.116$ pesanan**.
- **Keterbatasan yang Diketahui**: 1 baris mewakili 1 order belanja, bukan jumlah item produk perorangan di dalamnya.

---

### 3.2 Average Order Value (AOV - Nilai Rata-rata Pesanan)
- **Makna Bisnis**: Rata-rata nilai penjualan merchandise bersih yang dihasilkan dari setiap satu pesanan belanja.
- **Rumus yang Tepat**: 
  $$\text{AOV} = \frac{\sum \text{Net Sales}}{\sum \text{Total Orders}}$$
- **Kolom atau Tabel Sumber**: Kolom turunan `net_sales` dan hitungan `order_id`.
- **Metode Agregasi**: Pembagian rasio terbobot ($\sum \text{net\_sales} / \sum \text{orders}$).
- **Satuan & Format Tampilan**: USD, format: `$#,##0.00` (contoh: `$1,137.76`).
- **Perilaku Filter**: Dihitung ulang pada subset terfilter.
- **Penyebut (*Denominator*)**: **$\sum \text{Total Orders}$ pada subset terfilter**.
- **Penanganan Nilai Null**: Jika orders = 0, kembalikan `$0.00`.
- **Tolok Ukur Validasi**: **$\$1.137,76$** (pada basis sumber adalah $\$1.282,50$).
- **Keterbatasan yang Diketahui**: Nilai ini didasarkan pada Basis C; jika dibandingkan dengan laporan industri luar yang menyertakan pajak/ongkir, nilai ini tampak lebih rendah namun lebih murni.

---

### 3.3 Basket Quantity (Kuantitas Barang per Pesanan)
- **Makna Bisnis**: Jumlah fisik unit produk yang dibeli konsumen dalam satu transaksi pesanan.
- **Rumus yang Tepat**: 
  $$\text{Mean Quantity} = \frac{1}{N} \sum_{i=1}^{N} \text{quantity}_i$$
- **Kolom atau Tabel Sumber**: Kolom `quantity` pada tabel fakta.
- **Metode Agregasi**: Rata-rata aritmatika (`AVG`).
- **Satuan & Format Tampilan**: Angka desimal (contoh: `5.42 unit`).
- **Perilaku Filter**: Dihitung dari subset terfilter.
- **Penyebut (*Denominator*)**: Total transaksi ($N$).
- **Penanganan Nilai Null**: 0 null. Rentang: 1 hingga 24 unit.
- **Tolok Ukur Validasi**: Rerata keseluruhan: $5,42$ unit. (Rerata per bracket diskon: 0% = 4,98 unit, 30%+ = 7,94 unit).
- **Keterbatasan yang Diketahui**: Kuantitas berkorelasi positif dengan kedalaman diskon ($+0,283$), menciptakan efek perancu keranjang (*basket size confound*).

---

## 4. Metrik Strategi Diskon (Discount Metrics)

### 4.1 Weighted Discount Rate (Tingkat Diskon Terbobot % - Metrik Utama Diskon)
- **Makna Bisnis**: Persentase total nilai potongan harga yang diberikan perusahaan dibandingkan terhadap seluruh potensi nilai penjualan kotor (*portfolio-level discount depth*).
- **Rumus yang Tepat**: 
  $$\text{Weighted Discount Rate \%} = \frac{\sum \text{Discount Amount}}{\sum \text{Gross Sales}} \times 100$$
- **Kolom atau Tabel Sumber**: Kolom `discount_amount` dan `gross_sales` pada tabel fakta.
- **Metode Agregasi**: Rasio terbobot dari jumlah nominal.
- **Satuan & Format Tampilan**: Persentase, format: `0.00%` (contoh: `17.28%`).
- **Perilaku Filter**: Dihitung ulang dari $\sum \text{discount} / \sum \text{gross} \times 100$ pada subset. Sejak `mvp-6`, kedua ukuran aditif ini dibawa kubus gabungan bersama `orders`/`net_sales`/`profit`, sehingga nilainya mengikuti setiap kombinasi filter global (rentang bulan + segmen + channel + status order).
- **Penyebut (*Denominator*)**: **$\sum \text{Gross Sales}$**.
- **Penanganan Nilai Null**: 0.
- **Tolok Ukur Validasi**: **$17,28\%$**.
- **Keterbatasan yang Diketahui**: Berbeda $2,16\text{ pp}$ dari rata-rata baris aritmatika ($15,12\%$) karena pesanan besar cenderung memiliki diskon lebih dalam.

---

### 4.2 Row-level Average Discount Rate (Rata-rata Diskon per Baris %)
- **Makna Bisnis**: Rata-rata persentase diskon per transaksi individual tanpa pembobotan nominal omzet.
- **Rumus yang Tepat**: 
  $$\text{Row Avg Discount \%} = \frac{1}{N} \sum_{i=1}^{N} \left(\frac{\text{discount\_amount}_i}{\text{gross\_sales}_i} \times 100\right)$$
- **Kolom atau Tabel Sumber**: Kolom `discount_amount` dan `gross_sales` per baris.
- **Metode Agregasi**: Rata-rata baris (`AVG`). Non-aditif.
- **Satuan & Format Tampilan**: Persentase, format: `0.00%` (contoh: `15.12%`).
- **Perilaku Filter**: Hanya valid untuk bulan tunggal atau seluruh dataset.
- **Penyebut (*Denominator*)**: **Jumlah pesanan ($N$)**.
- **Penanganan Nilai Null**: Jika gross sales = 0, diskon diatur 0%.
- **Tolok Ukur Validasi**: Rata-rata: **$15,12\%$**, Median: **$12,75\%$**, Maksimum: **$60,02\%$**.
- **Keterbatasan yang Diketahui**: Tidak boleh dicampuradukkan dengan diskon terbobot.

---

### 4.3 Discount Depth Brackets (Tingkat Kedalaman Diskon 5 Kategori)
- **Makna Bisnis**: Pengelompokan seluruh transaksi ke dalam 5 tingkatan diskon guna menganalisis batas elastisitas harga dan degradasi margin laba.
- **Rumus yang Tepat**: 
  Kategori per baris berdasarkan $\text{discount\_rate} = \text{discount\_amount} / \text{gross\_sales} \times 100$:
  - `0%`: Tingkat diskon $= 0$
  - `1-10%`: $0 < \text{tingkat diskon} \le 10$
  - `11-20%`: $10 < \text{tingkat diskon} \le 20$
  - `21-30%`: $20 < \text{tingkat diskon} \le 30$
  - `30%+`: $\text{tingkat diskon} > 30$
- **Kolom atau Tabel Sumber**: Kolom turunan per baris tabel fakta.
- **Metode Agregasi**: Binning kategoris lengkap dan saling lepas (*mutually exclusive & collectively exhaustive*).
- **Satuan & Format Tampilan**: Distribusi tabel dan diagram batang.
- **Perilaku Filter**: Mengikuti rentang periode melalui kubus panel `discount_bracket` (mvp-4); tidak dapat digabungkan dengan filter segmen/channel/status.
- **Penyebut (*Denominator*)**: Total pesanan masing-masing bracket.
- **Penanganan Nilai Null**: 0.
- **Tolok Ukur Validasi**:
  | Bracket | Transaksi | Net Sales (USD) | Profit (USD) | Margin Keseluruhan | Margin Transaksi Rerata | Order Rugi |
  |---|---|---|---|---|---|---|
  | **0%** | $17.864$ | $\$21.770.139$ | $\$10.538.011$ | **48,41%** | 51,30% | 0 |
  | **1-10%** | $35.031$ | $\$39.340.499$ | $\$17.601.245$ | **44,74%** | 48,06% | 0 |
  | **11-20%** | $49.198$ | $\$52.820.115$ | $\$21.062.208$ | **39,88%** | 43,11% | 0 |
  | **21-30%** | $17.729$ | $\$21.188.389$ | $\$6.689.904$ | **31,57%** | 35,61% | 0 |
  | **30%+** | $18.294$ | $\$22.024.072$ | $\$3.340.937$ | **15,17%** | 18,13% | $2.530$ |
- **Keterbatasan yang Diketahui**: Penurunan margin paling tajam ada pada lompatan ke tier 30%+ (anjlok $-16,40\text{ pp}$). Dilarang mengklaim "titik diskon optimal 20%" tanpa model ekonometrika.

---

## 5. Metrik Pelanggan & Retensi (Customer Intelligence Metrics)

### 5.1 Active Customers (Pelanggan Aktif yang Bertransaksi)
- **Makna Bisnis**: Jumlah entitas pelanggan unik yang melakukan minimal 1 kali transaksi pembelanjaan dalam kurun waktu dataset.
- **Rumus yang Tepat**: 
  $$\text{Active Customers} = \text{CountDistinct}(\text{customer\_id})$$
- **Kolom atau Tabel Sumber**: Kolom `customer_id` pada tabel fakta `ecommerce_sales_customer_analytics_150k.csv`.
- **Metode Agregasi**: Hitung unik (`COUNT DISTINCT`). **Non-aditif**.
- **Satuan & Format Tampilan**: Bilangan bulat (contoh: `24,911 pelanggan`).
- **Perilaku Filter**: Hanya dihitung per bulan tunggal atau total 5 tahun. Dilarang menjumlahkan pelanggan unik lintas bulan.
- **Penyebut (*Denominator*)**: Tidak ada.
- **Penanganan Nilai Null**: 0.
- **Tolok Ukur Validasi**: **$24.911$ pelanggan** (dari total $25.000$ pada tabel master; terdapat 89 pelanggan master tanpa order).
- **Keterbatasan yang Diketahui**: Harus dibedakan dari angka master $25.000$.

---

### 5.2 Repeat Customer Rate - Customer Level (Tingkat Pelanggan Berulang - D4)
- **Makna Bisnis**: Persentase dari seluruh pelanggan aktif yang melakukan lebih dari satu kali pemesanan belanja ($\ge 2$ pesanan) sepanjang masa hidup akun mereka.
- **Rumus yang Tepat**: 
  $$\text{Repeat Customer Rate \%} = \frac{\text{Jumlah Pelanggan dengan Total Order} > 1}{\text{Total Pelanggan Aktif}} \times 100$$
- **Kolom atau Tabel Sumber**: Agregasi `order_id` per `customer_id` pada tabel fakta.
- **Metode Agregasi**: Rasio unik tingkat pelanggan.
- **Satuan & Format Tampilan**: Persentase, format: `0.00%` (contoh: `97.90%`).
- **Perilaku Filter**: Dihitung pada level portofolio keseluruhan.
- **Penyebut (*Denominator*)**: **Total Pelanggan Aktif ($24.911$)**.
- **Penanganan Nilai Null**: 0.
- **Tolok Ukur Validasi**: **$97,90\%$** ($24.387$ dari $24.911$ pelanggan memiliki $>1$ order).
- **Keterbatasan yang Diketahui**: Menggantikan kolom mentah `is_repeat_customer` ($99,76\%$) yang tidak valid untuk tindakan bisnis (D4).

---

### 5.3 Orders per Customer (Frekuensi Pesanan per Pelanggan)
- **Makna Bisnis**: Rata-rata akumulasi jumlah pesanan belanja yang dilakukan oleh seorang pelanggan aktif.
- **Rumus yang Tepat**: 
  $$\text{Orders per Customer} = \frac{\text{Total Orders}}{\text{Total Active Customers}}$$
- **Kolom atau Tabel Sumber**: Pembagian antara jumlah transaksi fakta dengan jumlah pelanggan unik.
- **Metode Agregasi**: Rasio terbobot.
- **Satuan & Format Tampilan**: Angka desimal, format: `0.00` (contoh: `5.54 pesanan/pelanggan`).
- **Perilaku Filter**: Non-aditif lintas bulan; disembunyikan jika filter mencakup multi-bulan.
- **Penyebut (*Denominator*)**: **Pelanggan Aktif ($24.911$)**.
- **Penanganan Nilai Null**: 0.
- **Tolok Ukur Validasi**: **$5,544$** (median: 5, min: 1, maks: 19 order).
- **Keterbatasan yang Diketahui**: Jangan menggunakan kolom `customer_order_count` karena menyimpang pada $37,83\%$ pelanggan (I-9).

---

### 5.4 Profit per Customer (Laba per Pelanggan Aktif)
- **Makna Bisnis**: Rata-rata kontribusi laba bersih merchandise riil yang dihasilkan oleh setiap pelanggan aktif kepada perusahaan.
- **Rumus yang Tepat**: 
  $$\text{Profit per Customer} = \frac{\sum \text{Profit}}{\text{Total Active Customers}}$$
- **Kolom atau Tabel Sumber**: Kolom turunan `profit` (Basis C) dibagi jumlah unik `customer_id`.
- **Metode Agregasi**: Rasio terbobot.
- **Satuan & Format Tampilan**: USD, format: `$#,##0.00` (contoh: `$2,377.76 per pelanggan`).
- **Perilaku Filter**: Non-aditif lintas bulan.
- **Penyebut (*Denominator*)**: **Pelanggan Aktif ($24.911$)**.
- **Penanganan Nilai Null**: 0.
- **Tolok Ukur Validasi**: Keseluruhan: **$\$2.377,76$**.
  - Segmen Consumer: **$\$2.470,14$** (tertinggi)
  - Segmen Business: **$\$2.420,96$**
  - Segmen Premium: **$\$2.223,38$**
  - Segmen VIP: **$\$2.221,99$** (terendah akibat diskon dalam)
- **Keterbatasan yang Diketahui**: Membantah narasi awal bahwa segmen VIP/Premium paling menguntungkan (S-2).

---

### 5.5 Mean Customer Rating (Kepuasan Pelanggan Rata-rata)
- **Makna Bisnis**: Skor rata-rata kepuasan pengalaman berbelanja yang diberikan pelanggan pada pesanan yang berhasil diterima.
- **Rumus yang Tepat**: 
  $$\text{Mean Rating} = \frac{1}{M} \sum_{i=1}^{M} \text{customer\_rating}_i$$
- **Kolom atau Tabel Sumber**: Kolom `customer_rating` pada tabel fakta.
- **Metode Agregasi**: Rata-rata baris yang tidak null (`AVG`).
- **Satuan & Format Tampilan**: Angka desimal skala 1–5, format: `0.00` (contoh: `3.68 / 5.0`).
- **Perilaku Filter**: Dihitung dari baris yang terisi pada subset.
- **Penyebut (*Denominator*)**: **Jumlah pesanan terkirim yang memberikan rating ($M = 113.559$)**.
- **Penanganan Nilai Null**: Terdapat $24.557$ baris bernilai null (seluruh pesanan yang tidak terkirim: Pending, Returned, Cancelled sengaja tidak memiliki rating). Baris null diabaikan dari pembagi.
- **Tolok Ukur Validasi**: **$3,677$**.
- **Keterbatasan yang Diketahui**: Hanya merefleksikan pesanan yang sampai di tujuan.

---

### 5.6 Metrik Pelanggan yang Belum Divalidasi (UNVALIDATED)

| Nama Metrik | Kolom Sumber | Masalah & Alasan Pelarangan | Status Regulasi |
|---|---|---|---|
| **`is_repeat_customer` (Transaksi)** | `is_repeat_customer` | Bernilai True pada $99,76\%$ baris (hanya 334 False). Bertentangan dengan `customer_type` ($8.335$ Returning) dan tidak dapat ditindaklanjuti. | **UNVALIDATED** (Gunakan D4 tingkat pelanggan) |
| **`customer_order_count`** | `customer_order_count` | Berbeda dari hitungan pesanan sebenarnya pada $37,83\%$ pelanggan ($9.423$ orang). Kolom sintetis cacat. | **UNVALIDATED** (Hitung langsung dari `COUNT(order_id)`) |
| **Customer Lifetime Value (CLV)** | `customer_lifetime_value` | Nilai konstan per pelanggan dengan rata-rata $\$7.721,56$, melampaui laba riil pada 100% pelanggan (rasio 3,25x). Asal usul matematis tidak diketahui. | **UNVALIDATED** (Dilarang disajikan sebagai metrik terverifikasi) |
| **Customer Acquisition Cost (CAC)** | `customer_acquisition_cost` | Nilai tercatat $\$5,01-\$79,99$ pada tabel pelanggan, tetapi tidak ada tanggal akuisisi atau aturan atribusi jendela waktu. | **UNVALIDATED** (Tidak dipakai untuk KPI) |
| **ROMI / ROI Pemasaran** | Turunan | Dataset tidak memiliki data biaya riil per saluran pemasaran (*marketing spend*). | **UNVALIDATED** (Dikecualikan dari MVP) |
| **Komparasi First-Time vs Repeat** | Irisan | Sampel pesanan *first-time* hanya 334 transaksi ($0,24\%$). Secara statistik tidak valid untuk uji komparasi. | **UNVALIDATED** (Dilarang dipublikasikan di UI) |

---

## 6. Metrik Deteksi Anomali & Penyelamatan Laba (Anomaly & Gap Metrics)

### 6.1 High-Revenue Low-Margin Orders (Pesanan Anomali)
- **Makna Bisnis**: Transaksi bervolume penjualan besar namun menghasilkan margin laba yang sangat tipis, mengindikasikan adanya pemberian diskon promosi yang berlebihan atau ketidaktepatan penetapan harga.
- **Rumus yang Tepat**: 
  Pesanan yang memenuhi kedua syarat secara inklusif (D2):
  $$\text{net\_sales} \ge \$1.552,32 \quad (\text{Persentil ke-75}) \quad \text{DAN} \quad \text{profit\_margin} \le 34,12\% \quad (\text{Persentil ke-25})$$
- **Kolom atau Tabel Sumber**: Kolom turunan `net_sales` dan `profit_margin` Basis C pada tabel fakta.
- **Metode Agregasi**: Hitung baris bertanda anomali (`COUNT`).
- **Satuan & Format Tampilan**: Bilangan bulat dan persentase pangsa (contoh: `12,855 pesanan` / `9.31%`).
- **Perilaku Filter**: Ambang kuartil dipatok **secara global** agar angka dapat direkonsiliasi.
- **Penyebut (*Denominator*)**: **Total pesanan ($138.116$)**.
- **Penanganan Nilai Null**: 0.
- **Tolok Ukur Validasi**: **$12.855$ pesanan** ($9,31\%$ baris).
- **Keterbatasan yang Diketahui**: Jika menggunakan operator ketat ($>$ dan $<$), jumlahnya $12.855$ (pada Basis C kedua operator bernilai sama karena tidak ada baris tepat di titik persentil).

---

### 6.2 Anomaly Net Sales & Profit (Finansial Transaksi Anomali)
- **Makna Bisnis**: Akumulasi nilai omzet penjualan dan laba kotor yang bersumber secara khusus dari pesanan-pesanan anomali.
- **Rumus yang Tepat**: 
  $$\text{Anomaly Net Sales} = \sum_{\text{anomali}} \text{net\_sales}, \quad \text{Anomaly Profit} = \sum_{\text{anomali}} \text{profit}$$
- **Kolom atau Tabel Sumber**: Kolom fakta pada baris berstatus anomali.
- **Metode Agregasi**: Penjumlahan (`SUM`).
- **Satuan & Format Tampilan**: USD, format: `$#,##0.00`.
- **Perilaku Filter**: Menjumlahkan baris anomali pada subset.
- **Penyebut (*Denominator*)**: Tidak ada.
- **Penanganan Nilai Null**: 0.
- **Tolok Ukur Validasi**:
  - Revenue Anomali: **$\$34.665.272,99$** ($22,06\%$ dari total omzet perusahaan).
  - Profit Anomali: **$\$7.528.760,49$** ($12,71\%$ dari total laba perusahaan).
  - Margin Keseluruhan Anomali: **$21,72\%$** (jauh di bawah margin normal $37,69\%$).
- **Keterbatasan yang Diketahui**: Menunjukkan bahwa $22\%$ omzet perusahaan hanya menghasilkan margin kotor $21\%$.

---

### 6.3 Opportunity Gap - Aggregate Basis (Simulasi Potensi Pemulihan Laba - D3)
- **Makna Bisnis**: Estimasi keuntungan tambahan yang dapat diraih perusahaan secara teoritis jika margin pesanan anomali dapat dinaikkan hingga menyamai rata-rata margin keseluruhan portofolio ($37,69\%$) tanpa menurunkan volume belanja.
- **Rumus yang Tepat**: 
  $$\text{Opportunity Gap}_{\text{Agg}} = \text{Anomaly Net Sales} \times (\text{Margin Keseluruhan Portofolio} - \text{Margin Keseluruhan Anomali})$$
  $$\text{Opportunity Gap}_{\text{Agg}} = \$34.665.272,99 \times (37,69\% - 21,72\%) = \$5.537.690,05$$
- **Nama Kolom**: `counterfactual_gap_aggregate_margin` (angka utama). Pembanding teknis memakai basis rata-rata transaksi:
  $$\text{Opportunity Gap}_{\text{Txn}} = \text{Net Sales Anomali} \times 41,16\% - \text{Profit Anomali} \rightarrow \texttt{counterfactual\_gap\_avg\_txn\_margin}$$
  Hasil: **$\$6.738.175,54$**. Persentase margin di baris ini adalah pembulatan tampilan; pipeline memakai presisi penuh ($41,156278\%$ untuk basis transaksi dan $37,6932\%$ untuk basis agregat).
  Keduanya simulasi potensi dan **tidak boleh** disajikan sebagai keuntungan riil; angka utama tetap basis agregat.
- **Kolom atau Tabel Sumber**: Perhitungan turunan dari metrik anomali Basis C.
- **Metode Agregasi**: Simulasi potensi.
- **Satuan & Format Tampilan**: USD, format: `$#,##0.00` (contoh: `$5,537,690.05`). Wajib label: "Simulasi potensi".
- **Perilaku Filter**: Dihitung dari metrik agregat.
- **Penyebut (*Denominator*)**: Tidak ada.
- **Penanganan Nilai Null**: 0.
- **Tolok Ukur Validasi**: **$\$5.537.690,05$** (pada basis rata-rata transaksi baris adalah $\$6.738.175,54$).
- **Keterbatasan yang Diketahui**: Merupakan angka simulasi potensi; bukan target anggaran dan bukan jaminan realisasi tanpa uji elastisitas permintaan.

---

## 7. Metrik Operasional & Logistik (Operational & Logistics Metrics)

### 7.1 Pembedaan Kritis: Status Pesanan vs Status Pengiriman
Agar tidak terjadi kerancuan terminologi pelaporan:
- **`order_status` (Status Pesanan Komersial)**: Status administrasi pesanan pelanggan (`Completed`, `Pending`, `Returned`, `Cancelled`).
- **`delivery_status` (Status Fisik Logistik)**: Kondisi fisik pengiriman kurir (`On Time`, `Delayed`, `Early`, `Cancelled`). Di mana `Cancelled` pada pengiriman bermakna **"Tidak Dikirim"** (mencakup seluruh pesanan yang dibatalkan, ditahan/pending, maupun diretur).

---

### 7.2 Order Status Distribution (Distribusi Status Pesanan Komersial)
- **Makna Bisnis**: Komposisi volume dan rasio pesanan berdasarkan status penyelesaian komersialnya.
- **Rumus yang Tepat**: 
  $$\text{Status Share \%} = \frac{\text{Count}(\text{order\_status} == X)}{\text{Total Orders}} \times 100$$
- **Kolom atau Tabel Sumber**: Kolom `order_status` pada tabel fakta.
- **Metode Agregasi**: Hitung frekuensi baris dibagi total baris.
- **Satuan & Format Tampilan**: Distribusi jumlah dan persentase.
- **Perilaku Filter**: Menyesuaikan subset terfilter.
- **Penyebut (*Denominator*)**: **Total pesanan ($138.116$)**.
- **Penanganan Nilai Null**: 0 baris null. Tepat 4 nilai unik.
- **Tolok Ukur Validasi**:
  | Status Pesanan | Kuantitas Baris | Pangsa Pesanan | Net Sales (USD) | Profit (USD) | Margin Keseluruhan |
  |---|---|---|---|---|---|
  | **Completed** | $113.559$ | **82,22%** | $\$129.231.782,78$ | $\$46.467.755,75$ | **35,96%** |
  | **Pending** | $6.697$ | **4,85%** | $\$7.625.334,16$ | $\$2.753.803,13$ | **36,11%** |
  | **Returned** | $9.462$ | **6,85%** | $\$10.742.668,78$ | $\$5.196.486,01$ | **48,37%** |
  | **Cancelled** | $8.398$ | **6,08%** | $\$9.543.428,34$ | $\$4.814.260,46$ | **48,44%** |
- **Keterbatasan yang Diketahui**: Order Returned dan Cancelled tetap mencatat laba karena ketiadaan data refund (D6).

---

### 7.3 Delivery Status Distribution (Distribusi Status Pemenuhan Fisik)
- **Makna Bisnis**: Efisiensi ketepatan waktu pengantaran barang fisik ke tangan konsumen.
- **Rumus yang Tepat**: 
  $$\text{Delivery Share \%} = \frac{\text{Count}(\text{delivery\_status} == Y)}{\text{Total Orders}} \times 100$$
- **Kolom atau Tabel Sumber**: Kolom `delivery_status` pada tabel fakta.
- **Metode Agregasi**: Hitung frekuensi baris.
- **Satuan & Format Tampilan**: Bilangan bulat dan persentase.
- **Perilaku Filter**: Dilaporkan mandiri.
- **Penyebut (*Denominator*)**: **Total pesanan ($138.116$)**.
- **Penanganan Nilai Null**: 0 baris null.
- **Tolok Ukur Validasi**:
  - `On Time`: $86.916$ pesanan (**62,93%**)
  - `Cancelled / Tidak Dikirim`: $24.557$ pesanan (**17,78%**) (sama persis dengan $8.398\text{ Batal} + 6.697\text{ Pending} + 9.462\text{ Retur}$)
  - `Delayed`: $16.886$ pesanan (**12,23%**)
  - `Early`: $9.757$ pesanan (**7,06%**)
- **Keterbatasan yang Diketahui**: Wajib memberi label "Tidak Dikirim" pada nilai Cancelled agar tidak tertukar dengan status pesanan dibatalkan.

---

## 8. Metrik Waktu & Musiman (Time & Seasonality Metrics)

### 8.1 Monthly & Quarterly Seasonality (Musiman Bulanan & Kuartalan Lintas Tahun)
- **Makna Bisnis**: Pola fluktuasi omzet dan margin yang berulang pada bulan atau kuartal tertentu sepanjang 5 tahun pengamatan.
- **Rumus yang Tepat**: 
  Agregasi bulanan $\sum \text{net\_sales}$ dan $\sum \text{profit} / \sum \text{net\_sales} \times 100$ per bulan kalender 1–12 lintas tahun 2021–2025.
- **Kolom atau Tabel Sumber**: Kolom `order_date` dan ukuran finansial Basis C.
- **Metode Agregasi**: Pengelompokan bulanan dan kuartalan.
- **Satuan & Format Tampilan**: Diagram batang dan area.
- **Perilaku Filter**: Menampilkan data agregat seluruh periode.
- **Penyebut (*Denominator*)**: Total omzet pada bulan/kuartal terkait.
- **Penanganan Nilai Null**: 0.
- **Tolok Ukur Validasi**:
  - Kuartal 1 (Q1): Margin keseluruhan **$42,71\%$**
  - Kuartal 2 (Q2): Margin keseluruhan **$42,96\%$**
  - Kuartal 3 (Q3): Margin keseluruhan **$39,08\%$** (terdapat penurunan di bulan Juli: $34,22\%$)
  - Kuartal 4 (Q4): Margin keseluruhan **$30,22\%$** (terendah tahunan)
  - Puncak Akhir Tahun: November omzet $\$19,11\text{M}$ (margin $25,89\%$), Desember omzet $\$20,69\text{M}$ (margin $26,40\%$).
- **Keterbatasan yang Diketahui**: Lonjakan volume Q4 dibayar mahal oleh anjloknya margin akibat diskon terbobot yang melonjak hingga $30,24\%$.

---

### 8.2 Annual Performance & Year-over-Year (YoY) Growth
- **Makna Bisnis**: Laju pertumbuhan atau perubahan kinerja keuangan tahunan dibandingkan dengan tahun sebelumnya.
- **Rumus yang Tepat**: 
  $$\text{YoY Revenue Growth \%} = \frac{\text{Net Sales}_T - \text{Net Sales}_{T-1}}{\text{Net Sales}_{T-1}} \times 100$$
  $$\text{YoY Profit Growth \%} = \frac{\text{Profit}_T - \text{Profit}_{T-1}}{\text{Profit}_{T-1}} \times 100$$
- **Kolom atau Tabel Sumber**: Kolom `order_date` (tahun) dan ukuran finansial Basis C.
- **Metode Agregasi**: Perhitungan delta tahunan.
- **Satuan & Format Tampilan**: Persentase bertanda ($+$ atau $-$), format: `+0.00%` atau `-0.00%`.
- **Perilaku Filter**: Hanya berlaku pada level data tahunan penuh.
- **Penyebut (*Denominator*)**: **Nilai tahun sebelumnya ($T-1$)**.
- **Penanganan Nilai Null**: **Tahun 2021 tidak memiliki nilai YoY (bernilai `null` / `-`)** karena tidak ada data historis tahun 2020.
- **Tolok Ukur Validasi**:
  | Tahun | Transaksi | Net Sales (USD) | YoY Revenue | Profit (USD) | YoY Profit | Margin Keseluruhan |
  |---|---|---|---|---|---|---|
  | **2021** | $27.554$ | $\$31.690.973$ | **- (Data Awal)** | $\$11.909.437$ | **-** | **37,58%** |
  | **2022** | $27.564$ | $\$31.331.038$ | **-1,14%** | $\$11.784.397$ | **-1,05%** | **37,61%** |
  | **2023** | $27.632$ | $\$31.532.249$ | **+0,64%** | $\$11.869.282$ | **+0,72%** | **37,64%** |
  | **2024** | $27.768$ | $\$31.462.213$ | **-0,22%** | $\$11.903.090$ | **+0,28%** | **37,83%** |
  | **2025** | $27.598$ | $\$31.126.741$ | **-1,07%** | $\$11.766.100$ | **-1,15%** | **37,80%** |
- **Keterbatasan yang Diketahui**: Data menunjukkan kinerja **statis/datar ($\pm 1\%$)**, membuktikan ketiadaan pertumbuhan struktural selama 5 tahun.

---

### 8.3 Weekday vs Weekend Performance (Hari Kerja vs Akhir Pekan)
- **Makna Bisnis**: Perbandingan perilaku transaksi dan margin antara hari Senin–Jumat (*Weekdays*) dan Sabtu–Minggu (*Weekends*).
- **Rumus yang Tepat**: Pengelompokan berdasarkan indeks hari kalender `order_date.weekday() < 5` vs $\ge 5$.
- **Kolom atau Tabel Sumber**: Kolom `order_date` dan metrik Basis C.
- **Metode Agregasi**: Partisi biner dan rasio margin keseluruhan.
- **Satuan & Format Tampilan**: Volume pesanan, pangsa persentase, dan margin keseluruhan.
- **Perilaku Filter**: Data agregat seluruh periode.
- **Penyebut (*Denominator*)**: Total pesanan kelompok masing-masing.
- **Penanganan Nilai Null**: 0.
- **Tolok Ukur Validasi**:
  - `Hari Kerja`: $98.686$ pesanan ($71,45\%$), margin keseluruhan **$37,71\%$**.
  - `Akhir Pekan`: $39.430$ pesanan ($28,55\%$), margin keseluruhan **$37,65\%$**.
- **Keterbatasan yang Diketahui**: Menunjukkan stabilitas margin yang identik (hanya berselisih $0,06\text{ pp}$) antara hari kerja dan akhir pekan.

---

## 9. Metrik Tingkat Produk & Baris SKU (UNVALIDATED - D5)

Tabel berikut mencantumkan metrik pada tabel `order_items.csv` yang **secara tegas dikecualikan dari MVP dan ditandai UNVALIDATED**:

| Nama Metrik | Kolom Sumber | Alasan Pelanggaran & Batasan Validasi | Status Regulasi |
|---|---|---|---|
| **Product Net Sales** | `order_items.net_sales` | Akumulasi total berbeda $+8,61\%$ ($\$192,40\text{M}$ vs fakta $\$177,13\text{M}$). Hanya $91,87\%$ order yang cocok dalam selisih $\$0,01$. | **UNVALIDATED (D5)** |
| **Product Profit** | `order_items.profit` | Akumulasi total berbeda $+8,60\%$ ($\$82,70\text{M}$ vs fakta $\$76,15\text{M}$). | **UNVALIDATED (D5)** |
| **Item Discount %** | `order_items.discount_percentage` | Skala kontinu 0,0–0,6 per baris SKU; berbeda definisi matematis dari `discount_amount / gross_sales` tabel fakta. | **UNVALIDATED** |
| **SKU Key Grain** | `(order_id, product_id)` | Terdapat 87 pasangan kunci duplikat pada 397.569 baris pesanan, melanggar keunikan grain. | **UNVALIDATED** |

---

## 10. Matriks Tolok Ukur Validasi Otomatis (Anchor Benchmarks)

Untuk pengujian otomatis pipeline data (`scripts/prepare_dashboard_data.py`), seluruh angka hasil komputasi wajib lolos toleransi matematis terhadap tabel tolok ukur berikut:

| Kode Anchor | Nama Metrik | Nilai Benchmark Tepat (Basis C) | Toleransi Pengujian |
|---|---|---|---|
| `ANC-01` | Total Gross Sales | **$189.962.560,88$** | $\pm 0,01$ |
| `ANC-02` | Total Discount Amount | **$32.819.346,82$** | $\pm 0,01$ |
| `ANC-03` | Total Net Sales (Basis C) | **$157.143.214,06$** | $\pm 0,01$ |
| `ANC-04` | Total Product Cost | **$97.910.908,71$** | $\pm 0,01$ |
| `ANC-05` | Total Profit (Basis C) | **$59.232.305,35$** | $\pm 0,01$ |
| `ANC-06` | Margin Keseluruhan Total | **37,69%** | $\pm 0,01\text{ pp}$ |
| `ANC-07` | Rata-rata Margin Transaksi | **41,16%** | $\pm 0,01\text{ pp}$ |
| `ANC-08` | Total Volume Transaksi | **138.116** | 0 (Eksak) |
| `ANC-09` | Total Pelanggan Aktif | **24.911** | 0 (Eksak) |
| `ANC-10` | Average Order Value (AOV) | **$1.137,76$** | $\pm 0,01$ |
| `ANC-11` | Repeat Customer Rate (Customer) | **97,90%** | $\pm 0,01\text{ pp}$ |
| `ANC-12` | High Margin Share (>20%) | **92,01%** | $\pm 0,01\text{ pp}$ |
| `ANC-13` | Jumlah Pesanan Merugi | **2.530** | 0 (Eksak) |
| `ANC-14` | Total Nilai Kerugian | **$426.306,80$** | $\pm 0,01$ |
| `ANC-15` | Jumlah Pesanan Anomali | **12.855** | 0 (Eksak) |
| `ANC-16` | Revenue Pesanan Anomali | **$34.665.272,99$** | $\pm 0,01$ |
| `ANC-17` | Margin Keseluruhan Anomali | **21,72%** | $\pm 0,01\text{ pp}$ |
| `ANC-18` | Opportunity Gap (Basis Agregat) | **$5.537.690,05$** | $\pm 0,01$ |
| `ANC-19` | Tingkat Diskon Terbobot | **17,28%** | $\pm 0,01\text{ pp}$ |
| `ANC-20` | Rerata Rating (Hanya Terkirim) | **3,677** | $\pm 0,001$ |
| `ANC-21` | Pajak Dipungut (Pass-Through) | **$16.914.090,41$** | $\pm 0,01$ |
| `ANC-22` | Ongkir Ditagih (Pass-Through) | **$3.076.959,27$** | $\pm 0,01$ |
| `ANC-23` | Kubus Filter Rekonsiliasi | **$\sum \text{Net Sales} = 157.143.214,06$** | $\pm 0,01$ |
| `ANC-24` | Kubus panel `day_type` | **$\sum \text{orders} = 138.116$; $\sum \text{net sales} = 157.143.214,06$; $\sum \text{profit} = 59.232.305,35$** | order eksak; uang $\pm 0,01$ |
| `ANC-25` | Kubus panel `delivery_status` | idem `ANC-24` | idem |
| `ANC-26` | Kubus panel `discount_bracket` | idem `ANC-24` | idem |
| `ANC-27` | Kubus panel `region` | idem `ANC-24` | idem |
| `ANC-28` | Kubus gabungan `combined` (total) | **$\sum \text{orders} = 138.116$; $\sum \text{net sales} = 157.143.214,06$; $\sum \text{profit} = 59.232.305,35$** | order eksak; uang $\pm 0,01$ |
| `ANC-29` | Kubus gabungan $\to$ marginal per bulan | sama persis dengan `months_by_year` | order eksak; uang $\pm 0,01$ |
| `ANC-30` | Kubus gabungan $\to$ marginal `segment` | sama persis per sel dengan kubus `segment` | idem |
| `ANC-31` | Kubus gabungan $\to$ marginal `sales_channel` | sama persis per sel dengan kubus `sales_channel` | idem |
| `ANC-32` | Kubus gabungan $\to$ marginal `order_status` | sama persis per sel dengan kubus `order_status` | idem |
| `ANC-33` | Ukuran diskon kubus (semua kubus) | **$\sum \text{gross\_sales} = 189.962.560,88$; $\sum \text{discount\_amount} = 32.819.346,82$** | $\pm 0,01$ |
| `ANC-34` | Identitas D7 per baris kubus | **$\text{net\_sales} = \text{gross\_sales} - \text{discount\_amount}$ pada setiap baris kubus gabungan, filter satu-dimensi, dan panel** | per baris $\le \$0,03$ (pembulatan sen); global $\pm 0,01$ |

Setiap kubus panel juga wajib mereproduksi jumlah order per nilai yang sudah ditampilkan panel global: `day_type` (Weekday 98.686 / Weekend 39.430), `delivery_status` (86.916 / 24.557 / 16.886 / 9.757), `discount_bracket` (17.864 / 35.031 / 49.198 / 17.729 / 18.294), dan `region` (43.990 / 29.627 / 26.273 / 21.602 / 16.624). Kubus gabungan (mvp-6) wajib mereproduksi setiap marginal di atas persis, sehingga tampilan terfilter dan tak terfilter tidak mungkin berbeda. Setiap baris kubus (termasuk kubus gabungan) membawa ukuran aditif `gross_sales` dan `discount_amount`, sehingga tingkat diskon terbobot ikut semua kombinasi filter global.
