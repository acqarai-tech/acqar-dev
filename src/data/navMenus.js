import { ChartLineUp, MapTrifold, Calculator, Buildings, ChartBar, BookOpen, Target, Newspaper } from '@phosphor-icons/react'

// Dummy content for now — swap for real destinations once those tools/pages
// exist. Shared between the desktop nav dropdowns (Nav.jsx), the mobile nav
// drawer accordions (Nav.jsx), and the mobile tab bar's Investors popup
// (MobileTabBar.jsx) so all three stay in sync from one source.
export const INVESTOR_TOOLS_ITEMS = [
  { label: 'Market Trends', desc: 'Live price trends across Dubai areas', Icon: ChartLineUp, href: '#' },
  { label: 'Area Reports', desc: 'Deep-dive reports for every community', Icon: MapTrifold, href: '/areas' },
  { label: 'Rental Yield Calculator', desc: 'Estimate rental returns before you buy', Icon: Calculator, href: '#' },
  { label: 'Off-Plan Tracker', desc: 'Track payment plans and handover dates', Icon: Buildings, href: '#' },
]

export const INSIGHTS_ITEMS = [
  { label: 'Market Insights', desc: "Weekly analysis of Dubai's property market", Icon: ChartBar, href: '#' },
  { label: 'Investor Guides', desc: 'How-to guides for buying, selling, investing', Icon: BookOpen, href: '#' },
  { label: 'Case Studies', desc: 'Real valuation stories from ACQAR users', Icon: Target, href: '#' },
  { label: 'Intelligence Blog', desc: 'News and updates from the ACQAR team', Icon: Newspaper, href: '#' },
]
