import { House, CurrencyCircleDollar, TrendUp } from '@phosphor-icons/react'
import Reveal from './Reveal'

const CARDS = [
  {
    tag: 'Buying',
    verdict: 'Buy or Don’t Buy',
    question:
      "“I'm being asked AED 1.8M for a 1BR in JVC — fair price or overpaying?”",
    Icon: House,
  },
  {
    tag: 'Selling',
    verdict: 'Sell or Hold',
    question:
      '“I own a 2BR in Business Bay, bought in 2021 — sell now or hold?”',
    Icon: CurrencyCircleDollar,
  },
  {
    tag: 'Investing',
    verdict: 'Invest or Walk Away',
    question:
      '“A studio in Silicon Oasis offers 8% yield — good, or too good to be true?”',
    Icon: TrendUp,
  },
]

export default function ThreeQuestions() {
  return (
    <section className="border-y border-line bg-white/60 px-6 pt-24 pb-12">
      <div className="mx-auto max-w-[1280px]">
        <Reveal className="mx-auto max-w-[672px] text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent-dark">
            Real questions, real answers
          </p>
          <h2 className="mt-3 text-3xl font-semibold leading-[1.1] tracking-[-0.03em] text-ink sm:text-4xl">
            Whatever you're trying to decide, ACQAR has a straight answer.
          </h2>
        </Reveal>

        <div className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-3">
          {CARDS.map((c, i) => (
            <Reveal
              key={c.tag}
              delay={i * 120}
              className="group flex flex-col items-center rounded-[20px] border border-accent/20 bg-white px-8 py-8 text-center shadow-[var(--shadow-sm)] transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[var(--shadow-lg)]"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-full border border-accent/20 bg-white shadow-[var(--shadow-sm)] transition-transform duration-300 group-hover:scale-110">
                <c.Icon weight="duotone" size={24} className="text-accent" />
              </div>
              <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
                {c.tag}
              </p>
              <p className="mt-3 text-[15px] italic leading-relaxed text-ink/80">
                {c.question}
              </p>
              <div className="mt-5 rounded-full bg-accent/10 px-4 py-1.5 text-sm font-semibold text-accent-dark transition-colors duration-300 group-hover:bg-accent group-hover:text-white">
                {c.verdict}
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
