import { Link } from 'react-router-dom'
import Reveal from './Reveal'
import productShot from '../assets/acqar-product-v3.webp'

export default function ProductShowcase() {
  return (
    <section className="grain relative overflow-hidden px-6 py-24">
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-0 -z-10 h-[420px] w-[780px] -translate-x-1/2 -translate-y-1/3 rounded-full opacity-[0.16] blur-[100px]"
        style={{ background: 'radial-gradient(circle, rgba(184,115,51,0.6), transparent 70%)' }}
      />

      <div className="mx-auto max-w-[1000px] text-center">
        <Reveal className="mx-auto max-w-[700px]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent-dark">
            See it in action
          </p>
          <h2 className="mt-3 text-3xl font-semibold leading-[1.1] tracking-[-0.03em] text-ink sm:text-4xl">
            You already know how to use it.
            <br />
            <span className="bg-gradient-to-r from-accent via-[#c98a4a] to-accent-dark bg-clip-text text-transparent">
              Just ask.
            </span>
          </h2>
        </Reveal>

        <Reveal delay={80} className="mx-auto mt-4 max-w-[620px] text-base leading-relaxed text-muted">
          You know how ChatGPT or Claude works — type a question, get an answer.
          ACQAR works the same way, except it only knows one thing: Dubai real
          estate, grounded in real DLD transactions and live market data.
        </Reveal>

        <Reveal delay={120} className="reveal-media mx-auto mt-12 w-full max-w-[900px]">
          <div className="relative">
            <div
              aria-hidden
              className="product-shadow pointer-events-none absolute inset-x-[10%] -bottom-4 h-10 rounded-full blur-2xl"
              style={{ background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.18), transparent 70%)' }}
            />
            <div className="product-float">
              <img
                src={productShot}
                alt="ACQAR chat interface shown on laptop and phone"
                className="block h-auto w-full"
              />
            </div>
          </div>
        </Reveal>

        <Reveal delay={220} className="mt-10">
          <Link
            to="/chat"
            className="inline-block cursor-pointer rounded-full bg-accent px-7 py-3.5 text-sm font-medium text-white shadow-[var(--shadow-glow)] transition-transform duration-200 hover:brightness-105 active:scale-95"
          >
            Try It on a Real Property
          </Link>
        </Reveal>
      </div>
    </section>
  )
}
