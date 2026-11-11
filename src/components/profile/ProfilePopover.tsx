import { useState } from 'react'
import { ExternalLink, Mail } from 'lucide-react'
import { cn } from 'cn'
import { StatusPill } from '@/components/metrics/StatusPill'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

function LinkedInIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="currentColor">
      <circle cx="4.6" cy="4.5" r="2.1" />
      <rect x="2.7" y="8.5" width="3.8" height="12.8" rx="0.6" />
      <path d="M9.2 8.5h3.4v1.8h.05c.48-.9 1.66-1.85 3.42-1.85 3.66 0 4.33 2.4 4.33 5.52v7.33h-3.6v-6.5c0-1.55-.03-3.54-2.16-3.54-2.16 0-2.49 1.69-2.49 3.43v6.61H9.2V8.5Z" />
    </svg>
  )
}

function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="currentColor">
      <path d="M12 .5C5.73.5.5 5.73.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.56v-2.17c-3.2.7-3.87-1.54-3.87-1.54-.52-1.32-1.28-1.67-1.28-1.67-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.71 1.26 3.37.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.19-3.1-.12-.29-.51-1.46.11-3.05 0 0 .96-.31 3.15 1.18a10.9 10.9 0 0 1 5.74 0c2.18-1.49 3.14-1.18 3.14-1.18.63 1.59.24 2.76.12 3.05.74.81 1.19 1.84 1.19 3.1 0 4.42-2.7 5.39-5.26 5.67.42.36.8 1.08.8 2.18v3.23c0 .31.21.68.8.56A11.51 11.51 0 0 0 23.5 12C23.5 5.73 18.27.5 12 .5Z" />
    </svg>
  )
}

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="none">
      <rect
        x="2.6"
        y="2.6"
        width="18.8"
        height="18.8"
        rx="5.4"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <circle cx="12" cy="12" r="4.3" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="17.5" cy="6.5" r="1.15" fill="currentColor" />
    </svg>
  )
}

function ProfileAvatar({ className }: { className?: string }) {
  const [failed, setFailed] = useState(false)

  return (
    <span
      className={cn(
        'flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 font-heading text-[10px] font-bold text-primary',
        className,
      )}
    >
      {failed ? (
        <span>MD</span>
      ) : (
        <img
          src="/avatar.webp"
          alt="Mahendra Agung Darmawan"
          className="size-full object-cover"
          onError={() => setFailed(true)}
        />
      )}
    </span>
  )
}

const LINKS = [
  {
    name: 'LinkedIn',
    action: 'Lihat Profil ↗',
    href: 'https://www.linkedin.com/in/mahendra-agung-bba516314/',
    icon: <LinkedInIcon className="size-4" />,
    external: true,
  },
  {
    name: 'GitHub',
    action: 'Source Code ↗',
    href: 'https://github.com/HenMahen/Ecommerce-Sales-Analytics-Dashboard',
    icon: <GitHubIcon className="size-4" />,
    external: true,
  },
  {
    name: 'Email',
    action: 'Kirim Email ↗',
    href: 'mailto:amahendra952@gmail.com',
    icon: <Mail aria-hidden="true" className="size-4" />,
    external: false,
  },
  {
    name: 'Instagram',
    action: 'Lihat Profil ↗',
    href: 'https://www.instagram.com/mahendra.agungd/',
    icon: <InstagramIcon className="size-4" />,
    external: true,
  },
]

const PROJECT_FACTS = [
  { label: 'Dataset', value: '138.116 Transaksi (2021–2025)' },
  { label: 'Stack', value: 'React 19, TypeScript, Python Pandas, Tailwind CSS' },
]

/** Analyst identity and project links, opened from the avatar in the top header. */
export function ProfilePopover() {
  return (
    <Popover>
      <PopoverTrigger
        aria-label="Buka menu profil Mahendra Agung Darmawan"
        title="Menu profil"
        className="inline-flex size-8 shrink-0 items-center justify-center rounded-full border border-border bg-primary/10 text-primary transition-colors hover:border-primary/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none aria-expanded:ring-2 aria-expanded:ring-primary/40"
      >
        <ProfileAvatar />
      </PopoverTrigger>

      <PopoverContent
        side="bottom"
        align="end"
        sideOffset={10}
        aria-labelledby="profile-popover-name"
        className="max-h-[min(36rem,calc(100vh-6rem))] w-[21rem] max-w-[calc(100vw-2rem)] overflow-y-auto overscroll-contain p-0"
      >
        <div className="flex items-start gap-3 border-b border-border p-4">
          <ProfileAvatar className="size-12 border border-border text-sm" />
          <div className="min-w-0">
            <p
              id="profile-popover-name"
              className="font-heading text-sm leading-tight font-semibold text-foreground"
            >
              Mahendra Agung Darmawan
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
              Data Analyst / Data Engineer / AI
            </p>
            <StatusPill label="Open to Work / Project" tone="positive" className="mt-2" />
          </div>
        </div>

        <div className="border-b border-border p-4">
          <p className="font-mono text-[10px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
            Tentang Proyek Ini
          </p>
          <dl className="mt-2.5 grid grid-cols-[auto_1fr] gap-x-3 gap-y-2 text-[11px] leading-relaxed">
            {PROJECT_FACTS.map((fact) => (
              <div key={fact.label} className="contents">
                <dt className="text-muted-foreground">{fact.label}</dt>
                <dd className="font-medium text-foreground">{fact.value}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="p-4">
          <p className="font-mono text-[10px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
            Tautan
          </p>
          <div className="mt-2 flex flex-col gap-1">
            {LINKS.map((link) => (
              <a
                key={link.name}
                href={link.href}
                target="_blank"
                rel="noreferrer"
                className="group flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                <span className="flex size-7 shrink-0 items-center justify-center rounded-md border border-border bg-muted/60 text-muted-foreground transition-colors group-hover:text-foreground dark:bg-surface-container-high/60">
                  {link.icon}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-medium text-foreground">{link.name}</span>
                  <span className="block text-[11px] text-muted-foreground">{link.action}</span>
                </span>
                {link.external ? (
                  <ExternalLink
                    aria-hidden="true"
                    className="size-3.5 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground"
                  />
                ) : null}
              </a>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
