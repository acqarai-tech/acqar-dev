import VerdictBadge from './VerdictBadge'

// Composite score card: big number + verdict + a breakdown of the factors
// that make it up, each as a labeled horizontal bar. Reusable wherever a
// scored verdict needs explaining, not just the area detail page.
export default function ScoreGauge({ score, verdict, outlookLabel, breakdown, className = '' }) {
  return (
    <div className={`rounded-2xl border border-line bg-white p-5 shadow-[var(--shadow-md)] ${className}`}>
      <div className="flex flex-col items-center text-center">
        <VerdictBadge verdict={verdict} size="lg" />
        <p className="mt-3 text-5xl font-semibold tabular-nums tracking-[-0.03em] text-ink">
          {score}
          <span className="text-lg font-medium text-muted">/100</span>
        </p>
        {outlookLabel && <p className="mt-1 text-xs text-muted">{outlookLabel}</p>}
      </div>

      {breakdown?.length > 0 && (
        <div className="mt-5 flex flex-col gap-3 border-t border-line pt-4">
          {breakdown.map((item) => (
            <div key={item.label}>
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs text-ink/70">{item.label}</p>
                <p className="text-xs font-semibold tabular-nums text-ink">{item.value}</p>
              </div>
              <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-[#fdf8f2]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-accent to-accent-dark"
                  style={{ width: `${Math.min(100, Math.max(0, item.value))}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
