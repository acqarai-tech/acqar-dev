import { ChatCircleDots, Brain, Target } from '@phosphor-icons/react'
import Reveal from './Reveal'

const STEPS = [
  {
    step: 'Step 01',
    title: 'Ask',
    desc: 'Type your Dubai property question in your own words. No filters, no menus.',
    Icon: ChatCircleDots,
  },
  {
    step: 'Step 02',
    title: 'Analyze',
    desc: 'ACQAR reads real DLD transactions, valuation models, and live market signals in seconds.',
    Icon: Brain,
  },
  {
    step: 'Step 03',
    title: 'Decide',
    desc: 'Get a clear buy, sell, invest, or hold answer — with the numbers behind it.',
    Icon: Target,
  },
]

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="px-6 py-24">
      <div className="mx-auto max-w-[1280px]">
        <Reveal className="mx-auto max-w-[672px] text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent-dark">
            How it works
          </p>
          <h2 className="mt-3 text-3xl font-semibold leading-[1.1] tracking-[-0.03em] text-ink sm:text-4xl">
            Three steps to a straight answer.
          </h2>
        </Reveal>

        <div className="relative mt-12 grid grid-cols-1 gap-12 sm:grid-cols-3">
          <div
            className="absolute top-7 hidden h-px w-full sm:block"
            style={{
              backgroundImage:
                'linear-gradient(90deg, transparent 0%, #e5e7ec 15%, #e5e7ec 85%, transparent 100%)',
            }}
          />
          {STEPS.map((s, i) => (
            <Reveal key={s.title} delay={i * 120} className="relative flex flex-col items-center text-center">
              <div className="group flex h-14 w-14 items-center justify-center rounded-full border border-accent/20 bg-white shadow-[var(--shadow-sm)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-md)]">
                <s.Icon weight="duotone" size={24} className="text-accent transition-transform duration-300 group-hover:scale-110" />
              </div>
              <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
                {s.step}
              </p>
              <h3 className="mt-1 text-lg font-semibold">{s.title}</h3>
              <p className="mt-1.5 max-w-[320px] text-sm leading-relaxed text-muted">
                {s.desc}
              </p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
