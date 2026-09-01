import * as Accordion from '@radix-ui/react-accordion'
import { CaretDown } from '@phosphor-icons/react'

// Numbered step guide as an accordion — only the current step's detail is
// expanded, so a 5-item guide reads as 5 short titles instead of a wall of
// paragraphs. Reusable wherever a sequential how-to needs to render.
export default function StepList({ steps, className = '' }) {
  return (
    <Accordion.Root
      type="single"
      collapsible
      defaultValue="step-0"
      className={`flex flex-col divide-y divide-line rounded-2xl border border-line bg-white shadow-[var(--shadow-xs)] ${className}`}
    >
      {steps.map((step, i) => (
        <Accordion.Item key={step.title} value={`step-${i}`}>
          <Accordion.Header>
            <Accordion.Trigger className="group flex w-full cursor-pointer items-center gap-4 px-5 py-4 text-left">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold text-white">
                {i + 1}
              </span>
              <span className="flex-1 text-sm font-semibold text-ink">{step.title}</span>
              <CaretDown
                weight="bold"
                size={14}
                className="shrink-0 text-ink/40 transition-transform duration-300 group-data-[state=open]:rotate-180 group-data-[state=open]:text-accent-dark"
              />
            </Accordion.Trigger>
          </Accordion.Header>
          <Accordion.Content className="faq-content">
            <p className="px-5 pb-4 pl-16 text-sm leading-relaxed text-muted">{step.body}</p>
          </Accordion.Content>
        </Accordion.Item>
      ))}
    </Accordion.Root>
  )
}
