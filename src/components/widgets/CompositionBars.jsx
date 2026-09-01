// Paired-percentage split bars — "58% Off-Plan / 42% Ready" style market
// composition rows. Reusable anywhere a two-way split needs a quick visual.
export default function CompositionBars({ pairs, title, subtitle, className = '' }) {
  return (
    <div className={`rounded-2xl border border-line bg-white p-5 shadow-[var(--shadow-md)] ${className}`}>
      {(title || subtitle) && (
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          {title && <p className="text-sm font-semibold text-ink">{title}</p>}
          {subtitle && <p className="text-xs text-muted">{subtitle}</p>}
        </div>
      )}
      <div className="flex flex-col gap-3.5">
        {pairs.map((pair) => (
          <div key={pair.leftLabel}>
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-ink">
                {pair.leftLabel} <span className="tabular-nums text-accent-dark">{pair.leftValue}%</span>
              </span>
              <span className="font-medium text-muted">
                <span className="tabular-nums text-ink/60">{pair.rightValue}%</span> {pair.rightLabel}
              </span>
            </div>
            <div className="mt-1.5 flex h-2 w-full overflow-hidden rounded-full bg-[#fdf8f2]">
              <div className="h-full rounded-l-full bg-accent" style={{ width: `${pair.leftValue}%` }} />
              <div className="h-full rounded-r-full bg-line" style={{ width: `${pair.rightValue}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
