import { WhatsappLogo } from '@phosphor-icons/react'

const WHATSAPP_GREEN = '#25D366'
const WHATSAPP_NUMBER = '971508696331'
const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}`

// Desktop-only — mobile gets the "Advisor" tab in MobileTabBar instead.
// href is a placeholder pending the real WhatsApp business number.
// Deliberately a plain pill with an always-visible label (icon + text in one
// shape) rather than PropertyStellar's rotating-text-around-a-circle
// treatment — different mechanic, not a skin of theirs.
export default function FloatingAdvisorButton() {
  return (
    <a
     href={WHATSAPP_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with a property advisor on WhatsApp"
      title="Ask a property advisor on WhatsApp"
      className="group fixed bottom-8 right-8 z-50 hidden cursor-pointer md:block"
    >
      <span
        aria-hidden
        className="absolute inset-0 rounded-full animate-ping"
        style={{ backgroundColor: WHATSAPP_GREEN, opacity: 0.3 }}
      />
      <span
        className="relative flex items-center gap-2.5 rounded-full py-3.5 pl-4 pr-5 text-sm font-semibold text-white transition-transform duration-200 group-hover:scale-105 group-active:scale-95"
        style={{ backgroundColor: WHATSAPP_GREEN, boxShadow: '0 12px 28px -6px rgba(37,211,102,0.45)' }}
      >
        <WhatsappLogo weight="fill" size={22} className="shrink-0" />
        Ask Property Advisor
      </span>
    </a>
  )
}
