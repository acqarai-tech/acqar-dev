# ACQAR — Frontend (acqar-dev)

Vite + React 19 + Tailwind CSS v4 frontend for ACQAR ("Real Estate AI Agent in Your Pocket"). This repo is a **static, front-end-only build** — every page renders from local mock/demo data in `src/data/`, there is no backend or live API wired in yet.

## Live environments

| Environment | URL | Branch | Notes |
|---|---|---|---|
| Dev preview | https://acqar-dev.vercel.app | `main` | Auto-deploys on every push. `dev.acqar.com` domain pending DNS setup. |

This is a separate GitHub repo (`acqarai-tech/acqar-dev`) and Vercel project from `beta.acqar.com` and `www.acqar.com` — pushing here does not affect those.

## Pages

| Route | Page | What it is |
|---|---|---|
| `/` | Landing page | Marketing home — hero, product showcase, capabilities, trust metrics, how-it-works, FAQ, final CTA. |
| `/chat` | Chat | "Ask ACQAR" AI chat interface — rich answer cards (tables, charts, verdict chips) demoing what an AI property query response looks like. |
| `/valuations` | Property Valuations | Standalone property valuation tool page. |
| `/areas` | Areas list | Browsable, searchable, filterable directory of 60 Dubai areas, each as a card with a score/verdict. |
| `/areas/:slug` | Area Specialist report | Full report for one area — see breakdown below. |

### `/areas/:slug` — Area Specialist report detail

Every one of the 60 areas in `src/data/areas.js` resolves to a working detail page, but with three tiers of depth:

1. **`jumeirah-village-circle-jvc`** (Jumeirah Village Circle / JVC) — the flagship, fully hand-authored reference implementation. Includes the complete persona × timeline matrix: three persona tabs (First-Time Buyer / Investor / Already Own) crossed with three timeline tabs (Past / Present / Future), each showing genuinely different content — pricing, resilience report, developer delivery track record, catalyst/infrastructure timeline, market composition charts, rental yield breakdowns, off-plan supply risk, etc.
2. **`business-bay`** and **`dubai-marina`** — hand-authored core stats, AI brief, pricing, and price history, but using the simpler single-timeline tab layout (no persona split).
3. **All other 57 areas** — auto-generated on the fly from deterministic synthetic data (`synthesizeProfile()` in `src/data/areas.js`), so no area is a dead link. These show a "Preview report — auto-generated" badge to distinguish them from the hand-authored ones.

## Tech stack

- **Vite 8** + **React 19** + **react-router-dom 7**
- **Tailwind CSS v4** (`@theme` tokens in `src/index.css` — single accent color design system)
- **@phosphor-icons/react** for all icons
- No backend/API — all data lives in `src/data/`

## Local development

```bash
npm install
npm run dev      # starts Vite dev server
npm run build    # production build
npm run lint     # oxlint
```

## Deployment

Hosted on Vercel, connected to this GitHub repo (`acqarai-tech/acqar-dev`, `main` branch). Every push to `main` triggers an automatic production deployment. `vercel.json` handles the SPA rewrite so client-side routes (e.g. `/areas/jumeirah-village-circle-jvc`) work on direct load/refresh, not just client-side navigation.
