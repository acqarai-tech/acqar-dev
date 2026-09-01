// Flag + label + percentage rows — "Buyer Nationality" breakdown. Generic
// enough for any emoji/icon + label + share list.
export default function FlagStatList({ items, title, subtitle, className = '' }) {
  const max = Math.max(...items.map((i) => i.value))
  return (
    <div className={`rounded-2xl border border-line bg-white p-5 shadow-[var(--shadow-md)] ${className}`}>
      {(title || subtitle) && (
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          {title && <p className="text-sm font-semibold text-ink">{title}</p>}
          {subtitle && <p className="text-xs text-muted">{subtitle}</p>}
        </div>
      )}
      <div className="flex flex-col gap-2.5">
        {items.map((item) => (
          <div key={item.label} className="flex items-center gap-3">
            <span className="w-6 shrink-0 text-center text-base leading-none">{item.flag}</span>
            <span className="w-24 shrink-0 text-xs text-ink/80">{item.label}</span>
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#fdf8f2]">
              <div className="h-full rounded-full bg-accent" style={{ width: `${(item.value / max) * 100}%` }} />
            </div>
            <span className="w-9 shrink-0 text-right text-xs font-semibold tabular-nums text-ink">{item.value}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}
