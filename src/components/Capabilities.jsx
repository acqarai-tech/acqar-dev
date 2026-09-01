import {
  Calculator,
  Broadcast,
  MapTrifold,
  ChartLineUp,
  ArrowsLeftRight,
  Database,
  ChatCircleDots,
  ChartLine,
} from '@phosphor-icons/react'
import { Link } from 'react-router-dom'
import Reveal from './Reveal'

const CAPABILITIES = [
  {
    title: 'What’s this actually worth?',
    desc: 'Instant, RICS-aligned valuation estimates for any Dubai property, backed by real comparables.',
    Icon: Calculator,
  },
  {
    title: 'Has anything changed here recently?',
    desc: 'Live market signals across multiple data sources, flagged by severity so nothing slips past you.',
    Icon: Broadcast,
  },
  {
    title: 'Is this area worth buying into right now?',
    desc: 'Buy, Watch, or Hold scoring for every monitored area, updated continuously.',
    Icon: MapTrifold,
  },
  {
    title: 'What would I actually earn on this?',
    desc: 'Rental yield, appreciation, and risk breakdowns for any property or area.',
    Icon: ChartLineUp,
  },
  {
    title: 'Off-plan or resale — which is the better deal here?',
    desc: 'See where the real opportunity is, whether a project is mid-payment-plan or already handed over.',
    Icon: ArrowsLeftRight,
  },
  {
    title: 'Is this backed by real transactions?',
    desc: '365K+ actual DLD transactions across Dubai — not third-party estimates.',
    Icon: Database,
  },
  {
    title: 'Can I just ask like I would ChatGPT?',
    desc: 'Ask however feels natural, get a straight buy, sell, or invest answer.',
    Icon: ChatCircleDots,
  },
  {
    title: 'Where will prices be in 6 months? In 3 years?',
    desc: 'Price forecasting models for any property or area.',
    Icon: ChartLine,
  },
]

export default function Capabilities() {
  return (
    <section className="px-6 py-24">
      <div className="mx-auto max-w-[1280px]">
        <Reveal className="mx-auto max-w-[672px] text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent-dark">
            What ACQAR can do
          </p>
          <h2 className="mt-3 text-3xl font-semibold leading-[1.1] tracking-[-0.03em] text-ink sm:text-4xl">
            Everything you'd want to ask, in one chat.
          </h2>
        </Reveal>

        <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {CAPABILITIES.map((c, i) => (
            <Reveal
              key={c.title}
              delay={Math.min(i * 60, 300)}
              className="group flex flex-col items-center rounded-[20px] border border-accent/20 bg-white px-6 py-7 text-center shadow-[var(--shadow-sm)] transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[var(--shadow-lg)]"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-full border border-accent/20 bg-white shadow-[var(--shadow-sm)] transition-transform duration-300 group-hover:scale-110">
                <c.Icon weight="duotone" size={24} className="text-accent" />
              </div>
              <h3 className="mt-4 text-base font-semibold tracking-[-0.02em] text-ink">
                {c.title}
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">
                {c.desc}
              </p>
            </Reveal>
          ))}
        </div>

        <Reveal delay={360} className="mt-12 text-center">
          <Link
            to="/chat"
            className="inline-block cursor-pointer rounded-full bg-accent px-7 py-3.5 text-sm font-medium text-white shadow-[var(--shadow-glow)] transition-transform duration-200 hover:brightness-105 active:scale-95"
          >
            See a Sample Answer
          </Link>
        </Reveal>
      </div>
    </section>
  )
}
