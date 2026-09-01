import emaar from '../assets/logos/emaar.svg'
import damac from '../assets/logos/damac.svg'
import sobha from '../assets/logos/sobha.svg'
import binghatti from '../assets/logos/binghatti.jpg'
import nakheel from '../assets/logos/nakheel.svg'
import azizi from '../assets/logos/azizi.png'
import danube from '../assets/logos/danube.png'
import meraas from '../assets/logos/meraas.svg'
import dld from '../assets/logos/dld.png'

const LOGO_SOURCES = [
  { name: 'Dubai Land Department', logo: dld },
  { name: 'Emaar', logo: emaar },
  { name: 'DAMAC', logo: damac },
  { name: 'Sobha Realty', logo: sobha },
  { name: 'Binghatti', logo: binghatti, boxed: true },
  { name: 'Nakheel', logo: nakheel },
  { name: 'Azizi', logo: azizi },
  { name: 'Danube', logo: danube },
  { name: 'Meraas', logo: meraas },
]

const TEXT_SOURCES = ['Samana', 'Dubai Holding']

function LogoItem({ name, logo, boxed }) {
  if (boxed) {
    return (
      <img
        src={logo}
        alt={name}
        className="h-8 w-auto shrink-0 rounded-md opacity-70 grayscale transition hover:opacity-100 hover:grayscale-0"
      />
    )
  }
  return (
    <img
      src={logo}
      alt={name}
      className="h-6 w-auto shrink-0 object-contain opacity-50 grayscale transition hover:opacity-90 hover:grayscale-0"
    />
  )
}

export default function DeveloperMarquee() {
  const items = [...LOGO_SOURCES, ...TEXT_SOURCES.map((name) => ({ name, text: true }))]
  const track = [...items, ...items]

  return (
    <div className="mx-auto mt-14 w-full max-w-[1000px]">
      <p className="mb-3 whitespace-nowrap text-center text-[9px] font-semibold uppercase tracking-[0.08em] text-muted sm:text-[11px] sm:tracking-[0.14em]">
        Tracking data across Dubai's top developers
      </p>
      <div
        className="marquee-track relative overflow-hidden"
        style={{
          maskImage:
            'linear-gradient(90deg, transparent 0%, black 8%, black 92%, transparent 100%)',
          WebkitMaskImage:
            'linear-gradient(90deg, transparent 0%, black 8%, black 92%, transparent 100%)',
        }}
      >
        <div className="animate-marquee flex w-max items-center gap-12 whitespace-nowrap py-1">
          {track.map((item, i) =>
            item.text ? (
              <span
                key={`${item.name}-${i}`}
                className="text-[15px] font-semibold tracking-tight text-ink/35 select-none"
              >
                {item.name}
              </span>
            ) : (
              <LogoItem key={`${item.name}-${i}`} {...item} />
            )
          )}
        </div>
      </div>
    </div>
  )
}
