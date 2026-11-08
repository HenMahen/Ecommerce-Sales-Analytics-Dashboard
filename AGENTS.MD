# Instruksi Agen AI

## Proyek

Membangun dasbor analitik penjualan *e-commerce* yang bersih, elegan, dan responsif untuk portofolio analis data.

## Tujuan Utama

- Metrik bisnis yang akurat
- Desain yang konsisten di seluruh halaman
- Mode gelap (*dark mode*) dan mode terang (*light mode*)
- Interaksi yang sederhana dan intuitif
- Tata letak yang responsif
- Kode TypeScript yang mudah dipelihara
- Dokumentasi dan pengujian yang jelas

## Teknologi

- React
- TypeScript
- Vite
- Tailwind CSS
- shadcn/ui
- Recharts
- Lucide React
- Python dan Pandas untuk persiapan data
- Vitest dan React Testing Library

## Aturan Pengembangan

1. Baca `docs/PRD.md` sebelum mengimplementasikan fitur.
2. Baca `docs/DESIGN_BRIEF.md` sebelum membuat komponen UI.
3. Ikuti `docs/METRIC_DICTIONARY.md` untuk semua metrik bisnis.
4. Ikuti `docs/DATA_CONTRACT.md` saat membaca data yang telah diproses.
5. Tinjau `docs/EDA_VALIDATION.md` sebelum menggunakan kumpulan data apa pun.
6. Jangan mengarang data, KPI, wawasan, atau persentase pertumbuhan.
7. Jangan melakukan *hardcoding* metrik bisnis ke dalam komponen UI.
8. Lakukan perhitungan bisnis di dalam *pipeline* persiapan data menggunakan Python.
9. Gunakan tipe TypeScript untuk struktur data API dan JSON.
10. Gunakan kembali komponen yang sudah ada jika memungkinkan.
11. Pastikan tema gelap dan terang tetap konsisten secara visual.
12. Jangan menambahkan dependensi yang tidak diperlukan.
13. Jangan membangun ulang komponen yang tidak terkait tanpa alasan yang jelas.
14. Jangan mengubah definisi metrik secara diam-diam.
15. Jangan pernah menyatakan pengujian telah lulus kecuali jika pengujian tersebut benar-benar telah dijalankan.

## Aturan Data

- File CSV sumber harus tetap tidak berubah.
- Validasi data yang telah diproses terhadap tolok ukur yang telah didokumentasikan.
- Tampilkan metrik yang tidak tersedia sebagai "tidak tersedia", jangan mengarang nilainya.
- Jangan menyajikan metrik keuangan tingkat produk yang belum direkonsiliasi sebagai angka final.
- Jangan menyajikan CLV atau ROMI yang belum divalidasi sebagai KPI bisnis yang terverifikasi.

## Aturan UI

- Gunakan bilah sisi (*sidebar*) kiri yang tetap (*persistent*) pada perangkat desktop.
- Gunakan pola navigasi yang responsif pada perangkat seluler.
- Pastikan kartu KPI tampil ringkas dan konsisten. - Gunakan warna yang tidak mencolok dan dekorasi minimal.
- Dukung navigasi papan tik (keyboard) dan status fokus yang terlihat jelas.
- Sertakan status pemuatan (loading), kosong (empty), dan galat (error).
- Pastikan semua grafik tetap dapat dibaca dalam kedua tema.
- Tidak usah memakai penjelasan yang panjang pada setiap KPI card atau chart, cukup jelaskan singkat

## Alur Kerja

Sebelum implementasi:

1. Periksa struktur proyek saat ini.
2. Baca dokumentasi yang relevan.
3. Identifikasi dependensi dan batasan.
4. Ajukan rencana implementasi sederhana.

Setelah implementasi:

1. Jalankan pengujian yang relevan.
2. Jalankan pemeriksaan *lint* dan tipe data (jika sudah dikonfigurasi).
3. Lakukan *build* aplikasi.
4. Laporkan berkas yang diubah serta hasil pengujian.
5. Laporkan secara eksplisit masalah yang belum terselesaikan.
