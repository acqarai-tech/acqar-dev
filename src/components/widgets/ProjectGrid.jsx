import { Buildings } from '@phosphor-icons/react'

// Off-plan project card grid — name, delivery window, PSF from, sold %, and
// a construction-progress bar. Reusable for any project/inventory listing.
export default function ProjectGrid({ projects, title, meta, className = '' }) {
  return (
    <div className={`rounded-2xl border border-line bg-white p-5 shadow-[var(--shadow-md)] ${className}`}>
      {(title || meta) && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          {title && <p className="text-sm font-semibold text-ink">{title}</p>}
          {meta && <span className="rounded-full border border-line px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted">{meta}</span>}
        </div>
      )}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {projects.map((p) => (
          <div key={p.name} className="rounded-xl border border-line bg-[#fdf8f2] p-4">
            <div className="flex items-start gap-2.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-accent/20 bg-white text-accent">
                <Buildings weight="duotone" size={15} />
              </span>
              <p className="text-sm font-semibold leading-snug text-ink">{p.name}</p>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-y-1.5 text-xs">
              <span className="text-muted">Delivery</span>
              <span className="text-right font-medium text-ink">{p.delivery}</span>
              <span className="text-muted">PSF from</span>
              <span className="text-right font-medium tabular-nums text-ink">{p.psfFrom}</span>
              <span className="text-muted">Sold</span>
              <span className="text-right font-medium tabular-nums text-ink">{p.sold}%</span>
            </div>
            <div className="mt-3">
              <div className="flex items-center justify-between text-[10px] font-medium text-muted">
                <span>Built</span>
                <span className="tabular-nums">{p.built}%</span>
              </div>
              <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-white">
                <div className="h-full rounded-full bg-accent" style={{ width: `${p.built}%` }} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
