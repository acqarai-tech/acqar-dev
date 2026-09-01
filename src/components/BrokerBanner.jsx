import { Link } from 'react-router-dom'
import { Handshake } from '@phosphor-icons/react'
import Reveal from './Reveal'

export default function BrokerBanner() {
  return (
    <section id="for-brokers" className="px-6 pt-12 pb-20">
      <Reveal className="relative mx-auto flex max-w-[1000px] flex-col items-center gap-6 overflow-hidden rounded-[28px] border border-accent/20 bg-white px-8 py-14 text-center shadow-[var(--shadow-lg)] sm:px-16">
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-0 h-[220px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-[0.15] blur-[80px]"
          style={{ background: 'radial-gradient(circle, rgba(184,115,51,0.8), transparent 70%)' }}
        />
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/10">
          <Handshake weight="duotone" size={22} className="text-accent" />
        </div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent-dark">
          For Dubai brokers
        </p>
        <h2 className="max-w-[520px] text-3xl font-semibold leading-[1.1] tracking-[-0.03em] text-ink sm:text-4xl">
          Give every client a straight answer, instantly.
        </h2>
        <p className="max-w-[520px] text-base leading-relaxed text-muted">
          Your clients ask you for a price opinion, a sell-or-hold call, an
          investment read. Put ACQAR in the conversation and back it up with real
          DLD data in seconds — free for every Dubai broker.
        </p>
        <Link
          to="/chat"
          className="mt-2 cursor-pointer rounded-full bg-accent px-6 py-3 text-sm font-medium text-white shadow-[var(--shadow-glow)] transition-transform duration-200 hover:brightness-105 active:scale-95"
        >
          Ask ACQAR Free
        </Link>
      </Reveal>
    </section>
  )
}
