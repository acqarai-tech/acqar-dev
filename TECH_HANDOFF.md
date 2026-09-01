# ACQAR Landing Page — Tech Handoff

This document is for the engineering team picking up this repo. It covers what the
project is, how to run it, how it's structured, and — most importantly — exactly
where and how it needs to connect to `beta.acqar.com/broker`.

## What this is

A marketing landing page for ACQAR ("Real Estate AI Agent in Your Pocket"),
targeting independent Dubai brokers as the primary audience. It is a **standalone
static site** — it does not share a codebase, build pipeline, or deployment with
the beta app at `beta.acqar.com`. Most "Ask ACQAR Free" / "Try It Free" buttons
are still outbound links to the beta app (no embedding, no shared auth, no API
calls). The exception is the small set of buttons that specifically say "chat" or
show the Sparkle icon (Hero's search field, the mobile header's chat icon, the
mobile tab bar's AI Agent tab) — those route to `/chat`, a local, front-end-only
chat prototype that lives in this same codebase (see `/chat` route below). It is
**not** connected to any real AI backend.

## Tech stack

| Layer | Choice |
|---|---|
| Build tool | Vite 8 |
| Framework | React 19 |
| Styling | Tailwind CSS v4 (via `@tailwindcss/vite`, no `tailwind.config.js` — tokens live in `src/index.css` under `@theme`) |
| Icons | `@phosphor-icons/react` (duotone/fill weights used throughout) |
| WebGL | `ogl` (lightweight WebGL2 lib) — powers the Hero background shader only |
| Accessible primitives | `@radix-ui/react-accordion` (FAQ), `@radix-ui/react-dialog` (mobile nav drawer, chat sidebar drawer) |
| Routing | `react-router-dom` (`BrowserRouter`) — only two routes exist: `/` (landing page) and `/chat` |
| Linting | `oxlint` |

No backend, no CMS, no database. Most interactive components (orbiting avatars,
count-up, typing animation) are still hand-built with plain React state + CSS —
only the FAQ accordion and the mobile nav drawer use Radix primitives (added for
proper keyboard navigation / focus-trap / Escape-to-close, which the original
hand-rolled versions didn't have). No shadcn CLI was used — Radix was installed
directly as a normal dependency and styled from scratch with Tailwind.

## Running it

```bash
npm install
npm run dev      # http://localhost:5173, hot-reload
npm run build    # outputs static site to dist/
npm run preview  # serve the production build locally
```

Deploy target: any static host (Vercel/Netlify/S3+CloudFront/etc.) — `dist/` is a
plain static bundle, no server-side runtime required. **One thing that does need
host config now that `/chat` exists as a client-side route:** the host must
rewrite all unmatched paths to `/index.html` (SPA fallback), or a direct hit /
refresh on `/chat` will 404. Vercel/Netlify do this by default for a Vite app;
a plain S3 bucket or nginx box needs an explicit rewrite rule.

**If you ever see a console error that looks like a real React/dependency bug**
(e.g. "Invalid hook call") **after installing or removing a package, always test
in a brand-new browser tab before trusting it.** A tab that's been hot-reloaded
many times during dev can accumulate stale error-boundary state and throw
misleading errors that don't reproduce on a fresh load. This cost real debugging
time during development — confirmed the hard way.

## Project structure

```
src/
  App.jsx                 — routes: `/` (landing page composition, section order
                             see below) and `/chat` (ChatPage.jsx)
  index.css               — Tailwind entry + design tokens (@theme) + all custom
                             CSS animations (orbit, marquee, reveal, FAQ accordion,
                             nav drawer)
  main.jsx                — React root, StrictMode
  components/
    Nav.jsx                — sticky header, mobile nav drawer (Radix Dialog)
    Hero.jsx                — headline, WebGL background, search bar
    Plasma.jsx              — the WebGL shader behind the Hero (self-contained)
    TypingPlaceholder.jsx   — typing-animation effect used in Hero's search bar
    DeveloperMarquee.jsx    — auto-scrolling developer-logo strip
    ProductShowcase.jsx     — product screenshot section
    Capabilities.jsx        — 8-item capability grid
    TrustMetrics.jsx        — stats + orbiting-avatar visual
    CountUp.jsx             — scroll-triggered number count-up (used in TrustMetrics)
    HowItWorks.jsx          — 3-step "Ask / Analyze / Decide"
    ThreeQuestions.jsx      — 3 example question/verdict cards
    BrokerBanner.jsx        — "Free for every Dubai broker" CTA card
    Faq.jsx                 — 10-question accordion (Radix Accordion)
    FinalCta.jsx            — closing CTA section
    Footer.jsx              — footer links + columns
    MobileTabBar.jsx        — mobile-only bottom tab bar (Home / Valuation / AI
                             Agent / Investors / Advisor), desktop uses
                             FloatingAdvisorButton + Nav's pill nav instead
    FloatingAdvisorButton.jsx — desktop-only floating WhatsApp button
    ChatPage.jsx             — the `/chat` prototype: sidebar (popular questions,
                             mock "recent" list) + chat thread with canned,
                             keyword-matched Buy/Sell/Invest replies, all in
                             `getAssistantReply()`. No real AI or backend — that
                             function is the one place a real API call would
                             replace the canned logic
    Reveal.jsx              — shared scroll-into-view fade wrapper (used everywhere)
  assets/                  — logo + product screenshot (both .webp, optimized),
                             developer logos
.backups/                  — historical snapshots of components from the design
                             iteration process. Not used by the build — safe to
                             delete, kept only in case any prior version needs
                             to be referenced.
```

## Page section order (`App.jsx`)

Nav → Hero → Product Showcase → Capabilities → Trust Metrics → How It Works →
Three Questions → Broker Banner → FAQ → Final CTA → Footer.

## Integration with beta.acqar.com/broker — read this carefully

Every primary CTA on this page links out to the beta app, but **the destination
has changed since this doc was first written**: every "Ask ACQAR Free" / "Try
It" / "See a Sample Answer" style CTA on the page now routes to the local
`/chat` prototype (`react-router-dom` `<Link to="/chat">`) instead of an
outbound link to `beta.acqar.com`. That's **all** of them — desktop nav,
mobile nav drawer, ProductShowcase, Capabilities, TrustMetrics, BrokerBanner,
and FinalCta.

| File | Link text |
|---|---|
| `Nav.jsx` (×2 — desktop pill + mobile drawer) | "Ask ACQAR Free" |
| `ProductShowcase.jsx` | "Try It on a Real Property" |
| `Capabilities.jsx` | "See a Sample Answer" |
| `TrustMetrics.jsx` | "Ask Your First Question" |
| `BrokerBanner.jsx` | "Ask ACQAR Free" |
| `FinalCta.jsx` | "Ask ACQAR Free" |

**Before this goes live for real**, someone needs to decide: does `/chat` stay
as the destination (i.e. the real chat product gets built inside this same
app), or does it get swapped back to `beta.acqar.com` once that's the actual
production chat experience? Right now `/chat` (`ChatPage.jsx`) has no real AI
behind it — see the `ChatPage.jsx` entry under Project structure. If you do
want to point back out to `beta.acqar.com`, it's a one-line `href` swap per
link above (back to a plain `<a>`, since it'd be leaving the SPA).

The mobile tab bar's AI Agent tab and the mobile header's Sparkle icon also
route to `/chat` (in `MobileTabBar.jsx` and `Nav.jsx`) — same caveat applies.

## Design tokens (`src/index.css`, under `@theme`)

```css
--color-cream: #fbfaf8       /* page background */
--color-accent: #b87333      /* brand copper — primary actions, highlights */
--color-accent-dark: #b57a3f
--color-ink: #0a0a0a         /* primary text */
--color-muted: #6b7280       /* secondary text */
--color-line: #e5e7ec        /* hairline borders */
--shadow-xs / sm / md / lg / glow   /* elevation scale — use these, not ad hoc box-shadow values */
```

Typography convention used everywhere (not enforced by a shared component, just
consistently hand-applied):
- Headings: `font-semibold leading-[1.1] tracking-[-0.03em]`
- Eyebrow labels: `text-[11px] font-semibold uppercase tracking-[0.14em] text-accent-dark`
- Body copy: `text-base leading-relaxed text-muted`

Font is Inter, loaded via Google Fonts `<link>` in `index.html` (not self-hosted).

## SEO / social sharing

`index.html` has a full set of Open Graph and Twitter Card meta tags, including
`og:image` pointing at `public/og-image.jpg` (a real screenshot of the Hero
section, captured at the standard 1200×630 size). **The domain used in `og:url`
/ `og:image` / `twitter:image` is currently a placeholder (`https://acqar.com/`)
— confirm the real production domain before launch and update those three tags.**

## Known placeholders — do not ship without addressing

- **Trust Metrics avatar photos** (`TrustMetrics.jsx`) use `randomuser.me` stock
  placeholder headshots, not real people. Swap for real broker/team photos (with
  consent) before public launch — flagged explicitly during design, not an
  oversight.
- **Footer links** (`Footer.jsx`): "Contact Us", "Intelligence Blog", "Terms of
  Use", and "Privacy Policy" are still `href="#"` — no real destinations exist
  yet. TruValu, Signal, and "About ACQAR" already point to the real
  `acqar.com` pages; "Pricing" and "Brokers" point to the on-page Broker
  Banner section (`#for-brokers`).
- **OG image domain** — see SEO section above.
- **Nav links**: only "How it works" and "For Brokers" exist as real in-page
  anchors (`#how-it-works`, `#for-brokers`). There is no dedicated Pricing or
  Resources page/section — those nav items were removed rather than left as
  dead links. Add them back only once real destinations exist.

## Things worth knowing before touching specific components

- **`Plasma.jsx`** — WebGL2 canvas running a 60-iteration-per-pixel raymarch
  shader, which is genuinely GPU-expensive. It pauses its render loop in two
  situations: (1) via `IntersectionObserver`, whenever the canvas is fully
  scrolled off-screen, and (2) whenever the user is **actively scrolling**,
  resuming ~150ms after scroll stops (only if still in view). The second
  guard matters more than it looks — the Hero is shorter than most viewports,
  so the canvas is only ever partially visible during the scroll transition
  through it, which is exactly when GPU contention with scroll compositing
  is most noticeable. If you touch this file, keep both guards intact. `dpr`
  is capped at `Math.min(devicePixelRatio, 2)` — full retina resolution.
  It was previously capped at 1.5 to cut render cost, but the floating nav
  pill's `backdrop-blur` sits directly over this canvas and made the
  resolution cut visibly soft/pixelated through the glass, so crispness won
  out here; the scroll-pause guard above is what actually carries the
  performance cost, not the dpr cap.
- **`TrustMetrics.jsx`** orbiting avatars — pure CSS animation (`@keyframes orbit`
  in `index.css`), no JS animation loop. All 6 avatars share one ring radius/speed,
  offset by `animation-delay` to land evenly spaced (60° apart) — if you add/remove
  avatars, recompute the delay formula in the component comment.
- **`Faq.jsx`** accordion — built on `@radix-ui/react-accordion` (`type="single"
  collapsible`, single-open-at-a-time). The expand/collapse height animation uses
  Radix's own `--radix-accordion-content-height` CSS variable (see `.faq-content`
  in `index.css`), not a JS height measurement. Comes with working keyboard
  navigation (arrow keys / Home / End between questions) for free — don't remove
  the `Accordion.Header`/`Accordion.Trigger` structure, Radix relies on it for
  correct ARIA roles.
- **`Nav.jsx`** mobile drawer — built on `@radix-ui/react-dialog`. Gives real
  focus-trapping, Escape-to-close, click-outside-to-close, and `pointer-events:
  none` on the rest of the page while open (all automatic from Radix, not
  hand-rolled). The drawer's vertical position is computed at runtime by
  measuring the header row's actual height via `ResizeObserver` (see
  `headerHeight` state) rather than a hardcoded pixel value — if the header's
  height ever changes (e.g. logo size, padding), this adjusts automatically.
- **`TypingPlaceholder.jsx`** — previously had a real bug: it stashed an
  interval ID as a property on the return value of `setTimeout` (a primitive
  number), which throws in strict mode (all ES modules run in strict mode).
  The interval still ran, but cleanup silently failed to clear it. Fixed by
  using a closure variable instead. If you're rewriting this component, don't
  reintroduce that pattern. It also takes an optional `mobileText` prop —
  swaps to a shorter placeholder string below the `640px` breakpoint via
  `matchMedia`, so the search bar pill never wraps to multiple lines on phones.
- **`CountUp.jsx`** — triggers once via `IntersectionObserver`, respects
  `prefers-reduced-motion`.
- All animations respect `prefers-reduced-motion: reduce` (wrapped in a media
  query in `index.css`) — don't remove those guards.

## Assets

- `acqar-logo.webp` and `acqar-product-transparent.webp` — both converted from
  PNG to WebP during optimization (logo: 148KB → 16KB; product shot: 580KB →
  67KB). If you need to regenerate either from a source PSD/Figma export, export
  as PNG first, then convert to WebP (quality ~85–90) rather than shipping the
  raw PNG.
- `public/og-image.jpg` — the social-share preview image, a real screenshot of
  the Hero section at 1200×630, compressed to ~53KB.
- Two dead/unused files were removed during cleanup and won't reappear:
  `macbook-scene.jpg` / `macbook2-composite.jpg` (leftovers from an abandoned
  photo-compositing approach to the product mockup) and `BrowserFrame.jsx`
  (an unused custom browser-chrome component from an earlier design iteration,
  confirmed unreferenced anywhere before deletion).
