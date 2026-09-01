import { Link } from 'react-router-dom'
import { House, ChartLineUp, Buildings, MagnifyingGlass } from '@phosphor-icons/react'
import Reveal from './Reveal'
import LayeredGlow from './LayeredGlow'

export default function FinalCta() {
  return (
    <section className="px-6 pb-24 pt-4">
      <Reveal className="relative mx-auto flex max-w-[900px] flex-col items-center gap-5 overflow-hidden rounded-[28px] border border-accent/20 px-8 py-16 text-center shadow-[var(--shadow-lg)] sm:px-16">
        <LayeredGlow />
        <House
          weight="fill"
          size={64}
          className="pointer-events-none absolute -left-3 top-8 text-accent/10"
          aria-hidden
        />
        <ChartLineUp
          weight="fill"
          size={76}
          className="pointer-events-none absolute -right-4 top-6 text-accent/10"
          aria-hidden
        />
        <Buildings
          weight="fill"
          size={84}
          className="pointer-events-none absolute -bottom-8 left-10 text-accent/10"
          aria-hidden
        />
        <MagnifyingGlass
          weight="fill"
          size={58}
          className="pointer-events-none absolute -bottom-4 -right-3 text-accent/10"
          aria-hidden
        />

        <h2 className="relative max-w-[560px] text-3xl font-semibold leading-[1.15] tracking-[-0.03em] text-ink sm:text-4xl">
          Anyone can use ACQAR to make{' '}
          <span className="bg-gradient-to-r from-accent via-[#c98a4a] to-accent-dark bg-clip-text text-transparent">
            a smarter property decision
          </span>
        </h2>
        <p className="relative text-base leading-relaxed text-muted sm:whitespace-nowrap">
          Check the price. Compare the area. Know before you decide.
        </p>
        <Link
          to="/chat"
          className="relative mt-2 inline-block cursor-pointer rounded-full px-7 py-3.5 text-sm font-semibold text-white shadow-[var(--shadow-glow)] transition-transform duration-200 hover:brightness-105 active:scale-95"
          style={{ background: 'linear-gradient(95deg, var(--color-accent) 50%, var(--color-accent-dark) 100%)' }}
        >
          Ask ACQAR Free
        </Link>
      </Reveal>
    </section>
  )
}
