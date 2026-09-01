import * as Accordion from '@radix-ui/react-accordion'
import { Plus } from '@phosphor-icons/react'
import Reveal from './Reveal'
import LayeredGlow from './LayeredGlow'

const FAQS = [
  {
    q: 'Who is ACQAR for?',
    a: 'Brokers, investors, buyers, and sellers — anyone who wants a straight, data-backed answer about Dubai property.',
  },
  {
    q: 'Does ACQAR cover off-plan, or only resale?',
    a: 'Both — ask about either, or ask ACQAR to compare them for a specific area.',
  },
  {
    q: 'Does ACQAR cover residential and commercial property?',
    a: "Today, ACQAR's focus is residential Dubai property — apartments, villas, and townhouses.",
  },
  {
    q: "What data backs ACQAR's answers?",
    a: 'Real DLD transaction records, not third-party estimates.',
  },
  {
    q: "I'm a first-time buyer — how does this help me?",
    a: 'Ask ACQAR whether an asking price is fair before you make an offer.',
  },
  {
    q: "I'm selling — how does this help me?",
    a: 'Ask whether now is the right time to sell or worth holding another year.',
  },
  {
    q: "I'm an investor — how does this help me?",
    a: 'Ask for yield, appreciation, and risk on any property or area before you commit.',
  },
  {
    q: "I'm a broker — how does this help with clients?",
    a: 'Get a data-backed answer live, on the call, instead of "let me check and get back to you."',
  },
  {
    q: 'Are the valuations built on a recognized standard?',
    a: 'RICS-aligned estimates.',
  },
  {
    q: 'Is ACQAR affiliated with DLD?',
    a: 'Independent — data-backed, not affiliated.',
  },
]

export default function Faq() {
  return (
    <section className="grain relative overflow-hidden px-6 py-24">
      <LayeredGlow />

      <Reveal className="mx-auto max-w-[672px] text-center">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent-dark">
          FAQ
        </p>
        <h2 className="mt-3 text-3xl font-semibold leading-[1.1] tracking-[-0.03em] text-ink sm:text-4xl">
          Questions, answered.
        </h2>
      </Reveal>

      <Accordion.Root
        type="single"
        collapsible
        defaultValue="item-0"
        className="mx-auto mt-12 max-w-[720px] divide-y divide-line"
      >
        {FAQS.map((item, i) => (
          <Reveal key={item.q} delay={Math.min(i * 40, 320)} className="py-2">
            <Accordion.Item value={`item-${i}`}>
              <Accordion.Header>
                <Accordion.Trigger className="group flex w-full cursor-pointer items-center gap-4 py-4 text-left">
                  <span className="w-7 shrink-0 text-sm font-semibold tracking-[-0.02em] text-accent">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span className="flex-1 text-base font-medium leading-snug text-ink sm:text-lg">
                    {item.q}
                  </span>
                  <Plus
                    weight="bold"
                    size={18}
                    className="shrink-0 text-accent transition-transform duration-300 group-data-[state=open]:rotate-45"
                  />
                </Accordion.Trigger>
              </Accordion.Header>
              <Accordion.Content className="faq-content">
                <p className="max-w-[620px] pb-5 pl-11 text-sm leading-relaxed text-muted sm:text-base">
                  {item.a}
                </p>
              </Accordion.Content>
            </Accordion.Item>
          </Reveal>
        ))}
      </Accordion.Root>
    </section>
  )
}
