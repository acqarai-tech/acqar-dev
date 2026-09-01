// Reusable Buy / Watch / Hold pill — the areas equivalent of ChatPage's
// Buy/Sell/Invest verdict chip. Same "single accent color only" language:
// every state stays within the copper/accent family, no traffic-light colors.
const STYLES = {
  Buy: 'bg-accent text-white',
  Watch: 'bg-accent/10 text-accent-dark',
  Hold: 'border border-accent-dark/40 text-accent-dark',
}

export default function VerdictBadge({ verdict, size = 'md', className = '' }) {
  const sizeClass = size === 'lg' ? 'px-3.5 py-1.5 text-xs' : 'px-2.5 py-1 text-[11px]'
  return (
    <span
      className={`inline-block shrink-0 rounded-full font-semibold uppercase tracking-[0.1em] ${sizeClass} ${STYLES[verdict] ?? STYLES.Watch} ${className}`}
    >
      {verdict}
    </span>
  )
}
