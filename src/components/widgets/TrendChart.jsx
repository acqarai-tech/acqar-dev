import { useRef, useState } from 'react'
import { CaretUp, CaretDown } from '@phosphor-icons/react'

// One chart, driven by a row of clickable metric tiles above it — click a
// tile and the line redraws for that series. Replaces having several
// separate static charts side by side. Includes a real hover tooltip
// (nearest-point tracking), which none of the site's charts had before.
export default function TrendChart({ metrics, className = '' }) {
  const [activeKey, setActiveKey] = useState(metrics[0].key)
  const [hover, setHover] = useState(null)
  const wrapRef = useRef(null)
  const active = metrics.find((m) => m.key === activeKey) ?? metrics[0]

  const width = 640
  const height = 220
  const padX = 12
  const padTop = 24
  const padBottom = 28

  const values = active.data.map((d) => d.value)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1

  const points = active.data.map((d, i) => {
    const x = padX + (i / (active.data.length - 1)) * (width - padX * 2)
    const y = padTop + (1 - (d.value - min) / range) * (height - padTop - padBottom)
    return { x, y, ...d }
  })

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${height - padBottom} L ${points[0].x} ${height - padBottom} Z`
  const color = active.color ?? 'var(--color-accent)'
  const gradientId = `trend-fill-${active.key}`

  const handleMove = (e) => {
    const rect = wrapRef.current.getBoundingClientRect()
    const scale = rect.width / width
    const vbX = (e.clientX - rect.left) / scale
    let nearest = 0
    let best = Infinity
    points.forEach((p, i) => {
      const d = Math.abs(p.x - vbX)
      if (d < best) {
        best = d
        nearest = i
      }
    })
    const p = points[nearest]
    setHover({ leftPct: (p.x / width) * 100, topPct: (p.y / height) * 100, ...p })
  }

  const format = (v) => `${active.valuePrefix ?? ''}${v.toLocaleString()}${active.valueSuffix ?? ''}`

  return (
    <div className={`rounded-2xl border border-line bg-white p-5 shadow-[var(--shadow-md)] ${className}`}>
      {metrics.length > 1 && (
        <div className="mb-4 grid grid-cols-2 gap-2 sm:flex sm:items-stretch">
          {metrics.map((m) => (
            <button
              key={m.key}
              type="button"
              onClick={() => {
                setActiveKey(m.key)
                setHover(null)
              }}
              className={`cursor-pointer rounded-xl border px-4 py-2.5 text-left transition-colors sm:flex-1 ${
                m.key === activeKey ? 'border-accent/30 bg-[#fdf8f2]' : 'border-line bg-white hover:bg-accent/5'
              }`}
            >
              <p className="text-xs text-muted">{m.label}</p>
              <div className="mt-0.5 flex items-baseline gap-1.5">
                <p className="text-base font-semibold tabular-nums tracking-[-0.01em] text-ink">{m.value}</p>
                {m.change != null && (
                  <span className={`flex items-center gap-0.5 text-[11px] font-semibold ${m.changeDirection === 'down' ? 'text-[#b5502e]' : 'text-accent-dark'}`}>
                    {m.changeDirection === 'down' ? <CaretDown weight="fill" size={9} /> : <CaretUp weight="fill" size={9} />}
                    {m.change}
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {(active.title || active.subtitle) && (
        <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          {active.title && <p className="text-sm font-semibold text-ink">{active.title}</p>}
          {active.subtitle && <p className="text-xs text-muted">{active.subtitle}</p>}
        </div>
      )}

      <div ref={wrapRef} className="relative" onMouseMove={handleMove} onMouseLeave={() => setHover(null)}>
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full cursor-crosshair" preserveAspectRatio="none" role="img" aria-label={active.label}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.22" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
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
          {active.band && (
            <rect
              x={points[active.band.startIndex]?.x - 6}
              y={padTop}
              width={(points[active.band.endIndex]?.x ?? 0) - (points[active.band.startIndex]?.x ?? 0) + 12}
              height={height - padTop - padBottom}
              fill={color}
              opacity="0.06"
            />
          )}
          <path d={areaPath} fill={`url(#${gradientId})`} />
          <path d={linePath} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          {hover && <line x1={hover.x} x2={hover.x} y1={padTop} y2={height - padBottom} stroke={color} strokeWidth="1" strokeDasharray="3 3" opacity="0.5" />}
          {points.map((p, i) => (
            <circle
              key={p.label}
              cx={p.x}
              cy={p.y}
              r={hover?.index === i || i === points.length - 1 ? 4.5 : 3}
              fill={i === points.length - 1 ? color : 'white'}
              stroke={color}
              strokeWidth="1.5"
            />
          ))}
        </svg>
        {hover && (
          <div
            className="pointer-events-none absolute -translate-x-1/2 -translate-y-[calc(100%+10px)] whitespace-nowrap rounded-lg border border-line bg-white px-2.5 py-1.5 text-xs shadow-[var(--shadow-md)]"
            style={{ left: `${hover.leftPct}%`, top: `${hover.topPct}%` }}
          >
            <p className="font-semibold tabular-nums text-ink">{format(hover.value)}</p>
            <p className="text-muted">{hover.label}</p>
          </div>
        )}
      </div>
      <div className="mt-1 flex justify-between text-xs text-muted">
        {active.data.map((d) => (
          <span key={d.label}>{d.label}</span>
        ))}
      </div>
    </div>
  )
}
