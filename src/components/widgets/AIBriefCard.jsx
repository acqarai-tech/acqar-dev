import { Sparkle, ClockCounterClockwise, Database, SealCheck, ArrowsClockwise } from '@phosphor-icons/react'

// "Area Specialist" AI brief — icon-badged paragraph with a meta row of
// trust signals. Same shape as ChatPage's assistant message treatment, so
// it could drop straight into a rich chat answer if needed later.
export default function AIBriefCard({ updated, sources, text, className = '' }) {
  return (
    <div className={`rounded-2xl border border-line bg-white p-5 shadow-[var(--shadow-md)] ${className}`}>
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-line bg-white text-accent shadow-[var(--shadow-xs)]">
          <Sparkle weight="fill" size={16} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-accent-dark">
            Area Specialist · AI brief
          </p>
          <p className="mt-2 text-sm leading-relaxed text-ink">{text}</p>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted">
            <span className="flex items-center gap-1">
              <ClockCounterClockwise size={13} /> Updated {updated}
            </span>
            <span className="flex items-center gap-1">
              <Database size={13} /> {sources} live data sources
            </span>
            <span className="flex items-center gap-1">
              <SealCheck size={13} /> RICS-aligned Truvalu™
            </span>
            <span className="flex items-center gap-1">
              <ArrowsClockwise size={13} /> Refreshes daily
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
