import { useState } from 'react'
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  ChevronDown,
  Database,
  Info,
  Lightbulb,
  Repeat2,
  Search,
  ShieldAlert,
  ShoppingCart,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react'
import { cn } from 'cn'
import { useRouter } from '@/app/router'
import { ChartCard } from '@/components/charts/ChartCard'
import { PageHeader } from '@/components/layout/PageHeader'
import { StatTile } from '@/components/metrics/StatTile'
import { StatusPill, type PillTone } from '@/components/metrics/StatusPill'

interface Finding {
  number: number
  badge: string
  tone: PillTone
  title: string
  value: string
  valueClassName: string
  description: string
  path: string
}

interface Recommendation {
  badge: string
  tone: PillTone
  finding: number
  title: string
  description: string
  basis: string
  icon: LucideIcon
  borderClassName: string
  surfaceClassName: string
  iconClassName: string
}

const FINDINGS: Finding[] = [
  {
    number: 1,
    badge: 'Risiko Tinggi',
    tone: 'danger',
    title: 'Diskon 30% atau lebih membuat penjualan merugi',
    value: '−$201.225',
    valueClassName: 'text-negative dark:text-brand-pink',
    description:
      'Sebanyak 1.296 dari 138.116 pesanan (0,94%) rugi. Semua pesanan rugi itu ada di kelompok diskon 30% atau lebih. Total kerugiannya $201.225. Hubungan antara tingkat diskon dan margin kuat dan negatif (-0,707): makin besar diskon, makin kecil margin. Penurunan paling tajam terjadi saat diskon naik dari kelompok 21–30% ke kelompok 30% atau lebih, yaitu 15,29 poin persentase. Penurunan ini 2,4 kali lebih besar dari penurunan sebelumnya.',
    path: '/sales',
  },
  {
    number: 2,
    badge: 'Pola Stabil',
    tone: 'warning',
    title: 'Penjualan tahunan hampir tidak berubah',
    value: '±1% per tahun',
    valueClassName: 'font-mono text-muted-foreground',
    description:
      'Penjualan tahunan berada di kisaran $35,1 juta sampai $35,7 juta. Pada 2021 nilainya $35,72 juta, sedangkan pada 2025 $35,09 juta. Pertumbuhan tahunan hanya bergerak dari -1,11% sampai +0,57%. Jumlah pesanan juga stabil di sekitar 27.500 per tahun. Artinya, bisnis ini sudah matang dan tidak sedang tumbuh cepat.',
    path: '/sales',
  },
  {
    number: 3,
    badge: 'Akhir Tahun',
    tone: 'violet',
    title: 'Penjualan ramai di akhir tahun, tetapi margin paling tipis',
    value: '32–33%',
    valueClassName: 'text-brand-pink',
    description:
      'Penjualan paling besar terjadi pada November dan Desember. Namun margin di kedua bulan itu hanya 32,55% dan 32,95%, jauh di bawah rata-rata Januari sampai Oktober yang sekitar 47,5%. Penyebab utamanya diskon: rata-rata diskon pada November dan Desember 27,56%, sedangkan bulan lain 11,11%.',
    path: '/sales',
  },
  {
    number: 4,
    badge: 'Peluang Laba',
    tone: 'info',
    title: 'Banyak pesanan besar dengan laba tipis',
    value: '$5,4–6,1 Juta',
    valueClassName: 'text-positive',
    description:
      'Ada 11.659 pesanan (8,44%) dengan penjualan tinggi, tetapi margin rendah. Batasnya: penjualan bersih minimal $1.744,58 dan margin maksimal 38,88%. Rata-rata margin pesanan ini hanya 27,39%, sedangkan rata-rata keseluruhan 42,99%. Jika margin pesanan ini dinaikkan ke batas sehat, potensi laba tambahannya $5,4 juta sampai $6,1 juta.',
    path: '/transactions',
  },
]

const RECOMMENDATIONS: Recommendation[] = [
  {
    badge: 'Prioritas Tinggi',
    tone: 'danger',
    finding: 1,
    title: 'Batasi diskon maksimal 20%',
    description:
      'Semua pesanan rugi (1.296 pesanan, total $201 ribu) berasal dari kelompok diskon 30% atau lebih. Diskon di atas 20% juga membuat margin 16,9 poin persentase lebih rendah dibanding diskon 20% atau kurang. Batas 20% bisa langsung diterapkan di kasir dan platform promosi. Ini langkah paling sederhana untuk mencegah kerugian.',
    basis:
      '1.296 pesanan rugi, semuanya di kelompok diskon 30% atau lebih. Margin turun 16,9 poin persentase pada diskon di atas 20%.',
    icon: ShieldAlert,
    borderClassName: 'border-l-brand-pink',
    surfaceClassName: 'bg-brand-pink/10',
    iconClassName: 'text-brand-pink',
  },
  {
    badge: 'Prioritas Sedang',
    tone: 'warning',
    finding: 2,
    title: 'Fokus ke pelanggan lama dan nilai belanja',
    description:
      'Sekitar 97,9% pelanggan aktif sudah membeli lebih dari sekali (24.387 dari 24.911). Karena penjualan tahunan datar, menambah pelanggan baru kemungkinan tidak banyak mengubah hasil. Yang lebih menjanjikan adalah menaikkan nilai transaksi rata-rata (sekarang $1.282) dan jumlah pembelian dari kelompok pelanggan Consumer, yang marginnya paling tinggi (46,09%).',
    basis:
      '97,9% pelanggan membeli lebih dari sekali. Penjualan tahunan hanya bergerak sekitar 1% selama lima tahun.',
    icon: Repeat2,
    borderClassName: 'border-l-positive',
    surfaceClassName: 'bg-positive/10',
    iconClassName: 'text-positive',
  },
  {
    badge: 'Prioritas Sedang',
    tone: 'warning',
    finding: 3,
    title: 'Ubah cara promosi di akhir tahun',
    description:
      'Penjualan kuartal 4 paling tinggi, tetapi marginnya paling rendah, yaitu 38,72%. Diskon rata-rata 27,56% pada November dan Desember perlu diganti dengan promosi yang tidak terlalu memotong margin. Contohnya diskon bertingkat untuk pembelian lebih banyak dengan batas margin minimum, atau paket produk. Targetnya, margin kuartal 4 mendekati rata-rata tahunan 42,99% tanpa kehilangan volume.',
    basis:
      'Margin kuartal 4 sebesar 38,72% (terendah). Margin November dan Desember 32,55% dan 32,95%. Diskon November dan Desember 27,56%, sedangkan bulan lain 11,11%.',
    icon: CalendarDays,
    borderClassName: 'border-l-primary',
    surfaceClassName: 'bg-primary/10',
    iconClassName: 'text-primary',
  },
]

export function CaseStudyPage() {
  const { navigate } = useRouter()
  const [open, setOpen] = useState(false)

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Studi Kasus & Rekomendasi Bisnis"
        description="Analisis penjualan e-commerce dari 2021 sampai 2025. Halaman ini menjelaskan masalah yang ditemukan, temuan utama, dan langkah yang bisa diambil."
        icon={BookOpen}
        badges={
          <>
            <StatusPill label="Angka tervalidasi" tone="positive" />
            <StatusPill label="Periode 2021–2025" tone="neutral" />
          </>
        }
      />

      <ChartCard
        title="Latar Belakang"
        icon={Database}
        iconTone="violet"
        scope="Seluruh periode 2021–2025"
        info="Cakupan data dan masalah utama yang dibahas: 138.116 pesanan dari 2021 sampai 2025, dengan empat kelompok pelanggan."
      >
        <div className="flex flex-col gap-5">
          <p className="max-w-prose text-sm leading-relaxed text-foreground/80">
            Dasbor ini menganalisis penjualan e-commerce retail selama lima tahun, 2021 sampai 2025.
            Ada dua masalah utama. Pertama, penjualan tahunan hampir tidak tumbuh, hanya sekitar 1%.
            Kedua, laba menipis karena diskon besar, terutama pada kuartal akhir ketika penjualan
            sedang ramai. Margin adalah persentase laba terhadap penjualan.
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatTile
              label="Total Pesanan"
              value="138.116"
              hintMode="popover"
              icon={ShoppingCart}
              hint={{
                concept:
                  'Jumlah pesanan unik di dalam data. Tidak ada pesanan yang terhitung dua kali.',
                current:
                  'Setiap baris mewakili satu pesanan. Pemeriksaan ulang memastikan tidak ada nomor pesanan yang muncul dua kali.',
              }}
              className="h-full"
            />
            <StatTile
              label="Periode Analisis"
              value="5 Tahun"
              hintMode="popover"
              icon={CalendarDays}
              hint={{
                concept: 'Data mencakup Januari 2021 sampai Desember 2025.',
                current:
                  'Data 2025 lengkap, bukan hanya sebagian tahun. Jumlah pesanan tiap tahun hampir sama, sekitar 27.500.',
              }}
              className="h-full"
            />
            <StatTile
              label="Total Penjualan Bersih"
              value="$177,13 Juta"
              hintMode="popover"
              icon={Wallet}
              hint={{
                concept:
                  'Total penjualan bersih setelah diskon. Pajak dan ongkir ikut dihitung dalam angka ini.',
                current:
                  'Nilai pastinya $177.134.263,74. Angka ini sudah dikurangi diskon, lalu ditambah pajak dan ongkir.',
              }}
              className="h-full"
            />
            <StatTile
              label="Kelompok Pelanggan"
              value="4 Kelompok"
              hintMode="popover"
              icon={Users}
              hint={{
                concept: 'Ada empat kelompok pelanggan: Consumer, Premium, VIP, dan Business.',
                current:
                  'Consumer paling banyak, yaitu 54,5% dari seluruh pelanggan. VIP dan Business jumlahnya lebih kecil.',
              }}
              className="h-full"
            />
          </div>
        </div>
      </ChartCard>

      <ChartCard
        title="Temuan Utama"
        icon={Search}
        iconTone="blue"
        scope="Seluruh periode 2021–2025"
        info="Temuan berasal dari analisis data yang sudah dicek ulang dengan file CSV sumber. Angka ini menggambarkan data, bukan hasil uji sebab-akibat."
      >
        <div className="grid gap-4 md:grid-cols-2">
          {FINDINGS.map((finding) => (
            <div
              key={finding.number}
              className="flex h-full flex-col gap-3 rounded-xl border border-border bg-muted/30 p-4 dark:bg-surface-container-low/50"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-[11px] font-bold tracking-widest text-muted-foreground uppercase">
                  Temuan {finding.number}
                </span>
                <StatusPill label={finding.badge} tone={finding.tone} />
              </div>
              <h3 className="font-heading text-base leading-snug font-semibold text-foreground">
                {finding.title}
              </h3>
              <p
                className={cn(
                  'font-heading text-3xl font-bold tabular-nums',
                  finding.valueClassName,
                )}
              >
                {finding.value}
              </p>
              <p className="text-sm leading-relaxed text-muted-foreground">{finding.description}</p>
              <button
                type="button"
                onClick={() => navigate(finding.path)}
                aria-label={`Lihat Temuan ${finding.number} di dasbor`}
                className="mt-auto inline-flex w-fit cursor-pointer items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                Lihat di dasbor
                <ArrowRight aria-hidden="true" className="size-3" />
              </button>
            </div>
          ))}
        </div>
      </ChartCard>

      <ChartCard
        title="Rekomendasi Bisnis"
        icon={Lightbulb}
        iconTone="positive"
        scope="Dari temuan 2021–2025"
        info="Saran ini disusun dari temuan data. Sebelum dijalankan, tetap perlu disesuaikan dengan kondisi bisnis."
      >
        <div className="flex flex-col gap-4">
          {RECOMMENDATIONS.map((recommendation) => {
            const Icon = recommendation.icon
            return (
              <div
                key={recommendation.finding}
                className={cn(
                  'flex gap-4 rounded-xl border border-l-4 border-border p-4 dark:bg-surface-container-low/40',
                  recommendation.borderClassName,
                )}
              >
                <div className="flex shrink-0 flex-col items-center gap-2">
                  <div
                    className={cn(
                      'flex size-10 items-center justify-center rounded-full border border-border bg-muted',
                      recommendation.surfaceClassName,
                    )}
                  >
                    <Icon
                      aria-hidden="true"
                      className={cn('size-5', recommendation.iconClassName)}
                    />
                  </div>
                </div>
                <div className="flex min-w-0 flex-col gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusPill label={recommendation.badge} tone={recommendation.tone} />
                    <StatusPill label={`Dari Temuan ${recommendation.finding}`} tone="neutral" />
                  </div>
                  <h3 className="font-heading text-base font-semibold text-foreground">
                    {recommendation.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {recommendation.description}
                  </p>
                  <div className="mt-1 rounded-lg bg-muted/60 px-3 py-2 text-xs text-muted-foreground dark:bg-surface-container-high/40">
                    <span className="font-semibold text-foreground">Dasar data: </span>
                    {recommendation.basis}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </ChartCard>

      <section aria-label="Cara menghitung dan keterbatasan data">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-controls="case-study-methodology"
          className="flex w-full cursor-pointer items-center justify-between gap-3 rounded-xl border border-dashed border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <span className="flex items-center gap-2 font-medium">
            <Info aria-hidden="true" className="size-4 shrink-0" />
            Cara Menghitung & Keterbatasan Data
          </span>
          <ChevronDown
            aria-hidden="true"
            className={cn('size-4 shrink-0 transition-transform', open && 'rotate-180')}
          />
        </button>

        {open ? (
          <div
            id="case-study-methodology"
            className="mt-2 rounded-xl border border-border/60 bg-card p-5 dark:bg-card/85"
          >
            <ul className="list-disc space-y-3 pl-5 text-sm leading-relaxed text-muted-foreground marker:text-border">
              <li>
                <span className="font-medium text-foreground">
                  Rumus penjualan bersih (net_sales):{' '}
                </span>
                <code className="rounded bg-muted/70 px-1 py-0.5 font-mono text-[11px] text-foreground">
                  net_sales = gross_sales − discount_amount + tax_amount + shipping_cost
                </code>
                . Rumus ini berbeda dari rumus umum &quot;penjualan bersih = penjualan kotor
                dikurangi diskon&quot;. Pajak dan ongkir masuk ke penjualan bersih. Akibatnya,
                ongkir tercatat sebagai pemasukan sekaligus biaya.
              </li>
              <li>
                <span className="font-medium text-foreground">Rumus laba (profit): </span>
                <code className="rounded bg-muted/70 px-1 py-0.5 font-mono text-[11px] text-foreground">
                  profit = net_sales − product_cost − shipping_cost
                </code>
                . Bentuk lain:{' '}
                <code className="rounded bg-muted/70 px-1 py-0.5 font-mono text-[11px] text-foreground">
                  gross_sales − discount_amount + tax_amount − product_cost
                </code>
                .
              </li>
              <li>
                <span className="font-medium text-foreground">Cara menghitung margin: </span>
                Margin keseluruhan dihitung dari total laba dibagi total penjualan bersih, bukan
                dari rata-rata margin tiap baris. Kedua cara sama-sama sah, tetapi hasilnya berbeda:
                42,99% dengan cara total dan 45,07% dengan rata-rata baris.
              </li>
              <li>
                <span className="font-medium text-foreground">
                  Batas pesanan besar dengan margin tipis:{' '}
                </span>
                Batas ini diambil dari seluruh data. Penjualan bersih minimal $1.744,58 adalah batas
                25% pesanan dengan penjualan terbesar. Margin maksimal 38,88% adalah batas 25%
                pesanan dengan margin terendah. Batas yang sama dipakai untuk semua bagian data
                supaya perbandingan tetap adil.
              </li>
              <li>
                <span className="font-medium text-foreground">Data pelanggan berulang: </span>
                Kolom <code className="font-mono text-[11px]">is_repeat_customer</code> menandai 334
                transaksi sebagai pembelian pertama (0,24%). Jumlah itu terlalu kecil untuk
                membandingkan pelanggan baru dan lama. Karena itu, angka 97,9% dihitung dari{' '}
                <code className="font-mono text-[11px]">customer_id</code> unik yang punya lebih
                dari satu pesanan. Kolom{' '}
                <code className="font-mono text-[11px]">customer_type</code> (Loyal/Returning/New)
                tidak cocok dengan <code className="font-mono text-[11px]">is_repeat_customer</code>
                , jadi tidak dipakai.
              </li>
              <li>
                <span className="font-medium text-foreground">
                  Nilai pelanggan (CLV) dan ROMI:{' '}
                </span>
                <code className="font-mono text-[11px]">customer_lifetime_value</code> sudah ada di
                data, bukan hasil hitungan dari transaksi. Asal-usulnya tidak diketahui, jadi angka
                ini tidak dipakai sebagai indikator bisnis utama. ROMI, yaitu pengembalian biaya
                promosi, juga tidak dihitung karena belum ada aturan untuk menghubungkan penjualan
                ke kampanye.
              </li>
            </ul>
          </div>
        ) : null}
      </section>
    </div>
  )
}
