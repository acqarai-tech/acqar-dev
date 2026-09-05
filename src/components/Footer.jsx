import acqarLogo from '../assets/acqar-logo.webp'

const COLUMNS = [
 {
    title: 'Product',
    links: [
      { label: 'ACQAR TruValu™', href: '/truvalu' },
      { label: 'Pricing', href: '#for-brokers' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About ACQAR', href: 'https://www.acqar.com/' },
      { label: 'Contact Us', href: '#' },
      { label: 'Brokers', href: '#for-brokers' },
    ],
  },
  {
    title: 'Legal & Info',
    links: [
      { label: 'Intelligence Blog', href: '#' },
      { label: 'Terms of Use', href: '#' },
      { label: 'Privacy Policy', href: '#' },
    ],
  },
]

export default function Footer() {
  return (
    <footer className="border-t border-line px-6 py-14">
      <div className="mx-auto grid max-w-[1280px] grid-cols-2 gap-10 sm:grid-cols-4">
        <div className="col-span-2 sm:col-span-1">
          <img src={acqarLogo} alt="ACQAR" className="h-6 w-auto" />
          <p className="mt-3 max-w-[240px] text-sm text-muted">
            The Real Estate AI Agent in your pocket. Independent, data-backed, and
            always on.
          </p>
        </div>

        {COLUMNS.map((col) => (
          <div key={col.title}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
              {col.title}
            </p>
            <ul className="mt-3 space-y-2">
              {col.links.map((link) => (
                <li key={link.label}>
                  <a href={link.href} className="cursor-pointer text-sm text-ink/70 transition-colors hover:text-accent-dark">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="mx-auto mt-10 max-w-[1280px] border-t border-line pt-6 text-center text-xs text-muted">
        © 2026 ACQARLABS L.L.C-FZ. All rights reserved.
      </div>
    </footer>
  )
}
