// Lightweight custom SVG area/line chart — no charting library dependency.
// Reusable for any label/value time series (price history here, but the
// shape works for any trend the chat or other pages might want to plot).
export default function PriceHistoryChart({ data, valuePrefix = 'AED ', valueSuffix = '', title, subtitle, className = '' }) {
  const width = 640
  const height = 220
  const padX = 8
  const padTop = 28
  const padBottom = 28

  const values = data.map((d) => d.value)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1

  const points = data.map((d, i) => {
    const x = padX + (i / (data.length - 1)) * (width - padX * 2)
    const y = padTop + (1 - (d.value - min) / range) * (height - padTop - padBottom)
    return { x, y, ...d }
  })

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${height - padBottom} L ${points[0].x} ${height - padBottom} Z`
  const last = points[points.length - 1]

  return (
    <div className={`rounded-2xl border border-line bg-white p-5 shadow-[var(--shadow-xs)] ${className}`}>
      {(title || subtitle) && (
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          {title && <p className="text-sm font-semibold text-ink">{title}</p>}
          {subtitle && <p className="text-xs text-muted">{subtitle}</p>}
        </div>
      )}
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" preserveAspectRatio="none" role="img" aria-label={title || 'Price history chart'}>
        <defs>
          <linearGradient id="priceHistoryFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-accent)" stopOpacity="0.22" />
            <stop offset="100%" stopColor="var(--color-accent)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((t) => (
          <line
            key={t}
            x1={padX}
            x2={width - padX}
            y1={padTop + t * (height - padTop - padBottom)}
            y2={padTop + t * (height - padTop - padBottom)}
            stroke="var(--color-line)"
            strokeDasharray="3 4"
          />
        ))}
        <path d={areaPath} fill="url(#priceHistoryFill)" />
        <path d={linePath} fill="none" stroke="var(--color-accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((p) => (
          <circle key={p.label} cx={p.x} cy={p.y} r={p === last ? 4.5 : 3} fill="var(--color-accent-dark)" stroke="white" strokeWidth="1.5" />
        ))}
        <text x={last.x} y={last.y - 14} textAnchor="end" className="fill-[var(--color-ink)] text-[13px] font-semibold">
          {valuePrefix}{last.value.toLocaleString()}{valueSuffix}
        </text>
      </svg>
      <div className="mt-1 flex justify-between text-xs text-muted">
        {data.map((d) => (
          <span key={d.label}>{d.label}</span>
        ))}
      </div>
    </div>
  )
}
