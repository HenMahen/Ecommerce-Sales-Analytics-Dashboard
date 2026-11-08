# Dokumen Persyaratan Produk (Product Requirements Document - PRD)

## Dasbor Analisis Penjualan E-Commerce (E-Commerce Sales Analytics Dashboard)

- **Status**: Disetujui untuk Implementasi Frontend (Menyelaraskan ke Basis Metrik `mvp-6`)
- **Peran Produk**: Proyek Portofolio Profesional Analis Data (*Data Analyst Portfolio Project*)
- **Target Pengguna**: Pemimpin Bisnis E-commerce, Manajer Penjualan, Analis Finansial, Perekrut Profesional (*Hiring Managers*), serta **Masyarakat Umum / Orang Awam** (pengguna non-teknis, pemilik toko/UMKM rintisan, dan pembelajar yang ingin memahami dinamika performa e-commerce tanpa kebingungan jargon analitik)
- **Versi Definisi Data**: `mvp-4` (Keputusan D1–D7, Q1–Q5, B1–B8)
- **Teknologi**: React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui, Recharts, Lucide React, Python/Pandas (Pipeline Data)

---

## 1. Ringkasan Eksekutif & Tujuan Produk

### 1.1 Latar Belakang & Konteks Portofolio

Dalam industri retail dan e-commerce modern, pengambilan keputusan bisnis sering kali terhambat oleh metrik permukaan yang menyesatkan, inkonsistensi rekonsiliasi data, serta perlakuan finansial yang keliru (misalnya menganggap pajak dan ongkir sebagai laba atau membiarkan promosi diskon menggerus margin kotor tanpa disadari).

Produk ini dirancang sebagai **dasbor SaaS analitik penjualan e-commerce berstandar korporat** yang menampilkan kecakapan seorang Analis Data profesional. Portofolio ini mendemonstrasikan tidak hanya visualisasi data yang bersih dan elegan, melainkan disiplin analitis tingkat lanjut:

1. **Audit Data & Rekonsiliasi Matematika Ketat**: Membedakan secara eksplisit antara data mentah (*as_stored*) dengan standar akuntansi yang benar (*Basis C / D7*), di mana pajak dan ongkir diperlakukan sebagai *pass-through*, bukan pendapatan merchandise maupun laba.
2. **Integritas Metrik**: Menggunakan margin keseluruhan ($\sum \text{Profit} / \sum \text{Net Sales}$) sebagai ukuran utama profitabilitas bisnis dan membedakannya secara konsisten dari rata-rata margin per transaksi.
3. **Objektivitas Analisis**: Menolak narasi pertumbuhan palsu saat data menunjukkan kinerja historis yang datar ($\pm 1\%$ per tahun), mengungkap erosi margin kuartal 4 akibat diskon dalam, serta membedah anomali pesanan bervolume tinggi dengan margin rendah.
4. **Desain SaaS Berkelas & Referensi Desain Modern**: Tata letak yang fungsional, responsif, elegan, bebas dari ornamen palsu, mengadopsi sistem desain dari `design/` (*Warm Alabaster & Japanese Indigo* untuk Mode Terang, dan *Nocturne Synthwave Luxury* untuk Mode Gelap).
5. **Aksesibilitas & Kejelasan bagi Orang Awam**: Menyajikan data finansial kompleks melalui visualisasi yang jernih, tipografi berdaya baca tinggi, serta penjelasan singkat pada setiap kartu dan grafik sehingga audiens umum atau pemula bisnis dapat memahami konsep omzet riil, margin laba, dan dampak diskon secara intuitif tanpa memerlukan latar belakang analitik yang rumit.

### 1.2 Tujuan Utama Produk (Product Goals)

- Menyajikan ringkasan performa finansial dan operasional 5 tahun (2021–2025) berbasis 138.116 transaksi tervalidasi.
- Memberikan visibilitas terperinci mengenai hubungan antara kedalaman diskon dan profitabilitas riil.
- Mengidentifikasi segmen pelanggan yang paling bernilai serta membuktikan efisiensi retensi melalui perilaku transaksi aktual.
- Menyediakan alat penelusuran anomali bisnis (transaksi bernilai tinggi namun margin rendah) untuk penyelamatan potensi laba (*opportunity gap*).
- Memberikan sarana edukasi dan eksplorasi data yang intuitif, ramah, dan transparan bagi masyarakat umum (*orang awam*) dan pengambil keputusan bisnis pemula untuk memahami kesehatan ekonomi e-commerce.

---

## 2. Prinsip Desain & Pengalaman Pengguna (UX/UI)

### 2.1 Bahasa Desain & Sistem Desain Terpadu (Design Reference)

- **Prinsip Estetika**: Tata letak bersih, fokus pada rasio data-ke-tinta (*high data-ink ratio*), ramah pengguna awam dengan hirarki visual terarah, perataan angka finansial (`tabular-nums`), serta transisi mikro yang lembut.
- **Tipografi Sistem**:
  - Tampilan & Judul (*Display & Headings*): Menggunakan **Space Grotesk** / **Plus Jakarta Sans** berbobot tebal (Semibold/Bold) untuk karakter tajuk yang tegas dan profesional.
  - Teks Isi (*Body Text*): Menggunakan **Geist** / **Plus Jakarta Sans** dengan spasi baris proporsional untuk kenyamanan membaca data panjang.
  - Label & Numerik (*Labels & Monospace*): Menggunakan **JetBrains Mono** / font angka tabular untuk perataan nilai desimal, persentase margin, dan lencana kode status.
- **Sistem Palet Warna (Merujuk Folder `design/`)**:
  - **Mode Terang (*Light Mode - Warm Alabaster & Japanese Indigo*)**:
    - Latar Belakang & Permukaan: Nuansa hangat alabaster dan kertas korporat (`#F9F9FF` / `#FBF9F5`).
    - Warna Primer (*Primary*): Biru Indigo Jepang yang berwibawa (`#0037B0`, kontainer `#1D4ED8`).
    - Warna Sekunder & Tersier: Terra Cotta hangat (`#AC3400`) dan Giok Hutan (`#004F38`).
    - Garis Pembatas: Halus dan netral (`#E8E2D8` / `#C4C5D7`).
  - **Mode Gelap (*Dark Mode - Nocturne Synthwave Luxury*)**:
    - Latar Belakang & Permukaan: Obsidian ungu pekat (*Deep Nocturne* `#151120`, kontainer `#100C1B` / `#221D2D`).
    - Warna Primer (*Primary*): Neon Synthwave Pink cerah (`#FFAEDA`, kontainer `#FF3AC2`).
    - Warna Sekunder & Tersier: Ungu Lilac mewah (`#E5B4FF`) dan Biru Periwinkle halus (`#BCC2FF`).
    - Aksen Pencahayaan: Efek pendaran neon (*ambient glow*) halus dan garis batas berkontras pas (`#593F4C` / `rgba(255, 28, 192, 0.18)`).
- **Penanda Status Semantik**:
  - Selesai / Laba (*Completed*): Hijau Emerald / Neon Mint (`#16A34A` / `#00FFA3`).
  - Tertunda / Anomali (*Pending* / *Anomaly*): Kuning Amber cerah (`#D97706` / `#FBBF24`).
  - Retur / Kerugian (*Returned* / *Loss*): Merah Terang (`#DC2626` / `#FFB4AB`).
  - Dibatalkan (*Cancelled*): Netral / Slate (`#475569` / `#A78897`).
- **Mikro-interaksi & State**:
  - Transisi halus saat *hover* kartu, tooltip grafik interaktif dengan pemformatan mata uang dan persentase yang presisi.
  - Penanganan state yang lengkap: *Loading skeleton*, *Empty state* saat kombinasi filter tidak menghasilkan baris, dan *Error state* yang deskriptif.

### 2.2 Mode Gelap & Mode Terang (Dark & Light Mode)

- Dasbor wajib mendukung pergantian tema gelap dan terang secara konsisten tanpa merusak keterbacaan grafik Recharts maupun batas kartu.
- Menggunakan variabel CSS semantik yang selaras dengan sistem desain `design/` di seluruh komponen UI.

### 2.3 Navigasi & Tata Letak Responsif

- **Desktop ($\ge 1024\text{px}$)**: Bilah sisi kiri (*sidebar*) yang tetap (*persistent*), menampilkan menu 4 halaman utama analitik.
- **Tablet & Mobile ($< 1024\text{px}$)**: Bilah sisi berubah menjadi laci (*drawer/sheet*) yang dapat dibuka/tutup melalui tombol menu hamburger di header atas.
- **Struktur Halaman**:
  - Header atas: Judul aplikasi/dasbor, kontrol pencarian cepat (*Command Palette* $\text{Ctrl/Cmd+K}$ untuk navigasi halaman & kamus metrik), pemilih periode cepat, dan sakelar tema (*theme toggle*).
  - Bilah ringkasan filter aktif (*Filter Summary Bar*).
  - Kontainer halaman utama yang memuat baris kartu KPI, panel grafik Recharts, tabel data interaktif, dan catatan kaki penjelasan metrik.

---

## 3. Fondasi Data & Keputusan Metrik Bisnis

Seluruh metrik yang ditampilkan dalam PRD ini diturunkan langsung dari dataset yang telah diproses di `data/processed/*.json` dan telah divalidasi silang terhadap dokumen [docs/EDA_VALIDATION.md](<file:///c:/Users/TUF/OneDrive/Semester%205/Proyek/Penjualan_E-Commerce/docs/EDA_VALIDATION.md>) serta [docs/METRIC_DICTIONARY.md](<file:///c:/Users/TUF/OneDrive/Semester%205/Proyek/Penjualan_E-Commerce/docs/METRIC_DICTIONARY.md>).

### 3.1 Keputusan Kunci Metrik MVP (D1–D7)

| ID           | Aspek Bisnis                     | Pilihan yang Dikunci                                                                     | Alasan Analitis                                                                                                                                               | Nilai Acuan Terverifikasi                                                               |
| ------------ | -------------------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| **D1** | **Basis Margin Utama**     | **Margin Keseluruhan** ($\sum \text{Profit} / \sum \text{Net Sales} \times 100$) | Mengukur persentase riil dari setiap dolar penjualan yang menjadi laba bersih. Rata-rata margin transaksi hanya dijadikan metrik sekunder berlabel eksplisit. | Keseluruhan: **37,69%** vs Rerata transaksi: **41,16%**                     |
| **D2** | **Operator Anomali**       | **Inklusif** ($\ge$ p75 Revenue dan $\le$ p25 Margin)                          | Konsisten dengan definisi batas persentil matematis.                                                                                                          | Ambang: $\$1.552,32$ & $34,12\%$; Jumlah: **12.855 pesanan** (9,31%)          |
| **D3** | **Opportunity Gap**        | **Simulasi potensi** (dengan asumsi eksplisit)                                     | Mencegah misrepresentasi angka simulasi sebagai laba aktual yang hilang.                                                                                      | Basis transaksi: $\$6.738.175,54$; Basis agregat: $\$5.537.690,05$                  |
| **D4** | **Pelanggan Berulang**     | **Tingkat Pelanggan** ($\ge 2$ pesanan)                                          | Transaksi berulang 99,76% tidak dapat ditindaklanjuti. Menghindari perbandingan first-time vs repeat karena sampel first-time hanya 334 baris.                | **97,90%** pelanggan aktif ($24.387 / 24.911$)                                  |
| **D5** | **Level Produk**           | **Dikecualikan dari MVP**                                                          | Berkas `order_items.csv` memiliki deviasi $+8,61\%$ dan 87 duplikat yang belum terekonsiliasi dengan tabel fakta order.                                   | Tidak ada tabel/grafik finansial level SKU di MVP                                       |
| **D6** | **Retur & Pembatalan**     | **Diakui di semua status** (dengan catatan pengakuan pendapatan)                   | Dataset tidak memuat pembalikan nilai uang/refund; membalik laba tanpa data akan mengarang angka.                                                             | Completed $35,96\%$, Pending $36,11\%$, Returned $48,37\%$, Cancelled $48,44\%$ |
| **D7** | **Basis Net Sales & Laba** | **Basis C (Merchandise Net)**                                                      | Rumus sumber memasukkan pajak dan ongkir ke net sales serta pajak ke laba. Pajak & ongkir wajib diperlakukan sebagai *pass-through*.                        | Net Sales: **$\$157.143.214,06$**; Laba: **$\$59.232.305,35$**          |

### 3.2 Rumus Matematika Baku

$$
\text{Net Sales} = \text{Gross Sales} - \text{Discount Amount}
$$

$$
\text{Profit} = \text{Net Sales} - \text{Product Cost}
$$

$$
\text{Aggregate Margin \%} = \frac{\sum \text{Profit}}{\sum \text{Net Sales}} \times 100
$$

$$
\text{Average Order Value (AOV)} = \frac{\text{Net Sales}}{\text{Total Orders}}
$$

$$
\text{Weighted Discount Rate \%} = \frac{\sum \text{Discount Amount}}{\sum \text{Gross Sales}} \times 100 \quad (17,28\%)
$$

---

## 4. Sistem Filter Global & Interaktivitas

### 4.1 Filter Global yang Berlaku

Sistem filter global membaca kubus agregasi `filter-cubes.json`; sejak `mvp-5` semua kombinasi dihitung dari satu **kubus gabungan** $Period \times Segment \times Sales\,Channel \times Status\,Order$, sehingga angka konsisten secara instan tanpa backend. Sejak `mvp-6`, kubus yang sama juga membawa ukuran aditif `gross_sales` dan `discount_amount`, sehingga KPI diskon (gross, nilai diskon, tingkat terbobot) mengikuti seluruh kombinasi filter:

1. **Tahun**: pemilih cepat yang mengatur rentang bulan ke satu tahun penuh (`2021`–`2025`, atau `Semua tahun`). Opsi "Rentang kustom" tampil otomatis (nonaktif) bila rentang bulan tidak mencakup tepat satu tahun.
2. **Rentang Bulan**: kontrol `Dari bulan` dan `Sampai bulan` (granularitas bulanan `2021-01` sampai `2025-12`, 60 bulan); rentang selalu dijaga agar tidak terbalik.
3. **Segmen Pelanggan**: `Consumer`, `Premium`, `Business`, `VIP`.
4. **Sales Channel**: `Mobile App`, `Website`, `Social Media`, `Marketplace`.
5. **Status Order**: `Completed`, `Pending`, `Returned`, `Cancelled`.
   Kelima kontrol dapat aktif bersamaan; kombinasi yang tidak memiliki baris data ditangani sebagai keadaan kosong yang eksplisit (lihat §4.2).

### 4.2 Aturan Perilaku Filter

- **Penjumlahan Kubus Gabungan**: Nilai terfilter dihitung dengan menjumlahkan baris `cubes.combined` yang terpilih ($\sum \text{orders}$, $\sum \text{net\_sales}$, $\sum \text{profit}$). Margin keseluruhan dihitung ulang berbobot: $\sum \text{profit} / \sum \text{net\_sales} \times 100$. Frontend tidak boleh mengulang rumus bisnis lain.
- **Satu Cakupan untuk Semua Panel**: Kartu KPI, kedua tren bulanan, komposisi segmen, musiman bulan kalender, dan tabel status order membaca cakupan data yang sama dari kubus gabungan. Panel yang tidak dapat mengikuti filter dimensi (kubus panel rentang periode) **disembunyikan dengan penjelasan** — bukan ditampilkan tanpa filter di samping KPI terfilter.
- **Ukuran Tidak Aditif**: Jumlah pelanggan (`customers`) dan rata-rata margin transaksi (`avg_transaction_margin_pct`) **tidak boleh dijumlahkan atau dirata-ratakan** lintas bulan. Kubus gabungan tidak membawanya; `customers` tetap disajikan sebagai acuan "Ringkasan seluruh periode 2021-2025" berlabel, dan `avg_transaction_margin_pct` sekunder disembunyikan saat ada filter dimensi aktif.
- **Isolasi Panel Tanpa Kubus**: Panel yang tidak memiliki kubus filter (misalnya sebaran wilayah anomali, rincian marketing channel) tidak terpengaruh filter dimensi dan **wajib menampilkan lencana status** `"Seluruh Periode 2021-2025"` atau `"Semua Segmen"`. Panel yang hanya mengikuti rentang bulan — sejak `mvp-4` — memakai lencana `"Mengikuti rentang periode"`; saat filter dimensi aktif, panel tersebut disembunyikan dengan penjelasan agar tidak pernah ada angka tak terfilter berdampingan dengan KPI terfilter.
- **Filter Aktif Terlihat & Reset Cepat**: Setiap filter aktif tampil sebagai chip yang dapat dilepas satu per satu; saat semua filter bersih, bilah menampilkan penanda "Tanpa filter". Tombol **"Hapus semua filter"** beserta penghitung filter aktif selalu tersedia dan hanya aktif ketika ada filter yang menyala.

---

## 5. Spesifikasi Detail Empat Halaman Utama

```
+----------------------------------------------------------------------------------------------------+
|                                    SISTEM NAVIGASI & HALAMAN                                       |
+------------------------------------+---------------------------------------------------------------+
|  1. Tinjauan Eksekutif             |  Ringkasan eksekutif kesehatan bisnis, tren jangka panjang,   |
|     (Executive Overview)           |  kontribusi profit segmen, dan komposisi pesanan.             |
+------------------------------------+---------------------------------------------------------------+
|  2. Penjualan & Profitabilitas     |  Dinamika finansial, erosi margin diskon, dekomposisi waktu   |
|     (Sales & Profitability)        |  (tahunan/kuartalan/musiman), dan anomali Q4.                 |
+------------------------------------+---------------------------------------------------------------+
|  3. Intelijen Pelanggan            |  Analisis nilai pelanggan, perbandingan segmen, distribusi   |
|     (Customer Intelligence)        |  margin tinggi, dan validasi retensi berbasis data nyata.     |
+------------------------------------+---------------------------------------------------------------+
|  4. Eksplorasi Transaksi           |  Deteksi anomali volume tinggi ber-margin rendah, kalkulasi   |
|     (Transaction Explorer)         |  opportunity gap, analisis order rugi, dan efisiensi kirim.   |
+------------------------------------+---------------------------------------------------------------+
```

---

### 5.1 Halaman 1: Tinjauan Eksekutif (Executive Overview)

#### A. Pertanyaan Bisnis

1. Bagaimana ringkasan performa finansial merchandise bersih (net sales) dan laba riil perusahaan sepanjang horizon 5 tahun?
2. Bagaimana tren volume pesanan dan profitabilitas dari bulan ke bulan, dan apakah bisnis mengalami lonjakan musiman tertentu?
3. Segmen pelanggan mana yang menjadi kontributor terbesar terhadap total profitabilitas perusahaan?
4. Bagaimana proporsi status pemrosesan pesanan dan apakah pesanan retur/batal memengaruhi margin merchandise?

#### B. Target Audiens

C-Level Executives (CEO, CFO, CMO), Direktur Operasional E-commerce, dan Perekrut Senior yang ingin melihat kemampuan analis dalam merangkum kesehatan makro bisnis secara ringkas dan presisi.

#### C. KPI yang Diperlukan

| Nama KPI             | Label Tampilan             | Definisi & Rumus                                                     | Nilai Acuan (Seluruh Data)                  |
| -------------------- | -------------------------- | -------------------------------------------------------------------- | ------------------------------------------- |
| Net Sales            | Penjualan Bersih           | $\sum(\text{gross\_sales} - \text{discount\_amount})$              | **$\$157.143.214,06$**              |
| Profit               | Laba Bersih Merchandise    | $\sum(\text{net\_sales} - \text{product\_cost})$                   | **$\$59.232.305,35$**               |
| Aggregate Margin     | Margin Keseluruhan (Utama) | $(\sum \text{profit} / \sum \text{net\_sales}) \times 100$         | **$37,69\%$**                       |
| Total Orders         | Volume Pesanan             | Jumlah seluruh baris transaksi                                       | **$138.116$ pesanan**               |
| Average Order Value  | Nilai Pesanan Rata-rata    | $\text{Net Sales} / \text{Total Orders}$                           | **$\$1.137,76$**                    |
| Repeat Customer Rate | Pelanggan Berulang         | Pelanggan unik dengan $\ge 2$ pesanan dibagi total pelanggan aktif | **$97,90\%$** ($24.387 / 24.911$) |

#### D. Komponen Visual & Penataan Layout

> **Status implementasi (mvp-4).** Baris KPI ditampilkan sebagai **4 kartu ringkas** (Net Sales, Profit, Margin Keseluruhan, Total Orders); AOV dan Repeat Customer Rate dipindah ke panel "Ringkasan seluruh periode". Panel tren dipisah menjadi dua: **Tren penjualan bersih bulanan** (area net sales + garis margin keseluruhan) dan **Tren laba bulanan**. Ditambah panel **Wawasan bisnis** (pemeringkatan bulan/status/segmen + porsi, tanpa perbandingan periode atau indikator pertumbuhan). Urutan final dan bukti verifikasi: `docs/IMPLEMENTATION_BLUEPRINT.md` §18.

1. **Baris Kartu KPI Utama**:
   - 6 kartu ringkas: Net Sales, Profit, Margin Keseluruhan (dengan lencana "Metrik Utama"), Total Orders, AOV, dan Repeat Customer Rate.
   - Kartu Margin Keseluruhan dilengkapi sub-informasi rata-rata margin transaksi ($41,16\%$) sebagai pembanding sekunder.
2. **Panel Tren 60 Bulan (Net Sales & Margin)**:
   - Area chart kombinasi Recharts: Area bergradasi halus untuk Net Sales (sumbu kiri) dan garis aksen untuk Margin Keseluruhan (sumbu kanan, rentang $20\%-55\%$).
   - Dilengkapi penanda visual untuk periode penurunan margin di setiap akhir tahun (Q4).
3. **Panel Distribusi Profit per Segmen Pelanggan**:
   - Donut chart interaktif yang menampilkan pangsa profit 4 segmen: Consumer ($56,65\%$), Premium ($23,55\%$), Business ($10,28\%$), dan VIP ($9,51\%$).
   - Legenda ringkas dengan nilai nominal laba per segmen.
4. **Panel Musiman Penjualan Bulanan (Aggregated Across Years)**:
   - Bar chart agregat 12 bulan (Januari–Desember): Memperlihatkan lonjakan volume tajam di bulan November ($\$19,1\text{M}$) dan Desember ($\$20,7\text{M}$) disertai penurunan margin tajam ke level $25,89\%$ dan $26,40\%$.
5. **Panel Tabel Komposisi Status Pesanan**:
   - Tabel ringkas status pesanan (`Completed`, `Pending`, `Returned`, `Cancelled`) yang menyajikan volume order, net sales, profit, dan margin keseluruhan per status.
6. **Catatan Kaki Finansial (Pass-through Reconciliation)**:
   - Catatan ringkas terverifikasi: Pajak dipungut ($\$16.914.090,41$) dan Ongkir ditagih ($\$3.076.959,27$) dilaporkan terpisah sebagai aliran *pass-through* dan tidak dihitung sebagai pendapatan perusahaan.

#### E. Filter & Interaksi

- **Respon Filter Global**: Kartu KPI, kedua panel tren bulanan, komposisi segmen, musiman kalender, dan tabel status order membaca **satu cakupan data yang sama** dari kubus gabungan; kelima kontrol filter (Tahun, rentang bulan, segmen, channel, status order) dapat dikombinasikan tanpa keadaan yang bertentangan.
- **Cakupan Panel**: Panel yang hanya mengikuti rentang periode (mis. status pengiriman) disembunyikan dengan penjelasan saat filter dimensi aktif; ringkasan non-aditif tetap memakai acuan "Ringkasan seluruh periode 2021-2025" dengan label eksplisit.
- **Interaksi Tooltip**: Hover pada grafik menampilkan angka nominal akurat dalam format USD dan persentase 2 desimal.

#### F. Kriteria Penerimaan (Acceptance Criteria)

- [ ] Angka KPI awal pada kondisi tanpa filter sama persis dengan angka acuan benchmark $157.143.214,06$ USD dan margin $37,69\%$.
- [ ] Kombinasi kelima filter dihitung dari kubus gabungan dan konsisten dengan angka acuan (mis. VIP + Website + Completed); kombinasi kosong menampilkan keadaan kosong eksplisit dengan tombol hapus filter.
- [ ] Tooltip grafik tren menampilkan tanggal dalam format `Bulan Tahun` (misal: `Nov 2024`) serta nilai finansial terformat rapi.
- [ ] Tidak ada kartu atau teks yang menampilkan nilai pajak dan ongkos kirim sebagai bagian dari laba.
- [ ] Tabel status pesanan menyertakan catatan penjelasan pengakuan pendapatan D6 (laba diakui di semua status karena ketiadaan data pembalikan/refund).

---

### 5.2 Halaman 2: Penjualan & Profitabilitas (Sales & Profitability)

#### A. Pertanyaan Bisnis

1. Apakah peningkatan promosi diskon menghasilkan penambahan keuntungan riil atau justru menggerus profitabilitas (*margin erosion*)?
2. Bagaimana profil kinerja penjualan tahunan (YoY), dan apakah bisnis benar-benar tumbuh secara struktural?
3. Pada tingkat diskon berapa pesanan mulai mengalami kerugian finansial bersih (*loss-making orders*)?
4. Bagaimana perbedaan dinamika profitabilitas antara hari kerja (*weekdays*) dan akhir pekan (*weekends*) serta kinerja antar kuartal?

#### B. Target Audiens

Head of Commercial, Pricing & Promotion Managers, Financial Planning & Analysis (FP&A) Analysts, yang berfokus pada strategi penetapan harga, elastisitas promo, dan efisiensi kalender dagang.

#### C. KPI yang Diperlukan

| Nama KPI               | Label Tampilan             | Definisi & Rumus                                                       | Nilai Acuan (Seluruh Data)                 |
| ---------------------- | -------------------------- | ---------------------------------------------------------------------- | ------------------------------------------ |
| Gross Sales            | Total Penjualan Kotor      | $\sum \text{gross\_sales}$                                           | **$\$189.962.560,88$**             |
| Total Discount         | Total Diskon Diberikan     | $\sum \text{discount\_amount}$                                       | **$\$32.819.346,82$**              |
| Weighted Discount Rate | Rata-rata Diskon Terbobot  | $\sum \text{discount\_amount} / \sum \text{gross\_sales} \times 100$ | **$17,28\%$**                      |
| Net Profit             | Laba Bersih Merchandise    | $\text{Net Sales} - \text{COGS}$                                     | **$\$59.232.305,35$**              |
| Loss-Making Orders     | Pesanan Mengalami Kerugian | Jumlah pesanan dengan nilai $\text{Profit} < 0$                      | **$2.530$ pesanan** ($1,83\%$)   |
| Total Financial Loss   | Total Nilai Kerugian       | $\sum \text{Profit}$ pada pesanan dengan profit $< 0$              | **$\$426.306,80$** (nilai absolut) |

#### D. Komponen Visual & Penataan Layout

1. **Baris Kartu Metrik Finansial & Diskon**:
   - Menampilkan Gross Sales, Nilai Diskon, Diskon Terbobot ($17,28\%$), Net Sales, Profit, dan Total Kerugian ($\$426.306,80$).
2. **Panel Analisis Dampak Bracket Diskon**:
   - Grouped bar / Bar chart + Tabel komparatif 5 tingkat diskon:
     - `0%`: $17.864$ order, Net Sales $\$21,77\text{M}$, Margin Keseluruhan $48,41\%$, Profit/Order $\$589,90$, 0 order rugi.
     - `1-10%`: $35.031$ order, Net Sales $\$39,34\text{M}$, Margin Keseluruhan $44,74\%$, Profit/Order $\$502,45$, 0 order rugi.
     - `11-20%`: $49.198$ order, Net Sales $\$52,82\text{M}$, Margin Keseluruhan $39,88\%$, Profit/Order $\$428,11$, 0 order rugi.
     - `21-30%`: $17.729$ order, Net Sales $\$21,19\text{M}$, Margin Keseluruhan $31,57\%$, Profit/Order $\$377,34$, 0 order rugi.
     - `30%+`: $18.294$ order, Net Sales $\$22,02\text{M}$, Margin Keseluruhan **$15,17\%$**, Profit/Order **$\$182,62$**, **$2.530$ order rugi**.
   - Wawasan Analitis eksplisit: Penurunan margin paling tajam terjadi pada diskon $>30\%$ (anjlok $-16,40\text{ pp}$), dan 100% pesanan yang merugi terkonsentrasi pada tier diskon $>30\%$. Disertai catatan batasan *basket size confound* (rata-rata item naik dari 4,98 unit di 0% menjadi 7,94 unit di 30%+).
3. **Panel Kinerja Tahunan & Analisis YoY (5 Tahun)**:
   - Tabel dan Bar chart tahunan (2021–2025): Menampilkan volume order, net sales, profit, margin keseluruhan, dan laju pertumbuhan YoY.
   - Narasi Transparan Portofolio: Menegaskan bahwa performa bisnis berada dalam kondisi **datar (statis)** dengan fluktuasi tahunan $\pm 1\%$ (YoY Revenue: $-1,14\%$ di 2022, $+0,64\%$ di 2023, $-0,22\%$ di 2024, $-1,07\%$ di 2025). Mengeliminasi klaim palsu mengenai "pertumbuhan pesat".
4. **Panel Dekomposisi Kuartalan & Hari Kerja vs Akhir Pekan**:
   - Kartu komparasi Kuartal (Q1–Q4 lintas tahun): Q1 ($42,71\%$), Q2 ($42,96\%$), Q3 ($39,08\%$), Q4 ($30,22\%$).
   - Kartu komparasi Hari: Hari Kerja ($98.686$ order, margin $37,71\%$) vs Akhir Pekan ($39.430$ order / $28,55\%$ pangsa, margin $37,65\%$). Menunjukkan stabilitas margin terlepas dari hari pemesanan.
5. **Panel Distribusi Metrik Diskon**:
   - Perbandingan 4 ukuran diskon: Diskon Keseluruhan ($17,28\%$), Rerata Diskon ($15,12\%$), Median Diskon ($12,75\%$), dan Maksimum Diskon ($60,02\%$).

#### E. Filter & Interaksi

- Sakelar tampilan grafik (*toggle* waktu): Pengguna dapat beralih antara deret waktu Bulanan (60 titik), Kuartalan (20 titik per kuartal-tahun), dan Tahunan (5 bar).

#### F. Kriteria Penerimaan (Acceptance Criteria)

- [ ] Tabel bracket diskon memuat tepat 5 baris dengan jumlah order kumulatif $138.116$.
- [ ] Seluruh angka kerugian ($426.306,80$ USD pada $2.530$ order) diberi label positif bertuliskan "Nilai Kerugian" (bukan angka minus yang membingungkan).
- [ ] Narasi analitis tahunan secara tegas mencantumkan bahwa tren adalah "Stabilitas/Datar", bukan pertumbuhan ekspansif.

> **Status implementasi (mvp-6).** Halaman dibangun dengan baris KPI: Gross Sales, Total Diskon, Tingkat Diskon Terbobot, Net Sales, Profit, Margin Keseluruhan, Order, plus kartu **"Nilai Kerugian"** berlabel "Seluruh periode 2021-2025" karena non-aditif. Panel tren memakai sakelar Bulanan/Kuartalan/Tahunan (batang net sales + garis profit + garis margin keseluruhan); panel perbandingan channel; panel margin kuartalan Q1-Q4 lintas tahun (dihitung ulang dari kubus gabungan); panel hari kerja vs akhir pekan (hanya rentang periode, disembunyikan dengan penjelasan saat filter dimensi aktif); panel bracket diskon (grafik + tabel 5 baris + empat ukuran tingkat diskon yang masing-masing dilabeli penyebutnya + catatan Nilai Kerugian); panel tahunan (grafik + tabel YoY + narasi "Stabilitas/Datar"). Seluruh KPI finansial dan diskon membaca kubus gabungan yang sama (`definitions_version mvp-6`, ukuran aditif `gross_sales`/`discount_amount` ikut semua filter); YoY dihitung di klien dengan rumus identik pipeline dan hanya tampil bila kedua tahun lengkap dalam cakupan. Verifikasi: `docs/IMPLEMENTATION_BLUEPRINT.md` §20.

---

### 5.3 Halaman 3: Intelijen Pelanggan (Customer Intelligence)

#### A. Pertanyaan Bisnis

1. Bagaimana karakteristik profitabilitas dan volume belanja dari masing-masing segmen pelanggan (`Consumer`, `Premium`, `Business`, `VIP`)?
2. Segmen mana yang memberikan profit tertinggi per pelanggan aktif, dan apakah program VIP/Premium benar-benar menghasilkan margin lebih tinggi?
3. Seberapa dominan transaksi bernilai margin sehat ($>20\%$) dalam portofolio pelanggan?
4. Bagaimana kepuasan pelanggan (rating ulasan) tersebar di antara transaksi yang berhasil dikirimkan?

#### B. Target Audiens

Chief Marketing Officer (CMO), Head of CRM, Customer Retention Strategists, yang membutuhkan fakta berbasis data untuk alokasi insentif loyalitas dan strategi retensi.

#### C. KPI yang Diperlukan

| Nama KPI              | Label Tampilan                    | Definisi & Rumus                                               | Nilai Acuan (Seluruh Data)                              |
| --------------------- | --------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------- |
| Active Customers      | Total Pelanggan Aktif             | Pelanggan unik yang bertransaksi minimal 1 kali di tabel fakta | **$24.911$ pelanggan** (dari $25.000$ master) |
| Orders per Customer   | Rata-rata Pesanan per Pelanggan   | $\text{Total Orders} / \text{Pelanggan Aktif}$               | **$5,544$ pesanan/pelanggan**                   |
| Profit per Customer   | Rata-rata Laba per Pelanggan      | $\text{Total Profit} / \text{Pelanggan Aktif}$               | **$\$2.377,76$ per pelanggan**                  |
| Repeat Customer Share | Tingkat Pelanggan Berulang        | Pelanggan dengan $\ge 2$ pesanan                             | **$97,90\%$**                                   |
| High-Margin Tx Share  | Pangsa Transaksi Margin $>20\%$ | Transaksi dengan $\text{profit\_margin} > 20\%$              | **$92,01\%$** ($127.077$ pesanan)             |
| Mean Customer Rating  | Kepuasan Pelanggan Rata-rata      | Rerata kolom `customer_rating` pada pesanan terkirim         | **$3,677$** (skala 1–5)                        |

#### D. Komponen Visual & Penataan Layout

1. **Baris Kartu KPI Pelanggan**:
   - Menampilkan Pelanggan Aktif, Pesanan per Pelanggan, Profit per Pelanggan, Tingkat Pelanggan Berulang, Pangsa Margin Tinggi ($92,01\%$), dan Rating Pelanggan.
   - Peringatan non-aditif: Jika filter mencakup lebih dari 1 bulan, kartu Pesanan per Pelanggan dan Profit per Pelanggan menyajikan catatan disclaimer bahwa denominator pelanggan unik tidak dapat dijumlahkan lintas bulan.
2. **Panel Tabel Profil Komparatif Segmen Pelanggan**:
   - Tabel komprehensif 4 segmen:
     - `Consumer`: $75.636$ order, $13.585$ pelanggan, Net Sales $\$86,04\text{M}$, Profit $\$33,56\text{M}$, Margin Keseluruhan $39,00\%$, Profit/Pelanggan **$\$2.470,14$**, Order/Pelanggan $5,57$, Diskon Rerata $13,70\%$.
     - `Premium`: $34.746$ order, $6.275$ pelanggan, Net Sales $\$39,45\text{M}$, Profit $\$13,95\text{M}$, Margin Keseluruhan $35,37\%$, Profit/Pelanggan **$\$2.223,38$**, Order/Pelanggan $5,54$, Diskon Rerata $17,70\%$.
     - `Business`: $13.777$ order, $2.515$ pelanggan, Net Sales $\$15,72\text{M}$, Profit $\$6,09\text{M}$, Margin Keseluruhan $38,73\%$, Profit/Pelanggan **$\$2.420,96$**, Order/Pelanggan $5,48$, Diskon Rerata $13,80\%$.
     - `VIP`: $13.957$ order, $2.536$ pelanggan, Net Sales $\$15,93\text{M}$, Profit $\$5,63\text{M}$, Margin Keseluruhan $35,37\%$, Profit/Pelanggan **$\$2.221,99$**, Order/Pelanggan $5,50$, Diskon Rerata $17,78\%$.
   - Temuan Analisis: Profit per pelanggan tertinggi justru berasal dari segmen **Consumer ($\$2.470,14$)**, sedangkan VIP dan Premium memiliki laba per pelanggan lebih rendah karena diskon yang diberikan lebih tinggi ($17,70\%-17,78\%$).
3. **Panel Komparasi Margin Keseluruhan vs Rata-rata Transaksi Segmen**:
   - Grouped bar chart membandingkan Margin Keseluruhan (primer) dengan Rata-rata Transaksi (sekunder).
   - Menjelaskan selisih sekitar $3,2-3,6\text{ pp}$ antar kedua basis perhitungan.
4. **Panel Perbandingan Tingkat Diskon Segmen (Baris vs Terbobot)**:
   - Visualisasi berdampingan antara rata-rata diskon per baris dan diskon terbobot nilai penjualan (misal VIP: $17,78\%$ rerata baris vs $20,20\%$ terbobot).
5. **Panel Catatan Batasan Data Pelanggan**:
   - Kotak informasi transparan yang menjelaskan metrik-metrik yang sengaja **tidak ditampilkan**:
     - *Customer Lifetime Value (CLV)*: Tidak tervalidasi karena nilai di dataset melampaui laba riil pada 100% pelanggan (rasio 3,25x).
     - *Perbandingan First-Time vs Repeat*: Dibatalkan karena sampel first-time hanya 334 baris ($0,24\%$).
     - *ROMI/CAC*: Tidak ada data biaya kampanye pemasaran per saluran.

#### E. Filter & Interaksi

- Tabel segmen mendukung pengurutan kolom (*sorting*) berdasarkan nama segmen, volume order, total net sales, dan profit per pelanggan.

#### F. Kriteria Penerimaan (Acceptance Criteria)

- [ ] Denominator pelanggan aktif yang digunakan adalah $24.911$ (bukan $25.000$ dari master tabel).
- [ ] Terdapat catatan kaki yang menjelaskan bahwa rating pelanggan ($3,677$) hanya dihitung dari pesanan terkirim ($24.557$ pesanan tidak terkirim bernilai null).
- [ ] Panel batasan data mencantumkan alasan ilmiah mengapa CLV sintetis tidak disajikan sebagai KPI bisnis.

---

### 5.4 Halaman 4: Eksplorasi Transaksi (Transaction Explorer)

#### A. Pertanyaan Bisnis

1. Di mana letak konsentrasi transaksi "anomali" yang menghasilkan revenue besar namun memiliki margin profit yang sangat rendah?
2. Berapa estimasi potensi perbaikan laba (*opportunity gap*) jika transaksi anomali tersebut dikembalikan ke batas profitabilitas standar?
3. Apakah permasalahan margin rendah terkonsentrasi pada channel penjualan tertentu, wilayah (*region*), atau saluran pemasaran (*marketing channel*)?
4. Bagaimana performa pemenuhan logistik (*delivery status*) dan berapa proporsi pesanan yang gagal terkirim ke tangan pembeli?

#### B. Target Audiens

Chief Operating Officer (COO), Logistics & Fulfillment Directors, Operations Analytics Leads, yang bertanggung jawab atas mitigasi kebocoran margin dan keandalan pemenuhan pesanan.

#### C. KPI yang Diperlukan

| Nama KPI                   | Label Tampilan                 | Definisi & Rumus                                                       | Nilai Acuan (Seluruh Data)                    |
| -------------------------- | ------------------------------ | ---------------------------------------------------------------------- | --------------------------------------------- |
| High-Rev Low-Margin Orders | Jumlah Pesanan Anomali         | $\text{net\_sales} \ge \$1.552,32$ DAN $\text{margin} \le 34,12\%$ | **$12.855$ pesanan** ($9,31\%$)     |
| Anomaly Net Sales          | Pendapatan Transaksi Anomali   | $\sum \text{net\_sales}$ pada pesanan anomali                        | **$\$34.665.272,99$**                 |
| Anomaly Profit             | Laba Transaksi Anomali         | $\sum \text{profit}$ pada pesanan anomali                            | **$\$7.528.760,49$**                  |
| Anomaly Aggregate Margin   | Margin Keseluruhan Anomali     | $(\sum \text{profit} / \sum \text{net\_sales}) \times 100$           | **$21,72\%$** (vs $37,69\%$ normal) |
| Counterfactual Gap (Agg.)  | Potensi Pemulihan Laba         | Revenue Anomali $\times (37,69\% - 21,72\%)$                         | **$\$5.537.690,05$** (simulasi)       |
| Undelivered Order Share    | Tingkat Pesanan Tidak Terkirim | Pesanan dengan `delivery_status == 'Cancelled'`                      | **$17,78\%$** ($24.557$ pesanan)    |
| Order Cancellation Rate    | Tingkat Pembatalan Pesanan     | Pesanan dengan `order_status == 'Cancelled'`                         | **$6,08\%$** ($8.398$ pesanan)      |
| Order Return Rate          | Tingkat Retur Pesanan          | Pesanan dengan `order_status == 'Returned'`                          | **$6,85\%$** ($9.462$ pesanan)      |

#### D. Komponen Visual & Penataan Layout

1. **Baris Kartu KPI Anomali & Efisiensi Operasional**:
   - Menampilkan Pesanan Anomali ($12.855$), Total Revenue Anomali ($\$34,67\text{M}$), Margin Anomali ($21,72\%$), Opportunity Gap ($\$5,54\text{M}$), Tingkat Retur ($6,85\%$), dan Pesanan Tidak Terkirim ($17,78\%$).
2. **Panel Aturan Anomali & Potensi Laba**:
   - Kartu aturan: pesanan dianggap anomali jika net sales minimal $\$1.552,32$ dan margin tidak lebih dari $34,12\%$. Batas ditetapkan sekali dari seluruh data dan tidak berubah saat filter diganti. Detail kuartil dan operator inklusif ada di `METRIC_DICTIONARY.md`.
   - Dua kartu simulasi potensi:
     - Basis Margin Keseluruhan: **$\$5.537.690,05$** (angka acuan).
     - Basis Margin Rata-rata Transaksi: **$\$6.738.175,54$** (pembanding).
   - Setiap kartu punya ikon penjelasan yang menjawab apa, kenapa, dan bagaimana dalam bahasa bisnis.
   - Asumsi simulasi tanpa ikon: margin anomali dapat naik ke margin portofolio tanpa mengurangi omzet; perubahan permintaan, biaya, dan operasional tidak dihitung; hasilnya ilustratif, bukan prakiraan atau target; basis margin keseluruhan adalah acuan, basis rata-rata transaksi hanya pembanding.
3. **Panel Breakdown Anomali Lintas Dimensi (Channel, Region, Marketing)**:
   - Sakelar 3 dimensi (*dimension toggle*):
     - `Sales Channel`: Mobile App ($9,15\%$), Website ($9,23\%$), Social Media ($9,22\%$), Marketplace ($9,67\%$).
     - `Region`: South ($8,99\%$), Central ($9,25\%$), North ($9,36\%$), West ($9,47\%$), East ($9,48\%$).
     - `Marketing Channel`: 10 channel berkisar antara $8,92\%$ (Direct) hingga $9,88\%$ (Email Marketing).
   - Wawasan Utama: Angka anomali tersebar sangat merata dalam rentang sempit $9\%-10\%$ di semua saluran dan wilayah, membuktikan bahwa inefisiensi margin bukan disebabkan oleh satu channel atau regional tertentu, melainkan kebijakan diskon katalog yang berlaku umum.
4. **Panel Rincian Status Pengiriman (Fulfillment Mix)**:
   - Bar chart komposisi pengiriman: `On Time` ($62,93\%$), `Cancelled / Tidak Dikirim` ($17,78\%$), `Delayed` ($12,23\%$), `Early` ($7,06\%$).
   - Penjelasan terminologi: `Cancelled` pada status pengiriman mencakup seluruh pesanan yang tidak pernah dikirimkan (gabungan dari status pesanan Cancelled, Pending, dan Returned).
5. **Panel Analisis Status Pesanan & Margin Realisasi**:
   - Tabel perbandingan status pesanan, memperlihatkan bahwa order `Returned` dan `Cancelled` membawa margin di atas $48\%$ karena ketiadaan pencatatan pembalikan dana (refund) pada tabel fakta.

#### E. Filter & Interaksi

- Sakelar dimensi anomali: Memilih antara tabel Sales Channel, Region, atau Marketing Channel.
- Sakelar unit: Menampilkan volume absolut transaksi anomali atau persentase rasio anomali.

#### F. Kriteria Penerimaan (Acceptance Criteria)

- [ ] Ambang anomali yang digunakan adalah batas global ($1.552,32$ USD dan $34,12\%$) dan tidak dihitung ulang secara dinamis per subset agar rekonsiliasi data tetap valid.
- [ ] Angka Opportunity Gap secara tegas berlabel "Simulasi potensi" dengan asumsi perhitungan yang tercantum jelas.
- [ ] Label untuk `delivery_status == 'Cancelled'` ditampilkan sebagai "Tidak Dikirim" guna membedakannya dari status pesanan dibatalkan (`order_status == 'Cancelled'`).

---

## 6. Fitur yang Secara Eksplisit di Luar Cakupan (Out-of-Scope)

Untuk menjaga ketepatan waktu pengerjaan MVP, integritas data, dan fokus portofolio analis, hal-hal berikut **secara eksplisit dilarang dan berada di luar cakupan**:

1. **Sistem Autentikasi & Backend Dinamis**: Tidak ada login, register, password reset, database SQL server-side, atau autentikasi OAuth. Data disajikan secara statis melalui 9 berkas JSON teroptimasi di `public/data/`.
2. **Tampilan Transaksi Tingkat Satuan (Row-by-Row Transaction Lookup)**: Tidak ada fitur pencarian order ID satuan (misal `ORD-000123`), tabel transaksi mentah 138k baris, atau paginasi baris transaksi, karena dasbor berfokus pada agregasi analitis.
3. **Metrik Finansial Tingkat Produk (SKU Level)**: Tidak ada tabel pendapatan per produk, kategori produk, atau brand produk, karena tabel `order_items.csv` belum terekonsiliasi (D5).
4. **Komponen Pengguna Fiktif & Notifikasi Palsu**: Tidak ada foto profil pengguna fiktif, dropdown notifikasi palsu, lonceng aktivitas, atau log audit yang dibuat-buat.
5. **Metrik Pemasaran Tanpa Biaya (ROMI, ROI, CAC)**: Tidak menampilkan laba atas belanja iklan (*Return on Marketing Investment*) karena tidak adanya data biaya belanja iklan per saluran pemasaran.
6. **Customer Lifetime Value (CLV)**: Dilarang menyajikan kolom `customer_lifetime_value` sebagai realisasi laba masa depan karena tidak terbukti secara matematis.
7. **Perbandingan Retensi First-Time vs Repeat**: Dilarang mempublikasikan perbandingan margin pelanggan baru vs lama karena ukuran sampel pelanggan baru hanya 334 transaksi ($0,24\%$).
8. **Date Picker Tingkat Harian**: Tidak menyediakan pemilih tanggal hari per hari karena data dipersiapkan pada granularitas bulanan (*monthly aggregates*).
9. **Klaim Batas Diskon Optimal**: Dilarang membuat visualisasi atau label otomatis "Diskon Maksimal yang Diizinkan" tanpa model ekonometrika elastisitas harga formal.
10. **Target & Bilah Kemajuan Fiktif (Mock Budget/Targets)**: Tidak ada grafik bilah pencapaian target penjualan tahunan karena dataset tidak memiliki data anggaran perusahaan.

---

## 7. Spesifikasi Teknis & Kinerja

### 7.1 Format & Kontrak Berkas Data (`public/data/*.json`)

Dasbor membaca 9 berkas JSON terstruktur:

1. `dashboard-summary.json`: Ringkasan total KPI, kedua basis margin, pass-through, status mix, dan metrik turunan.
2. `monthly-performance.json`: Performa 60 bulan dan agregasi musiman 12 bulan lintas tahun.
3. `discount-brackets.json`: Metrik 5 bracket kedalaman diskon beserta statistik order rugi.
4. `segment-performance.json`: Performa 4 segmen pelanggan beserta metrik rata-rata per pelanggan aktif.
5. `anomaly-by-dimension.json`: Data anomali dan sebarannya pada sales channel, region, dan marketing channel.
6. `annual-performance.json`: Kinerja 5 tahun historis beserta kalkulasi persentase YoY.
7. `time-dimensions.json`: Dekomposisi kuartalan, hari kerja vs akhir pekan, dan rincian status kirim.
8. `filter-cubes.json`: Kubus gabungan $Period \times Segment \times Sales\,Channel \times Status\,Order$ (`cubes.combined`, mvp-5) sebagai sumber tunggal semua kombinasi filter global, ditambah tiga kubus marginal $Period \times Satu\,Dimensi$ dan empat kubus panel $Period \times Satu\,Dimensi$ (`day_type`, `delivery_status`, `discount_bracket`, `region`).
9. `metadata.json`: Versi dataset, jumlah baris sumber, rentang tanggal, dan tanda tangan definisi `mvp-5`.

### 7.2 Aksesibilitas (a11y) & Responsivitas

- **Keyboard Navigation**: Seluruh elemen interaktif (navigasi sidebar, kontrol filter, palet pencarian) dapat diakses melalui papan tik (`Tab`, `Enter`, `Space`, `Esc`).
- **Focus Rings**: Status fokus terlihat jelas pada mode gelap maupun terang.
- **Warna Kontras**: Rasio kontras teks terhadap latar belakang memenuhi standar WCAG AA ($\ge 4,5:1$).
- **Responsive Breakpoints**:
  - Seluler: $< 768\text{px}$ (tata letak 1 kolom, tabel horizontal scrollable).
  - Tablet: $768\text{px} - 1023\text{px}$ (tata letak 2 kolom, drawer navigation).
  - Desktop: $\ge 1024\text{px}$ (sidebar tetap, grid 2 hingga 4 kolom).

---

## 8. Laporan Asumsi & Rekomendasi yang Memerlukan Konfirmasi

Berikut adalah asumsi-asumsi teknis dan bisnis yang diterapkan dalam PRD ini dan memerlukan perhatian atau konfirmasi lebih lanjut dari pemangku kepentingan:

1. **Konfirmasi Skala Mata Uang Tunggal (USD)**:
   - *Kondisi Data*: Kolom `currency` pada dataset memuat 7 label mata uang berbeda (USD, GBP, EUR, CAD, AUD, INR, AED), namun nilai nominal uang pada seluruh kolom keuangan memiliki skala harga yang identik dengan USD tanpa riwayat kurs konversi.
   - *Asumsi PRD*: Seluruh angka finansial diasumsikan dan disajikan dalam satuan **USD ($)** tanpa konversi valuta asing.
2. **Penggabungan Multi-Dimensi pada Filter Kubus (Selesai pada `mvp-5`)**:
   - *Kondisi Data*: Sejak `mvp-5`, `filter-cubes.json` memuat kubus gabungan $Period \times Segment \times Sales\,Channel \times Status\,Order$ (3.666 baris berisi order) sehingga filter multi-dimensi simultan (misal: Segmen VIP + Marketplace) didukung penuh. Kubus satu-dimensi dipertahankan sebagai marginal dan diverifikasi sama persis dengan kubus gabungan oleh pipeline.
   - *Asumsi PRD*: Kubus panel (`day_type`, `delivery_status`, `discount_bracket`, `region`) tetap hanya boleh digabungkan dengan rentang periode dan disembunyikan saat filter dimensi aktif. Dimensi lain (Marketing Channel, metode pembayaran/kirim, gudang, negara) tetap memerlukan kubus tambahan sebelum dapat difilter.
3. **Penyajian Simulasi Opportunity Gap**:
   - *Kondisi Data*: Terdapat dua opsi basis gap profit anomali: basis agregat ($\$5,54\text{M}$) dan basis transaksi ($\$6,74\text{M}$).
   - *Asumsi PRD*: Nilai **basis agregat ($\$5.537.690,05$)** direkomendasikan sebagai angka utama karena paling konsisten dengan keputusan D1, dengan angka basis transaksi dicantumkan sebagai catatan pembanding teknis.
4. **Catatan Versi Dokumen**: PRD ini mencerminkan kondisi implementasi terakhir (`mvp-6`) dan tidak lagi memuat halaman referensi metodologi; rincian rekonsiliasi Basis C (D7) tersedia di `docs/METRIC_DICTIONARY.md` dan `docs/EDA_VALIDATION.md`.
