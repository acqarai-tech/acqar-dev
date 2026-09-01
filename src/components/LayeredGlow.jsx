import { useId } from 'react'

// Layered "premium" background: a soft diagonal gradient wash, a faint
// blueprint-style grid texture, and three low-opacity glow orbs in the same
// copper family already used for gradient text elsewhere on the site
// (accent, the mid "via" gold, and accent-dark) — same idea as a 3-color
// ambient-glow treatment, just kept inside ACQAR's existing warm palette
// instead of introducing unrelated hues.
export default function LayeredGlow() {
  const uid = useId()

  return (
    <>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-30"
        style={{
          background: 'linear-gradient(135deg, #fdf8f2 0%, #fbfaf8 50%, #fdf6ee 100%)',
        }}
      />
      <svg aria-hidden className="pointer-events-none absolute inset-0 -z-20 h-full w-full opacity-[0.05]">
        <defs>
          <pattern id={`glow-grid-${uid}`} width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#b87333" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#glow-grid-${uid})`} />
      </svg>
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 -right-24 -z-10 h-[400px] w-[400px] rounded-full blur-[60px]"
        style={{ background: 'radial-gradient(circle, rgba(184,115,51,0.14) 0%, transparent 65%)' }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-24 -left-24 -z-10 h-[400px] w-[400px] rounded-full blur-[60px]"
        style={{ background: 'radial-gradient(circle, rgba(201,138,74,0.13) 0%, transparent 65%)' }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute top-1/3 -left-32 -z-10 h-[320px] w-[320px] rounded-full blur-[60px]"
        style={{ background: 'radial-gradient(circle, rgba(181,122,63,0.11) 0%, transparent 65%)' }}
      />
    </>
  )
}
