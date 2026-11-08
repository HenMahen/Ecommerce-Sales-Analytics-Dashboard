# Kontrak Data JSON Dasbor (Dashboard Data Contract)
## Dasbor Analisis Penjualan E-Commerce (E-Commerce Sales Analytics Dashboard)

- **Status**: Disetujui & Terkunci untuk Implementasi (`definitions_version = mvp-6`)
- **Peran Dokumen**: Spesifikasi Antarmuka Resmi (*Data Interface Contract*) untuk Seluruh Berkas JSON Olahan di `public/data/*.json` dan `data/processed/*.json`
- **Dasar Rekonsiliasi**: Selaras Penuh dengan [`docs/METRIC_DICTIONARY.md`](file:///c:/Users/TUF/OneDrive/Semester%205/Proyek/Penjualan_E-Commerce/docs/METRIC_DICTIONARY.md), [`docs/EDA_VALIDATION.md`](file:///c:/Users/TUF/OneDrive/Semester%205/Proyek/Penjualan_E-Commerce/docs/EDA_VALIDATION.md), dan [`docs/PRD.md`](file:///c:/Users/TUF/OneDrive/Semester%205/Proyek/Penjualan_E-Commerce/docs/PRD.md)
- **Prinsip Utama**: **Frontend dilarang menghitung metrik bisnis dari data mentah**. Seluruh logika bisnis dipersiapkan di pipeline Python (`scripts/prepare_dashboard_data.py`), dan UI hanya bertugas membaca, menyajikan, serta merangkum subset kubus aditif yang telah tervalidasi.

---

## 1. Versi Skema & Ketentuan Umum

### 1.1 Versi Skema Aktif
- **`definitions_version`**: `"mvp-6"`
- Seluruh berkas JSON wajib menyertakan atribut root `"definitions_version": "mvp-6"`. Lapisan pemuat data UI (`loadDashboardData.ts`) wajib memeriksa kesesuaian versi ini saat inisialisasi aplikasi dan melempar *runtime error* jika terjadi ketidakcocokan versi skema.
- Riwayat versi: `mvp-3` (kubus filter + blok `derived` + `time-dimensions.json`) dinaikkan ke `mvp-4` karena `filter-cubes.json` bertambah empat kubus panel (`day_type`, `delivery_status`, `discount_bracket`, `region`), lalu ke `mvp-5` karena berkas yang sama bertambah satu *kubus gabungan* ($Period \times Segment \times Sales\,Channel \times Status\,Order$) agar keempat filter global dapat dipakai bersamaan. Kubus satu-dimensi dipertahankan sebagai marginal dan wajib sama persis dengan kubus gabungan. Versi kini `mvp-6`: **seluruh kubus** (gabungan, satu-dimensi, panel) bertambah dua ukuran aditif `gross_sales` dan `discount_amount`, sehingga KPI diskon (gross, nilai diskon, tingkat terbobot $\sum\text{discount}/\sum\text{gross}$) mengikuti setiap kombinasi filter global. Tidak ada metrik, rumus inti, atau angka yang berubah; lihat §3.9, §4.1, dan §4.2.

### 1.2 Standar Tipe Numerik & Presisi
1. **Presisi Finansial / Mata Uang (USD)**:
   - Seluruh nilai moneter (`net_sales`, `gross_sales`, `profit`, `discount_amount`, `product_cost`, `tax_collected`, `shipping_billed`, `total_loss`) bertipe `number` (IEEE 754 float64).
   - Dibulatkan tepat ke 2 desimal (`round(val, 2)`).
   - Format tampilan: `$#,##0.00` (locale `en-US`).
2. **Presisi Rasio & Persentase**:
   - Bertipe `number`, disimpan dalam skala 0–100 (contoh: `37.69` untuk $37,69\%$).
   - Dibulatkan ke 2 desimal (`round(val, 2)`).
   - Persentase perubahan YoY (`revenue_yoy_pct`, `profit_yoy_pct`) bertipe `number | null`.
3. **Kuantitas & Hitungan Objek**:
   - Bertipe `number` (integer bulat $\ge 0$ tanpa desimal): `orders`, `customers`, `loss_orders`, `anomalies`.
   - Pengecualian metrik rata-rata per objek: `orders_per_customer` (3 desimal, contoh `5.544`) dan `mean_rating` (3 desimal, contoh `3.677`).

### 1.3 Standar Format Tanggal & Waktu
- Format Periode Bulanan: `"YYYY-MM"` (contoh: `"2021-01"` sampai `"2025-12"`).
- Format Musiman Bulanan: `"01"` sampai `"12"`.
- Format Periode Kuartalan: `"YYYY-Qn"` (contoh: `"2021-Q1"` sampai `"2025-Q4"`).
- Format Rentang Tanggal Ekstrem: ISO 8601 Date `"YYYY-MM-DD"` (contoh: `"2021-01-01"` dan `"2025-12-31"`).
- Format Waktu Pembuatan (*Timestamp*): ISO 8601 UTC dengan penanda zona waktu (contoh: `"2026-10-14T10:02:49+00:00"`).

### 1.4 Standar Penanganan Nilai Kosong (*Null Value Handling*)
- Pada ukuran numerik reguler, nilai kosong **tidak diperbolehkan** (wajib `0` atau angka riil).
- Nilai `null` secara eksplisit **hanya diizinkan** pada kasus matematis khusus:
  1. `revenue_yoy_pct` dan `profit_yoy_pct` pada tahun awal dataset (`2021`), karena tidak ada data pembanding tahun 2020.
- Pada UI, jika subset filter menghasilkan nol transaksi: nilai total ditampilkan sebagai `$0.00` atau `0`, dan margin ditampilkan sebagai `0.00%` atau `"N/A"` disertai lencana status kosong (*EmptyState*).

---

## 2. Inventaris Berkas JSON Olahan

Pipeline data menghasilkan tepat 9 berkas JSON statis yang disalin ke `public/data/` dan `data/processed/`:

```
public/data/
├── metadata.json                 # Versi skema, keputusan D1-D7, dan parameter toleransi
├── dashboard-summary.json        # Objek KPI utama, total finansial, dan status mix
├── monthly-performance.json      # Agregasi 12 bulan musiman dan deret 60 bulan
├── annual-performance.json       # Kinerja 5 tahun historis dan pertumbuhan YoY
├── segment-performance.json      # Kinerja 4 segmen pelanggan dan metrik per pelanggan aktif
├── discount-brackets.json        # Distribusi 5 tingkat diskon dan metrik order rugi
├── anomaly-by-dimension.json     # Catatan transaksi anomali dan sebaran lintas dimensi
├── time-dimensions.json          # Agregasi kuartalan, hari kerja/akhir pekan, dan status kirim
└── filter-cubes.json             # Kubus agregat untuk sistem filter global dan panel rentang periode
```

---

## 3. Spesifikasi Skema Detail & Contoh Struktur JSON

### 3.1 Berkas `metadata.json`
Menyimpan riwayat dataset, parameter toleransi, dan keputusan bisnis D1–D7 yang aktif.

- **Atribut Wajib**:
  - `dataset_version` (`string`): Pengenal versi data mentah.
  - `source_files` (`string[]`): Daftar CSV sumber yang diaudit (`ecommerce_sales_...`, `customer_master.csv`, `product_catalog.csv`).
  - `excluded_source_files` (`string[]`): Berkas yang dikeluarkan (`order_items.csv`, `dataset_statistics.csv`).
  - `row_count` (`number`): Tepat `138116`.
  - `date_range` (`{ min: string, max: string }`): `"2021-01-01"` s/d `"2025-12-31"`.
  - `definitions_version` (`string`): `"mvp-4"`.
  - `decisions` (`object`): Peta keputusan bisnis D1–D7 (lihat contoh).
  - `tolerances` (`{ money_abs: number, pct_abs: number, count_abs: number }`): Batas toleransi validasi otomatis (`0.01`, `0.01`, `0`).

```json
{
  "dataset_version": "ecommerce-sales-2021-2025",
  "source_files": [
    "ecommerce_sales_customer_analytics_150k.csv",
    "customer_master.csv",
    "product_catalog.csv"
  ],
  "excluded_source_files": [
    "order_items.csv",
    "dataset_statistics.csv"
  ],
  "row_count": 138116,
  "date_range": {
    "min": "2021-01-01",
    "max": "2025-12-31"
  },
  "definitions_version": "mvp-4",
  "decisions": {
    "margin_basis": "aggregate_primary",
    "avg_transaction_margin": "secondary",
    "net_sales_basis": "merchandise_gross_minus_discount",
    "tax_treatment": "pass_through",
    "shipping_treatment": "pass_through",
    "anomaly_operator": "inclusive",
    "repeat_customer_definition": "customer_with_more_than_one_order",
    "product_level_metrics": "excluded",
    "returns_treatment": "status_only_no_refund_amount",
    "excluded_metrics": ["clv", "romi"],
    "global_filters": ["period", "customer_segment", "sales_channel", "order_status"],
    "cross_filter_source": "filter-cubes.json (combined: period x segment x sales_channel x order_status)",
    "filter_dimensions": ["segment", "sales_channel", "order_status"],
    "panel_dimensions": ["day_type", "delivery_status", "discount_bracket", "region"],
    "combined_cube_measures": ["orders", "net_sales", "profit"],
    "non_additive_measures": ["customers", "avg_transaction_margin_pct"],
    "business_formulas_location": "python_prep_only"
  },
  "generated_at": "2026-10-14T10:02:49+00:00",
  "tolerances": {
    "money_abs": 0.01,
    "pct_abs": 0.01,
    "count_abs": 0
  }
}
```

---

### 3.2 Berkas `dashboard-summary.json` (Objek KPI Utama)
Menyajikan angka dasar untuk kartu KPI eksekutif, pass-through, status mix, dan metrik turunan.

- **Atribut Wajib**:
  - `totals` (`object`):
    - `gross_sales` (`number`): Total penjualan kotor ($189.962.560,88$).
    - `discount_amount` (`number`): Total potongan harga ($32.819.346,82$).
    - `net_sales` (`number`): Omzet merchandise bersih Basis C ($157.143.214,06$).
    - `product_cost` (`number`): Biaya pokok barang ($97.910.908,71$).
    - `profit` (`number`): Laba kotor merchandise Basis C ($59.232.305,35$).
    - `orders` (`number`): $138.116$.
    - `customers_active` (`number`): $24.911$ (pelanggan yang muncul di tabel fakta).
    - `customers_master` (`number`): $25.000$.
    - `products_used` (`number`): $1.175$.
  - `margins` (`object`):
    - `aggregate_margin_pct` (`number`): **37.69** (Metrik Utama).
    - `avg_transaction_margin_pct` (`number`): **41.16** (Metrik Sekunder).
    - `primary_basis` (`string`): `"aggregate"`.
    - `net_sales_basis` (`string`): `"merchandise_gross_minus_discount"`.
  - `pass_through` (`object`):
    - `tax_collected` (`number`): $16.914.090,41$ (bukan pendapatan).
    - `shipping_billed` (`number`): $3.076.959,27$ (bukan pendapatan).
  - `as_stored` (`object`): Nilai kolom sumber mentah untuk audit rekonsiliasi.
  - `kpis` (`object`):
    - `avg_order_value` (`number`): $1.137,76$.
    - `mean_rating` (`number`): $3,677$ (hanya order terkirim).
    - `repeat_customer_rate_customer_level_pct` (`number`): $97,90\%$.
    - `high_margin_transaction_share_pct` (`number`): $92,01\%$.
  - `derived` (`object`):
    - `profit_per_customer` (`number`): $2.377,76$.
    - `orders_per_customer` (`number`): $5,544$.
    - `discount_rate_weighted_pct` (`number`): $17,28\%$.
    - `discount_rate_row_mean_pct` (`number`): $15,12\%$.
    - `discount_rate_row_median_pct` (`number`): $12,75\%$.
    - `discount_rate_row_max_pct` (`number`): $60,02\%$.
    - `loss_orders` (`number`): $2.530$.
    - `total_loss` (`number`): $-426.306,80$ (pada UI disajikan absolut $426.306,80$ berlabel kerugian).
    - `definitions` (`Record<string, string>`): Definisi tertulis dan denominator tiap metrik turunan.
  - `status_mix` (`Record<string, number>`): Hitungan order per status (`completed`, `pending`, `returned`, `cancelled`).
  - `status_margins` (`Record<string, StatusMarginRow>`): Rincian orders, net sales, profit, dan margin per status order.
  - `return_rate_pct` (`number`): $6,85\%$.
  - `cancellation_rate_pct` (`number`): $6,08\%$.
  - `undelivered_rate_pct` (`number`): $17,78\%$.

```json
{
  "definitions_version": "mvp-4",
  "generated_at": "2026-10-14T10:02:49+00:00",
  "source_rows": 138116,
  "date_min": "2021-01-01",
  "date_max": "2025-12-31",
  "net_sales_basis": "merchandise_gross_minus_discount",
  "totals": {
    "gross_sales": 189962560.88,
    "discount_amount": 32819346.82,
    "net_sales": 157143214.06,
    "product_cost": 97910908.71,
    "profit": 59232305.35,
    "orders": 138116,
    "customers_active": 24911,
    "customers_master": 25000,
    "products_used": 1175
  },
  "margins": {
    "aggregate_margin_pct": 37.69,
    "avg_transaction_margin_pct": 41.16,
    "primary_basis": "aggregate",
    "net_sales_basis": "merchandise_gross_minus_discount"
  },
  "pass_through": {
    "note": "Pajak dan ongkir tidak masuk revenue maupun profit...",
    "tax_collected": 16914090.41,
    "shipping_billed": 3076959.27
  },
  "as_stored": {
    "note": "Nilai apa adanya dari file sumber...",
    "net_sales": 177134263.74,
    "profit": 76146395.76,
    "aggregate_margin_pct": 42.99
  },
  "kpis": {
    "avg_order_value": 1137.76,
    "mean_rating": 3.677,
    "repeat_customer_rate_customer_level_pct": 97.9,
    "high_margin_transaction_share_pct": 92.01
  },
  "derived": {
    "profit_per_customer": 2377.76,
    "orders_per_customer": 5.544,
    "discount_rate_weighted_pct": 17.28,
    "discount_rate_row_mean_pct": 15.12,
    "discount_rate_row_median_pct": 12.75,
    "discount_rate_row_max_pct": 60.02,
    "loss_orders": 2530,
    "total_loss": -426306.8
  },
  "status_mix": {
    "completed": 113559,
    "pending": 6697,
    "returned": 9462,
    "cancelled": 8398
  },
  "return_rate_pct": 6.85,
  "cancellation_rate_pct": 6.08,
  "undelivered_rate_pct": 17.78
}
```

---

### 3.3 Berkas `monthly-performance.json` (Agregasi Bulanan)
Menyimpan dua deret waktu bulanan: musiman 12 bulan kalender dan deret 60 bulan historis.

- **Struktur Objek**:
  - `months` (`MonthRow[]`): Tepat 12 baris (Januari s/d Desember), menggabungkan seluruh tahun untuk visualisasi musiman.
  - `months_by_year` (`PeriodRow[]`): Tepat 60 baris (`"2021-01"` s/d `"2025-12"`) untuk visualisasi area chart tren penuh.
- **Tipe Kolom Baris**:
  - `period` (`string`): Format `"01"` s/d `"12"` (pada `months`) atau `"YYYY-MM"` (pada `months_by_year`).
  - `orders` (`number`): Volume pesanan pada bulan terkait.
  - `net_sales` (`number`): Omzet bersih Basis C.
  - `profit` (`number`): Laba kotor Basis C.
  - `avg_transaction_margin_pct` (`number`): Rata-rata margin transaksi per baris.
  - `aggregate_margin_pct` (`number`): Margin keseluruhan berbobot ($\sum \text{profit} / \sum \text{net\_sales} \times 100$).
  - `month_name` (`string`, khusus `months`): `"Jan"`, `"Feb"`, ..., `"Dec"`.

```json
{
  "definitions_version": "mvp-4",
  "months": [
    {
      "period": "01",
      "month_name": "Jan",
      "orders": 9693,
      "net_sales": 10866360.24,
      "profit": 4657040.59,
      "avg_transaction_margin_pct": 45.97,
      "aggregate_margin_pct": 42.86
    },
    {
      "period": "11",
      "month_name": "Nov",
      "orders": 16999,
      "net_sales": 19107451.48,
      "profit": 4947767.11,
      "avg_transaction_margin_pct": 29.64,
      "aggregate_margin_pct": 25.89
    }
  ],
  "months_by_year": [
    {
      "period": "2021-01",
      "orders": 2341,
      "net_sales": 2690371.49,
      "profit": 1152069.96,
      "avg_transaction_margin_pct": 45.94,
      "aggregate_margin_pct": 42.82
    }
  ]
}
```

---

### 3.4 Berkas `annual-performance.json` (Agregasi Tahunan & YoY)
Menyajikan data kinerja per tahun kalender lengkap beserta laju perubahan tahun-ke-tahun.

- **Struktur Baris (`AnnualRow[]`)**: Tepat 5 baris (tahun `2021` sampai `2025`).
- **Tipe Kolom**:
  - `year` (`number`): `2021`, `2022`, `2023`, `2024`, `2025`.
  - `orders` (`number`): Total transaksi tahun bersangkutan.
  - `customers` (`number`): Pelanggan unik yang bertransaksi pada tahun tersebut.
  - `net_sales` (`number`): Penjualan bersih tahunan.
  - `profit` (`number`): Laba kotor tahunan.
  - `avg_transaction_margin_pct` (`number`): Rata-rata margin baris tahunan.
  - `aggregate_margin_pct` (`number`): Margin keseluruhan tahunan.
  - `revenue_yoy_pct` (`number | null`): **Wajib `null` pada 2021**, desimal bertanda pada 2022–2025.
  - `profit_yoy_pct` (`number | null`): **Wajib `null` pada 2021**, desimal bertanda pada 2022–2025.

```json
{
  "definitions_version": "mvp-4",
  "years": [
    {
      "year": 2021,
      "orders": 27554,
      "customers": 16635,
      "net_sales": 31690972.96,
      "profit": 11909436.79,
      "avg_transaction_margin_pct": 41.0,
      "aggregate_margin_pct": 37.58,
      "revenue_yoy_pct": null,
      "profit_yoy_pct": null
    },
    {
      "year": 2022,
      "orders": 27564,
      "customers": 16793,
      "net_sales": 31331038.21,
      "profit": 11784396.53,
      "avg_transaction_margin_pct": 41.08,
      "aggregate_margin_pct": 37.61,
      "revenue_yoy_pct": -1.14,
      "profit_yoy_pct": -1.05
    }
  ]
}
```

---

### 3.5 Berkas `segment-performance.json` (Agregasi Pelanggan)
Menyajikan matriks profitabilitas 4 segmen pelanggan bisnis.

- **Struktur Baris (`SegmentRow[]`)**: Tepat 4 baris (`"Consumer"`, `"Premium"`, `"Business"`, `"VIP"`).
- **Tipe Kolom**:
  - `segment` (`string`): Nama segmen resmi.
  - `orders` (`number`): Total pesanan segmen.
  - `customers` (`number`): Jumlah pelanggan unik segmen.
  - `net_sales` (`number`): Total omzet merchandise segmen.
  - `profit` (`number`): Total laba kotor segmen.
  - `avg_transaction_margin_pct` (`number`): Rata-rata margin baris segmen.
  - `aggregate_margin_pct` (`number`): Margin keseluruhan utama segmen.
  - `profit_share_pct` (`number`): Persentase kontribusi laba segmen terhadap total laba ($56,65\%$, $23,55\%$, $10,28\%$, $9,51\%$).
  - `profit_per_customer` (`number`): $\text{Profit} / \text{Customers}$ segmen.
  - `orders_per_customer` (`number`): $\text{Orders} / \text{Customers}$ segmen.
  - `avg_discount_rate_row_mean_pct` (`number`): Rerata diskon baris.
  - `avg_discount_rate_weighted_pct` (`number`): Diskon terbobot nilai omzet.

```json
{
  "definitions_version": "mvp-4",
  "segments": [
    {
      "segment": "Consumer",
      "orders": 75636,
      "customers": 13585,
      "net_sales": 86043495.08,
      "profit": 33556898.53,
      "avg_transaction_margin_pct": 42.56,
      "aggregate_margin_pct": 39.0,
      "profit_share_pct": 56.65,
      "profit_per_customer": 2470.14,
      "orders_per_customer": 5.57,
      "avg_discount_rate_row_mean_pct": 13.7,
      "avg_discount_rate_weighted_pct": 15.55
    }
  ]
}
```

---

### 3.6 Berkas `discount-brackets.json` (Agregasi Kedalaman Diskon)
Menyajikan performa finansial berdasarkan tier diskon yang diberikan.

- **Struktur Baris (`DiscountBracketRow[]`)**: Tepat 5 baris lengkap dan saling lepas.
- **Tipe Kolom**:
  - `bracket` (`string`): `"0% (No Discount)"`, `"1-10%"`, `"11-20%"`, `"21-30%"`, `"30%+"`.
  - `orders` (`number`): Volume order pada bracket.
  - `net_sales` (`number`): Omzet bersih merchandise.
  - `profit` (`number`): Laba kotor merchandise.
  - `avg_transaction_margin_pct` (`number`): Rata-rata margin baris.
  - `aggregate_margin_pct` (`number`): Margin keseluruhan bracket.
  - `profit_per_order` (`number`): $\text{Profit} / \text{Orders}$.
  - `loss_orders` (`number`): Jumlah pesanan rugi ($0$ pada 4 tier pertama, $2.530$ pada tier 30%+).

```json
{
  "definitions_version": "mvp-4",
  "brackets": [
    {
      "bracket": "0% (No Discount)",
      "orders": 17864,
      "net_sales": 21770139.34,
      "profit": 10538011.45,
      "avg_transaction_margin_pct": 51.3,
      "aggregate_margin_pct": 48.41,
      "profit_per_order": 589.9,
      "loss_orders": 0
    },
    {
      "bracket": "30%+",
      "orders": 18294,
      "net_sales": 22024071.55,
      "profit": 3340936.75,
      "avg_transaction_margin_pct": 18.13,
      "aggregate_margin_pct": 15.17,
      "profit_per_order": 182.62,
      "loss_orders": 2530
    }
  ]
}
```

---

### 3.7 Berkas `anomaly-by-dimension.json` (Catatan Transaksi & Saluran)
Menyimpan aturan anomali global, angka simulasi potensi, serta breakdown sebaran anomali per saluran penjualan, wilayah, dan saluran pemasaran.

- **Struktur Objek**:
  - `rule` (`object`): Definisi batas kuartil atas revenue ($\ge \$1.552,32$) dan kuartil bawah margin ($\le 34,12\%$) dengan operator inklusif.
  - `summary` (`object`): Orders anomali ($12.855$), pangsa order ($9,31\%$), net sales ($\$34,67\text{M}$), profit ($\$7,53\text{M}$), margin keseluruhan anomali ($21,72\%$), dua angka simulasi potensi (`counterfactual_gap_aggregate_margin`, `counterfactual_gap_avg_txn_margin`), dan `assumptions` (`string[]`).
  - **Definisi kedua angka simulasi potensi (D3)**: $\text{gap} = \text{net sales anomali} \times \text{margin portofolio} - \text{profit anomali}$. Basis agregat memakai margin keseluruhan portofolio ($37,69\%$) → `counterfactual_gap_aggregate_margin` $= \$5.537.690,05$ (angka utama). Basis transaksi memakai rata-rata margin transaksi portofolio ($41,16\%$) → `counterfactual_gap_avg_txn_margin` $= \$6.738.175,54$ (pembanding teknis, bukan angka utama). Keduanya wajib berlabel "Simulasi potensi".
  - `dimensions` (`object`):
    - `sales_channel` (`DimensionAnomalyRow[]`): Marketplace, Mobile App, Social Media, Website.
    - `region` (`DimensionAnomalyRow[]`): South, Central, West, East, North.
    - `marketing_channel` (`DimensionAnomalyRow[]`): 10 saluran pemasaran.
- **Tipe Kolom Dimensi**:
  - `value` (`string`): Nama kategori dimensi.
  - `orders` (`number`): Total transaksi pada kategori tersebut.
  - `anomalies` (`number`): Jumlah transaksi anomali.
  - `anomaly_rate_pct` (`number`): $\text{Anomalies} / \text{Orders} \times 100$ (seluruhnya berkisar $8,99\%-9,88\%$).

```json
{
  "definitions_version": "mvp-4",
  "rule": {
    "percentile_revenue": 0.75,
    "percentile_margin": 0.25,
    "operator": "inclusive",
    "revenue_threshold": 1552.32,
    "margin_threshold_pct": 34.12,
    "thresholds_scope": "global"
  },
  "summary": {
    "orders": 12855,
    "order_share_pct": 9.31,
    "net_sales": 34665272.99,
    "profit": 7528760.49,
    "avg_transaction_margin_pct": 21.47,
    "aggregate_margin_pct": 21.72,
    "counterfactual_gap_avg_txn_margin": 6738175.54,
    "counterfactual_gap_aggregate_margin": 5537690.05,
    "assumptions": [
      "Pesanan anomali dianggap bisa mencapai margin keseluruhan portofolio tanpa mengurangi omzet...",
      "Perubahan permintaan, biaya tetap, perpindahan pelanggan, dan kesiapan operasional tidak dihitung...",
      "Hasilnya ilustratif: bukan prakiraan dan bukan target.",
      "Basis margin keseluruhan adalah acuan; basis rata-rata transaksi hanya pembanding."
    ]
  },
  "dimensions": {
    "sales_channel": [
      {
        "value": "Marketplace",
        "orders": 20698,
        "anomalies": 2002,
        "anomaly_rate_pct": 9.67
      }
    ]
  }
}
```

---

### 3.8 Berkas `time-dimensions.json` (Dimensi Waktu Tambahan & Status Kirim)
Menyajikan dekomposisi kuartalan, hari kerja vs akhir pekan, dan rincian status fisik pengiriman logistik.

- **Struktur Objek**:
  - `quarters` (`QuarterRow[]`): Q1 s/d Q4 lintas tahun.
  - `year_quarters` (`YearQuarterRow[]`): 20 baris per kuartal-tahun (`"2021-Q1"` s/d `"2025-Q4"`).
  - `day_types` (`DayTypeRow[]`): `"Weekday"` ($98.686$ order, margin $37,71\%$) dan `"Weekend"` ($39.430$ order / $28,55\%$, margin $37,65\%$).
  - `delivery_status` (`DeliveryStatusRow[]`): Rincian fisik pengiriman kurir:
    - `On Time`: $86.916$ pesanan ($62,93\%$)
    - `Cancelled`: $24.557$ pesanan ($17,78\%$) (label UI wajib: "Tidak Dikirim")
    - `Delayed`: $16.886$ pesanan ($12,23\%$)
    - `Early`: $9.757$ pesanan ($7,06\%$)

---

### 3.9 Berkas `filter-cubes.json` (Fondasi Filter Global dan Panel Rentang Periode)
Merupakan berkas inti yang mendukung interaktivitas filter tanpa backend dinamis. Sejak `mvp-5` (diperluas `mvp-6`) menyimpan tiga kelompok kubus agregat:

1. **Kubus gabungan** (`cubes.combined`, mvp-5): agregat $Period \times Segment \times Sales\,Channel \times Status\,Order$ (3.666 baris; kombinasi bulan-dimensi tanpa order tidak ditulis, sama seperti konvensi kubus bracket diskon). Ini **sumber tunggal** semua kombinasi filter global: rentang bulan/tahun + segmen pelanggan + sales channel + status order sekaligus. Hanya memuat ukuran aditif: `orders`, `net_sales`, `profit`, `gross_sales`, `discount_amount` (dua terakhir sejak mvp-6).
2. **Kubus filter satu-dimensi** (`dimensions`): marginal $Period \times Satu\,Dimensi$ (`segment`, `sales_channel`, `order_status`). Dipertahankan untuk kompatibilitas dan diwajibkan sama persis dengan marginal kubus gabungan (diperiksa pipeline).
3. **Kubus panel** (`panel_dimensions`, mvp-4): hanya mengikuti rentang periode. Dipakai panel yang menampilkan satu dimensi tetap (hari kerja/akhir pekan, status kirim, bracket diskon, wilayah). Kubus ini **tidak** dapat digabungkan dengan dimensi filter; UI menyembunyikan panelnya saat filter dimensi aktif, bukan menampilkan angka tak terfilter.

- **Atribut Root**:
  - `dimensions` (`string[]`): `["segment", "sales_channel", "order_status"]`.
  - `combined_dimensions` (`string[]`): `["segment", "sales_channel", "order_status"]`.
  - `panel_dimensions` (`string[]`): `["day_type", "delivery_status", "discount_bracket", "region"]`.
  - `non_additive_measures` (`string[]`): `["customers", "avg_transaction_margin_pct"]`.
  - `notes` (`string[]`): Aturan komputasi sisi klien.
  - `cubes` (`object`):
    - `combined` (`CombinedCubeRow[]`): 3.666 baris (kombinasi $Period \times Segmen \times Channel \times Status$ yang benar-benar berisi order).
    - `segment` (`SegmentCubeRow[]`): 240 baris (60 bulan $\times$ 4 segmen).
    - `sales_channel` (`SalesChannelCubeRow[]`): 240 baris (60 bulan $\times$ 4 channel).
    - `order_status` (`OrderStatusCubeRow[]`): 240 baris (60 bulan $\times$ 4 status).
    - `day_type` (`DayTypeCubeRow[]`): 120 baris (60 bulan $\times$ 2 tipe hari).
    - `delivery_status` (`DeliveryStatusCubeRow[]`): 240 baris (60 bulan $\times$ 4 status kirim).
    - `discount_bracket` (`DiscountBracketCubeRow[]`): 260 baris (60 bulan $\times$ 5 bracket; kombinasi bulan-bracket tanpa order tidak ditulis).
    - `region` (`RegionCubeRow[]`): 300 baris (60 bulan $\times$ 5 wilayah).
- **Atribut Baris Kubus**:
  - `period` (`string`): `"YYYY-MM"`.
  - `{dimension_key}` (`string`): Nilai dimensi (contoh `segment: "VIP"`, `day_type: "Weekend"`).
  - `orders` (`number`): **Aditif**.
  - `net_sales` (`number`): **Aditif**.
  - `profit` (`number`): **Aditif**.
  - `gross_sales` (`number`): **Aditif** (mvp-6). Penjualan kotor sebelum diskon; bersama `discount_amount` memenuhi identitas $\text{net\_sales} = \text{gross\_sales} - \text{discount\_amount}$ per baris.
  - `discount_amount` (`number`): **Aditif** (mvp-6). Nominal diskon baris; tingkat diskon terbobot $\sum\text{discount}/\sum\text{gross}$ dihitung ulang frontend dari dua kolom ini.
  - `customers` (`number`): **Non-aditif**, hanya pada kubus filter satu-dimensi.
  - `avg_transaction_margin_pct` (`number`): **Non-aditif**. Hanya ada pada kubus satu-dimensi dan panel; **tidak** dibawa kubus gabungan. UI menampilkannya sebagai nilai sekunder hanya saat tidak ada filter dimensi aktif.
  - `aggregate_margin_pct` (`number`): Margin per baris untuk kenyamanan baca; saat filter aktif nilainya **dihitung ulang** oleh frontend: $\sum \text{profit} / \sum \text{net\_sales} \times 100$. Kubus gabungan tidak membawa kolom ini.

```json
{
  "definitions_version": "mvp-6",
  "dimensions": ["segment", "sales_channel", "order_status"],
  "combined_dimensions": ["segment", "sales_channel", "order_status"],
  "panel_dimensions": ["day_type", "delivery_status", "discount_bracket", "region"],
  "non_additive_measures": ["customers", "avg_transaction_margin_pct"],
  "cubes": {
    "combined": [
      {
        "period": "2021-01",
        "segment": "Business",
        "sales_channel": "Website",
        "order_status": "Completed",
        "orders": 45,
        "net_sales": 53231.75,
        "profit": 23365.46,
        "gross_sales": 57837.39,
        "discount_amount": 4605.64
      }
    ],
    "segment": [
      {
        "segment": "Business",
        "period": "2021-01",
        "orders": 187,
        "customers": 183,
        "net_sales": 201147.44,
        "profit": 88136.97,
        "gross_sales": 218700.56,
        "discount_amount": 17553.12,
        "avg_transaction_margin_pct": 47.0,
        "aggregate_margin_pct": 43.82
      }
    ],
    "day_type": [
      {
        "day_type": "Weekday",
        "period": "2021-01",
        "orders": 1317,
        "net_sales": 1447227.26,
        "profit": 621005.52,
        "gross_sales": 1612022.05,
        "discount_amount": 164794.79,
        "avg_transaction_margin_pct": 45.85,
        "aggregate_margin_pct": 42.91
      }
    ]
  }
}
```

---

## 4. Arsitektur Filter Global & Kompatibilitas Dimensi

### 4.1 Logika Perhitungan di Sisi Klien (*Client-Side Aggregation*)
Frontend dilarang mengulang rumus bisnis kompleks dari baris mentah. Logika filter di frontend (`src/lib/filter.ts`) **hanya diizinkan melakukan empat operasi**:
1. **Penjumlahan Baris Kubus Terpilih**:
   $$\text{Orders} = \sum \text{orders}_i, \quad \text{NetSales} = \sum \text{net\_sales}_i, \quad \text{Profit} = \sum \text{profit}_i, \quad \text{Gross} = \sum \text{gross\_sales}_i, \quad \text{Discount} = \sum \text{discount\_amount}_i$$
2. **Rasio Berbobot** (*weighted ratio*): satu pembagian antara dua penjumlahan operasi 1, dipakai untuk seluruh rasio tampilan berbobot:
   $$\text{Margin Keseluruhan \%} = \frac{\sum \text{profit}}{\sum \text{net\_sales}} \times 100, \qquad \text{Tingkat Diskon Terbobot \%} = \frac{\sum \text{discount}}{\sum \text{gross}} \times 100$$
   Termasuk rasio turunan seperti $\text{Profit}/\text{Orders}$ per bracket dan AOV ($\sum \text{net\_sales} / \sum \text{orders}$) — selalu jumlah dibagi jumlah, tidak pernah rata-rata persentase baris.
3. **Perubahan Persentase antar Dua Ember Penjumlahan** (*percentage change*): dipakai untuk YoY tahunan dengan rumus identik pipeline `annual-performance.json`:
   $$\text{YoY \%} = \frac{\text{nilai}_{\text{tahun kini}} - \text{nilai}_{\text{tahun sebelumnya}}}{\text{nilai}_{\text{tahun sebelumnya}}} \times 100$$
   Hanya dihitung bila **kedua** tahun lengkap (12 bulan) dalam cakupan filter; tahun dasar dan tahun parsial ditampilkan `"—"`.
4. **Satu Pembagian Porsi Tampilan** (*display share*), yaitu rasio antara dua ukuran aditif yang sudah dijumlahkan pada operasi 1 (contoh: porsi order kelompok terhadap total order subset). Operasi ini hanya untuk label/bar porsi, dan hasilnya **tidak boleh** diberi nama metrik bisnis baru.

Ketentuan tambahan:

- Sejak `mvp-5`, keempat filter global (rentang bulan, segmen, sales channel, status order) membaca satu **kubus gabungan** `cubes.combined`, sehingga kombinasi apa pun hanya berupa penjumlahan baris pada operasi 1–4 di atas. Tidak ada rumus bisnis kedua di frontend. Sejak `mvp-6`, kubus yang sama juga membawa `gross_sales` dan `discount_amount`, sehingga KPI diskon mengikuti semua kombinasi filter.
- Kubus panel (`day_type`, `delivery_status`, `discount_bracket`, `region`) hanya dijumlahkan menurut rentang periode dan **tidak** boleh digabungkan dengan filter dimensi pada operasi mana pun; sejak `mvp-6` kubus panel juga membawa `gross_sales` dan `discount_amount`, tetapi aturan penggabungannya tidak berubah. Saat filter dimensi aktif, panelnya disembunyikan dengan penjelasan eksplisit; UI tidak boleh menampilkan angka tak terfilter di samping KPI terfilter.
- Ukuran non-aditif (`customers`, `avg_transaction_margin_pct`) tidak dibawa kubus gabungan. Nilai `avg_transaction_margin_pct` sekunder hanya ditampilkan bila tidak ada filter dimensi aktif; panel "Ringkasan seluruh periode" tetap memakai acuan seluruh dataset dengan label eksplisit. Statistik diskon per baris (rerata/median/maksimum) dan Nilai Kerugian juga non-aditif: hanya ditampilkan sebagai angka seluruh periode **berlabel**, bukan hasil operasi filter.

### 4.2 Pemisahan Dimensi yang Dapat Digabungkan vs Memerlukan Agregasi Tambahan

| Kategori Dimensi | Dimensi yang Terlibat | Status Kompatibilitas Filter | Perilaku Antarmuka Pengguna (UI) |
|---|---|---|---|
| **Dapat Digabungkan Secara Andal (*Reliably Combinable*)** | - **Periode Waktu** (`YYYY-MM`)<br>- **Segmen Pelanggan**<br>- **Sales Channel**<br>- **Status Order** | **Tervalidasi & Didukung Penuh** via kubus gabungan `cubes.combined` (mvp-6). Keempat filter dapat dipakai bersamaan dalam kombinasi apa pun; ukuran aditifnya meliputi `gross_sales` dan `discount_amount`, sehingga KPI diskon ikut terfilter. | KPI finansial & diskon, kedua tren, komposisi segmen, musiman, dan tabel status order membaca cakupan data yang sama. Angka terbukti rekonsiliasi ke total dataset ($\pm 0,01$). |
| **Memerlukan Agregasi Tambahan (*Requires Validated Extension*)** | - **Marketing Channel**<br>- **Metode Pembayaran / Metode Kirim / Gudang / Negara** | **Belum Tersedia di Kubus MVP**. Dataset mentah memiliki dimensinya, namun belum dibuat kubus di `scripts/prepare_dashboard_data.py`. | UI belum menampilkan kontrol filter untuk dimensi ini. Panel Marketing Channel tetap diberi lencana status `"Seluruh Periode"`. |
| **Hanya Mengikuti Rentang Periode (*Period-Only Panels*, mvp-4)** | - **Hari Kerja/Akhir Pekan** (`day_type`)<br>- **Status Kirim** (`delivery_status`)<br>- **Bracket Diskon** (`discount_bracket`)<br>- **Wilayah** (`region`) | **Tersedia** sebagai `panel_dimensions` di `filter-cubes.json` (agregat $Period \times satu\,dimensi$). **Tidak** dapat digabungkan dengan dimensi filter. | Panel mengikuti rentang bulan dan memakai lencana cakupan yang sesuai. Saat filter dimensi aktif, panelnya **disembunyikan dengan penjelasan eksplisit** — tidak pernah menampilkan angka tak terfilter di samping KPI terfilter. |
| **Dilarang Digabungkan (*Non-Combinable / Prohibited*)** | - **Ukuran Non-Aditif** (`customers`, `avg_transaction_margin_pct`) | **Dilarang Dijumlahkan Lintas Bulan**. Jumlah pelanggan unik per bulan memiliki irisan berulang. | Tidak pernah dijumlahkan/dirata-ratakan lintas bulan; `customers` hanya tampil di panel "Ringkasan seluruh periode", dan `avg_transaction_margin_pct` sekunder disembunyikan saat ada filter dimensi aktif. |

---

## 5. Kebijakan Pengecualian Produk & Status Metrik Belum Divalidasi

Sesuai aturan ketat [`AGENTS.MD`](file:///c:/Users/TUF/OneDrive/Semester%205/Proyek/Penjualan_E-Commerce/AGENTS.MD) dan [`docs/EDA_VALIDATION.md`](file:///c:/Users/TUF/OneDrive/Semester%205/Proyek/Penjualan_E-Commerce/docs/EDA_VALIDATION.md), entitas berikut **secara tegas dikecualikan dari kontrak data JSON dan dilarang ditampilkan sebagai metrik terverifikasi**:

```
+------------------------------------------------------------------------------------------------------+
|                               STATUS REGULASI DATA & METRIK                                          |
+------------------------------------+-----------------------------------------------------------------+
|  ENTITAS / KOLOM SUMBER            |  STATUS REGULASI & KONSEKUENSI PADA KONTRAK DATA                |
+------------------------------------+-----------------------------------------------------------------+
|  1. Tabel `order_items.csv`        |  UNVALIDATED (D5)                                               |
|     (SKU-Level Financials)         |  Memiliki deviasi +8,61% omzet dan 87 pasangan duplikat kunci.  |
|                                    |  Dikeluarkan sepenuhnya dari 9 berkas JSON.                     |
+------------------------------------+-----------------------------------------------------------------+
|  2. `customer_lifetime_value`      |  UNVALIDATED                                                    |
|     (CLV Sintetis)                 |  Melebihi laba riil pada 100% pelanggan (rasio 3,25x).          |
|                                    |  Dilarang disajikan sebagai metrik finansial riil.              |
+------------------------------------+-----------------------------------------------------------------+
|  3. `customer_acquisition_cost`    |  UNVALIDATED                                                    |
|     (CAC / ROMI Attribution)       |  Tidak ada data belanja pemasaran riil per saluran.             |
|                                    |  Tidak dihitung di berkas JSON mana pun.                        |
+------------------------------------+-----------------------------------------------------------------+
|  4. `customer_order_count`         |  UNVALIDATED                                                    |
|     (Kolom Sintetis)               |  Menyimpang pada 37,83% pelanggan.                              |
|                                    |  Wajib menggunakan hitungan riil COUNT(order_id).               |
+------------------------------------+-----------------------------------------------------------------+
|  5. `is_repeat_customer`           |  UNVALIDATED                                                    |
|     (Kolom Transaksi)              |  99,76% True; bertentangan dengan customer_type.                |
|                                    |  Wajib diganti metrik D4 tingkat pelanggan (97,90%).            |
+------------------------------------+-----------------------------------------------------------------+
```

---

## 6. Aturan Validasi Otomatis & Rekonsiliasi Integritas Data

Setiap kali skrip persiapan data dijalankan, seluruh berkas JSON hasil olahan wajib diuji secara otomatis terhadap **34 Anchor Benchmark Terverifikasi** dengan aturan ketat:
1. **Rekonsiliasi Total**:
   - Jumlah `net_sales` pada seluruh 240 baris kubus segmen wajib tepat sama dengan `$157.143.214,06` (toleransi $\pm \$0,01$).
   - Jumlah `net_sales` pada seluruh 240 baris kubus channel wajib tepat sama dengan `$157.143.214,06`.
   - Jumlah `net_sales` pada seluruh 240 baris kubus status order wajib tepat sama dengan `$157.143.214,06`.
   - Sejak `mvp-6`, seluruh kubus (gabungan, satu-dimensi, dan panel) juga wajib menjumlah `gross_sales = $189.962.560,88$` dan `discount_amount = $32.819.346,82$`, serta memenuhi identitas $\text{net\_sales} = \text{gross\_sales} - \text{discount\_amount}$ per baris (toleransi pembulatan $\le \$0,03$; lihat `ANC-33`/`ANC-34`).
2. **Kesesuaian Antar Berkas**:
   - Total `orders` pada `dashboard-summary.totals.orders` ($138.116$) wajib sama dengan $\sum \text{orders}$ pada `monthly-performance.months_by_year` dan `annual-performance.years`.
3. **Integritas Byte-per-Byte**:
   - Seluruh berkas JSON di `public/data/` wajib identik byte-per-byte dengan berkas di `data/processed/`.
