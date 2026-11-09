# Rencana Implementasi Proyek (Implementation Plan)
## Dasbor Analisis Penjualan E-Commerce (E-Commerce Sales Analytics Dashboard)

- **Status**: Disetujui sebagai Rencana Eksekusi Teknis Bertahap
- **Peran Produk**: Proyek Portofolio Profesional Analis Data (*Data Analyst Portfolio Project*)
- **Prinsip Utama**: Pembagian fase-fase kecil yang dapat diuji secara independen (*small, independently testable phases*), lingkup MVP tetap ramping, dan **tanpa modifikasi data mentah sumber**.
- **Acuan Utama**: Menyelaraskan penuh dengan [`AGENTS.MD`](file:///c:/Users/TUF/OneDrive/Semester%205/Proyek/Penjualan_E-Commerce/AGENTS.MD), [`docs/PRD.md`](file:///c:/Users/TUF/OneDrive/Semester%205/Proyek/Penjualan_E-Commerce/docs/PRD.md), [`docs/DESIGN_BRIEF.MD`](file:///c:/Users/TUF/OneDrive/Semester%205/Proyek/Penjualan_E-Commerce/docs/DESIGN_BRIEF.MD), [`docs/METRIC_DICTIONARY.md`](file:///c:/Users/TUF/OneDrive/Semester%205/Proyek/Penjualan_E-Commerce/docs/METRIC_DICTIONARY.md), [`docs/DATA_CONTRACT.md`](file:///c:/Users/TUF/OneDrive/Semester%205/Proyek/Penjualan_E-Commerce/docs/DATA_CONTRACT.md), dan [`docs/EDA_VALIDATION.md`](file:///c:/Users/TUF/OneDrive/Semester%205/Proyek/Penjualan_E-Commerce/docs/EDA_VALIDATION.md).

---

## Ringkasan Alur Kerja 12 Fase

```
+----------------------------------------------------------------------------------------------------+
|                                    PETA JALAN IMPLEMENTASI (12 FASE)                               |
+----------------------------------------------------------------------------------------------------+
|  Fase 1: Pengaturan Proyek & Tooling         -->  Infrastruktur Vite, TypeScript, Tailwind, Vitest |
|  Fase 2: Penyiapan & Validasi Data           -->  Pipeline Python, 9 JSON statis, 23 Anchor checks |
|  Fase 3: Design Tokens & Cangkang Aplikasi   -->  Inter font, CSS variables, Persistent Sidebar    |
|  Fase 4: Mode Gelap & Mode Terang            -->  ThemeProvider, dark class, Recharts palette sync |
|  Fase 5: Gambaran Eksekutif                  -->  Halaman '/', 6 Kartu KPI, Tren 60 Bln, Donut mix  |
|  Fase 6: Filter Global & Interaksi Grafik    -->  FilterProvider, filter-cubes.json, Non-additives |
|  Fase 7: Penjualan & Profitabilitas          -->  Halaman '/sales', 5 Bracket diskon, Tren YoY     |
|  Fase 8: Kecerdasan Pelanggan                -->  Halaman '/customers', 4 Segmen, Profil Consumer |
|  Fase 9: Penjelajah Transaksi                -->  Halaman '/transactions', Anomali, Status kirim   |
|  Fase 10: Tata Letak Responsif & Aksesibilitas->  Mobile drawer, Command Palette, a11y WCAG AA     |
|  Fase 11: Pengujian & Build Produksi         -->  Typecheck, Linting, Unit/Integration tests, Vite |
|  Fase 12: Deployment & Dokumentasi           -->  SPA rewrites, Portfolio README, Case study showcase |
+----------------------------------------------------------------------------------------------------+
```

---

### Fase 1: Pengaturan Proyek dan Perangkat Pendukung (Tooling)

- **Tujuan**:
  Memastikan lingkungan pengembangan, konfigurasi TypeScript, bundler Vite, Tailwind CSS v4, linter ESLint, dan kerangka pengujian otomatis (*Vitest* + *React Testing Library*) terpasang, terkonfigurasi secara bersih, dan siap untuk build serta testing otomatis tanpa hambatan dependensi.
- **Dependensi**:
  Node.js $\ge 18$, npm, Python 3.10+ (lingkungan virtual `.venv`).
- **Berkas yang Perlu Dibuat atau Diubah**:
  - `package.json` (menambahkan script `test`, `typecheck`, dan devDependencies testing).
  - `tsconfig.app.json` & `tsconfig.json` (memastikan path alias `@/*` mengarah tepat ke `src/*`).
  - `vite.config.ts` (resolusi path alias dan konfigurasi test runner).
  - `vitest.config.ts` (baru, konfigurasi lingkungan jsdom untuk React testing).
  - `tests/setup.ts` (baru, inisialisasi `@testing-library/jest-dom`).
  - `tests/smoke.test.ts` (baru, verifikasi test runner berfungsi).
- **Langkah-Langkah Implementasi**:
  1. Pasang dependensi pengujian ringan: `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, dan `jsdom`.
  2. Tambahkan berkas konfigurasi `vitest.config.ts` yang menyelaraskan path alias `@/` dengan `src/`.
  3. Konfigurasi skrip eksekusi di `package.json`:
     - `"test": "vitest run"`
     - `"typecheck": "tsc --noEmit"`
     - `"lint": "eslint ."`
  4. Buat tes smoke sederhana di `tests/smoke.test.ts` untuk memvalidasi bahwa lingkungan Node.js dan DOM virtual beroperasi normal.
- **Pengujian**:
  - Eksekusi `npm run typecheck` menghasilkan status lolos 0 error.
  - Eksekusi `npm run lint` tidak memicu peringatan fatal.
  - Eksekusi `npm run test` menjalankan `tests/smoke.test.ts` dengan status PASS.
- **Kriteria Penerimaan**:
  - Seluruh skrip tooling lokal dapat dijalankan secara deterministik dari command line.
  - Path alias `@/` berfungsi di TypeScript compiler dan bundler Vite.
- **Kondisi Penyelesaian (*Definition of Done*)**:
  Infrastruktur tooling siap mengeksekusi pemeriksaan tipe data dan rangkaian pengujian otomatis pada setiap fase berikutnya.

---

### Fase 2: Penyiapan dan Validasi Data (Data Preparation & Validation)

- **Tujuan**:
  Menjalankan dan memverifikasi pipeline persiapan data Python (`scripts/prepare_dashboard_data.py`) untuk memproses berkas mentah CSV di `data/source/` menjadi 9 berkas JSON statis di `data/processed/` dan `public/data/` yang memenuhi kontrak [`docs/DATA_CONTRACT.md`](file:///c:/Users/TUF/OneDrive/Semester%205/Proyek/Penjualan_E-Commerce/docs/DATA_CONTRACT.md) serta lolos 23 anchor benchmark di [`docs/METRIC_DICTIONARY.md`](file:///c:/Users/TUF/OneDrive/Semester%205/Proyek/Penjualan_E-Commerce/docs/METRIC_DICTIONARY.md).
- **Dependensi**:
  Fase 1 (Tooling), Python virtual environment (`.venv`), pandas, numpy, berkas sumber `data/source/*.csv`.
- **Berkas yang Perlu Dibuat atau Diubah**:
  - `scripts/prepare_dashboard_data.py` (verifikasi eksekusi).
  - `data/processed/*.json` & `public/data/*.json` (9 berkas JSON olahan).
  - `tests/data_integrity.test.ts` (baru, pengujian otomatis kecocokan angka JSON dengan benchmark).
- **Langkah-Langkah Implementasi**:
  1. Eksekusi skrip persiapan data: `python scripts/prepare_dashboard_data.py`.
  2. Verifikasi keluaran konsol Python memastikan seluruh pengujian internal lolos (`ALL OK: 84 checks passed, 0 failures`).
  3. Pastikan salinan berkas JSON di `public/data/` identik *byte-per-byte* dengan `data/processed/`.
  4. Buat unit test TypeScript `tests/data_integrity.test.ts` yang membaca berkas `dashboard-summary.json`, `metadata.json`, dan `filter-cubes.json`:
     - Memverifikasi Net Sales = $\$157.143.214,06$.
     - Memverifikasi Profit = $\$59.232.305,35$.
     - Memverifikasi Margin Keseluruhan = $37,69\%$.
     - Memverifikasi Total Orders = $138.116$.
     - Memverifikasi Rekonsiliasi Kubus: $\sum \text{net\_sales}$ pada kubus segmen, channel, dan status order tepat sama dengan total net sales.
- **Pengujian**:
  - `python scripts/prepare_dashboard_data.py` keluar dengan status exit code 0.
  - `npm run test tests/data_integrity.test.ts` berhasil (PASS).
- **Kriteria Penerimaan**:
  - 9 berkas JSON tersedia di `public/data/` dengan atribut `"definitions_version": "mvp-4"`.
  - Berkas sumber CSV di `data/source/` sama sekali tidak tersentuh atau dimodifikasi.
  - Metrik tingkat produk `order_items` dan metrik sintetis CLV tidak masuk ke dalam JSON.
- **Kondisi Penyelesaian**:
  Lapisan data JSON olahan terbukti valid secara matematis dan siap dikonsumsi oleh lapisan frontend React.

---

### Fase 3: Design Tokens dan Kerangka Aplikasi (Application Shell)

- **Tujuan**:
  Menerapkan design token di `src/index.css` sesuai [`docs/DESIGN_BRIEF.MD`](file:///c:/Users/TUF/OneDrive/Semester%205/Proyek/Penjualan_E-Commerce/docs/DESIGN_BRIEF.MD) (merujuk sistem desain pada folder `design/`: *Warm Alabaster & Japanese Indigo* dan *Nocturne Synthwave Luxury*, font Space Grotesk / Geist / JetBrains Mono) dan memantapkan komponen kerangka aplikasi (`AppShell`, `TopHeader`, `SidebarNav`, `PageHeader`) dengan navigasi 4 rute, dukungan kolaps sidebar desktop ($264\text{px} \leftrightarrow 76\text{px}$), dan laci mobile (*mobile drawer*).
- **Dependensi**:
  Fase 1 (Tooling), Fase 2 (Data JSON).
- **Berkas yang Perlu Dibuat atau Diubah**:
  - `src/index.css` (penyelarasan variabel CSS semantik dan utilitas tipografi `tabular-nums`).
  - `src/components/layout/AppShell.tsx` (pengaturan layout utama flex/grid dan footer).
  - `src/components/layout/SidebarNav.tsx` (navigasi persisten desktop, status lipat, dan mobile drawer).
  - `src/components/layout/TopHeader.tsx` (header sticky `h-14`, tombol hamburger, breadcrumb, chip info).
  - `src/components/layout/PageHeader.tsx` (judul halaman dan slot lencana cakupan).
  - `src/app/routes.ts` & `src/app/router.tsx` (router internal berbasis History API).
- **Langkah-Langkah Implementasi**:
  1. Perbarui `src/index.css` dengan token variabel CSS tema terang *Warm Alabaster & Japanese Indigo*: `--background: #fbf9f5`, `--foreground: #0f172a`, `--card: #ffffff`, `--border: #e8e2d8`, `--primary: #0037b0`, `--sidebar: #fbf9f5`, radius $12\text{px}$, dan bayangan halus.
  2. Implementasikan sidebar navigasi desktop yang persisten dan dapat dilipat ($264\text{px} \leftrightarrow 76\text{px}$) dengan penyimpanan preferensi di `localStorage`.
  3. Pasang laci seluler (*mobile drawer*) dengan overlay latar belakang gelap untuk layar $< 1024\text{px}$.
  4. Bangun `TopHeader` dengan breadcrumb penanda halaman aktif, chip tanggal, chip versi metrik, dan tombol menu hamburger seluler.
  5. Pastikan router internal menangani navigasi 4 rute (`/`, `/sales`, `/customers`, `/transactions`) dengan sinkronisasi URL dan scroll-to-top otomatis.
- **Pengujian**:
  - Uji navigasi rute: mengklik item menu memperbarui rute aktif dan pathname peramban tanpa memicu refresh halaman penuh.
  - Uji kolaps sidebar: mengklik tombol toggle mengubah lebar sidebar secara halus dan mengingat preferensi di `localStorage`.
  - Uji visual: tidak ada bilah gulir (*scrollbar*) horizontal liar pada elemen body.
- **Kriteria Penerimaan**:
  - Sidebar persisten di desktop ($\ge 1024\text{px}$), bertransisi menjadi drawer di seluler ($< 1024\text{px}$).
  - Cangkang bebas dari ornamen fiktif (tanpa avatar pengguna atau notifikasi palsu).
- **Kondisi Penyelesaian**:
  Kerangka aplikasi beroperasi stabil, kokoh, dan siap menampung seluruh halaman analitik.

---

### Fase 4: Mode Gelap (Dark Mode) dan Mode Terang (Light Mode)

- **Tujuan**:
  Mengimplementasikan sistem sakelar tema (*Theme Toggle*) yang mendukung mode terang (*Warm Alabaster & Japanese Indigo*), mode gelap (*Nocturne Synthwave Luxury*), dan deteksi preferensi sistem operasi, dengan konsistensi 100% pada struktur layout kartu, tipografi, dan adaptasi palet grafik Recharts sesuai Bagian 6 & 7 [`docs/DESIGN_BRIEF.MD`](file:///c:/Users/TUF/OneDrive/Semester%205/Proyek/Penjualan_E-Commerce/docs/DESIGN_BRIEF.MD).
- **Dependensi**:
  Fase 3 (Application Shell).
- **Berkas yang Perlu Dibuat atau Diubah**:
  - `src/app/ThemeProvider.tsx` (baru, konteks tema `light` / `dark` / `system`).
  - `src/components/ui/ThemeToggle.tsx` (baru, tombol pemilih tema dengan ikon Sun/Moon).
  - `src/index.css` (penambahan token kelas `.dark`).
  - `src/components/layout/TopHeader.tsx` (menempatkan `ThemeToggle` di sisi kanan header).
  - `src/App.tsx` (membungkus cangkang aplikasi dengan `ThemeProvider`).
- **Langkah-Langkah Implementasi**:
  1. Buat `ThemeProvider` berbasis React Context untuk mengelola status tema, menyimpan pilihan pengguna ke `localStorage`, dan menambahkan/menghapus kelas `.dark` pada elemen root `<html>`.
  2. Definisikan token warna lengkap untuk kelas `.dark` di `src/index.css` sesuai Bagian 7 `docs/DESIGN_BRIEF.MD` (`--background: #151120`, `--card: #1c1033`, `--border: rgba(255, 28, 192, 0.18)`, `--primary: #ff1cc0`, `--primary-container: #ff3ac2`, dll.).
  3. Buat komponen `ThemeToggle` di header atas dengan tombol interaktif yang ramah papan tik.
  4. Pastikan token warna grafik (`--chart-1` s/d `--chart-5`) berpindah ke varian warna terang/neon yang kontras di latar gelap (`#FFAEDA`, `#FF3AC2`, `#E5B4FF`, `#BCC2FF`, `#00FFA3`).
- **Pengujian**:
  - Memilih mode gelap langsung menambahkan kelas `.dark` pada `document.documentElement`.
  - Refresh peramban mempertahankan tema yang telah dipilih pengguna.
  - Uji visual: teks dan kurva grafik tetap memiliki kontras tinggi ($\ge 4,5:1$) pada kedua tema.
- **Kriteria Penerimaan**:
  - Tidak ada warna yang di-*hardcode* di dalam berkas komponen JSX/TSX.
  - Struktur komponen, padding, dan ukuran kartu tidak bergeser sedikit pun saat tema berganti.
- **Kondisi Penyelesaian**:
  Dasbor mendukung transisi mulus dan elegan antara mode gelap dan terang di seluruh layar.

---

### Fase 5: Gambaran Eksekutif (Executive Overview)

- **Tujuan**:
  Menyelesaikan halaman pertama `/` (Executive Overview) sesuai Bagian 5.1 [`docs/PRD.md`](file:///c:/Users/TUF/OneDrive/Semester%205/Proyek/Penjualan_E-Commerce/docs/PRD.md) yang menampilkan 6 kartu KPI ringkas, area chart tren 60 bulan, donut chart pangsa profit segmen, bar chart musiman 12 bulan, tabel status pesanan, dan catatan rekonsiliasi pass-through.
- **Dependensi**:
  Fase 4 (Theming), Fase 2 (Data JSON).
- **Berkas yang Perlu Dibuat atau Diubah**:
  - `src/features/executive-overview/ExecutiveOverviewPage.tsx` (penyempurnaan integrasi).
  - `src/components/charts/TrendAreaChart.tsx` (penyelarasan sumbu ganda dan tooltip).
  - `src/components/charts/ProfitShareDonut.tsx` (donut chart Recharts responsif).
  - `src/components/charts/SeasonalityBarChart.tsx` (diagram batang 12 bulan).
  - `src/components/metrics/KpiCard.tsx` (kartu KPI ringkas berfitur `tabular-nums`).
  - `src/components/metrics/BasisTag.tsx` (lencana penanda "Margin Keseluruhan (Utama)").
  - `src/components/table/DataTable.tsx` (tabel data dengan perataan angka kanan).
- **Langkah-Langkah Implementasi**:
  1. Hubungkan `ExecutiveOverviewPage` dengan `useDashboardData()`.
  2. Susun baris KPI atas: Net Sales ($\$157,14\text{M}$), Profit ($\$59,23\text{M}$), Margin Keseluruhan ($37,69\%$ dengan sub-label Rata-rata Transaksi $41,16\%$), Total Orders ($138.116$), AOV ($\$1.137,76$), dan Repeat Customer Rate ($97,90\%$).
  3. Konfigurasi `TrendAreaChart`: Net sales pada sumbu kiri, margin keseluruhan pada sumbu kanan, tooltip terformat USD dan persentase, serta penanda visual penurunan margin di akhir tahun.
  4. Konfigurasi `ProfitShareDonut`: Komposisi laba Consumer ($56,65\%$), Premium ($23,55\%$), Business ($10,28\%$), VIP ($9,51\%$).
  5. Konfigurasi `SeasonalityBarChart`: Volume dan margin keseluruhan 12 bulan lintas tahun, memperlihatkan lonjakan omzet November-Desember disertai penurunan margin tajam ke $25,89\%$ dan $26,40\%$.
  6. Sajikan tabel status pesanan (`status_margins`) dengan lencana status dan catatan pengakuan laba D6.
  7. Tampilkan catatan kaki finansial mengenai pemisahan pass-through pajak ($\$16,91\text{M}$) dan ongkir ($\$3,08\text{M}$).
- **Pengujian**:
  - Unit test `tests/executive_overview.test.tsx` memverifikasi angka-angka yang ter-render pada kondisi awal cocok persis dengan benchmark.
  - Tooltip grafik menampilkan nilai nominal dan persentase yang presisi saat di-hover.
- **Kriteria Penerimaan**:
  - Seluruh metrik finansial pada halaman utama mencerminkan Basis C (D7).
  - Terdapat pembedaan visual yang tegas antara margin keseluruhan utama dengan rata-rata transaksi.
- **Kondisi Penyelesaian**:
  Halaman Tinjauan Eksekutif selesai, interaktif, dan terverifikasi secara visual pada kedua tema.

---

### Fase 6: Filter Global dan Interaksi Grafik (Global Filtering)

- **Tujuan**:
  Menghubungkan bilah filter global (`GlobalFilterBar`) ke kubus data `filter-cubes.json` sehingga pemilihan periode bulanan, segmen pelanggan, saluran penjualan, atau status pesanan secara reaktif memperbarui kartu KPI dan grafik tren secara matematis tanpa memicu request backend.
- **Dependensi**:
  Fase 5 (Executive Overview), `src/lib/filter.ts`.
- **Berkas yang Perlu Dibuat atau Diubah**:
  - `src/app/FilterProvider.tsx` (state filter aktif: periode, segmen, channel, status).
  - `src/components/layout/GlobalFilterBar.tsx` (dropdown pemilih dimensi dan bilah ringkasan).
  - `src/components/layout/SelectField.tsx` (komponen select/dropdown aksesibel).
  - `src/lib/filter.ts` (logika penjumlahan baris kubus aditif dan margin berbobot).
  - `src/components/charts/ChartCard.tsx` (lencana cakupan data `ChartScopeBadge`).
  - `src/components/metrics/NonAdditiveNotice.tsx` (baru, penanganan metrik non-aditif).
- **Langkah-Langkah Implementasi**:
  1. Kelola state filter di `FilterProvider`: rentang periode bulanan (`YYYY-MM`), segmen pelanggan, sales channel, dan status order.
  2. Implementasikan fungsi murni di `src/lib/filter.ts`:
     - Menjumlahkan baris kubus yang cocok: $\sum \text{orders}$, $\sum \text{net\_sales}$, $\sum \text{profit}$.
     - Menghitung ulang margin berbobot: $\sum \text{profit} / \sum \text{net\_sales} \times 100$.
  3. Tambahkan aturan penanganan ukuran non-aditif (`customers` dan `avg_transaction_margin_pct`): jika filter mencakup $>1$ bulan, sembunyikan atau tampilkan pesan bahwa nilai tidak dapat dirata-ratakan lintas bulan.
  4. Pasang lencana `ChartScopeBadge`: `"Mengikuti Filter Aktif"` untuk modul yang bereaksi terhadap filter, dan `"Seluruh Periode 2021-2025"` untuk modul agregat penuh (seperti musiman 12 bulan).
  5. Sediakan tombol "Reset Filter" yang hanya tampil saat filter aktif.
- **Pengujian**:
  - Unit test `tests/filter_cubes.test.ts` memverifikasi rekonsiliasi:
    - Tanpa filter = tepat sama dengan total dataset ($\$157.143.214,06$).
    - Filter segmen VIP = tepat sama dengan total segmen VIP ($\$15.931.220,10$).
  - Uji interaktivitas: memilih bulan tertentu langsung memperbarui nilai kartu KPI dan grafik tren.
- **Kriteria Penerimaan**:
  - Angka yang dihasilkan dari filter selalu terekonsiliasi ke data kubus tanpa pembulatan liar.
  - Modul tanpa kubus terisolasi aman dengan lencana status yang transparan.
- **Kondisi Penyelesaian**:
  Sistem filter global berfungsi mulus, instan, dan konsisten di seluruh bagian dasbor.

---

### Fase 7: Penjualan & Profitabilitas (Sales & Profitability)

- **Tujuan**:
  Membangun halaman kedua `/sales` sesuai Bagian 5.2 [`docs/PRD.md`](file:///c:/Users/TUF/OneDrive/Semester%205/Proyek/Penjualan_E-Commerce/docs/PRD.md) untuk menganalisis dinamika kedalaman diskon pada 5 bracket, membuktikan konsentrasi pesanan rugi, menyajikan kinerja tahunan datar ($\pm 1\%$), dan dekomposisi kuartalan.
- **Dependensi**:
  Fase 6 (Global Filtering).
- **Berkas yang Perlu Dibuat atau Diubah**:
  - `src/features/sales-profitability/SalesProfitabilityPage.tsx` (baru).
  - `src/features/sales-profitability/DiscountBracketsTable.tsx` (baru, tabel komparatif 5 bracket).
  - `src/features/sales-profitability/AnnualPerformancePanel.tsx` (baru, tabel & bar tahunan + YoY).
  - `src/features/sales-profitability/TimeDecompositionPanel.tsx` (baru, kuartalan & hari kerja/akhir pekan).
  - `src/app/routes.ts` (mengubah status rute `/sales` menjadi `'ready'`).
  - `src/App.tsx` (mengarahkan rute `/sales` ke komponen `SalesProfitabilityPage`).
- **Langkah-Langkah Implementasi**:
  1. Daftarkan rute `/sales` sebagai `'ready'` di `src/app/routes.ts` dan buat outlet di `src/App.tsx`.
  2. Susun baris kartu KPI Penjualan: Gross Sales ($\$189,96\text{M}$), Discount Amount ($\$32,82\text{M}$), Diskon Terbobot ($17,28\%$), Net Sales ($\$157,14\text{M}$), Profit ($\$59,23\text{M}$), dan Total Kerugian ($\$426.306,80$).
  3. Bangun modul Analisis Bracket Diskon: diagram batang dan tabel komparatif 5 bracket (0%, 1–10%, 11–20%, 21–30%, 30%+), menyoroti anjloknya margin ke $15,17\%$ di tier 30%+ dan konsentrasi seluruh $2.530$ pesanan merugi pada tier tersebut.
  4. Cantumkan catatan analitis mengenai *basket size confound* (kuantitas unit naik dari 4,98 di 0% menjadi 7,94 di 30%+).
  5. Bangun modul Kinerja Tahunan & YoY (2021–2025): tampilkan tabel volume, net sales, profit, dan YoY bertanda, disertai penegasan narasi bahwa tren bisnis adalah **datar/statis ($\pm 1\%$), bukan pertumbuhan ekspansif**.
  6. Bangun modul Dekomposisi Waktu: perbandingan Kuartal Q1–Q4 lintas tahun (Q4 terendah $30,22\%$) serta perbandingan Hari Kerja ($37,71\%$) vs Akhir Pekan ($37,65\%$).
- **Pengujian**:
  - Unit test `tests/sales_page.test.tsx` memverifikasi render 5 bracket diskon dan angka YoY tahunan.
  - Verifikasi bahwa baris tahun 2021 menampilkan tanda dash/null pada kolom YoY.
- **Kriteria Penerimaan**:
  - Angka tabel bracket diskon dan kinerja tahunan cocok persis dengan benchmark Basis C.
  - Total kerugian ditampilkan sebagai angka positif berlabel "Total Kerugian" ($426.306,80$ USD).
- **Kondisi Penyelesaian**:
  Halaman Penjualan & Profitabilitas beroperasi penuh dan dapat diakses dari sidebar.

---

### Fase 8: Kecerdasan Pelanggan (Customer Intelligence)

- **Tujuan**:
  Membangun halaman ketiga `/customers` sesuai Bagian 5.3 [`docs/PRD.md`](file:///c:/Users/TUF/OneDrive/Semester%205/Proyek/Penjualan_E-Commerce/docs/PRD.md) untuk menyajikan profil profitabilitas 4 segmen pelanggan, membuktikan bahwa Consumer adalah kontributor laba per pelanggan tertinggi, memvalidasi retensi riil ($97,90\%$), serta menampilkan kotak transparansi metrik unvalidated.
- **Dependensi**:
  Fase 6 (Global Filtering).
- **Berkas yang Perlu Dibuat atau Diubah**:
  - `src/features/customer-intelligence/CustomerIntelligencePage.tsx` (baru).
  - `src/features/customer-intelligence/SegmentComparisonTable.tsx` (baru, tabel perbandingan 4 segmen).
  - `src/features/customer-intelligence/SegmentMarginComparisonChart.tsx` (baru, grouped bar chart margin).
  - `src/features/customer-intelligence/UnvalidatedMetricsBox.tsx` (baru, kotak batasan data).
  - `src/app/routes.ts` (mengubah status rute `/customers` menjadi `'ready'`).
  - `src/App.tsx` (mengarahkan rute `/customers` ke komponen `CustomerIntelligencePage`).
- **Langkah-Langkah Implementasi**:
  1. Daftarkan rute `/customers` sebagai `'ready'` di `src/app/routes.ts`.
  2. Susun baris kartu KPI Pelanggan: Pelanggan Aktif ($24.911$), Pesanan/Pelanggan ($5,544$), Profit/Pelanggan ($\$2.377,76$), Pelanggan Berulang ($97,90\%$), Pangsa Margin Tinggi ($92,01\%$), dan Rating Pelanggan ($3,677$).
  3. Bangun tabel komparatif 4 segmen (`Consumer`, `Premium`, `Business`, `VIP`) dengan fitur pengurutan kolom (*sortable*): orders, customers, net sales, profit, margin keseluruhan, profit share, dan profit/customer.
  4. Tampilkan temuan bisnis analitis: profit per pelanggan tertinggi justru berasal dari **Consumer ($\$2.470,14$)**, sedangkan VIP dan Premium lebih rendah ($\$2.221,99$ dan $\$2.223,38$) akibat diskon yang lebih dalam.
  5. Bangun diagram batang komparasi Margin Keseluruhan vs Rata-rata Transaksi per segmen (memperlihatkan selisih $3,2-3,6\text{ pp}$).
  6. Bangun kotak transparansi data *UnvalidatedMetricsBox* yang menguraikan alasan ilmiah mengapa CLV sintetis, ROMI, `customer_order_count`, dan perbandingan first-time vs repeat tidak disajikan sebagai KPI bisnis.
- **Pengujian**:
  - Unit test `tests/customer_page.test.tsx` memverifikasi angka-angka segmen dan denominator pelanggan aktif $24.911$.
  - Uji sorting tabel segmen berfungsi dengan benar.
- **Kriteria Penerimaan**:
  - Denominator yang digunakan konsisten $24.911$ pelanggan aktif (bukan $25.000$ master).
  - Kotak batasan data terdokumentasi transparan dan rapi.
- **Kondisi Penyelesaian**:
  Halaman Intelijen Pelanggan beroperasi penuh dengan standar akurasi data yang tinggi.

---

### Fase 9: Penjelajah Transaksi (Transaction Explorer)

- **Tujuan**:
  Membangun halaman keempat `/transactions` sesuai Bagian 5.4 [`docs/PRD.md`](file:///c:/Users/TUF/OneDrive/Semester%205/Proyek/Penjualan_E-Commerce/docs/PRD.md) untuk mendeteksi transaksi anomali (revenue tinggi margin rendah), menghitung simulasi potensi opportunity gap ($\$5,54\text{M}$), dan menganalisis rincian status pengiriman logistik.
- **Dependensi**:
  Fase 6 (Global Filtering).
- **Berkas yang Perlu Dibuat atau Diubah**:
  - `src/features/transaction-explorer/TransactionExplorerPage.tsx` (baru).
  - `src/features/transaction-explorer/AnomalySummaryPanel.tsx` (baru, aturan & opportunity gap).
  - `src/features/transaction-explorer/DimensionAnomalyTable.tsx` (baru, sebaran saluran/wilayah).
  - `src/features/transaction-explorer/FulfillmentMixChart.tsx` (baru, status pengiriman kurir).
  - `src/app/routes.ts` (mengubah status rute `/transactions` menjadi `'ready'`).
  - `src/App.tsx` (mengarahkan rute `/transactions` ke `TransactionExplorerPage`).
- **Langkah-Langkah Implementasi**:
  1. Daftarkan rute `/transactions` sebagai `'ready'` di `src/app/routes.ts`.
  2. Susun baris kartu KPI: Pesanan Anomali ($12.855$ / $9,31\%$), Omzet Anomali ($\$34,67\text{M}$), Laba Anomali ($\$7,53\text{M}$), Margin Anomali ($21,72\%$), Opportunity Gap Agregat ($\$5,54\text{M}$), dan Pesanan Tidak Dikirim ($17,78\%$).
  3. Bangun panel Aturan Anomali ($\ge \$1.552,32$ dan $\le 34,12\%$) dan perbandingan dua angka opportunity gap beserta daftar asumsi simulasi potensi.
  4. Bangun tabel sebaran anomali lintas dimensi dengan sakelar: Sales Channel ($9,15\%-9,67\%$), Region ($8,99\%-9,48\%$), Marketing Channel ($8,92\%-9,88\%$), menonjolkan temuan bahwa inefisiensi margin merata di seluruh saluran/wilayah.
  5. Bangun modul status pengiriman logistik (`delivery_status`) dengan penegasan label "Tidak Dikirim" untuk nilai Cancelled ($24.557$ pesanan).
- **Pengujian**:
  - Unit test `tests/transaction_explorer.test.tsx` memverifikasi angka anomali dan fulfillment.
- **Kriteria Penerimaan**:
  - Angka Opportunity Gap secara tegas diberi label "Simulasi potensi".
- **Kondisi Penyelesaian**:
  Seluruh 4 halaman analitik utama selesai diimplementasikan.

---

### Fase 10: Tata Letak Responsif dan Aksesibilitas (Responsive & a11y)

- **Tujuan**:
  Menyempurnakan seluruh antarmuka pada berbagai ukuran layar ($375\text{px}$, $768\text{px}$, $1024\text{px}$, $\ge 1440\text{px}$), mengintegrasikan palet perintah pencarian cepat (*Command Palette* $\text{Ctrl/Cmd+K}$), dan memastikan seluruh elemen memenuhi standar aksesibilitas WCAG 2.1 Level AA.
- **Dependensi**:
  Fase 5–9 (Seluruh Halaman Utama Selesai).
- **Berkas yang Perlu Dibuat atau Diubah**:
  - `src/components/layout/CommandPalette.tsx` (baru, modal pencarian halaman & metrik via `Ctrl+K`).
  - `src/components/layout/TopHeader.tsx` (menghubungkan shortcut `Ctrl+K`).
  - `src/components/layout/SidebarNav.tsx` (penyempurnaan fokus keyboard dan status ARIA).
  - `src/components/table/DataTable.tsx` (pembungkus scroll horizontal seluler).
  - `src/index.css` (penyempurnaan aturan `prefers-reduced-motion` dan fokus cincin).
- **Langkah-Langkah Implementasi**:
  1. Implementasikan dialog `CommandPalette` yang dapat dibuka melalui pintasan `Ctrl+K` atau `Cmd+K`: menyediakan navigasi cepat ke 4 halaman analitik dan kamus definisi metrik instan.
  2. Periksa seluruh breakpoint responsif (`base`, `sm`, `md`, `lg`, `xl`, `2xl`): pastikan tidak ada teks bertumpuk atau elemen kartu yang meluap (*overflow*).
  3. Pastikan seluruh tabel data memiliki pembungkus `overflow-x-auto` dengan lebar minimum tabel $560\text{px}$ agar dapat digeser horizontal dengan mulus di layar ponsel pintar.
  4. Audit navigasi papan tik: seluruh tombol dan input memiliki urutan tab logis serta indikator fokus yang kontras (`focus-visible:ring-2 focus-visible:ring-ring`).
  5. Lengkapi seluruh tombol ikon dengan teks pembaca layar `sr-only` dan sematkan atribut `aria-current="page"` pada menu navigasi aktif.
- **Pengujian**:
  - Pengujian manual menggunakan keyboard penuh (`Tab`, `Enter`, `Space`, `Esc`, panah atas/bawah) tanpa tetikus.
  - Audit aksesibilitas Lighthouse di peramban (skor target $\ge 95$).
  - Uji tampilan pada lebar viewport $375\text{px}$, $768\text{px}$, dan $1440\text{px}$.
- **Kriteria Penerimaan**:
  - Bebas dari jebakan fokus (*no keyboard focus traps*).
  - Rasio kontras teks terhadap latar belakang memenuhi standar WCAG AA ($\ge 4,5:1$).
- **Kondisi Penyelesaian**:
  Dasbor sepenuhnya responsif, inklusif, dan nyaman diakses oleh seluruh pengguna dan perangkat.

---

### Fase 11: Pengujian, Perbaikan Bug, dan Pembuatan Build Produksi

- **Tujuan**:
  Menjalankan rangkaian pengujian otomatis end-to-end menyeluruh, validasi tipe data TypeScript ketat, pembersihan seluruh peringatan linter, perbaikan bug visual atau fungsional, dan pembuatan bundel produksi teroptimasi di folder `dist/`.
- **Dependensi**:
  Fase 1–10.
- **Berkas yang Perlu Dibuat atau Diubah**:
  - Seluruh berkas di `src/**/*`.
  - Berkas pengujian di `tests/**/*`.
  - Folder output `dist/`.
- **Langkah-Langkah Implementasi**:
  1. Jalankan `npm run lint` dan selesaikan seluruh potensi peringatan kode.
  2. Jalankan `npm run typecheck` (`tsc -b`) untuk memastikan 100% kepatuhan tipe TypeScript tanpa `any` liar.
  3. Jalankan rangkaian lengkap unit test: `npm run test` (memastikan seluruh test suite lolos).
  4. Jalankan `npm run build` (`vite build`) untuk menghasilkan berkas statis produksi di folder `dist/`.
  5. Uji pratinjau hasil kompilasi produksi secara lokal menggunakan `npm run preview` pada port lokal, memverifikasi pemuatan 9 berkas JSON statis di mode rilis.
  6. Periksa ukuran berkas JavaScript dan CSS hasil build untuk memastikan efisiensi pemuatan (*zero bundle bloat*).
- **Pengujian**:
  - `npm run lint` menghasilkan status bersih (0 error, 0 warning).
  - `npm run typecheck` menghasilkan status sukses (0 error).
  - `npm run test` menghasilkan 100% tes lulus (PASS).
  - `npm run preview` berjalan lancar dengan status HTTP 200 pada seluruh rute dan berkas data.
- **Kriteria Penerimaan**:
  - Perintah `npm run build` sukses tanpa error dan menghasilkan artefak produksi di `dist/`.
  - Tidak ada pesan galat atau peringatan yang muncul di konsol peramban (*developer console*) saat aplikasi dijalankan.
- **Kondisi Penyelesaian**:
  Aplikasi terbukti bebas bug, terverifikasi secara matematis, dan siap diterapkan (*production-ready*).

---

### Fase 12: Penerapan (Deployment) dan Dokumentasi Portofolio

- **Tujuan**:
  Menyiapkan konfigurasi penerapan hosting web statis (seperti Vercel, Netlify, atau GitHub Pages) dengan aturan penanganan rute SPA (*rewrite rules*), serta menyusun dokumentasi `README.MD` berkualitas tinggi sebagai etalase portofolio profesional bagi calon perekrut dan pimpinan analitik.
- **Dependensi**:
  Fase 11 (Build Produksi Siap).
- **Berkas yang Perlu Dibuat atau Diubah**:
  - `README.MD` (restrukturisasi komprehensif menjadi studi kasus portofolio analis data).
  - `vercel.json` (baru, konfigurasi rewrite SPA `/*` $\rightarrow$ `/index.html` dan header caching berkas data).
  - `docs/PRD.md` (pembaruan status akhir proyek).
- **Langkah-Langkah Implementasi**:
  1. Buat konfigurasi serverless/statis `vercel.json` (atau berkas setara) untuk memastikan akses langsung ke URL sub-halaman (`/sales`, `/customers`, `/transactions`) tidak memicu kesalahan HTTP 404.
  2. Perbarui `README.MD` utama proyek dengan struktur portofolio standar industri:
     - Judul proyek, ringkasan eksekutif, dan tautan demo langsung (*live interactive demo*).
     - Studi Kasus Analisis Bisnis: Ringkasan audit data, erosi margin kuartal 4 akibat diskon dalam, kontribusi laba segmen pelanggan riil, dan deteksi anomali volume tinggi ber-margin rendah.
     - Metodologi & Pembuktian Matematika: Rekonsiliasi Basis C (D7) vs kolom sumber mentah.
     - Tumpukan Teknologi & Arsitektur: React 18, TypeScript, Tailwind CSS v4, Recharts, dan pipeline persiapan Python.
     - Panduan instalasi dan reproduksi lokal.
     - Tangkapan layar antarmuka pada mode terang dan mode gelap.
  3. Lakukan peninjauan akhir (*final verification pass*) untuk memastikan konsistensi terminologi di seluruh dokumen panduan proyek.
- **Pengujian**:
  - Uji coba direct navigation peramban pada mode preview ke rute `/sales` dan `/customers` berhasil menampilkan halaman terkait tanpa error 404.
  - Tinjauan estetika dan keterbacaan berkas `README.MD`.
- **Kriteria Penerimaan**:
  - Dokumentasi portofolio tersaji rapi, persuasif, dan memberikan impresi profesional bagi perekrut teknis.
  - Aplikasi dapat diakses secara publik dan seluruh interaksi berfungsi sesuai spesifikasi.
- **Kondisi Penyelesaian**:
  Seluruh rangkaian proyek Analisis Penjualan E-commerce selesai secara paripurna dari tahap audit data hingga publikasi portofolio.

---

## Matriks Pelacakan Ketergantungan Antar Fase

| Fase | Nama Fase | Dependensi Prasyarat | Output Utama |
|---|---|---|---|
| **Fase 1** | Pengaturan Proyek & Tooling | Lingkungan Sistem Node.js | Vitest, Typecheck script, Smoke test |
| **Fase 2** | Penyiapan & Validasi Data | Fase 1, Python `.venv` | 9 Berkas JSON statis, 23 Anchor checks |
| **Fase 3** | Design Tokens & App Shell | Fase 1, Fase 2 | CSS variables, Persistent Sidebar, Routing |
| **Fase 4** | Mode Gelap & Mode Terang | Fase 3 | `ThemeProvider`, kelas `.dark`, ThemeToggle |
| **Fase 5** | Gambaran Eksekutif | Fase 4, Fase 2 | Halaman `/` lengkap, 6 KPI, Tren 60 bulan |
| **Fase 6** | Filter Global & Interaktivitas | Fase 5, `filter-cubes.json` | `FilterProvider`, agregasi kubus aditif |
| **Fase 7** | Penjualan & Profitabilitas | Fase 6 | Halaman `/sales`, 5 Bracket diskon, Tren YoY |
| **Fase 8** | Kecerdasan Pelanggan | Fase 6 | Halaman `/customers`, 4 Segmen, Profil Consumer |
| **Fase 9** | Penjelajah Transaksi | Fase 6 | Halaman `/transactions`, Anomali, Status kirim |
| **Fase 10** | Responsivitas & Aksesibilitas | Fase 5–9 | Mobile drawer, Command Palette, a11y AA |
| **Fase 11** | Pengujian & Build Produksi | Fase 1–10 | Lint 0, Typecheck 0, Tests PASS, Folder `dist/` |
| **Fase 12** | Deployment & Dokumentasi | Fase 11 | Rewrites SPA, Portfolio `README.MD` lengkap |
