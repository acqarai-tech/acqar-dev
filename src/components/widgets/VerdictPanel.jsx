import { CheckCircle } from '@phosphor-icons/react'

// Question + verdict + supporting stats — "Should you sell?" / "Should you
// rent it out?" pattern. Reusable for any yes/no-style recommendation card.
export default function VerdictPanel({ question, verdict, body, stats, className = '' }) {
  return (
    <div className={`rounded-2xl border border-line bg-white p-5 shadow-[var(--shadow-md)] ${className}`}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">{question}</p>
      <p className="mt-1.5 flex items-center gap-2 text-lg font-semibold text-accent-dark">
        <CheckCircle weight="fill" size={20} className="shrink-0 text-accent" />
        {verdict}
      </p>
      <p className="mt-2 text-sm leading-relaxed text-ink/80">{body}</p>
      {stats?.length > 0 && (
        <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2.5 border-t border-line pt-4">
          {stats.map((s) => (
            <div key={s.label}>
              <p className="text-xs text-muted">{s.label}</p>
              <p className="text-sm font-semibold tabular-nums text-ink">{s.value}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
