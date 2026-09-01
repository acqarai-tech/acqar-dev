import { Link } from 'react-router-dom'
import { Sparkle } from '@phosphor-icons/react'
import Reveal from './Reveal'
import CountUp from './CountUp'

const STATS = [
  { prefix: 'AED ', end: 500, suffix: 'M+', label: 'Property value analyzed' },
  { prefix: '', end: 300, suffix: '+', label: 'Dubai areas monitored' },
  { prefix: '', end: 365, suffix: 'K+', label: 'DLD transactions' },
]

// All six sit on one ring, evenly spaced 60deg apart, same speed — so they
// travel the circle one after another instead of drifting independently.
const RING_RADIUS = 160
const RING_SIZE = 88
const RING_DURATION = 30
const AVATARS = [
  { startAngle: 0, gender: 'women', img: 12 },
  { startAngle: 60, gender: 'men', img: 47 },
  { startAngle: 120, gender: 'women', img: 33 },
  { startAngle: 180, gender: 'men', img: 5 },
  { startAngle: 240, gender: 'women', img: 26 },
  { startAngle: 300, gender: 'men', img: 65 },
]

export default function TrustMetrics() {
  return (
    <section className="border-y border-line bg-white/60 px-6 py-24">
      <div className="mx-auto grid max-w-[1140px] grid-cols-1 items-center gap-14 md:grid-cols-[1fr_520px]">
        <div>
          <Reveal>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent-dark">
              Backed by real data
            </p>
            <h2 className="mt-3 max-w-[420px] text-3xl font-semibold leading-[1.1] tracking-[-0.03em] text-ink sm:text-4xl">
              Why trust{' '}
              <span className="bg-gradient-to-r from-accent via-[#c98a4a] to-accent-dark bg-clip-text text-transparent">
                the answer.
              </span>
            </h2>
          </Reveal>
          <Reveal delay={100}>
            <p className="mt-4 max-w-[440px] text-base leading-relaxed text-muted">
              Real DLD transaction data, not guesswork. Every answer ACQAR gives is
              backed by the numbers you'd need to make the call yourself.
            </p>
          </Reveal>

          <div className="mt-8 grid grid-cols-3 gap-6 text-left">
            {STATS.map((s, i) => (
              <Reveal key={s.label} delay={200 + i * 100}>
                <div className="text-xl font-semibold tracking-[-0.03em] text-ink sm:text-2xl">
                  <CountUp prefix={s.prefix} end={s.end} suffix={s.suffix} />
                </div>
                <div className="mt-1 text-xs text-muted sm:text-sm">{s.label}</div>
              </Reveal>
            ))}
          </div>

          <Reveal delay={500}>
            <Link
              to="/chat"
              className="mt-9 block w-full cursor-pointer rounded-full bg-accent px-7 py-3.5 text-center text-sm font-medium text-white shadow-[var(--shadow-glow)] transition-transform duration-200 hover:brightness-105 active:scale-95 sm:inline-block sm:w-auto"
            >
              Ask Your First Question
            </Link>
          </Reveal>
        </div>

        <Reveal delay={200} className="relative ml-auto hidden h-[480px] w-[480px] md:block">
          <span className="absolute left-1/2 top-1/2 z-10 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-2xl border border-line bg-white shadow-[var(--shadow-md)]">
            <Sparkle weight="fill" size={26} className="text-accent" />
          </span>

          {AVATARS.map((a, i) => (
            <span
              key={i}
              className="avatar-orbit absolute left-1/2 top-1/2"
              style={{
                width: RING_SIZE,
                height: RING_SIZE,
                marginLeft: -RING_SIZE / 2,
                marginTop: -RING_SIZE / 2,
                '--orbit-radius': `${RING_RADIUS}px`,
                animationDuration: `${RING_DURATION}s`,
                animationDelay: `${-(a.startAngle / 360) * RING_DURATION}s`,
              }}
            >
              <img
                src={`https://randomuser.me/api/portraits/${a.gender}/${a.img}.jpg`}
                alt=""
                aria-hidden
                className="h-full w-full rounded-full border-2 border-white object-cover opacity-85 shadow-[var(--shadow-sm)] grayscale"
                loading="lazy"
              />
            </span>
          ))}

          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 z-[5] bg-gradient-to-l from-white via-white/50 to-transparent"
          />
        </Reveal>
      </div>
    </section>
  )
}
