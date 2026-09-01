// Lightweight custom SVG bar chart — no charting library dependency.
// Supports an optional shaded "band" over a range of bars (e.g. flagging a
// shock period) with a two-item legend. Reusable for any label/value set.
export default function BarChart({ data, band, title, subtitle, valueFormatter, className = '' }) {
  const width = 640
  const height = 200
  const padX = 12
  const padTop = 16
  const padBottom = 28
  const gap = 10

  const max = Math.max(...data.map((d) => d.value)) * 1.08
  const barWidth = (width - padX * 2 - gap * (data.length - 1)) / data.length
  const format = valueFormatter ?? ((v) => v.toLocaleString())

  return (
    <div className={`rounded-2xl border border-line bg-white p-5 shadow-[var(--shadow-md)] ${className}`}>
      {(title || subtitle) && (
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          {title && <p className="text-sm font-semibold text-ink">{title}</p>}
          {subtitle && <p className="text-xs text-muted">{subtitle}</p>}
        </div>
      )}
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" preserveAspectRatio="none" role="img" aria-label={title || 'Bar chart'}>
        {band && (
          <rect
            x={padX + band.startIndex * (barWidth + gap) - gap / 2}
            y={padTop}
            width={(band.endIndex - band.startIndex + 1) * (barWidth + gap)}
            height={height - padTop - padBottom}
            fill="var(--color-accent)"
            opacity="0.07"
            rx="6"
          />
        )}
        {data.map((d, i) => {
          const x = padX + i * (barWidth + gap)
          const barHeight = (d.value / max) * (height - padTop - padBottom)
          const y = height - padBottom - barHeight
          const isBand = band && i >= band.startIndex && i <= band.endIndex
          return (
            <g key={d.label}>
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                rx="3"
                fill={isBand ? 'var(--color-accent-dark)' : 'var(--color-accent)'}
                opacity={isBand ? 1 : 0.85}
              />
              {d.showValue && (
                <text x={x + barWidth / 2} y={y - 6} textAnchor="middle" className="fill-[var(--color-ink)] text-[11px] font-semibold">
                  {format(d.value)}
                </text>
              )}
              <text x={x + barWidth / 2} y={height - 10} textAnchor="middle" className="fill-[var(--color-muted)] text-[10px]">
                {d.label}
              </text>
            </g>
          )
        })}
      </svg>
      {band && (
        <div className="mt-2 flex items-center gap-4 text-xs text-muted">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-sm bg-accent opacity-85" /> Normal volume
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-sm bg-accent-dark" /> {band.label}
          </span>
        </div>
      )}
    </div>
  )
}
