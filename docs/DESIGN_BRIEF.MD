# Dokumen Panduan Desain (Design Brief)
## Dasbor Analisis Penjualan E-Commerce (E-Commerce Sales Analytics Dashboard)

- **Status**: Disetujui sebagai Panduan Desain UI/UX (Menyelaraskan Penuh dengan Referensi Desain Folder `design/`)
- **Peran Produk**: Dasbor Analitik SaaS Portofolio Profesional Analis Data
- **Target Pengguna**: Pemimpin Bisnis E-Commerce, Manajer Penjualan, Rekruter Profesional (*Hiring Managers*), serta **Masyarakat Umum / Orang Awam** (pengguna non-teknis dan pemilik toko rintisan yang membutuhkan visualisasi jelas dan mudah dipahami)
- **Target Tampilan**: Desktop (Sidebar Tetap & Kolapsibel), Tablet, dan Seluler Responsif
- **Dukungan Tema**: Mode Terang (*Warm Alabaster & Japanese Indigo*) dan Mode Gelap (*Nocturne Synthwave Luxury*) Terpadu
- **Acuan Arsitektur & Metrik**: Menyelaraskan penuh dengan [`AGENTS.MD`](file:///c:/Users/TUF/OneDrive/Semester%205/Proyek/Penjualan_E-Commerce/AGENTS.MD), [`docs/PRD.md`](file:///c:/Users/TUF/OneDrive/Semester%205/Proyek/Penjualan_E-Commerce/docs/PRD.md), dan aset referensi antarmuka di `design/`

---

## 1. Prinsip-Prinsip Desain (Design Principles)

1. **Prioritas pada Data (*Data-First & High Data-Ink Ratio*)**:
   - Fungsi utama antarmuka adalah menyajikan angka finansial dan wawasan bisnis secara jelas dan tanpa distorsi.
   - Elemen non-data (garis kisi, batas wadah, bayangan) dibuat sangat halus agar mata audiens tertuju langsung pada angka metrik dan kurva grafik.
2. **Kemudahan Pemahaman bagi Pengguna Awam (*Layperson Accessibility*)**:
   - Struktur kartu dan penyajian grafik dibuat ramah bagi pengguna awam tanpa mengorbankan ketajaman standar korporat.
   - Label metrik, kartu ringkasan, dan tooltip menyertakan penjelasan yang jernih, padat, dan bebas dari singkatan yang membingungkan.
3. **Konsistensi Struktural Lintas Tema**:
   - Struktur komponen DOM, hierarki tata letak, ukuran padding, margin, dan radius sudut wajib **100% identik** antara tema terang dan tema gelap.
   - Transisi tema hanya memodifikasi token variabel warna CSS (`var(--...)`) tanpa mengubah posisi elemen atau dimensi kartu.
4. **Karakter Visual Kuat dari Referensi Folder `design/`**:
   - **Mode Terang (*Warm Alabaster & Japanese Indigo*)**: Membawa nuansa editorial prestisius dengan latar kertas alabaster hangat (`#FBF9F5`), aksen biru indigo Jepang yang berwibawa (`#0037B0`), aksen terra cotta hangat (`#AC3400`), dan garis pembatas halus (`#E8E2D8`).
   - **Mode Gelap (*Nocturne Synthwave Luxury*)**: Membawa atmosfer malam bernuansa synthwave mewah dengan latar obsidian ungu pekat (`#151120`), permukaan plum (`#1C1033`), aksen neon pink bercahaya (`#FF1CC0` / `#FF3AC2`), violet listrik (`#B131FA`), serta efek pencahayaan pendaran (*ambient glow*) halus.
5. **Hirarki Tipografi Disiplin & Perataan Numerik**:
   - Penggunaan tipe huruf modern berdaya baca tinggi: **Space Grotesk** / **Plus Jakarta Sans** (Display/Heading), **Geist** / **Plus Jakarta Sans** (Body), serta **JetBrains Mono** dengan pemanfaatan wajib fitur `tabular-nums` untuk perataan angka finansial dan persentase.
6. **Minim Gangguan Visual (*Low Visual Noise*)**:
   - Tidak menggunakan ornamen visual fiktif seperti foto profil pengguna acak, lonceng notifikasi palsu, atau kartu promosi yang mengalihkan perhatian dari analisis bisnis.

---

## 2. Tata Letak Halaman dan Kisi (Page Layout & Grid System)

### 2.1 Arsitektur Cangkang Aplikasi (*App Shell*)
Tata letak dasar aplikasi dibangun dengan model cangkang dua area utama:
```
+------------------------------------------------------------------------------------------------------+
|  BILAH SISI (SIDEBAR)  |  TAJUK ATAS (TOP HEADER) - Sticky h-14 backdrop-blur                        |
|  - Lebar 264px         +-----------------------------------------------------------------------------+
|    (kolapsibel ke      |  BILAH FILTER GLOBAL (Filter Summary Bar & Selector Dropdowns)              |
|     76px di desktop)   +-----------------------------------------------------------------------------+
|  - Alabaster/Obsidian  |  BARIS KARTU KPI (Grid 1 -> 2 -> 3 -> 6 Kolom)                              |
|  - Menu 4 Analitik     +-----------------------------------------------------------------------------+
|  - 1 Referensi         |  GRID PANEL MODUL & GRAFIK (Grid 12-Kolom: 12-span / 8:4-span / 6:6-span)   |
|  - Drawer di seluler   +-----------------------------------------------------------------------------+
|                        |  CATATAN KAKI DATASET (Footer Provenance & Validasi Metrik)                 |
+------------------------------------------------------------------------------------------------------+
```

### 2.2 Sistem Kisi Responsif (*Responsive Content Grid*)
Konten halaman dikelompokkan ke dalam grid fleksibel:
1. **Kisi Kartu KPI**:
   - Seluler ($< 768\text{px}$): 1 kolom (`grid-cols-1`).
   - Tablet ($768\text{px} - 1023\text{px}$): 2 kolom (`grid-cols-2`).
   - Desktop Standar ($1024\text{px} - 1279\text{px}$): 3 atau 4 kolom (`grid-cols-3` atau `grid-cols-4`).
   - Layar Lebar ($\ge 1280\text{px}$): Hingga 6 kolom (`grid-cols-6`) untuk menampilkan seluruh indikator ringkas dalam satu baris pandang tanpa *vertical scrolling*.
2. **Kisi Panel Modul & Grafik (12-Column Grid)**:
   - Panel Penuh: `col-span-12` (digunakan untuk tren penjualan 60 bulan dan tabel data utama).
   - Panel Imbang: `col-span-12 lg:col-span-6` (digunakan untuk perbandingan bracket diskon dan analisis tahunan).
   - Panel Asimetris: `col-span-12 lg:col-span-8` berdampingan dengan `col-span-12 lg:col-span-4` (digunakan untuk kurva volume versus komposisi donat profitabilitas).

---

## 3. Dimensi Bilah Sisi dan Tajuk (Sidebar & Header Dimensions)

### 3.1 Bilah Sisi Kiri (Sidebar Navigation)
| Properti | Mode Terbuka (*Expanded*) | Mode Dilipat (*Collapsed*) | Mode Seluler (*Mobile Drawer*) |
|---|---|---|---|
| **Lebar Kontainer** | `264px` (`w-[264px]`) | `76px` (`w-[76px]`) | `280px` (`w-[280px]`) meluncur |
| **Tinggi Kontainer** | `100vh` tetap (*sticky/fixed*) | `100vh` tetap (*sticky/fixed*) | `100vh` di atas overlay gelap |
| **Warna Latar** | `var(--sidebar)` (`#FBF9F5` terang / `#100C1B` gelap) | `var(--sidebar)` (`#FBF9F5` terang / `#100C1B` gelap) | `var(--sidebar)` (`#FBF9F5` terang / `#100C1B` gelap) |
| **Garis Batas Kanan** | `1px solid var(--sidebar-border)` | `1px solid var(--sidebar-border)` | Bayangan tebal `shadow-2xl` |
| **Tinggi Header Sidebar** | `68px` (`px-5 py-5`) | `68px` (`justify-center py-5`) | `68px` (`px-5 py-5`) |
| **Ukuran Logo Simbol** | `36px × 36px` (`size-9`) | `36px × 36px` (`size-9`) | `36px × 36px` (`size-9`) |
| **Tinggi Baris Navigasi** | `38px` (`py-2 px-3`) | `38px` (`py-2 justify-center`) | `42px` (`py-2.5 px-4`) |
| **Ukuran Ikon Menu** | `16px × 16px` (`size-4`) | `16px × 16px` (`size-4`) | `18px × 18px` (`size-4.5`) |
| **Status Kolaps** | Tombol pemicu di kaki sidebar | Tombol pemicu di kaki sidebar | Tombol silang (*Close*) di header |

### 3.2 Tajuk Atas (Top Header)
- **Tinggi Tetap**: `56px` (`h-14` / `px-4 py-3 lg:px-6`).
- **Posisi**: `sticky top-0 z-30` dengan efek kaca buram `backdrop-blur-md bg-card/85`.
- **Garis Batas Bawah**: `1px solid var(--border)`.
- **Tata Letak Horizontal**:
  - Sisi Kiri: Tombol pemicu menu hamburger (khusus seluler/tablet), Breadcrumb penanda halaman (`DASHBOARD / {Page Name}`).
  - Sisi Kanan: Chip informasi cakupan data (`2021 s/d 2025`), Chip versi definisi metrik (`mvp-3`), Tombol pintasan pencarian/palet perintah (`Ctrl+K`), dan Sakelar tema (*Dark/Light Mode Toggle*).

---

## 4. Skala Tipografi (Typography Scale)

Seluruh komponen mengadopsi hierarki tipografi sistem desain modern dari folder `design/` yang memadukan ketegasan tajuk, keterbacaan teks isi yang ramah bagi audiens awam, dan presisi numerik:

- **Tampilan & Judul (*Display & Headings*)**: **Space Grotesk** (atau **Plus Jakarta Sans**), memberikan karakter tajuk yang tegas, modern, dan berwibawa.
- **Teks Tubuh (*Body Text*)**: **Geist** (atau **Plus Jakarta Sans**), memberikan kenyamanan pembacaan tinggi untuk analisis, deskripsi, dan catatan kaki.
- **Label & Nilai Numerik (*Numerical & Monospace*)**: **JetBrains Mono** / font angka berfitur `tabular-nums` untuk perataan presisi pada seluruh angka finansial, persentase margin, dan badge status.

| Peran Tipografi | Font Family | Ukuran (CSS / px) | Line Height | Font Weight | Letter Spacing | Peruntukan Khusus |
|---|---|---|---|---|---|---|
| **Display Hero** | Space Grotesk / PJS | `2.25rem - 3.25rem` | `1.15` (44-64px) | `700` (Bold) | `-0.03em` | Angka nilai finansial utama pada kartu KPI (`tabular-nums`) |
| **Heading 1 (Lg)** | Space Grotesk / PJS | `1.5rem - 2.25rem` | `1.2` (32-44px) | `600 - 700` | `-0.02em` | Judul utama halaman di `PageHeader` |
| **Heading 2 (Md)** | Space Grotesk / PJS | `1.125rem - 1.5rem` | `1.3` (24-32px) | `600` (Semibold) | `-0.015em` | Judul kartu grafik dan panel data |
| **Heading 3 (Sm)** | Space Grotesk / PJS | `1.0rem - 1.25rem` | `1.4` (20-28px) | `600` (Semibold) | `-0.01em` | Judul sub-seksi atau tajuk modal dialog |
| **Body Standard (Lg/Md)** | Geist / PJS | `0.875rem - 1.0rem` | `1.5` (20-24px) | `400` (Regular) | `0` | Teks paragraf, sel data tabel, deskripsi wawasan |
| **Body Small (Sm)** | Geist / PJS | `0.75rem - 0.8125rem`| `1.4` (16-20px) | `400` (Regular) | `0.005em` | Deskripsi metrik bantuan untuk pengguna awam |
| **Label Numeric / Caps** | JetBrains Mono / PJS | `0.6875rem - 0.875rem`| `1.3` (14-18px) | `600` (Semibold) | `0.04em - 0.08em` | Label kategori KPI (uppercase), tag basis metrik, pill status |

---

## 5. Skala Jarak (Spacing Scale) & Radius Sudut (Corner Radii)

### 5.1 Skala Jarak Standar (Kelipatan 4px/8px)
- `space-1` (`4px` / `0.25rem`): Jarak mikro antara ikon dan label teks inline.
- `space-2` (`8px` / `0.5rem`): Jarak antar tombol chip, gap item list vertikal yang rapat.
- `space-3` (`12px` / `0.75rem`): Padding vertikal sel tabel, gap horizontal pada bilah kontrol.
- `space-4` (`16px` / `1rem`): Padding internal kartu mobile, gap antar kartu pada layar kecil.
- `space-5` (`20px` / `1.25rem`): Padding internal standar kartu desktop (`p-5`), gap grid modul.
- `space-6` (`24px` / `1.5rem`): Padding horizontal area kerja utama desktop (`px-6 py-6`).
- `space-8` (`32px` / `2rem`): Jarak vertikal pemisah antar kelompok konten besar.

### 5.2 Radius Sudut (Corner Radii)
- Sudut Kartu Modul & Grafik: `12px` / `0.75rem` (`rounded-xl` / `var(--radius)`).
- Sudut Kontrol Input & Tombol: `8px` / `0.5rem` (`rounded-lg`).
- Sudut Kotak Dialog / Command Palette: `14px` / `0.875rem` (`rounded-2xl`).
- Sudut Status Pill & Chip Indikator: `9999px` (`rounded-full`).

---

## 6. Token Warna untuk Tema Terang (Light Mode Tokens - Warm Alabaster & Japanese Indigo)

Tema terang mengadopsi palet **Warm Alabaster & Japanese Indigo** dari referensi `design/Light`: nuansa editorial prestisius, latar kertas gading hangat, biru indigo Jepang, dan aksen terra cotta.

```css
:root {
  /* Skema Dasar */
  color-scheme: light;
  --background: #fbf9f5;           /* Warm Alabaster: Latar area kerja utama */
  --foreground: #0f172a;           /* Deep Indigo Navy: Teks heading dan angka utama */
  --card: #ffffff;                 /* Permukaan kartu modul */
  --card-foreground: #0f172a;
  --popover: #ffffff;              /* Permukaan dropdown & popover */
  --popover-foreground: #0f172a;

  /* Permukaan Berlapis (Surface Containers) */
  --surface-dim: #d1daf0;
  --surface-bright: #fbf9f5;
  --surface-container-lowest: #ffffff;
  --surface-container-low: #f0f3ff;
  --surface-container: #e8eeff;
  --surface-container-high: #dfe8fe;
  --surface-container-highest: #dae2f8;

  /* Garis Batas & Kontrol */
  --border: #e8e2d8;               /* Garis tepi halus netral */
  --border-variant: #ded7ca;
  --input: #c4c5d7;                /* Batas input dan select */
  --ring: #2563eb;                 /* Cincin fokus aksesibilitas */

  /* Aksen Utama & Interaktif */
  --primary: #0037b0;              /* Japanese Indigo: Aksen utama */
  --primary-foreground: #ffffff;
  --primary-hover: #1e3a8a;
  --primary-container: #1d4ed8;    /* Indigo terang kontainer */
  --on-primary-container: #cad3ff;
  --secondary: #ac3400;            /* Warm Terra Cotta: Aksen sekunder */
  --secondary-foreground: #ffffff;
  --secondary-container: #fd6b36;
  --tertiary: #004f38;             /* Forest Jade: Aksen tersier */
  --tertiary-foreground: #ffffff;
  --tertiary-container: #00694c;

  --muted: #f4efe6;                /* Latar skeleton & baris tabel hover */
  --muted-foreground: #434655;     /* Label kategori & teks sekunder */
  --accent: #faf7f2;               /* Latar sorotan */
  --accent-foreground: #0f172a;
  --destructive: #dc2626;          /* Error / Kerugian */
  --destructive-foreground: #ffffff;

  /* Bilah Sisi (Warm Alabaster Sidebar) */
  --sidebar: #fbf9f5;              /* Latar sidebar hangat */
  --sidebar-foreground: #0f172a;   /* Teks menu navigasi */
  --sidebar-primary: #0037b0;
  --sidebar-primary-foreground: #ffffff;
  --sidebar-border: #e8e2d8;       /* Batas sidebar */
  --sidebar-accent: #e8eeff;       /* Latar menu saat di-hover / aktif */
  --sidebar-accent-foreground: #0037b0;
  --sidebar-ring: #2563eb;

  /* Seri Warna Grafik Data */
  --chart-1: #1d4ed8;              /* Royal Indigo: Seri pendapatan/net sales */
  --chart-2: #004f38;              /* Forest Jade: Seri laba/profit */
  --chart-3: #ac3400;              /* Terra Cotta: Margin % / Diskon */
  --chart-4: #ea580c;              /* Burnt Orange: Pelanggan / Volume */
  --chart-5: #747686;              /* Neutral Slate: Anomali / Referensi */

  /* Alias Aksen Merek (dipakai komponen lama) */
  --brand-violet: #0037b0;
  --brand-blue: #1d4ed8;
  --brand-pink: #ac3400;

  /* Indikator Status Semantik */
  --positive: #047857;             /* Completed / Positif */
  --positive-bg: #d1fae5;
  --negative: #dc2626;             /* Returned / Kerugian */
  --negative-bg: #fee2e2;
  --warning: #ac3400;              /* Pending / Anomali */
  --warning-bg: #ffdbd0;

  /* Bayangan Halus */
  --shadow-card: 0 1px 2px rgba(27, 36, 52, 0.03), 0 4px 12px rgba(27, 36, 52, 0.02);
  --shadow-card-hover:
    0 4px 6px -1px rgba(27, 36, 52, 0.04), 0 12px 24px -4px rgba(27, 36, 52, 0.05);
}
```

---

## 7. Token Warna untuk Tema Gelap (Dark Mode Tokens - Nocturne Synthwave Luxury)

Tema gelap mengadopsi palet **Nocturne Synthwave Luxury** dari referensi `design/Dark`: latar obsidian ungu malam, aksen pendaran neon pink cerah, lilac, periwinkle, dan kilau futuristik.

```css
.dark {
  /* Skema Dasar */
  color-scheme: dark;
  --background: #151120;           /* Deep Nocturne Obsidian: Latar utama */
  --foreground: #f8f6fc;           /* Soft Lavender: Teks heading dan angka */
  --card: #1c1033;                 /* Permukaan kartu plum */
  --card-foreground: #f8f6fc;
  --popover: #1c1033;
  --popover-foreground: #f8f6fc;

  /* Permukaan Berlapis (Surface Containers) */
  --surface-dim: #151120;
  --surface-bright: #3c3748;
  --surface-container-lowest: #100c1b;
  --surface-container-low: #170e2b;
  --surface-container: #1c1033;
  --surface-container-high: #24133f;
  --surface-container-highest: #2e1b4e;

  /* Garis Batas & Kontrol */
  --border: rgba(255, 28, 192, 0.18); /* Batas kartu beraksen neon halus */
  --border-variant: #593f4c;
  --input: #8d6f7e;                /* Naik dari #593f4c agar batas kontrol mencapai 4,02:1 */
  --ring: #ff1cc0;                 /* Neon Synthwave Pink cincin fokus */

  /* Aksen Utama & Interaktif */
  --primary: #ff1cc0;              /* Neon Pink: Aksen utama */
  --primary-foreground: #0c0817;
  --primary-hover: #ff5ecb;
  --primary-container: #ff3ac2;    /* Vibrant Neon Pink */
  --on-primary-container: #55003e;
  --secondary: #ac2df2;            /* Violet listrik, digelapkan sedikit agar teks putih AA */
  --secondary-foreground: #ffffff;
  --secondary-container: #9a00e4;
  --tertiary: #bcc2ff;             /* Periwinkle Blue: Aksen tersier */
  --tertiary-foreground: #00179b;
  --tertiary-container: #7686ff;

  --muted: #24133f;
  --muted-foreground: #b4a8d1;     /* Teks label sekunder lembut */
  --accent: #2e1b4e;
  --accent-foreground: #f8f6fc;
  --destructive: #ffb4ab;          /* Soft Neon Red */
  --destructive-foreground: #690005;

  /* Bilah Sisi (Deep Synthwave Obsidian) */
  --sidebar: #100c1b;              /* Obsidian pekat */
  --sidebar-foreground: #e8dff5;
  --sidebar-primary: #ff1cc0;
  --sidebar-primary-foreground: #0c0817;
  --sidebar-border: rgba(255, 28, 192, 0.12);
  --sidebar-accent: #2e1b4e;
  --sidebar-accent-foreground: #f8f6fc;
  --sidebar-ring: #ff1cc0;

  /* Seri Warna Grafik Data (Pendaran Neon Kontras) */
  --chart-1: #ff1cc0;              /* Neon Pink: Seri pendapatan */
  --chart-2: #4d63ff;              /* Electric Blue: Seri laba */
  --chart-3: #b131fa;              /* Electric Violet: Seri margin / diskon */
  --chart-4: #00ffa3;              /* Neon Mint: Seri volume */
  --chart-5: #b4a8d1;              /* Lavender Grey: Anomali / referensi */

  /* Alias Aksen Merek (dipakai komponen lama) */
  --brand-violet: #bb45ff;         /* Digeser dari #b131fa agar teks ikon mencapai 4,62:1 */
  --brand-blue: #bcc2ff;
  --brand-pink: #ff1cc0;

  /* Indikator Status Semantik */
  --positive: #00ffa3;             /* Mint cerah: Completed / Positif */
  --positive-bg: rgba(0, 255, 163, 0.15);
  --negative: #ffb4ab;             /* Neon Coral: Returned / Kerugian */
  --negative-bg: rgba(255, 180, 171, 0.15);
  --warning: #ffb59d;              /* Peach Amber: Pending / Anomali */
  --warning-bg: rgba(255, 181, 157, 0.15);

  /* Bayangan Halus Mode Gelap (Atmospheric Glow) */
  --shadow-card: 0 12px 32px rgba(0, 0, 0, 0.55), inset 0 1px 0 rgba(255, 28, 192, 0.18);
  --shadow-card-hover: 0 16px 36px rgba(0, 0, 0, 0.65), 0 0 20px rgba(255, 28, 192, 0.28);
}
```

---

## 8. Spesifikasi Kartu KPI (KPI Card Specs)

### 8.1 Anatomi & Tata Letak
```
+--------------------------------------------------------------+
|  LABEL METRIK (Mono Uppercase 11px)          [ (Ikon Chip) ] |
|  $157.143.214,06 (Display 30px tabular-nums)                 |
|                                                              |
|  [ Lencana Basis: Margin Keseluruhan ]                           |
|  Penjualan merchandise bersih di luar pajak dan ongkir       |
+--------------------------------------------------------------+
```
- **Wadah Kartu (`Card`)**: Latar `var(--card)`, batas keliling `1px solid var(--border)`, radius `var(--radius)` (12px), padding internal `20px` (`p-5`).
- **Wadah Ikon**: Chip `36px × 36px` (`size-9 rounded-lg`) di pojok kanan atas, memakai tone aksen (`bg-brand-violet/10 text-brand-violet` pada tema terang, pendaran neon di tema gelap).
- **Aksen Atas**: Garis tipis `2px` di tepi atas kartu (`before:`): indigo solid pada tema terang, gradien pink–lilac–periwinkle pada tema gelap.
- **Nilai Metrik**: Huruf Semibold `30px` dengan line height rapat (`leading-none`), warna `var(--foreground)`, wajib class `tabular-nums`.
- **Lencana Basis (*Basis Tag*)**: Komponen penanda eksplisit bahwa angka merupakan "Margin Keseluruhan (Utama)" atau "Rata-rata Transaksi (Sekunder)" untuk memenuhi aturan integritas metrik D1.
- **Efek Hover**: Terangkat sangat halus `-2px` (`hover:-translate-y-0.5`), penguatan batas halus (`hover:border-primary/40`), dan bayangan bertambah (`hover:shadow-[var(--shadow-card-hover)]`) dengan transisi `duration-200 ease-out`.

---

## 9. Spesifikasi Kartu Grafik (Chart Card Specs)

### 9.1 Wadah Panel Grafik (`ChartCard`)
- **Struktur Header Panel**:
  - Judul Panel (`text-base font-semibold text-foreground`).
  - Deskripsi Analitis (`text-xs text-muted-foreground max-w-prose mt-1`).
  - Lencana Cakupan Data (*Scope Badge*):
    - Jika mengikuti filter aktif: Berlatar biru lembut dengan teks `"Mengikuti Filter Aktif"`.
    - Jika merupakan agregasi penuh: Berlatar netral dengan teks `"Seluruh Periode 2021-2025"`.
- **Area Plot Grafik**:
  - Tinggi minimum plot: `280px` (`h-[280px]` pada mobile) hingga `320px` (`h-[320px]` pada desktop).
  - Margin dalam Recharts: `{ top: 12, right: 12, left: -16, bottom: 0 }` untuk memastikan angka label sumbu Y tidak terpotong tepi kartu.
- **Aturan Garis & Sumbu Recharts**:
  - Sumbu X dan Y: `tickLine={false}`, label teks ukuran `11px` dengan `font-family: 'JetBrains Mono Variable'`, warna `var(--muted-foreground)`.
  - Garis Kisi Horisontal (*Cartesian Grid*): `stroke="var(--border)"`, `strokeDasharray="3 3"`, garis vertikal disembunyikan.
  - Kurva Area Penjualan: Garis kurva tebal `2px` (`stroke="var(--chart-1)"`), area bawah terisi gradien linear vertikal dari `var(--chart-1)` opasitas `0.35` di batas atas ke opasitas `0.02` di batas dasar.
  - Sumbu Ganda (*Dual Axis*): Sumbu kiri untuk nominal mata uang ($), sumbu kanan untuk persentase margin (%), warna garis kurva margin membedakan secara kontras (`var(--chart-3)`, garis putus-putus).
- **Catatan Kaki Panel (*Panel Footnote*)**:
  - Terpisah garis batas tipis (`border-t border-border/70 pt-3 mt-4`).
  - Dilengkapi ikon `Info` kecil (`size-3.5 shrink-0 text-muted-foreground`) dan teks edukatif metodologi data berukuran `12px`.

---

## 10. Spesifikasi Tabel (DataTable Specs)

### 10.1 Struktur & Format Tabel
- **Pembungkus Bergulir (*Horizontal Scroll Container*)**: Elemen `table` wajib dibungkus kontainer `overflow-x-auto w-full` dengan lebar minimum tabel `560px` agar tidak merusak tata letak pada ponsel pintar.
- **Header Kolom (`th`)**:
  - Tinggi baris `36px`, padding `px-2 py-2` (rapat agar tabel 9 kolom muat pada desktop).
  - Teks: Huruf kapital mini dengan JetBrains Mono (`font-mono text-[11px] font-semibold tracking-[0.05em] uppercase text-muted-foreground`).
  - Perataan: Kolom label (status, segmen, channel) rata kiri (`text-left`), **seluruh kolom angka finansial rata kanan (`text-right`)**.
  - Garis pemisah bawah: `1px solid var(--border)`.
- **Baris Data (`td`)**:
  - Tinggi baris `42px`–`44px`, padding `px-2 py-2.5`.
  - Teks: Ukuran `14px` (`text-sm`), warna `var(--foreground)`.
  - Perataan: Kolom angka menggunakan kelas `font-mono text-right tabular-nums`.
  - Garis pemisah: `1px solid var(--border)/60`.
  - Status Hover: Baris berubah warna lembut saat disentuh kursor (`hover:bg-muted/50 transition-colors`).

---

## 11. Gaya Komponen Form & Interaktif

### 11.1 Tombol (Button Styles)
- **Tombol Utama (Primary CTA)**:
  - Latar `var(--primary)` dengan hover `var(--primary-hover)`; tema gelap menambahkan pendaran neon halus.
  - Teks `var(--primary-foreground)` (`font-medium text-sm`).
  - Padding: `px-2.5`, tinggi `h-9`, radius `rounded-md` (10px).
  - Bayangan: `shadow-sm`, ditambah glow pink lembut pada tema gelap.
- **Tombol Sekunder / Outline**:
  - Latar `bg-card`, batas `1px solid var(--border)`, teks `text-foreground text-sm font-medium`.
  - Efek hover: `hover:bg-muted hover:text-foreground`.
- **Tombol Ikon Mini**:
  - Ukuran `32px × 32px` (`size-8`), batas halus `border border-border`, radius `rounded-md`.
  - Kursor: Wajib menyertakan properti `cursor: pointer` pada seluruh tombol yang tidak berstatus disabled.

### 11.2 Kontrol Pemilih (Select & Filter Dropdown)
- **Tombol Pemicu (*Trigger*)**:
  - Tinggi `36px` (`h-9`), padding horizontal `px-3`, batas `1px solid var(--input)`, latar `bg-card`, teks `text-xs font-medium text-foreground`, radius `rounded-lg`.
  - Ikon panah bawah `ChevronDown` (`size-3.5 text-muted-foreground`).
- **Kotak Menu (*Dropdown Content*)**:
  - Latar `bg-popover`, batas `1px solid var(--border)`, bayangan mengambang `shadow-lg`, radius `rounded-lg`, padding `p-1`.
  - Item Opsi: Padding `px-2.5 py-1.5`, teks `text-xs text-popover-foreground`, radius `rounded-md`, efek sorot `hover:bg-accent hover:text-accent-foreground cursor-pointer`.

### 11.3 Tooltip Grafik & UI
- Tooltip UI umum: latar `bg-foreground text-background`, batas halus `border border-border/50`, padding `px-2.5 py-1.5`, teks `text-xs font-medium`, radius `rounded-md`, bayangan `shadow-md`, z-index `z-50`.
- Tooltip grafik Recharts: latar `bg-popover`, batas `border-border`, bayangan `var(--shadow-card-hover)`, angka `font-mono tabular-nums`; tema gelap memakai kaca buram (`backdrop-blur-xl`). Nilai yang tidak tersedia ditulis "Tidak tersedia".

---

## 12. Titik Henti Responsif & Perilaku Layout (Breakpoints)

| Breakpoint | Rentang Lebar | Tata Letak Sidebar | Tata Letak KPI | Tata Letak Panel Modul |
|---|---|---|---|---|
| **Seluler (`base`)** | `< 640px` | Tersembunyi (Drawer hamburger) | 1 Kolom penuh | 1 Kolom penuh, tabel scroll horizontal |
| **Ponsel Besar (`sm`)** | `640px - 767px` | Tersembunyi (Drawer hamburger) | 2 Kolom | 1 Kolom penuh |
| **Tablet (`md`)** | `768px - 1023px` | Tersembunyi (Drawer hamburger) | 2 Kolom | Grid 2 Kolom imbang |
| **Desktop (`lg`)** | `1024px - 1279px` | Tetap (*Persistent* `264px`) | 3 Kolom | Grid 12-kolom (8:4 atau 6:6) |
| **Layar Lebar (`xl`)** | `1280px - 1535px` | Kolapsibel (`264px` $\leftrightarrow$ `76px`) | 4 Kolom | Grid 12-kolom leluasa |
| **Ultra Lebar (`2xl`)** | $\ge 1536\text{px}$ | Kolapsibel (`264px` $\leftrightarrow$ `76px`) | 6 Kolom | Grid 12-kolom lebar maksimal seimbang |

---

## 13. Status Komponen: Kosong, Pemuatan, dan Galat

### 13.1 Status Pemuatan (*Loading / Skeleton State*)
- Menggunakan komponen `PanelSkeleton`:
  - Meniru bentuk geometris kartu nyata (tinggi kotak `h-[220px]`, placeholder judul `h-5 w-40`, baris teks `h-4`).
  - Animasi pulsa redup (`animate-pulse bg-muted rounded-md`).
  - Mencegah pergeseran tata letak kumulatif (*zero Cumulative Layout Shift*).

### 13.2 Status Kosong (*Empty State*)
- Digunakan saat kombinasi filter tidak menghasilkan baris transaksi pada kubus data.
- Komponen `EmptyState`:
  - Batas putus-putus netral (`border border-dashed border-border rounded-xl p-8 text-center`).
  - Ikon `TriangleAlert` (`size-5 text-muted-foreground mx-auto mb-2`).
  - Pesan judul: "Tidak Ada Data Ditemukan".
  - Pesan bantuan: "Kombinasi filter aktif tidak menghasilkan transaksi pada periode ini. Silakan atur ulang filter Anda."

### 13.3 Status Galat (*Error State*)
- Digunakan jika berkas JSON data gagal dimuat melalui HTTP fetch.
- Komponen `ErrorState`:
  - Batas merah semantik (`border border-destructive/30 bg-destructive/5 rounded-xl p-6`).
  - Ikon `CircleAlert` (`size-5 text-destructive`).
  - Judul galat tegas dan daftar detail kendala teknis (`list-disc text-xs text-muted-foreground`).

---

## 14. Persyaratan Aksesibilitas (Accessibility & a11y)

1. **Standar Kontras Warna (WCAG 2.1 Level AA)**:
   - Seluruh teks `foreground` dan angka finansial wajib memiliki rasio kontras minimal **$4,5:1$** terhadap warna permukaan kartu, baik pada tema terang maupun gelap.
   - Elemen interaktif non-teks (batas tombol, kurva garis grafik) memiliki rasio kontras minimal **$3:1$**.
2. **Navigasi Papan Tik (Keyboard Focusability)**:
   - Seluruh tautan menu sidebar, tombol filter, dan kontrol select dapat diakses penuh melalui tombol `Tab`.
   - Cincin fokus wajib terlihat jelas saat elemen aktif melalui papan tik: `focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none`.
   - Pintasan keyboard `Ctrl+K` atau `Cmd+K` membuka palet perintah navigasi; tombol `Escape` menutup laci seluler atau dialog popover.
3. **Dukungan Pembaca Layar (*Screen Readers*)**:
   - Ikon murni dekoratif ditandai dengan `aria-hidden="true"`.
   - Tombol ikon menyertakan teks tersembunyi `sr-only` (misalnya: "Buka navigasi menu" pada hamburger button).
   - Indikator menu rute aktif dilengkapi atribut `aria-current="page"`.
   - Kolom tabel numerik menyertakan konteks `scope="col"`.
4. **Preferensi Pengurangan Gerak (*Reduced Motion*)**:
   - Sistem mendeteksi kueri media `(prefers-reduced-motion: reduce)`:
     ```css
     @media (prefers-reduced-motion: reduce) {
       *, *::before, *::after {
         animation-duration: 0.01ms !important;
         transition-duration: 0.01ms !important;
         scroll-behavior: auto !important;
       }
     }
     ```

---

## 15. Status Implementasi Fondasi Desain & Tema Ganda (mvp-4)

### 15.1 Mekanisme tema

| Aspek | Implementasi |
|---|---|
| Sumber token | `src/index.css`: blok `:root` (terang) dan `.dark` (gelap), dipetakan ke utilitas Tailwind lewat `@theme inline` |
| Sakelar tema | Kelas `.dark` pada `<html>` + `data-theme` + `style.colorScheme`; hanya warna yang berubah, dimensi tetap |
| Preferensi | `localStorage["dashboard.theme"]` bernilai `light` \| `dark` \| `system` (bawaan `system`) |
| Ikut sistem | Mode `system` memantau `matchMedia('(prefers-color-scheme: dark)')` lewat `src/app/ThemeProvider.tsx` |
| Tanpa kilasan tema | Skrip inline di `<head>` `index.html` menetapkan kelas sebelum paint pertama; logikanya sejalan dengan `src/lib/theme.ts` |
| Kontrol | Tombol ikon di `TopHeader` (`ThemeToggle`): Terang → Gelap → Sistem, dengan `aria-label` yang menyebut mode aktif dan mode berikutnya |

### 15.2 Dimensi dan skala yang dipakai bersama

| Bagian | Nilai |
|---|---|
| Skala tipe | `text-display` 30/33 -0,025em 600 · `text-h1` 24 · `text-h2` 18 · `text-h3` 15 · `text-body` 14 · `text-caption` 12 +0,02em · `text-micro` 11 |
| Jarak | Kelipatan 4px bawaan Tailwind (`--spacing: 0.25rem`); padding kartu `p-5`, gutter halaman `px-4 lg:px-6` |
| Radius | `--radius` 12px (kartu) · `--radius-md` 10px (tombol/input/select) · `--radius-xl` 16px (dialog) · `rounded-full` untuk pill |
| Kontrol | Tombol `h-8/h-9` (`size-8` ikon) · select & input `h-9` · cincin fokus `ring-2 ring-ring` (bukan lagi `ring/50`) |

### 15.3 Kontras terukur (WCAG 2.1)

Diukur dengan rumus luminansi relatif; angka ini juga dijaga otomatis oleh
`tests/design_tokens.test.ts`.

| Pasangan | Terang | Gelap |
|---|---|---|
| `foreground` di atas `card` | 17,85:1 | 16,72:1 |
| `muted-foreground` di atas `card` / `background` / `muted` | 9,35 / 8,89 / 8,16 | 8,08 / 8,35 / 7,63 |
| Teks tombol utama (`primary-foreground` di atas `primary` dan `primary-hover`) | 9,66 / 10,36 | 5,81 / 7,26 |
| `secondary-foreground` di atas `secondary` | 6,47:1 | 4,76:1 |
| `sidebar-foreground` di atas `sidebar` | 16,98:1 | 14,95:1 |
| `ring` di atas `card` (non-teks, ambang 3:1) | 5,17 | 5,28 |
| `chart-1..5` di atas `card` (non-teks) | 3,56–9,65 | 3,88–13,52 |
| `input` di atas `card` (non-teks) | **1,71:1** (lihat 15.4) | 4,02:1 |

### 15.4 Deviasi dan batasan yang belum tertutup

1. **Batas kontrol tema terang `--input: #c4c5d7` hanya 1,71:1** terhadap kartu putih (WCAG 1.4.11
   meminta 3:1). Dipertahankan agar tampilan terang tetap tenang; identifikasi kontrol dibantu
   label yang selalu terlihat dan cincin fokus 6,45:1. Nilai ini dijaga tes agar tidak makin buruk.
2. **Batas kontrol tema gelap dinaikkan dari `#593f4c` ke `--input: #8d6f7e`** agar mencapai
   4,02:1 terhadap kartu `#1c1033`, memenuhi ambang non-teks WCAG 1.4.11.
3. **`--chart-4` tema terang memakai `#ea580c`, bukan `#fd6b36` dari referensi**, agar tetap
   mencapai 3,56:1 terhadap kartu putih (ambang non-teks 3:1). `--chart-2` tema gelap memakai
   `#4d63ff` (3,88:1), bukan `#1c3aff` yang gagal ambang 3:1.
4. **`--secondary` tema gelap digeser dari `#b131fa` ke `#ac2df2`** agar teks putih tombol
   mencapai 4,76:1 (AA).
5. **Zoom 200%, urutan Tab nyata, dan pembaca layar belum diuji.**
6. **Kilasan tema diverifikasi secara struktural** (skrip inline di `<head>` sebelum bundel +
   tes tetap), bukan dengan perekaman first paint.
7. **Tangkapan layar headless** kadang membekukan animasi masuk (Recharts dan fade dropdown);
   keadaan akhir diverifikasi lewat *computed style* (opacity dropdown = 1, jalur grafik lengkap),
   bukan lewat tangkapan.
8. Kontras diukur untuk pasangan token pada tabel 15.3, bukan untuk setiap kombinasi piksel.
   Batas gelap `--border` dan `--sidebar-border` memakai rgba rose transparan sehingga tidak
   diukur langsung oleh pengurai hex pada tes.
