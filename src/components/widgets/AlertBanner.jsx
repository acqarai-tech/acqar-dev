import { Warning } from '@phosphor-icons/react'

// Market-note banner — kept inside the accent family (not red/yellow) so it
// reads as "worth knowing" rather than an error state, matching the site's
// single-accent-color rule.
export default function AlertBanner({ title, body, className = '' }) {
  return (
    <div className={`flex items-start gap-3 rounded-2xl border border-accent/25 bg-[#fdf8f2] px-4 py-3.5 shadow-[var(--shadow-sm)] ${className}`}>
      <Warning weight="fill" size={18} className="mt-0.5 shrink-0 text-accent-dark" />
      <p className="text-sm leading-relaxed text-ink/80">
        {title && <span className="font-semibold text-ink">{title}: </span>}
        {body}
      </p>
    </div>
  )
}
