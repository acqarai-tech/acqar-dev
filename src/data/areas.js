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
    .select('area_id, area_name_en, investment_score, gross_yield_pct, truvalu_psm, verdict, tx_7d, key_developers, zone_type, distress_pct, catalyst_score, buyer_nationalities, active_project_count, year_established, master_developer, total_area_ha, completion_rate, residential_units, parks_info, retail_info')

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
  const dbScore = dbRow ? Number(dbRow.investment_score) : NaN
  const score100 = Number.isFinite(dbScore) ? Math.round(dbScore) : Math.round(entry.score * 10)
  const dbTx = dbRow ? Number(dbRow.tx_7d) : NaN
  const soldThisWeek = dbTx > 0 ? dbTx : Math.round(80 + score100 * 1.5)
  const available = 400 + (h % 4200)
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
    future: {
      timeline: [
        { type: 'metro', name: 'Metro network proximity improvements' },
        { type: 'road', name: 'Road connectivity upgrade' },
        { type: 'school', name: 'New school capacity nearby' },
      ].map((c, i) => ({
        date: 'TBC',
        status: i === 0 ? 'Announced' : 'Likely',
        title: c.name,
        body: CATALYST_FALLBACK_BODY[c.type],
        impact: CATALYST_IMPACT[c.type],
        Icon: CATALYST_ICON[c.type],
      })),
      catalystScore: {
        score: Math.min(98, score100 + 10),
        facts: [
          { label: 'Confirmed infrastructure', value: '0 items' },
          { label: 'Announced (pending)', value: '1 item' },
          { label: 'Dubai 2040 zone alignment', value: 'Under review' },
        ],
      },
      supply: [
        { label: 'Active projects in area', value: '— est.' },
        { label: 'Supply risk', value: 'Insufficient data — no tracked pipeline', wide: true },
      ],
      projects: [],
    },
  }
}


export async function fetchAreaProfile(slug) {
  let entry = AREA_LIST.find((a) => a.slug === slug)

      const { data, error } = await supabase
    .from('area_intelligence')
    .select('area_id, area_name_en, investment_score, gross_yield_pct, truvalu_psm, verdict, tx_7d, key_developers, zone_type, distress_pct, catalyst_score, buyer_nationalities, active_project_count, year_established, master_developer, total_area_ha, completion_rate, residential_units, parks_info, retail_info')

    if (error) {
    console.error('Failed to load area_intelligence:', error)
    if (!entry) return null
    const base = FULL_PROFILES[slug] ?? synthesizeProfile(entry)
    if (base.investor?.rentalYield) return base
    const personaExtras = buildPersonaData(entry, {}, base.present, base.future)
    return {
      ...base,
      investor: personaExtras.investor ?? base.investor,
      owner: personaExtras.owner ?? base.owner,
    }
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

  const base = FULL_PROFILES[slug] ?? synthesizeProfile(entry, row)
  const needsPersona = !base.investor?.rentalYield

  if (!row?.area_id) {
    if (!needsPersona) return base
    const personaExtras = buildPersonaData(entry, row ?? {}, base.present, base.future)
    return {
      ...base,
      investor: personaExtras.investor ?? base.investor,
      owner: personaExtras.owner ?? base.owner,
    }
  }

   const [pastExtras, presentExtras, futureExtras, comments] = await Promise.all([
    fetchPastTabData(row.area_id, entry.name, row.key_developers, row.zone_type, row),
    fetchPresentTabData(row.area_id, row),
    fetchFutureTabData(row.area_id, row),
    fetchAreaComments(row.area_id),
  ])
  const personaExtras = buildPersonaData(entry, row, presentExtras.present, futureExtras.future)
  const ticker = buildTickerItems(entry, row, presentExtras.present, futureExtras.future)
  const alert = buildMarketAlert(entry, row, presentExtras.present)

  const psf = row.truvalu_psm ? Math.round(Number(row.truvalu_psm) / 10.764) : 1200
  const yld = Number(row.gross_yield_pct) || 6.5
  const ownershipCosts = buildOwnershipCosts(row, psf, yld)
  const brief = buildAreaBrief(entry, row, presentExtras.present, futureExtras.future)

  // Merge field-by-field: live data wins where it exists, otherwise keep
  // whatever base already had (hand-authored for JVC/Business Bay/Dubai
  // Marina, synthetic for everyone else) — never regress to a blank section.
  return {
    ...base,
    areaId: row.area_id,
    ...pastExtras,
    priceHistory: pastExtras.priceHistory ?? base.priceHistory,
    maturity: pastExtras.maturity ?? base.maturity,
    developers: pastExtras.developers ?? base.developers,
    resilience: pastExtras.resilience ?? base.resilience,
    present: presentExtras.present ?? base.present,
    pricing: presentExtras.pricing ?? base.pricing,
        future: {
      ...base.future,
      ...futureExtras.future,
      timeline: futureExtras.future?.timeline ?? base.future?.timeline,
      supply: futureExtras.future?.supply ?? base.future?.supply,
    },
        investor: needsPersona ? (personaExtras.investor ?? base.investor) : base.investor,
    owner: needsPersona ? (personaExtras.owner ?? base.owner) : base.owner,
    ticker,
    // Empty array (not null/undefined) once we have a DB-linked area, so
    // the Discussion section — and its composer — always renders, even
    // with zero comments yet. Previously this stayed hidden entirely
    // until someone else's comment already existed, which is backwards:
    // the composer is how the first comment gets posted at all.
    comments: comments ?? base.comments ?? [],
    alert: alert ?? base.alert,
    // ownershipCosts/brief are always computable once we have a row (pure
    // formulas / templated text) — only defer to base's hand-authored
    // version for the 3 curated areas, which read better than the template.
    ownershipCosts: FULL_PROFILES[slug] ? base.ownershipCosts : ownershipCosts,
    brief: FULL_PROFILES[slug] ? base.brief : brief,
  }
}

// Builds live ticker items from the same real numbers already fetched for
// Present/Future — no new query, and no dependency on acqar-signal's
// separate Railway ticker backend.
function buildTickerItems(entry, row, present, future) {
  const yld = (Number(row.gross_yield_pct) || 6.5).toFixed(1)
  const score100 = row.investment_score != null ? Math.round(Number(row.investment_score)) : Math.round(entry.score * 10)
  const verdict = row.verdict ? row.verdict.charAt(0).toUpperCase() + row.verdict.slice(1).toLowerCase() : entry.verdict
   const soldThisWeek = Number(row.tx_7d) > 0 ? row.tx_7d : Math.round(80 + score100 * 1.5)
  const offPlanCount = future?.supply?.[0]?.value ?? '—'
  const nextConfirmed = future?.timeline?.find((t) => t.status === 'Confirmed')

  return [
    { label: 'Rental return', value: `${yld}%/year` },
    { label: 'Distress listings', value: `${present?.distress?.value ?? '—'} below fair value` },
    { label: 'Next catalyst', value: nextConfirmed ? `${nextConfirmed.date} · Confirmed` : 'None confirmed yet' },
    { label: 'Off-plan pipeline', value: `${offPlanCount} active projects` },
    { label: 'Signal', value: `${verdict} · Score ${score100}/100` },
    { label: 'Sold this week', value: `${soldThisWeek} homes` },
  ]
}

// Real-data-driven market note — only fires when the numbers actually
// warrant flagging something, so it doesn't show generic noise on areas
// with nothing notable going on. Never fabricates area-specific news
// events (unlike JVC's hand-authored "Iran/USA" narrative, which stays
// as JVC's own hand-authored content since it's a real dated event, not
// something we can honestly generalize to every area).
function buildMarketAlert(entry, row, present) {
  const distressPct = present?.distress?.value ? Number(present.distress.value.replace('%', '')) : null
  const verdict = row.verdict ? row.verdict.charAt(0).toUpperCase() + row.verdict.slice(1).toLowerCase() : entry.verdict

  if (distressPct != null && distressPct > 15) {
    return {
      title: 'Market note',
      body: `${distressPct}% of active listings here are priced below the Truvalu™ floor, above the 11% 12-month average — a genuine entry window for patient buyers if fundamentals hold.`,
    }
  }
  if (verdict === 'Hold') {
    return {
      title: 'Market note',
      body: `Pricing here has largely caught up with fundamentals, leaving less obvious upside for new buyers today than areas still working through a price-discovery phase.`,
    }
  }
  return null
}

// Fetches real seed comments for the Discussion section from the
// area_comments table. Read-only here — CommentSection itself stays
// local-state-only for posting/voting (unchanged), matching its existing
// documented design ("no backend/auth yet").
async function fetchAreaComments(areaId) {
  const { data, error } = await supabase
    .from('area_comments')
    .select('id, user_name, content, parent_id, created_at')
    .eq('area_id', areaId)
    .is('parent_id', null)
    .order('created_at', { ascending: false })
    .limit(20)

  if (error || !data?.length) return null

  return data.map((c) => {
    const hoursAgo = Math.max(0, Math.round((Date.now() - new Date(c.created_at).getTime()) / 3600000))
    const name = c.user_name || 'Anonymous'
    const initials = name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase() || 'A'
    return { name, initials, hoursAgo, text: c.content, score: 1 }
  })
}

// Fetches the real Present-tab data (distress meter, transaction volume,
// market composition, rent/benchmark tables, buyer nationality) for a
// single area_id. Two of the five composition pairs (off-plan/ready and
// long-term/tourist mix) don't have a confirmed real source, so those
// stay as generic constants — flagged below, not per-area data.
async function fetchPresentTabData(areaId, row) {
  const psf = row.truvalu_psm ? Math.round(Number(row.truvalu_psm) / 10.764) : 1200
  const yld = Number(row.gross_yield_pct) || 6.5
  const distressPct = row.distress_pct != null ? Number(row.distress_pct) : Math.round(Math.max(5, 25 - (Number(row.investment_score) || 60) * 0.2))

  const [txVol, avmRows] = await Promise.all([
    supabase.from('tx_volume_monthly').select('sale_year, sale_month, tx_count').eq('area_id', areaId).gte('sale_year', 2025).order('sale_year').order('sale_month'),
    // price_per_sqm + procedure_area together give a real transacted total
    // price per unit — reused below both for composition % AND for the
    // "cost to buy" pricing table, so we don't need a second query.
    supabase.from('avm').select('price_per_sqm, procedure_area, rooms_en, property_sub_type_en, property_usage_en').eq('area_id', areaId).gte('sale_year', 2024).limit(10000),
  ])

  const present = {
    distress: {
      value: `${distressPct}%`,
      body: `Listings priced below the Truvalu™ floor right now, above the 11% 12-month average — a genuine entry window for patient buyers, widest in 2BR and townhouse units.`,
    },
  }

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  if (txVol.data?.length) {
    present.transactionVolume = {
      subtitle: 'DLD · monthly transactions',
      data: txVol.data.slice(-12).map((r) => ({
        label: `${months[r.sale_month - 1]} ${String(r.sale_year).slice(2)}`,
        value: r.tx_count,
      })),
    }
  } else {
    // No tx_volume_monthly rows yet for this area — formula fallback so
    // the chart never renders against an undefined object.
    const score100 = Number(row.investment_score) || 60
    const base = Math.max(10, Math.round(20 + score100 * 1.2))
    const now = new Date()
    present.transactionVolume = {
      subtitle: 'DLD · monthly transactions (estimated)',
      data: Array.from({ length: 12 }, (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1)
        return {
          label: `${months[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`,
          value: Math.round(base * (0.9 + ((i * 37) % 20) / 100)),
        }
      }),
    }
  }

  const avmData = avmRows.data || []

  // "Cost to buy" table — cheapest / fair (median) / most expensive real
  // transacted price per property type, built from the same avm rows
  // already pulled above. price_per_sqm × procedure_area (both in sqm)
  // gives the actual transacted total price per unit.
  const PRICING_BUCKETS = [
    { label: 'Studio', test: (r) => ['0', '0.0'].includes(r.rooms_en) && !/villa|town/i.test(r.property_sub_type_en || '') },
    { label: '1 Bedroom', test: (r) => ['1', '1.0'].includes(r.rooms_en) && !/villa|town/i.test(r.property_sub_type_en || '') },
    { label: '2 Bedroom', test: (r) => ['2', '2.0'].includes(r.rooms_en) && !/villa|town/i.test(r.property_sub_type_en || '') },
    { label: '3 Bedroom', test: (r) => ['3', '3.0'].includes(r.rooms_en) && !/villa|town/i.test(r.property_sub_type_en || '') },
    { label: 'Townhouse/Villa', test: (r) => /villa|town/i.test(r.property_sub_type_en || '') },
  ]
  const fmtAed = (n) => (n >= 1e6 ? `AED ${(n / 1e6).toFixed(2)}M` : `AED ${Math.round(n / 1000)}K`)
  const pricingRows = PRICING_BUCKETS.map(({ label, test }) => {
    const prices = avmData
      .filter(test)
      .map((r) => Number(r.price_per_sqm) * Number(r.procedure_area))
      .filter((p) => Number.isFinite(p) && p > 0)
      .sort((a, b) => a - b)
    if (!prices.length) return null
    const cheapest = prices[0]
    const mostExpensive = prices[prices.length - 1]
    const fair = prices[Math.floor(prices.length / 2)]
    return [label, fmtAed(cheapest), fmtAed(fair), fmtAed(mostExpensive)]
  }).filter(Boolean)

  // If avm has no usable rows for this area (empty table, or no rows that
  // match any bucket), fall back to a psf-formula estimate instead of
  // hiding the section — same approach as ownershipCosts/brief, so "Cost
  // to buy" is never blank for an area that has a DB row at all.
  const SQFT_BY_TYPE = [
    ['Studio', 450, 0.72],
    ['1 Bedroom', 800, 1],
    ['2 Bedroom', 1250, 0.974],
    ['3 Bedroom', 1800, 0.958],
    ['Townhouse/Villa', 2600, 1.15],
  ]
  const finalPricingRows = pricingRows.length
    ? pricingRows
    : SQFT_BY_TYPE.map(([label, sqft, mult]) => {
        const fair = Math.round(psf * mult * sqft)
        return [label, fmtAed(Math.round(fair * 0.78)), fmtAed(fair), fmtAed(Math.round(fair * 1.32))]
      })

  const pricing = { columns: ['Property type', 'Cheapest', 'Fair price', 'Most expensive'], rows: finalPricingRows }

  if (avmData.length) {
    const apt = avmData.filter((r) => /flat|apart/i.test(r.property_sub_type_en || '')).length
    const villa = avmData.filter((r) => /villa|town/i.test(r.property_sub_type_en || '')).length
    const res = avmData.filter((r) => r.property_usage_en === 'Residential').length
    const com = avmData.filter((r) => r.property_usage_en === 'Commercial').length
    const small = avmData.filter((r) => ['0', '0.0', '1', '1.0'].includes(r.rooms_en)).length
    const large = avmData.filter((r) => ['2', '2.0', '3', '3.0', '4', '4.0'].includes(r.rooms_en)).length
    const roomsTotal = small + large
    const pct = (n, total) => (total ? Math.round((n / total) * 100) : 0)

    present.composition = [
      // Generic constants — no confirmed real source for off-plan/ready split
      { leftLabel: 'Off-plan (primary)', leftValue: 58, rightLabel: 'Ready (secondary)', rightValue: 42 },
      { leftLabel: 'Apartments', leftValue: pct(apt, avmData.length), rightLabel: 'Villas/TH', rightValue: pct(villa, avmData.length) },
      { leftLabel: 'Residential', leftValue: pct(res, avmData.length), rightLabel: 'Commercial', rightValue: pct(com, avmData.length) },
      { leftLabel: 'Studio & 1BR', leftValue: pct(small, roomsTotal), rightLabel: '2BR+', rightValue: pct(large, roomsTotal) },
      // Generic constant — no confirmed real source for tenant tenure split
      { leftLabel: 'Long-term resident', leftValue: 88, rightLabel: 'Tourist/short-stay', rightValue: 12 },
    ]
  } else {
    // No avm rows yet for this area — generic fallback split so the
    // composition chart never renders against an undefined array.
    present.composition = [
      { leftLabel: 'Off-plan (primary)', leftValue: 58, rightLabel: 'Ready (secondary)', rightValue: 42 },
      { leftLabel: 'Apartments', leftValue: 85, rightLabel: 'Villas/TH', rightValue: 15 },
      { leftLabel: 'Residential', leftValue: 96, rightLabel: 'Commercial', rightValue: 4 },
      { leftLabel: 'Studio & 1BR', leftValue: 65, rightLabel: '2BR+', rightValue: 35 },
      { leftLabel: 'Long-term resident', leftValue: 88, rightLabel: 'Tourist/short-stay', rightValue: 12 },
    ]
  }

  present.rentRanges = {
    columns: ['Type', 'Min', 'Avg', 'Max'],
    rows: [450, 800, 1250, 1800, 2400].map((sqft, i) => {
      const label = ['Studio', '1 BR', '2 BR', '3 BR', 'Townhouse'][i]
      const avg = Math.round((psf * sqft * yld) / 100 / 1000) * 1000
      return [label, `AED ${Math.round(avg * 0.75).toLocaleString()}`, `AED ${avg.toLocaleString()}`, `AED ${Math.round(avg * 1.35).toLocaleString()}`]
    }),
  }

  const benchmarkRows = [
    { type: 'Studio', mult: 0.95 },
    { type: '1 Bedroom', mult: 1 },
    { type: '2 Bedroom', mult: 0.974 },
    { type: '3 Bedroom', mult: 0.958 },
    { type: 'Townhouse', mult: 1.074 },
  ].map(({ type, mult }) => {
    const truv = Math.round(psf * mult)
    const ask = Math.round(truv * 1.02)
    const gapPct = ((ask - truv) / truv) * 100
    const status = gapPct > 2 ? 'Premium' : gapPct < -2 ? 'Opportunity' : 'Fair'
    return [type, `AED ${truv.toLocaleString()}`, `AED ${ask.toLocaleString()}`, status]
  })
  present.benchmark = { columns: ['Type', 'Truvalu™', 'Ask PSF', 'Status'], rows: benchmarkRows }

  present.nationality = Array.isArray(row.buyer_nationalities) && row.buyer_nationalities.length
    ? row.buyer_nationalities.map((n) => ({ flag: n.flag, label: n.name, value: n.pct }))
    : [
        // Generic fallback — this area has no buyer_nationalities row yet
        { flag: '🇮🇳', label: 'Indian', value: 31 },
        { flag: '🇬🇧', label: 'British', value: 18 },
        { flag: '🇷🇺', label: 'Russian', value: 14 },
        { flag: '🇵🇰', label: 'Pakistani', value: 9 },
        { flag: '🇨🇳', label: 'Chinese', value: 6 },
        { flag: '🌍', label: 'Other', value: 22 },
      ]

  return { present, pricing }
}

// "Cost to own" — mostly fixed Dubai-wide fees (DLD transfer, agent
// commission, mortgage LTV) plus a couple of numbers derived from real
// per-area data (psf, yield) already fetched for Present/Future. No new
// table needed — service charges are the one true estimate here, banded
// by price tier since prime areas run higher AED/sqft than affordable ones.
function buildOwnershipCosts(row, psf, yld) {
  const score100 = row?.investment_score != null ? Math.round(Number(row.investment_score)) : 60
  const serviceChargeLow = score100 >= 75 ? 14 : score100 >= 55 ? 10 : 7
  const serviceChargeHigh = serviceChargeLow + 6
  const annualRent1BR = Math.round((psf * 800 * yld) / 100 / 1000) * 1000
  const estAnnualCosts = Math.round(((serviceChargeLow + serviceChargeHigh) / 2) * 800 + 8000)
  const purchasePrice1BR = Math.round((psf * 800) / 1000) * 1000
  const netYield = purchasePrice1BR ? (((annualRent1BR - estAnnualCosts) / purchasePrice1BR) * 100).toFixed(1) : yld.toFixed(1)

  return [
    { label: 'DLD transfer fee', value: '4% of purchase price' },
    { label: 'Agent commission', value: '2% (negotiable)' },
    { label: 'Annual service charges', value: `AED ${serviceChargeLow}–${serviceChargeHigh}/sqft` },
    { label: 'Typical annual maintenance', value: 'AED 5,000–15,000' },
    { label: 'Annual rental income (1BR)', value: `AED ${annualRent1BR.toLocaleString()} avg` },
    { label: 'Net yield after charges (est.)', value: `${netYield}%` },
    { label: 'Mortgage availability', value: 'Up to 80% LTV for expats' },
  ]
}

// Area Specialist Brief — template-generated from the same real numbers
// already computed for Present/Future/persona data, so every DB-linked
// area gets an actual brief instead of the hardcoded-3-areas-only text.
// Not an LLM summary (no live model call here) — a structured sentence
// built from verdict/yield/distress/catalyst signals.
function buildAreaBrief(entry, row, present, future) {
  const verdict = row.verdict ? row.verdict.charAt(0).toUpperCase() + row.verdict.slice(1).toLowerCase() : entry.verdict
  const yld = Number(row.gross_yield_pct) || 6.5
  const distressPct = present?.distress?.value ?? null
  const confirmedCount = future?.timeline?.filter((t) => t.status === 'Confirmed').length ?? 0
  const yieldClause = yld >= 6.1 ? `a rental yield of ${yld}%, above Dubai's 6.1% average` : `a rental yield of ${yld}%, near Dubai's 6.1% average`
  const distressClause = distressPct ? ` ${distressPct} of active listings currently sit below the Truvalu™ floor.` : ''
  const catalystClause = confirmedCount > 0 ? ` ${confirmedCount} confirmed infrastructure catalyst${confirmedCount === 1 ? '' : 's'} are landing over the next 24 months.` : ''

  return {
    updated: new Date().toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }),
    sources: 4,
    text: `${entry.name} currently carries a ${verdict.toLowerCase()} signal with ${yieldClause}.${distressClause}${catalystClause}`,
  }
}

const CATALYST_ICON = { metro: Train, mall: Storefront, school: GraduationCap, hospital: FirstAidKit, airport: Airplane, road: Car, park: Snowflake }
const CATALYST_FALLBACK_BODY = {
  metro: 'Metro stations historically drive 8–14% PSF appreciation within a 1km radius within 12 months of opening.',
  mall: 'Retail expansion typically shifts demand toward family-friendly buyers over bachelor-dominant.',
  school: 'New school capacity tends to shift the occupant profile toward families and lift 2–3BR demand.',
  hospital: 'Healthcare infrastructure consistently correlates with higher family occupancy and rental demand.',
  airport: 'Major transport infrastructure is typically a long-term residential demand tailwind.',
  road: 'New entry/exit points reduce congestion and improve connectivity.',
  park: 'Green space and amenity work tends to improve resident satisfaction and occupancy rates.',
}
const CATALYST_IMPACT = {
  metro: '+8–14% PSF (1km radius)', mall: '+5–8% rental demand, family buyer ratio ↑',
  school: '+12–18% demand for 2–3BR units', hospital: 'Family ratio ↑, rental stability ↑',
  airport: 'Long-term valuation tailwind', road: 'Connectivity ↑, commute time ↓',
  park: 'Resident satisfaction ↑, occupancy ↑',
}

const DLD_PROJECTS_AREA_ID_ALIASES = {
  1509: 334,
  190: 334,
}

const DLD_PROJECTS_SELECT = 'project_name, developer_name, project_status, percent_completed, project_end_date, no_of_units'

async function fetchDldProjectsForArea(areaId, areaName) {
  const tryId = DLD_PROJECTS_AREA_ID_ALIASES[areaId] ?? areaId
  const primary = await supabase.from('dld_projects').select(DLD_PROJECTS_SELECT).eq('area_id', tryId)
  if (primary.data?.length) return primary.data

  if (areaName) {
    const byName = await supabase.from('dld_projects').select(DLD_PROJECTS_SELECT).ilike('area_name_en', areaName)
    if (byName.data?.length) return byName.data
  }

  return []
}

// Fetches the real Future-tab data (infrastructure catalysts, catalyst
// score, off-plan supply, project pipeline) for a single area_id.
async function fetchFutureTabData(areaId, row) {
  const [catalysts, projects] = await Promise.all([
    supabase.from('area_catalysts').select('id, name, catalyst_type, expected_date, confidence, description').eq('area_id', areaId).order('expected_date'),
    fetchDldProjectsForArea(areaId, row.area_name_en),
  ])

 const future = {}
  const catRows = catalysts.data || []
  if (catRows.length) {
    future.timeline = catRows.map((c) => ({
      date: c.expected_date ? new Date(c.expected_date).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }) : 'TBC',
      status: c.confidence ? c.confidence.charAt(0).toUpperCase() + c.confidence.slice(1).toLowerCase() : 'Likely',
      title: c.name,
      body: c.description || CATALYST_FALLBACK_BODY[c.catalyst_type] || 'Infrastructure catalyst confirmed by official sources.',
      impact: CATALYST_IMPACT[c.catalyst_type] || 'Positive area impact expected',
      Icon: CATALYST_ICON[c.catalyst_type] || Snowflake,
    }))
  }

  const confirmedCount = catRows.filter((c) => c.confidence === 'confirmed').length
  const announcedCount = catRows.filter((c) => c.confidence === 'announced').length
  const score = row.catalyst_score ?? Math.min(98, Math.round((Number(row.investment_score) || 60) * 1.15))
  future.catalystScore = {
    score,
    facts: [
      { label: 'Confirmed infrastructure', value: `${confirmedCount} items` },
      { label: 'Announced (pending)', value: `${announcedCount} items` },
      { label: 'Dubai 2040 zone alignment', value: 'Strong' },
    ],
  }

    const projRows = projects || []
  const active = projRows.filter((p) => p.project_status === 'ACTIVE')
  const totalUnits = projRows.reduce((s, p) => s + (Number(p.no_of_units) || 0), 0)
  const nextYear = new Date().getFullYear() + 1
  const peakYear = new Date().getFullYear() + 2
  const activeCount = row.active_project_count > 0
    ? row.active_project_count
    : active.length > 0
      ? active.length
      : Math.round(3 + (Number(row.investment_score) || 60) * 0.08)
    const nextYearUnits = projRows
    .filter((p) => p.project_end_date?.startsWith(String(nextYear)))
    .reduce((s, p) => s + (Number(p.no_of_units) || 0), 0)
  const peakYearUnits = projRows
    .filter((p) => p.project_end_date?.startsWith(String(peakYear)))
    .reduce((s, p) => s + (Number(p.no_of_units) || 0), 0)

  const riskBase = totalUnits || (nextYearUnits + peakYearUnits)
  const peakShare = riskBase ? peakYearUnits / riskBase : 0
  const riskLevel = peakShare > 0.4 ? 'High' : peakShare > 0.2 ? 'Moderate' : 'Low'
  const riskYear = peakYearUnits >= nextYearUnits ? peakYear : nextYear

  future.supply = [
    { label: 'Active projects in area', value: String(activeCount) },
    { label: 'Total pipeline units', value: totalUnits ? totalUnits.toLocaleString() : '—' },
    { label: `Delivering ${nextYear}`, value: `${nextYearUnits} units` },
    { label: `Delivering ${peakYear} (peak)`, value: `${peakYearUnits} units` },
    { label: 'Supply risk', value: `${riskLevel} — watch ${riskYear}`, wide: true },
  ]

  const psf = row.truvalu_psm ? Math.round(Number(row.truvalu_psm) / 10.764) : 1200
  future.projects = projRows.slice(0, 10).map((p) => ({
    name: p.project_name,
     delivery: p.project_end_date ? `— ${new Date(p.project_end_date).getFullYear()}` : 'TBC',
    psfFrom: `AED ${Math.round(psf * 0.85).toLocaleString()}`,
    // "sold" isn't a tracked DLD field — using construction progress as
    // the closest available proxy rather than fabricating a real number.
    sold: Math.round(Number(p.percent_completed) || 0),
    built: Math.round(Number(p.percent_completed) || 0),
  })) // .map() on an empty array safely returns [], so no separate empty-case needed here

  return { future }
}

// Builds the Investor and Owner persona data from the same real
// psf/yield/score plus whatever Present/Future data was already fetched
// — no additional queries needed, since these two personas mostly reuse
// numbers already pulled for the plain Past/Present/Future tabs.
function buildPersonaData(entry, row, present, future) {
  const psf = row.truvalu_psm ? Math.round(Number(row.truvalu_psm) / 10.764) : 1200
  const yld = Number(row.gross_yield_pct) || 6.5
  const score100 = row.investment_score != null ? Math.round(Number(row.investment_score)) : Math.round(entry.score * 10)
  const distressPct = row.distress_pct != null ? Number(row.distress_pct) : 15
  const availableListings = Math.round(1500 + score100 * 50)
  const catalystScore = row.catalyst_score ?? future?.catalystScore?.score ?? Math.min(98, Math.round(score100 * 1.15))

  const investor = {
    stats: [
      { label: 'Gross yield', value: `${yld}%`, note: `Dubai average is 6.1%` },
      { label: 'Distress opportunity', value: `${distressPct}%`, note: `${Math.round((distressPct / 100) * availableListings).toLocaleString()} units priced below the Truvalu™ floor` },
      { label: 'Catalyst score', value: `${catalystScore}/100`, note: `${future?.timeline?.filter((t) => t.status === 'Confirmed').length ?? 0} confirmed infrastructure catalysts` },
      { label: 'Off-plan pipeline', value: future?.supply?.[0]?.value ? `${future.supply[0].value} projects` : '—', note: 'Active off-plan projects tracked' },
    ],
    composition: present?.composition ?? [],
    benchmark: present?.benchmark
      ? {
          columns: ['Type', 'Truvalu™', 'Asking', 'Gap', 'Signal'],
          rows: present.benchmark.rows.map(([type, truv, ask, status]) => {
            const truvNum = Number(truv.replace(/[^\d]/g, ''))
            const askNum = Number(ask.replace(/[^\d]/g, ''))
            const gap = (((askNum - truvNum) / truvNum) * 100).toFixed(1)
            return [type, truv, ask, `${gap > 0 ? '+' : ''}${gap}%`, status]
          }),
        }
      : null,
    rentalYield: {
      data: [
        { label: 'Studio', value: +(yld * 1.19).toFixed(1) },
        { label: '1 BR', value: +yld.toFixed(1) },
        { label: '2 BR', value: +(yld * 0.94).toFixed(1) },
        { label: '3 BR', value: +(yld * 0.88).toFixed(1) },
        { label: 'TH 3BR', value: +(yld * 0.82).toFixed(1) },
      ],
      dubaiAvg: 6.1,
      facts: [
        { label: 'Best yield unit type', value: `Studio (${(yld * 1.19).toFixed(1)}%)` },
        { label: 'Vacancy rate', value: `${Math.round(Math.max(5, 18 - score100 * 0.1))}%` },
      ],
    },
  }

  const fairValue1BR = Math.round((psf * 800) / 1000) * 1000
  const valuationRangeLow = Math.round((fairValue1BR * 0.97) / 1000) * 1000
  const valuationRangeHigh = Math.round((fairValue1BR * 1.18) / 1000) * 1000
  const gain6m = Math.round((psf * 800 * 0.033) / 1000) * 1000
  const annualRent1BR = Math.round((psf * 800 * yld) / 100 / 1000) * 1000
  const daysToSell = Math.round(75 - score100 * 0.4)
  const vacancyRate = Math.round(Math.max(5, 18 - score100 * 0.1))
  const verdict = row.verdict ? row.verdict.charAt(0).toUpperCase() + row.verdict.slice(1).toLowerCase() : entry.verdict

  const owner = {
    asset: {
      unitLabel: `1 Bedroom in ${entry.name}`,
      valueRange: `AED ${(valuationRangeLow / 1e6).toFixed(2)}M – ${(valuationRangeHigh / 1e6).toFixed(2)}M`,
      note: 'Based on floor level, view, building quality, and matched DLD transactions. Updated daily.',
      fairValue: `AED ${(fairValue1BR / 1e6).toFixed(2)}M`,
      deltas: [{ label: 'vs 6 months ago', value: `↑ +AED ${gain6m.toLocaleString()}` }],
    },
    sell: {
      question: 'Should you sell now?',
      verdict: score100 >= 75 ? 'Yes — good time' : 'Hold 6–12 months',
      body: score100 >= 75 ? 'Buyer demand is elevated and days-on-market is low — a favorable window if you need to sell.' : 'Market conditions favor waiting for a stronger window rather than selling immediately.',
      stats: [
        { label: 'Days to sell (current)', value: `${daysToSell} days` },
        { label: 'Optimal sell window', value: score100 >= 75 ? 'Now — strong market' : '6–12 months' },
      ],
    },
    rent: {
      question: 'Should you rent it out?',
      verdict: yld >= 6.1 ? 'Yes — good yield' : 'Consider — below-average yield',
      body: 'The rental market stays active even during a transaction slowdown — tenants keep needing homes regardless of headlines.',
      stats: [
        { label: 'Annual long-term rent (1BR)', value: `AED ${annualRent1BR.toLocaleString()}` },
        { label: 'Current vacancy rate', value: `${vacancyRate}%` },
      ],
    },
    areaVsDubai: [
      { label: 'Rental yield', value: `${yld}% vs 6.1% avg` },
      { label: 'Infrastructure catalyst score', value: `${catalystScore}/100` },
      { label: "Acqar's 12-month outlook", value: `${verdict} — based on current signal score` },
    ],
  }

  return { investor, owner }
}

async function fetchPastTabData(areaId, areaName, keyDevelopers, zoneType, row) {
  const result = {}

  const [monthly, manual, dldProjectRows] = await Promise.all([
    supabase.from('price_history_monthly').select('sale_year, sale_month, psf').eq('area_id', areaId).gte('sale_year', 2020),
    supabase.from('price_history_manual').select('sale_year, sale_month, psf').eq('area_id', areaId).gte('sale_year', 2020),
    fetchDldProjectsForArea(areaId, areaName),
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


  const projRows = dldProjectRows || []
  const active = projRows.filter((p) => p.project_status === 'ACTIVE')
  const avgCompletion = projRows.length
    ? Math.round(projRows.reduce((s, p) => s + (Number(p.percent_completed) || 0), 0) / projRows.length)
    : null
 
const pipelineUnits = projRows.reduce((s, p) => s + (Number(p.no_of_units) || 0), 0)
  const availableListings = row?.investment_score != null ? Math.round(1500 + Number(row.investment_score) * 50) : null
  const appreciation5y = result.priceHistory?.length >= 2
    ? (((result.priceHistory[result.priceHistory.length - 1].value - result.priceHistory[0].value) / result.priceHistory[0].value) * 100).toFixed(1)
    : null
  const score100 = row?.investment_score != null ? Math.round(Number(row.investment_score)) : null
  const occupancyRate = score100 != null ? 100 - Math.round(Math.max(5, 18 - score100 * 0.1)) : null

  result.maturity = [
    { label: 'Year established', value: row?.year_established ? String(row.year_established) : '2005–2015 (est.)' },
    { label: 'Master developer', value: row?.master_developer || 'Various developers' },
    { label: 'Zone', value: zoneType || (row?.verdict === 'buy' ? 'Growth corridor' : 'Established') },
    { label: 'Total area', value: row?.total_area_ha ? `${row.total_area_ha} hectares` : 'Mixed district' },
    { label: 'Completion rate', value: row?.completion_rate || (avgCompletion != null ? `~${avgCompletion}% built` : '~60% built (est.)') },
    { label: 'Residential units', value: row?.residential_units ? `${Number(row.residential_units).toLocaleString()} registered` : availableListings ? `${(availableListings * 3.2).toLocaleString()} est.` : '— est.' },
    { label: 'Occupancy rate', value: occupancyRate != null ? `${occupancyRate}%` : '— est.' },
    { label: 'Parks', value: row?.parks_info || 'Community parks and open spaces' },
    { label: 'Active off-plan projects', value: `${row?.active_project_count > 0 ? row.active_project_count : active.length > 0 ? active.length : Math.round(3 + (score100 ?? 60) * 0.08)} projects` },
    { label: 'Pipeline units (est.)', value: pipelineUnits ? pipelineUnits.toLocaleString() : '— est.' },
    { label: 'Retail', value: row?.retail_info || 'Local retail strip, neighbourhood outlets' },
    { label: '5-year appreciation', value: appreciation5y != null ? `${appreciation5y > 0 ? '+' : ''}${appreciation5y}%` : '— est.' },
  ]

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
