import { TrendUp, CalendarBlank } from '@phosphor-icons/react'

const STATUS_STYLES = {
  Confirmed: 'bg-accent text-white',
  Announced: 'bg-accent/10 text-accent-dark',
  Likely: 'border border-line text-muted',
}

const BADGE_STYLES = {
  Confirmed: 'border-accent bg-accent text-white',
  Announced: 'border-accent/30 bg-[#fdf8f2] text-accent-dark',
  Likely: 'border-line bg-white text-muted',
}

// Vertical event timeline — each event gets its own icon badge (matching
// the icon-badge language used everywhere else on the site) instead of a
// plain color dot, so the timeline can be scanned by icon shape alone.
export default function Timeline({ events, title, subtitle, className = '' }) {
  return (
    <div className={`rounded-2xl border border-line bg-white p-5 shadow-[var(--shadow-md)] ${className}`}>
      {(title || subtitle) && (
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          {title && <p className="text-sm font-semibold text-ink">{title}</p>}
          {subtitle && <p className="text-xs text-muted">{subtitle}</p>}
        </div>
      )}
      <div className="relative flex flex-col gap-6">
        <div aria-hidden className="absolute bottom-4 left-[19px] top-4 w-px bg-line" />
        {events.map((event) => {
          const EventIcon = event.Icon ?? CalendarBlank
          return (
            <div key={event.title} className="relative flex gap-4">
              <span
                className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border shadow-[var(--shadow-xs)] ${BADGE_STYLES[event.status]}`}
              >
                <EventIcon weight={event.status === 'Confirmed' ? 'fill' : 'duotone'} size={18} />
              </span>
              <div className="min-w-0 flex-1 pt-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.06em] text-muted">{event.date}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.06em] ${STATUS_STYLES[event.status]}`}>
                    {event.status}
                  </span>
                </div>
                <p className="mt-1 text-sm font-semibold text-ink">{event.title}</p>
                <p className="mt-1 text-sm leading-relaxed text-muted">{event.body}</p>
                {event.impact && (
                  <p className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-accent-dark">
                    <TrendUp weight="bold" size={13} /> {event.impact}
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
