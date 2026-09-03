import { Snowflake, Train, Car, Storefront, GraduationCap, FirstAidKit, Airplane } from '@phosphor-icons/react'
import { supabase } from '../lib/supabase'

// Demo/reference data only — for building and reviewing the Areas list and
// Area Specialist detail pages. Swap for real DLD-backed data once that
// pipeline exists. Scores below are synthetically generated for the
// demo (deterministic per area name, not scraped from any live source).

const AREA_NAMES = [
  'Downtown Dubai',
  'Dubai Marina',
  'Business Bay',
  'Jumeirah Village Circle (JVC)',
  'Jumeirah Village Triangle (JVT)',
  'Palm Jumeirah',
  'Dubai Hills Estate',
  'Arabian Ranches',
  'Al Barsha',
  'Jumeirah Lake Towers (JLT)',
  'Dubai Sports City',
  'Dubai Silicon Oasis',
  'International City',
  'Discovery Gardens',
  'The Springs',
  'The Meadows',
  'Emirates Hills',
  'Motor City',
  'Dubai Investment Park',
  'Dubai South',
  'Al Furjan',
  'DAMAC Hills',
  'DAMAC Hills 2',
  'Town Square',
  'Mudon',
  'Arjan',
  'Al Quoz',
  'Deira',
  'Bur Dubai',
  'Al Karama',
  'Al Nahda',
  'Mirdif',
  'Al Warqa',
  'Nad Al Sheba',
  'Meydan',
  'Dubai Creek Harbour',
  'City Walk',
  'Al Wasl',
  'Umm Suqeim',
  'Al Sufouh',
  'DIFC',
  'Dubai Design District',
  'Culture Village',
  'Dubai Festival City',
  'Al Jaddaf',
  'Dubai Healthcare City',
  'Dubai Land Residence Complex',
  'Al Barari',
  'Green Community',
  'DAMAC Lagoons',
  'Tilal Al Ghaf',
  'The Valley',
  'Dubai Islands',
  'Bluewaters Island',
]

export function slugify(name) {
  return name
    .toLowerCase()
    .replace(/\(([^)]+)\)/g, '$1')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}


const DLD_AREA_NAME_MAP = {
  'Jumeirah Village Triangle (JVT)': 'Al Barsha South Fifth',
  'Dubai Hills Estate': 'Hadaeq Sheikh Mohammed Bin Rashid',
  'Al Jaddaf': 'Al Jadaf',
  'DAMAC Hills 2': 'Madinat Hind 4',
  'Jumeirah Lake Towers (JLT)': 'Al Thanyah Fifth',
}

function hash(str) {
  let h = 0
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0
  return h
}

function scoreFor(name) {
  const h = hash(name)
  return Math.round((2 + ((h % 76) / 76) * 7.5) * 10) / 10
}

function verdictFor(score) {
  if (score >= 7.2) return 'Buy'
  if (score < 4.3) return 'Hold'
  return 'Watch'
}

// ---------------------------------------------------------------------------
// Full "Area Specialist" profiles — hand-authored for a few areas to
// showcase the complete widget set. Every other area in AREA_LIST still
// gets a working detail page (see getAreaProfile below), just with the
// lighter, synthetically generated sections instead of the bespoke ones
// (buying steps, developer track record, resilience report).
// ---------------------------------------------------------------------------

const JVC_PROFILE = {
  slug: 'jumeirah-village-circle-jvc',
  name: 'Jumeirah Village Circle (JVC)',
  tag: 'Prime · Mixed-Use Residential',
  zone: 'Prime',
  score: 80,
  verdict: 'Buy',
  outlookLabel: '12-month outlook · Aug 2026',
  scoreBreakdown: [
    { label: 'Are people buying?', value: 70 },
    { label: 'Is the price fair?', value: 88 },
    { label: "What's coming nearby?", value: 94 },
    { label: 'Is the mood positive?', value: 50 },
  ],
  alert: {
    title: 'Market note',
    body: "Regional headlines have cooled buyer sentiment this quarter — a mood shift, not a fundamentals problem. JVC has weathered every past slowdown within 8–16 months; see the Resilience table in the Past tab.",
  },
  metrics: [
    { label: 'Homes sold this week', value: '595', note: 'Flat vs last week', tone: 'default' },
    { label: "What's a fair price here?", value: 'AED 1,550/sqft', note: 'Slightly up over 3 months', tone: 'positive' },
    { label: 'Rent return per year', value: '7%', note: "Better than Dubai's 6.1% average", tone: 'positive' },
    { label: 'How long to sell?', value: '43 days', note: 'A bit slower than usual', tone: 'caution' },
    { label: 'Homes available to buy', value: '5,500', note: 'More choice than normal — good for buyers', tone: 'default' },
    { label: 'Market mood right now', value: 'Slow', note: 'Worth watching closely', tone: 'caution' },
  ],
  brief: {
    updated: 'Aug 2026',
    sources: 14,
    text: "A short-term confidence dip driven by headlines, not fundamentals. Yield, infrastructure, and below-fair-value supply all still point the same way: a selective entry window for patient buyers.",
  },
  pricing: {
    columns: ['Property type', 'Cheapest', 'Fair price', 'Most expensive'],
    rows: [
      ['Studio', 'AED 420K', 'AED 560K', 'AED 720K'],
      ['1 Bedroom', 'AED 780K', 'AED 1.24M', 'AED 1.65M'],
      ['2 Bedroom', 'AED 1.15M', 'AED 1.78M', 'AED 2.40M'],
      ['3 Bedroom', 'AED 1.80M', 'AED 2.65M', 'AED 3.35M'],
      ['Townhouse 3BR', 'AED 2.70M', 'AED 4.01M', 'AED 5.39M'],
    ],
  },
  ownershipCosts: [
    { label: 'DLD transfer fee', value: '4% of purchase price' },
    { label: 'Agent commission', value: '2% (negotiable)' },
    { label: 'Annual service charges', value: 'AED 12–18/sqft' },
    { label: 'Typical annual maintenance', value: 'AED 5,000–15,000' },
    { label: 'Annual rental income (1BR)', value: 'AED 87K avg' },
    { label: 'Net yield after charges (est.)', value: '5.8%' },
    { label: 'Mortgage availability', value: 'Up to 80% LTV for expats' },
  ],
  priceHistory: [
    { label: '2022', value: 1180 },
    { label: '2023', value: 1340 },
    { label: '2024', value: 1520 },
    { label: '2025', value: 1460 },
    { label: '2026', value: 1594 },
  ],
  maturity: [
    { label: 'Year established', value: '2005' },
    { label: 'Master developer', value: 'Nakheel' },
    { label: 'Zone', value: 'Prime' },
    { label: 'Total area', value: '870 hectares' },
    { label: 'Completion rate', value: '~75% built' },
    { label: 'Residential units', value: '105,860 registered' },
    { label: 'Occupancy rate', value: '90%' },
    { label: 'Parks', value: '33 landscaped parks' },
    { label: 'Active off-plan projects', value: '10 projects' },
    { label: 'Pipeline units (est.)', value: '990' },
    { label: 'Retail', value: 'Circle Mall (235 shops) + 200+ outlets' },
    { label: '5-year appreciation', value: '+54.0%' },
  ],
  developers: {
    columns: ['Developer', 'On-time %', 'Avg delay', 'Rating', 'Segment'],
    rows: [
      ['Danube Properties', '94%', '~0.5 months', 5, 'affordable'],
      ['Binghatti Developers', '92%', 'On time / early', 5, 'mid-market'],
      ['Ellington Properties', '88%', '~2 months', 4, 'luxury'],
      ['Iman Developers', '88%', '~2 months', 4, 'mid-market'],
      ['Tiger Group', '78%', '~4.5 months', 3, 'affordable'],
      ['Samana Developers', '77%', '~6.5 months', 3, 'mid-market'],
    ],
  },
  resilience: {
    columns: ['Event', 'Period', 'Price impact', 'Recovery time', 'What drove recovery', 'Happening now?'],
    rows: [
      ['Oil price crash', '2014–2016', '-14%', '16 months', 'Affordable yield appeal + end-user demand', 'More resilient than prime, given yield strength'],
      ['Expo slowdown', '2019–2020', '-8%', '8 months', 'Affordable entry pricing vs. Downtown', 'Mid-market usually recovers first in the cycle'],
      ['COVID-19', 'Q2–Q3 2020', '-10%', '12 months', 'Affordability + rental demand stability', 'Some areas took longer due to supply glut'],
      ['Russia/Ukraine war', 'Feb 2022', '+8%', 'N/A (rose)', 'Spill-over demand from pricier prime areas', 'Benefited as buyers got priced out of prime'],
      ['Current headlines', 'Aug 2026 →', '-4% so far', 'Projected 6–8 mo.', 'Rental yield floor (7–9%) + metro proximity', 'This is the current event'],
    ],
  },
  comments: [
    {
      name: 'Ahmed R.',
      initials: 'AR',
      hoursAgo: 5,
      text: "Picked up a 1BR here in 2023, yield's held up better than my Marina unit honestly. The metro opening next year should help too.",
      score: 14,
    },
    {
      name: 'Priya S.',
      initials: 'PS',
      hoursAgo: 22,
      text: 'Is the distress listing % just sellers panicking about the news, or is there something structural going on with supply?',
      score: 6,
    },
    {
      name: 'Marcus T.',
      initials: 'MT',
      hoursAgo: 48,
      text: "Circle Mall phase 2 is the one to watch — that's what actually shifts this from a bachelor area to a family one long-term.",
      score: 9,
    },
  ],
  ticker: [
    { label: 'Sold this week', value: '595 homes' },
    { label: 'Fair price', value: 'AED 1,550/sqft' },
    { label: 'Rental return', value: '7%/year' },
    { label: 'Distress listings', value: '17.2% below fair value' },
    { label: 'Metro opening', value: 'Dec 2026 · Confirmed' },
    { label: 'Off-plan pipeline', value: '10 active projects' },
    { label: 'Signal', value: 'Buy · Score 80/100' },
  ],
  present: {
    distress: {
      value: '17.2%',
      body: '946 listings priced below the Truvalu™ floor — above the 11% 12-month average. A genuine entry window for patient buyers, widest in 2BR and townhouse units.',
    },
    transactionVolume: {
      subtitle: 'DLD · monthly transactions',
      data: [
        { label: 'Mar 25', value: 4180 },
        { label: 'Apr 25', value: 4320 },
        { label: 'May 25', value: 4450 },
        { label: 'Jun 25', value: 4390 },
        { label: 'Jul 25', value: 4510 },
        { label: 'Aug 25', value: 4470 },
        { label: 'Sep 25', value: 4390 },
        { label: 'Oct 25', value: 4520 },
        { label: 'Nov 25', value: 4610 },
        { label: 'Dec 25', value: 4580 },
        { label: 'Jan 26', value: 4600 },
        { label: 'Feb 26', value: 4560, showValue: true },
      ],
      band: { startIndex: 10, endIndex: 11, label: 'Iran/USA shock period' },
    },
    composition: [
      { leftLabel: 'Off-plan (primary)', leftValue: 58, rightLabel: 'Ready (secondary)', rightValue: 42 },
      { leftLabel: 'Apartments', leftValue: 97, rightLabel: 'Villas/TH', rightValue: 3 },
      { leftLabel: 'Residential', leftValue: 100, rightLabel: 'Commercial', rightValue: 0 },
      { leftLabel: 'Studio & 1BR', leftValue: 77, rightLabel: '2BR+', rightValue: 23 },
      { leftLabel: 'Long-term resident', leftValue: 88, rightLabel: 'Tourist/short-stay', rightValue: 12 },
    ],
    rentRanges: {
      columns: ['Type', 'Min', 'Avg', 'Max'],
      rows: [
        ['Studio', 'AED 37,000', 'AED 49,000', 'AED 66,000'],
        ['1 BR', 'AED 65,000', 'AED 87,000', 'AED 117,000'],
        ['2 BR', 'AED 102,000', 'AED 136,000', 'AED 183,000'],
        ['3 BR', 'AED 146,000', 'AED 195,000', 'AED 264,000'],
        ['Townhouse', 'AED 195,000', 'AED 260,000', 'AED 352,000'],
      ],
    },
    benchmark: {
      columns: ['Type', 'Truvalu™', 'Ask PSF', 'Status'],
      rows: [
        ['Studio', 'AED 1,473', 'AED 1,488', 'Fair'],
        ['1 Bedroom', 'AED 1,550', 'AED 1,614', 'Premium'],
        ['2 Bedroom', 'AED 1,510', 'AED 1,451', 'Opportunity'],
        ['3 Bedroom', 'AED 1,485', 'AED 1,463', 'Fair'],
        ['Townhouse', 'AED 1,665', 'AED 1,597', 'Opportunity'],
      ],
    },
    nationality: [
      { flag: '🇮🇳', label: 'Indian', value: 34 },
      { flag: '🇵🇰', label: 'Pakistani', value: 15 },
      { flag: '🇬🇧', label: 'British', value: 14 },
      { flag: '🇷🇺', label: 'Russian', value: 11 },
      { flag: '🇧🇩', label: 'Bangladeshi', value: 7 },
      { flag: '🇨🇳', label: 'Chinese', value: 6 },
      { flag: '🌍', label: 'Other', value: 13 },
    ],
  },
  future: {
    timeline: [
      {
        date: 'Sept 2026',
        status: 'Confirmed',
        title: 'Empower District Cooling Plant 2 — JVC infrastructure',
        body: 'Green space and community amenity work expected to improve resident satisfaction and occupancy rates.',
        impact: 'Resident satisfaction ↑, occupancy ↑',
        Icon: Snowflake,
      },
      {
        date: 'Dec 2026',
        status: 'Confirmed',
        title: 'Metro Blue Line — Al Khail Station',
        body: 'Metro stations have historically driven 8–14% PSF appreciation within a 1km radius within 12 months of opening.',
        impact: '+8–14% PSF (1km radius)',
        Icon: Train,
      },
      {
        date: 'Dec 2026',
        status: 'Confirmed',
        title: 'Hessa Street upgrade — 3 new JVC entry/exit points',
        body: 'New entry/exit points reduce congestion and improve connectivity to Sheikh Mohammed Bin Zayed Road.',
        impact: 'Connectivity ↑, commute time ↓',
        Icon: Car,
      },
      {
        date: 'Jun 2027',
        status: 'Confirmed',
        title: 'Circle Mall Phase 2 — 800K sqft expansion',
        body: 'An 800,000 sqft retail expansion by Nakheel, shifting the area from bachelor-dominant toward family-friendly.',
        impact: '+5–8% rental demand, family buyer ratio ↑',
        Icon: Storefront,
      },
      {
        date: 'Sept 2027',
        status: 'Announced',
        title: 'GEMS World Academy — JVC campus (1,800 students)',
        body: 'A 1,800-student campus expected to shift the occupant profile toward families and lift 2BR/3BR demand.',
        impact: '+12–18% demand for 2–3BR units',
        Icon: GraduationCap,
      },
      {
        date: 'Jun 2028',
        status: 'Likely',
        title: 'DHA medical facility — JVC area catchment',
        body: 'Healthcare infrastructure consistently correlates with higher family occupancy and rental demand.',
        impact: 'Family ratio ↑, rental stability ↑',
        Icon: FirstAidKit,
      },
      {
        date: 'Dec 2030',
        status: 'Announced',
        title: 'Al Maktoum International Airport Phase 2 (15 min away)',
        body: "An AED 128B project confirmed to become the world's largest airport by 2040 — a long-term residential demand tailwind.",
        impact: 'Long-term valuation tailwind',
        Icon: Airplane,
      },
    ],
    catalystScore: {
      score: 88,
      facts: [
        { label: 'Confirmed infrastructure', value: '4 items' },
        { label: 'Announced (pending)', value: '2 items' },
        { label: 'Dubai 2040 zone alignment', value: 'Strong' },
        { label: 'Transport improvement', value: 'Metro Q4 2026' },
        { label: 'School infrastructure', value: 'Improving' },
      ],
    },
    supply: [
      { label: 'Active projects in area', value: '10' },
      { label: 'Total pipeline units', value: '990 est.' },
      { label: 'Delivering 2026', value: '210 units' },
      { label: 'Delivering 2027 (peak)', value: '460 units' },
      { label: 'Supply risk', value: 'Moderate — watch 2027', wide: true },
    ],
    projects: [
      { name: 'The Weave', delivery: '2025–2027', psfFrom: 'AED 1,318', sold: 40, built: 15 },
      { name: 'Sky Harmony by Peace Homes', delivery: '2025–2027', psfFrom: 'AED 1,318', sold: 52, built: 29 },
      { name: '368 Park Ln', delivery: '2025–2027', psfFrom: 'AED 1,318', sold: 64, built: 43 },
      { name: 'Binghatti Etherea', delivery: '2025–2027', psfFrom: 'AED 1,318', sold: 76, built: 57 },
      { name: 'Oxford Cove', delivery: '2025–2027', psfFrom: 'AED 1,318', sold: 88, built: 71 },
      { name: 'Serenz by Danube', delivery: '2025–2027', psfFrom: 'AED 1,318', sold: 40, built: 85 },
      { name: 'Shape', delivery: '2025–2027', psfFrom: 'AED 1,318', sold: 52, built: 15 },
      { name: '1Wood Residence 2', delivery: '2025–2027', psfFrom: 'AED 1,318', sold: 64, built: 29 },
      { name: 'Tresora by Wadan', delivery: '2025–2027', psfFrom: 'AED 1,318', sold: 76, built: 43 },
      { name: 'Sky Level 1', delivery: '2025–2027', psfFrom: 'AED 1,318', sold: 88, built: 57 },
    ],
  },
  investor: {
    stats: [
      { label: 'Gross yield', value: '7%', note: "Dubai avg 6.1% — JVC's been above average for 4 years" },
      { label: 'Distress opportunity', value: '17.2%', note: '946 units priced below the Truvalu™ floor' },
      { label: 'Catalyst score', value: '88/100', note: '4 confirmed infrastructure catalysts in the next 24 months' },
      { label: 'Off-plan pipeline', value: '10 projects', note: 'incl. The Weave, Sky Harmony, 368 Park Ln…' },
    ],
    composition: [
      { leftLabel: 'Off-plan (primary)', leftValue: 58, rightLabel: 'Ready (secondary)', rightValue: 42 },
      { leftLabel: 'Investor-owned', leftValue: 62, rightLabel: 'End-user', rightValue: 38 },
      { leftLabel: 'Apartments', leftValue: 87, rightLabel: 'Villas/TH', rightValue: 13 },
      { leftLabel: 'Long-term tenants', leftValue: 88, rightLabel: 'Short-stay', rightValue: 12 },
    ],
    benchmark: {
      columns: ['Type', 'Truvalu™', 'Asking', 'Gap', 'Signal'],
      rows: [
        ['Studio', 'AED 1,473', 'AED 1,489', '+1.1%', 'Fair'],
        ['1 Bedroom', 'AED 1,550', 'AED 1,614', '+4.1%', 'Premium'],
        ['2 Bedroom', 'AED 1,510', 'AED 1,451', '-3.9%', 'Opportunity'],
        ['3 Bedroom', 'AED 1,485', 'AED 1,464', '-1.4%', 'Fair'],
        ['Townhouse', 'AED 1,665', 'AED 1,597', '-4.1%', 'Opportunity'],
      ],
    },
    rentalYield: {
      data: [
        { label: 'Studio', value: 8.3 },
        { label: '1 BR', value: 7 },
        { label: '2 BR', value: 6.6 },
        { label: '3 BR', value: 6.2 },
        { label: 'TH 3BR', value: 5.7 },
      ],
      dubaiAvg: 6.1,
      facts: [
        { label: 'Best yield unit type', value: 'Studio (8.3%)' },
        { label: '5-year yield trend', value: '↑ 6.1% → 7%' },
        { label: 'Average days to rent', value: '18 days' },
        { label: 'Vacancy rate', value: '10%' },
      ],
    },
  },
  owner: {
    asset: {
      unitLabel: '1 Bedroom in JVC',
      valueRange: 'AED 1.20M – 1.46M',
      note: 'Based on floor level, view, building quality, and matched DLD transactions. Updated daily.',
      fairValue: 'AED 1.24M',
      deltas: [
        { label: 'vs 6 months ago', value: '↑ +AED 41,000' },
        { label: 'vs 5-year purchase price', value: '↑ +54.0%' },
      ],
    },
    sell: {
      question: 'Should you sell now?',
      verdict: 'Yes — good time',
      body: 'Buyer demand is elevated and days-on-market is low — a favorable window if you need to sell.',
      stats: [
        { label: 'Current market sentiment', value: 'Bullish' },
        { label: 'Days to sell (current)', value: '43 days' },
        { label: 'Expected post-catalyst lift', value: '8–14%' },
        { label: 'Optimal sell window', value: 'Now — strong market' },
      ],
    },
    rent: {
      question: 'Should you rent it out?',
      verdict: 'Yes — good yield',
      body: 'The rental market stays active even during a transaction slowdown — tenants keep needing homes regardless of headlines.',
      stats: [
        { label: 'Annual long-term rent (1BR)', value: 'AED 81K–87K' },
        { label: 'Short-term furnished (1BR)', value: 'AED 87K–109K' },
        { label: 'Average days to find tenant', value: '18 days' },
        { label: 'Current vacancy rate', value: '10%' },
      ],
    },
    areaVsDubai: [
      { label: 'Rental yield', value: '7% vs 6.1% avg' },
      { label: '5-year price appreciation', value: '+54.0%' },
      { label: 'Occupancy rate', value: '90%' },
      { label: 'Supply growth (risk)', value: '6.4% ↑ moderate' },
      { label: 'Infrastructure catalyst score', value: '88/100' },
      { label: 'Price resilience (past shocks)', value: 'Always recovered <16mo' },
      { label: "Acqar's 12-month outlook", value: 'Buy — strong momentum' },
    ],
  },
}

const BUSINESS_BAY_PROFILE = {
  slug: 'business-bay',
  name: 'Business Bay',
  tag: 'Prime · Business & Residential District',
  zone: 'Prime',
  score: 69,
  verdict: 'Hold',
  outlookLabel: '12-month outlook · Aug 2026',
  scoreBreakdown: [
    { label: 'Are people buying?', value: 62 },
    { label: 'Is the price fair?', value: 58 },
    { label: "What's coming nearby?", value: 80 },
    { label: 'Is the mood positive?', value: 55 },
  ],
  metrics: [
    { label: 'Homes sold this week', value: '410', note: '3% down vs last week', tone: 'caution' },
    { label: "What's a fair price here?", value: 'AED 1,980/sqft', note: 'Roughly flat over 3 months', tone: 'default' },
    { label: 'Rent return per year', value: '6.3%', note: "Just above Dubai's 6.1% average", tone: 'positive' },
    { label: 'How long to sell?', value: '38 days', note: 'In line with the usual pace', tone: 'default' },
    { label: 'Homes available to buy', value: '3,200', note: 'Steady supply', tone: 'default' },
    { label: 'Market mood right now', value: 'Steady', note: 'No major shift either way', tone: 'default' },
  ],
  brief: {
    updated: 'Aug 2026',
    sources: 12,
    text: "Business Bay's fundamentals remain solid — a central location, deep rental demand, and continued canal-front development — but pricing has caught up with the fundamentals over the past two years, leaving less obvious upside for new buyers today than areas still working through a price-discovery phase.",
  },
  priceHistory: [
    { label: '2022', value: 1640 },
    { label: '2023', value: 1820 },
    { label: '2024', value: 1960 },
    { label: '2025', value: 1990 },
    { label: '2026', value: 1980 },
  ],
  maturity: [
    { label: 'Year established', value: '2003' },
    { label: 'Master developer', value: 'Dubai Properties' },
    { label: 'Zone', value: 'Prime' },
    { label: 'Total area', value: '460 hectares' },
    { label: 'Completion rate', value: '~85% built' },
    { label: 'Residential units', value: '62,400 registered' },
    { label: 'Occupancy rate', value: '92%' },
    { label: '5-year appreciation', value: '+38.5%' },
  ],
}

const DUBAI_MARINA_PROFILE = {
  slug: 'dubai-marina',
  name: 'Dubai Marina',
  tag: 'Prime · Waterfront Residential',
  zone: 'Prime',
  score: 74,
  verdict: 'Buy',
  outlookLabel: '12-month outlook · Aug 2026',
  scoreBreakdown: [
    { label: 'Are people buying?', value: 75 },
    { label: 'Is the price fair?', value: 64 },
    { label: "What's coming nearby?", value: 70 },
    { label: 'Is the mood positive?', value: 68 },
  ],
  metrics: [
    { label: 'Homes sold this week', value: '380', note: '5% up vs last week', tone: 'positive' },
    { label: "What's a fair price here?", value: 'AED 2,150/sqft', note: 'Up over 3 months', tone: 'positive' },
    { label: 'Rent return per year', value: '6.6%', note: "Above Dubai's 6.1% average", tone: 'positive' },
    { label: 'How long to sell?', value: '31 days', note: 'Faster than usual', tone: 'positive' },
    { label: 'Homes available to buy', value: '2,850', note: 'Tighter than normal', tone: 'default' },
    { label: 'Market mood right now', value: 'Active', note: 'Demand holding up well', tone: 'positive' },
  ],
  brief: {
    updated: 'Aug 2026',
    sources: 13,
    text: 'Dubai Marina is one of the few established prime areas still showing tightening supply and shortening sale times this year — a combination that historically precedes further price firmness rather than a plateau.',
  },
  priceHistory: [
    { label: '2022', value: 1780 },
    { label: '2023', value: 1920 },
    { label: '2024', value: 2040 },
    { label: '2025', value: 2090 },
    { label: '2026', value: 2150 },
  ],
  maturity: [
    { label: 'Year established', value: '2003' },
    { label: 'Master developer', value: 'Emaar Properties' },
    { label: 'Zone', value: 'Prime' },
    { label: 'Total area', value: '500 hectares' },
    { label: 'Completion rate', value: '~95% built' },
    { label: 'Residential units', value: '48,900 registered' },
    { label: 'Occupancy rate', value: '94%' },
    { label: '5-year appreciation', value: '+46.0%' },
  ],
}

const FULL_PROFILES = {
  [JVC_PROFILE.slug]: JVC_PROFILE,
  [BUSINESS_BAY_PROFILE.slug]: BUSINESS_BAY_PROFILE,
  [DUBAI_MARINA_PROFILE.slug]: DUBAI_MARINA_PROFILE,
}

// Areas with a hand-authored full profile must show the SAME score/verdict
// in the list as on their detail page — derive from the profile (score is
// /100 there) instead of the independent synthetic hash used for every
// other area, so the two pages never disagree.
export const AREA_LIST = AREA_NAMES.map((name) => {
  const slug = slugify(name)
  const full = FULL_PROFILES[slug]
  const score = full ? Math.round(full.score / 10) / 10 : scoreFor(name)
  return {
    name,
    slug,
    score,
    verdict: full ? full.verdict : verdictFor(score),
  }
}).sort((a, b) => a.name.localeCompare(b.name))

// Live version of AREA_LIST — pulls real score/verdict from the
// area_intelligence table, falling back to the synthetic AREA_LIST
// above (per area) wherever a DB row is missing or the fetch fails.
export async function fetchAreaList() {
  const { data, error } = await supabase
    .from('area_intelligence')
    .select('area_id, area_name_en, investment_score, gross_yield_pct, truvalu_psm, verdict')

  if (error) {
    console.error('Failed to load area_intelligence:', error)
    return AREA_LIST
  }

  const bySlug = new Map()

  // Start with every area already known to the app (the curated 54), so
  // nothing regresses even if the DB is momentarily missing one of them.
  AREA_NAMES.forEach((name) => {
    const slug = slugify(name)
    const full = FULL_PROFILES[slug]
    const score = full ? Math.round(full.score / 10) / 10 : scoreFor(name)
    bySlug.set(slug, { name, slug, score, verdict: full ? full.verdict : verdictFor(score) })
  })

  // Then layer in every row from area_intelligence — overwriting the
  // placeholder with real data, and adding any area the DB has that
  // isn't part of the curated 54.
  ;(data || []).forEach((row) => {
    const slug = slugify(row.area_name_en || '')
    if (!slug || FULL_PROFILES[slug]) return // hand-authored areas keep their curated score/verdict

    const score100 = Number(row.investment_score)
    if (!Number.isFinite(score100)) return

    const score = Math.round(score100) / 10
    const verdict = row.verdict
      ? row.verdict.charAt(0).toUpperCase() + row.verdict.slice(1).toLowerCase()
      : verdictFor(score)
    bySlug.set(slug, { name: row.area_name_en, slug, score, verdict })
  })

  return Array.from(bySlug.values()).sort((a, b) => a.name.localeCompare(b.name))
}

const MOOD_WORDS = ['Slow', 'Steady', 'Warming', 'Active', 'Hot']
const DAYS_TO_SELL = [28, 33, 38, 43, 51, 58]

// Generates a lightweight-but-complete profile for any area that doesn't
// have hand-authored content above, so every entry in AREA_LIST resolves to
// a working detail page instead of a dead link.
function synthesizeProfile(entry, dbRow) {
  const h = hash(entry.name)
  const psm = dbRow ? Number(dbRow.truvalu_psm) || 0 : 0
  const pricePerSqft = psm ? Math.round(psm / 10.764) : 900 + (h % 1400)
  const dbYield = dbRow ? Number(dbRow.gross_yield_pct) : NaN
  const yieldPct = Number.isFinite(dbYield) ? dbYield.toFixed(1) : (5 + ((h >> 3) % 35) / 10).toFixed(1)
  const days = DAYS_TO_SELL[h % DAYS_TO_SELL.length]
  const mood = MOOD_WORDS[h % MOOD_WORDS.length]
  const dbTx = dbRow ? Number(dbRow.tx_7d) : NaN
  const soldThisWeek = Number.isFinite(dbTx) ? dbTx : 60 + (h % 340)
  const available = 400 + (h % 4200)
  const dbScore = dbRow ? Number(dbRow.investment_score) : NaN
  const score100 = Number.isFinite(dbScore) ? Math.round(dbScore) : Math.round(entry.score * 10)
  const verdict = dbRow?.verdict
    ? dbRow.verdict.charAt(0).toUpperCase() + dbRow.verdict.slice(1).toLowerCase()
    : entry.verdict

  return {
    slug: entry.slug,
    name: entry.name,
    tag: `${verdict === 'Buy' ? 'Emerging' : 'Established'} · Residential District`,
    zone: verdict === 'Buy' ? 'Growth' : 'Established',
    score: score100,
    verdict,
    outlookLabel: '12-month outlook · Aug 2026',
    scoreBreakdown: [
      { label: 'Are people buying?', value: Math.min(96, score100 + (h % 15) - 5) },
      { label: 'Is the price fair?', value: Math.min(96, score100 + (h % 10)) },
      { label: "What's coming nearby?", value: Math.min(96, 40 + (h % 55)) },
      { label: 'Is the mood positive?', value: Math.min(96, 35 + (h % 50)) },
    ],
    metrics: [
      { label: 'Homes sold this week', value: String(soldThisWeek), note: 'vs last week', tone: 'default' },
      { label: "What's a fair price here?", value: `AED ${pricePerSqft.toLocaleString()}/sqft`, note: 'Based on recent transactions', tone: 'default' },
      { label: 'Rent return per year', value: `${yieldPct}%`, note: "Dubai average is 6.1%", tone: Number(yieldPct) >= 6.1 ? 'positive' : 'default' },
      { label: 'How long to sell?', value: `${days} days`, note: 'Typical time on market', tone: days > 45 ? 'caution' : 'default' },
      { label: 'Homes available to buy', value: available.toLocaleString(), note: 'Current active listings', tone: 'default' },
      { label: 'Market mood right now', value: mood, note: 'Based on recent transaction pace', tone: mood === 'Slow' ? 'caution' : 'default' },
    ],
    brief: null,
    priceHistory: [0, 1, 2, 3, 4].map((i) => ({
      label: String(2022 + i),
      value: Math.round(pricePerSqft * (0.78 + i * 0.055)),
    })),
       maturity: [
      { label: 'Zone', value: verdict === 'Buy' ? 'Growth corridor' : 'Established' },
      { label: 'Current signal score', value: `${(score100 / 10).toFixed(1)}/10` },
      { label: 'Typical rental yield', value: `${yieldPct}%` },
      { label: 'Active listings', value: available.toLocaleString() },
    ],
  }
}


export async function fetchAreaProfile(slug) {
  if (FULL_PROFILES[slug]) return FULL_PROFILES[slug]

  let entry = AREA_LIST.find((a) => a.slug === slug)

   const { data, error } = await supabase
    .from('area_intelligence')
    .select('area_id, area_name_en, investment_score, gross_yield_pct, truvalu_psm, verdict, tx_7d, key_developers, zone_type')

  if (error) {
    console.error('Failed to load area_intelligence:', error)
    return entry ? synthesizeProfile(entry) : null
  }

  const row = (data || []).find((r) => slugify(r.area_name_en || '') === slug)

  if (!entry) {
    // Not one of the curated 54 — but the DB has it, so build a working
    // entry straight from the row instead of giving up.
    if (!row || !Number.isFinite(Number(row.investment_score))) return null
    const score = Math.round(Number(row.investment_score)) / 10
    entry = {
      name: row.area_name_en,
      slug,
      score,
      verdict: row.verdict
        ? row.verdict.charAt(0).toUpperCase() + row.verdict.slice(1).toLowerCase()
        : verdictFor(score),
    }
  }

  const base = synthesizeProfile(entry, row)
  if (!row?.area_id) return base

  const pastExtras = await fetchPastTabData(row.area_id, entry.name, row.key_developers, row.zone_type)
  return { ...base, ...pastExtras }
}


async function fetchPastTabData(areaId, areaName, keyDevelopers, zoneType) {
  const result = {}

  const [monthly, manual] = await Promise.all([
    supabase.from('price_history_monthly').select('sale_year, sale_month, psf').eq('area_id', areaId).gte('sale_year', 2020),
    supabase.from('price_history_manual').select('sale_year, sale_month, psf').eq('area_id', areaId).gte('sale_year', 2020),
  ])
  const rows = [...(manual.data || []), ...(monthly.data || [])]
  if (rows.length) {
    const byYear = {}
    rows.forEach((r) => {
      if (!byYear[r.sale_year]) byYear[r.sale_year] = []
      byYear[r.sale_year].push(Number(r.psf))
    })
    result.priceHistory = Object.entries(byYear)
      .sort(([a], [b]) => a - b)
      .slice(-5)
      .map(([year, vals]) => ({
        label: year,
        value: Math.round(vals.reduce((s, v) => s + v, 0) / vals.length),
      }))
  }

  if (keyDevelopers?.length) {
    const list = keyDevelopers.filter((d) => d !== 'Various')
    if (list.length) {
      const { data } = await supabase
        .from('developer_track_records')
        .select('developer_name, on_time_pct, avg_delay_months, star_rating, market_segment')
        .in('developer_name', list)
        .order('on_time_pct', { ascending: false })
      if (data?.length) {
        result.developers = {
          columns: ['Developer', 'On-time %', 'Avg delay', 'Rating', 'Segment'],
          rows: data.map((d) => [
            d.developer_name,
            `${d.on_time_pct}%`,
            d.avg_delay_months === 0 ? 'On time / early' : `~${d.avg_delay_months} months`,
            d.star_rating,
            d.market_segment,
          ]),
        }
      }
    }
  }

  if (zoneType) {
    const { data } = await supabase
      .from('area_shock_impacts')
      .select('event_name, event_period, price_impact_pct, recovery_months, recovery_driver, notes')
      .eq('zone_type', zoneType)
      .order('id', { ascending: true })
    if (data?.length) {
      result.resilience = {
        columns: ['Event', 'Period', 'Price impact', 'Recovery time', 'What drove recovery', 'Happening now?'],
        rows: data.map((s) => [
          s.event_name,
          s.event_period,
          s.price_impact_pct != null ? `${s.price_impact_pct > 0 ? '+' : ''}${s.price_impact_pct}%` : '—',
          s.recovery_months ? `${s.recovery_months} months` : 'N/A (rose)',
          s.recovery_driver,
          s.notes,
        ]),
      }
    }
  }

  return result
}

export function getAreaProfile(slug) {
  if (FULL_PROFILES[slug]) return FULL_PROFILES[slug]
  const entry = AREA_LIST.find((a) => a.slug === slug)
  if (!entry) return null
  return synthesizeProfile(entry)
}

export function hasFullProfile(slug) {
  return Boolean(FULL_PROFILES[slug])
}
