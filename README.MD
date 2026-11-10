# 📊 E-Commerce Sales & Profitability Analytics Dashboard (2021–2025)

[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19.0-61dafb?logo=react&logoColor=black)](https://react.dev/)
[![Python](https://img.shields.io/badge/Python-3.10+-3776ab?logo=python&logoColor=white)](https://python.org)
[![Pandas](https://img.shields.io/badge/Pandas-2.0+-150458?logo=pandas&logoColor=white)](https://pandas.pydata.org/)
[![Vitest](<https://img.shields.io/badge/Tests-212%20passed-2e7d32?logo=vitest&logoColor=white>)](https://vitest.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-06b6d4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)

Dasbor analitik penjualan dan profitabilitas e-commerce *enterprise-ready* yang dibangun untuk menyajikan performa finansial riil, mengekspos erosi margin akibat diskon berlebih, dan mendeteksi anomali transaksi berpendapatan tinggi namun berlaba tipis.

Menganalisis **138.116 transaksi tervalidasi** selama 5 tahun (Januari 2021 – Desember 2025) dengan total penjualan bersih senilai **$177,13 Juta**.

---

## Tautan Penting

- **Live Demo Dashboard**: [Tautan Live Demo Vercel/Netlify Anda di Sini](https://your-demo-url.vercel.app)
- **Sumber Dataset**: [E-Commerce Sales Analytics Dataset ](https://www.kaggle.com/datasets/datascikhan/e-commerce-sales-and-customer-analytics) *(E-Commerce Sales & Customer Analytics 150K)*
- **Studi Kasus Lengkap**: Akses menu **Studi Kasus** (`/case-study`) langsung di dalam aplikasi untuk membaca *narrative storytelling* dan rekomendasi bisnis strategis.

---

## Ringkasan Masalah Bisnis & Temuan Kunci

Dalam industri e-commerce, pertumbuhan omzet sering kali menutupi keroposnya margin keuntungan. Banyak perusahaan merayakan rekor penjualan tanpa menyadari bahwa promosi agresif justru mengikis laba bersih.

### 4 Temuan Kunci Berbasis Data (EDA Validated):

1. **Diskon 30%+ Menciptakan Kerugian**:
   - Sebanyak 1.296 pesanan merugi dengan total kerugian kumulatif sebesar **-$201.225**.
   - Seluruh pesanan rugi tersebut terkonsentrasi pada bracket diskon **≥ 30%**. Hubungan antara tingkat diskon dan margin terbukti kuat dan negatif (*r* = -0,707).
2. **Pertumbuhan Tahunan Stagnan (Maturing Business)**:
   - Volume dan net sales tahunan bergerak stabil di kisaran $35,1M – $35,7M dengan pertumbuhan tahunan (YoY) hanya **±1%** (-1,11% hingga +0,57%). Jumlah pesanan stabil di ~27.500 order/tahun.
3. **Anomali Promo Akhir Tahun (Peak Volume, Margin Tipis)**:
   - Penjualan kuartal 4 (terutama November & Desember) mencatatkan volume tertinggi, namun menghasilkan margin terendah (**32,55% – 32,95%** vs rata-rata Jan–Okt **~47,5%**). Penyebab utamanya adalah lonjakan rata-rata diskon hingga 27,56% (dibanding 11,11% pada bulan reguler).
4. **Peluang Optimasi Transaksi Anomali**:
   - Ditemukan **11.659 pesanan anomali** (8,44% dari total transaksi) dengan nilai transaksi tinggi (≥ $1.744,58), namun margin tipis (≤ 38,88%). Menyelamatkan efisiensi margin transaksi ini berpotensi membuka tambahan laba **$5,4 – $6,1 Juta**.

---

## Halaman & Fitur Dasbor

| Halaman                             | Rute              | Fokus & Metrik Kunci                                                                                                                                              |
| :---------------------------------- | :---------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Ringkasan Eksekutif**       | `/`             | KPI omzet & laba, tren MoM, proporsi segmen pelanggan, sebaran status pengiriman, dan wawasan bisnis otomatis.                                                    |
| **Sales & Profitabilitas**    | `/sales`        | Evaluasi bracket diskon (highlight risiko rugi), tren performa YoY, perbandingan kanal penjualan (Web/Mobile/Store), serta split performa *Weekday vs Weekend*. |
| **Customer Intelligence**     | `/customers`    | Analisis profitabilitas 4 segmen (Consumer, Premium, VIP, Business), nilai pesanan per pelanggan aktif, dan rasio *repeat customer* (97,9%).                    |
| **Transaction Explorer**      | `/transactions` | Filter dan audit anomali penjualan tinggi dengan margin rendah di seluruh dimensi (segmen, kanal, kategori, status).                                              |
| **Studi Kasus & Rekomendasi** | `/case-study`   | Narasi bisnis untuk eksekutif: latar belakang masalah, temuan kunci, rekomendasi aksi berbobot, serta transparansi metodologi kalkulasi data.                     |

### Fitur Unggulan UI/UX:

- **Dual Theme (Dark & Light Mode)**: *Nocturne Synthwave Luxury* (gelap) dan *Warm Alabaster & Japanese Indigo* (terang).
- **Penjelasan Metrik Kontekstual**: Ikon pada setiap kartu metrik dapat diklik untuk membuka penjelasan definisi konsep dan basis datanya (*Zero Confusion for Non-Technical Users*).
- **Highlighting Semantik pada Tabel**: Warna positif/negatif, penanda batas diskon berisiko (*badge* "Rentan Rugi"), serta sorotan baris anomali.
- **Filter Multidimensi Reaktif**: Sinkronisasi instan antara rentang tanggal, kanal penjualan, segmen, dan status pesanan dengan indikator *active chips*.

---

## Arsitektur Teknis & Integritas Data

Dasbor ini menerapkan prinsip integritas data analitik ketat: **tidak ada metrik bisnis yang dihitung sembarangan di komponen UI**.

```
[Sumber CSV Mentah (150K Baris)]
               │
               ▼
   scripts/prepare_dashboard_data.py  (Python + Pandas)
   ├── Pembersihan & Rekonsiliasi Data (138.116 transaksi lolos audit)
   ├── Penyelarasan Akuntansi (Pajak & Ongkir sebagai Pass-Through)
   ├── Agregasi Kubus Multidimensi (Waktu x Segmen x Kanal x Status)
   └── Validasi Terhadap Dokumentasi EDA (EDA_VALIDATION.md)
               │
               ▼
   data/processed/*.json (Kubus Data Terkompresi & Teragregasi)
               │
               ▼
   React 19 + TypeScript + Recharts Application
   ├── Typed Data Contracts (data/types.ts)
   ├── Pure Aggregate Selectors (lib/filter.ts)
   └── 212 Automated Unit Tests (tests/)
```

### Standar Formula Akuntansi:

- **Penjualan Bersih (*Net Sales*)**:

  $$
  \text{Net Sales} = \text{Gross Sales} - \text{Discount Amount} + \text{Tax Amount} + \text{Shipping Cost}
  $$
- **Laba Riil (*Profit*)**:

  $$
  \text{Profit} = \text{Net Sales} - \text{Product Cost} - \text{Shipping Cost}
  $$
- **Margin Agregat Keseluruhan**:

  $$
  \text{Margin \%} = \frac{\sum \text{Profit}}{\sum \text{Net Sales}} \times 100\%
  $$

---

## Struktur Direktori Proyek

```text
├── data/
│   ├── processed/            # File JSON kubus agregat (dibaca oleh aplikasi frontend)
│   └── source/               # File CSV sumber (diabaikan dari Git agar ringan)
├── docs/                     # Dokumentasi resmi data analitik & spesifikasi produk
│   ├── DATA_CONTRACT.md      # Kontrak skema data & tipe metrik
│   ├── DESIGN_BRIEF.md       # Panduan desain & token palet warna
│   ├── EDA_VALIDATION.md     # Nilai acuan benchmark hasil eksplorasi data
│   ├── METRIC_DICTIONARY.md  # Kamus metrik & definisi bisnis
│   └── PRD.md                # Dokumen Persyaratan Produk
├── scripts/
│   └── prepare_dashboard_data.py # Pipeline ETL Python untuk mempersiapkan kubus data
├── src/
│   ├── app/                  # Router, state filter, theme, dan data provider
│   ├── components/           # Komponen UI modular (Charts, Tables, Metrics, Layout)
│   ├── data/                 # Type definition untuk data contract JSON
│   ├── features/             # Halaman fitur analitik & studi kasus
│   └── lib/                  # Helper fungsi kalkulasi filter, format angka, dan tren
├── tests/                    # Berkas uji otomatis Vitest (212 unit tests)
├── eda_analysis.ipynb        # Jupyter Notebook eksplorasi data awal
└── README.MD                 # Dokumentasi proyek
```

---

## Panduan Menjalankan Secara Lokal

### Prasyarat:

- [Node.js](https://nodejs.org/) versi 18 atau lebih baru.
- [npm](https://www.npmjs.com/) atau pnpm.
- *(Opsional)* [Python](https://www.python.org/) 3.10+ jika ingin menjalankan ulang pipeline data mentah.

### 1. Kloning Repositori:

```bash
git clone https://github.com/username-anda/ecommerce-sales-analytics-dashboard.git
cd ecommerce-sales-analytics-dashboard
```

### 2. Pasang Dependensi Frontend:

```bash
npm install
```

### 3. Jalankan Server Pengembangan (Vite):

```bash
npm run dev
```

Buka peramban Anda di `http://localhost:5173`.

### 4. Menjalankan Pengujian (Unit Tests):

```bash
npm test
```

*Seluruh 212 pengujian akan dijalankan secara otomatis.*

### 5. Memeriksa Tipe & Linting:

```bash
npm run typecheck
npm run lint
```

### 6. Build untuk Produksi:

```bash
npm run build
```

---

## Menjalankan Ulang Pipeline Data (Opsional)

Jika Anda memperbarui dataset mentah di `data/source/`:

```bash
# Buat dan aktifkan virtual environment (opsional)
python -m venv .venv
source .venv/bin/activate  # atau .venv\Scripts\activate di Windows

# Pasang dependensi Python
pip install -r requirements.txt

# Jalankan pipeline pembersihan dan agregasi data
python scripts/prepare_dashboard_data.py
```

Hasil kubus data baru akan disimpan ke `data/processed/`.

---

## Profil & Kontak Analis

Proyek ini dikembangkan sebagai portofolio profesional analitik data:

- **Nama Lengkap**: Mahendra Agung Darmawan
- **Minat**: Data Analyst | Data Engineer | AI
- **LinkedIn**: [linkedin.com/in/mahendra-agung](https://www.linkedin.com/in/mahendra-agung-bba516314/)
- **GitHub**: [https://github.com/HenMahen](https://github.com/HenMahen)
- **Email**: [amahendra952@gmail.com](mailto:amahendra952@gmail.com)

---

*Lisensi: Proyek ini bersifat terbuka untuk tujuan edukasi dan portofolio profesional.*
