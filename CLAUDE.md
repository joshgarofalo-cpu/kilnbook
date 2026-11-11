# Kilnbook

A phone-first web app for a paint-your-own pottery studio. The goal is to replace the studio's spreadsheets with something the owners can run from their iPhones.

## Who it's for

- First customer: my aunts Jessie and Risa, who own a pottery studio in Virginia. They asked me for a pitch showing how this could work for them.
- How their studio works: walk-in "paint your own pottery." Customers pick an unpainted (bisque) piece, paint it, the studio glazes and fires it, and the customer comes back to pick it up. They do NOT run classes. They also have a party room and a small summer camp.
- Both owners use iPhones and are comfortable with tech.
- Longer term: if it works for them, sell it to other paint-your-own studios (SaaS).

## Where things stand

- `demo/index.html` is a clickable pitch demo. It's one self-contained file (inline CSS and JS, no build step) with made-up sample data held in memory. Refreshing the page resets it. Open it in a browser to see it.
- A published copy of the demo lives at https://claude.ai/artifact/Hg5kDFLMhLo4PCSxQP3StF
- `app/` is the real app, scaffolded. It has email-code sign-in, a database schema with per-studio security, an inventory screen with working + / − buttons, and a read-only pickups list. It isn't connected to a live Supabase project yet. Setup steps are in `app/README.md`.
- Not built yet: checking painters in, ticket status changes, kiln load/unload, texts, push alerts, and reorder lists.
- Everything in the demo is sample data: pieces, prices, customers, the suppliers (Mayco, Duncan), and the money numbers. Swap in the studio's real data when I get it.

## Roadmap

**Phase 1: inventory and pickups (what the demo shows)**
- Bisque inventory: count per piece type, cost, price, supplier, and a reorder point
- Counts go down automatically when a painter checks in; + and − buttons for deliveries and breakage
- Low-stock push alert and a reorder list grouped by supplier, rounded up to cases of 6
- Pickup tickets: customer name, phone, the pieces they painted, and a shelf spot that gets assigned automatically
- Status flow: painted (waiting to fire) → in the kiln → ready for pickup → picked up
- Bulk actions: "Load kiln" moves everything that's painted into the kiln; "Unload kiln" marks them all ready and texts everyone
- Texts: "ready for pickup," plus reminders for pieces that have sat 30+ days
- Search by name, phone, or shelf

**Phase 2: party room and summer camp**
- Party room calendar with deposits, headcount, package, and a prep list (which pieces to pull)
- One ticket per party, so pickup is one text to the host parent
- Camp sign-ups, roster, parent contacts, and pieces tracked per camper

**Phase 3: money dashboard**
- Revenue split by walk-ins, parties, and camp
- Profit per piece type (price minus bisque cost)
- Busy days and times, for staffing

## Tech decisions (already made)

- Backend: Supabase (Postgres plus auth)
- Hosting: Cloudflare Workers (static assets only, configured in `app/wrangler.jsonc`), deployed from GitHub on every push to `main`. Not Cloudflare Pages.
- An installable phone web app (PWA), not a native app
- Push notifications for stock alerts. On iPhone, web push only works after the app is added to the Home Screen (iOS 16.4+), so onboarding has to walk them through "Add to Home Screen."
- Front end: Vite plus plain JavaScript (no React). Screens are plain functions in `app/src/views/` that set `innerHTML`. Routing uses `#/name` URLs so hosting needs no setup.
- Sign-in: Supabase email one-time *code* (not magic link), because an iPhone Home Screen app doesn't share Safari's login. Only users added in Supabase can sign in (`shouldCreateUser: false`). Supabase won't let you edit the email template without custom SMTP, so for now the stock email's link also works (`emailRedirectTo`). Switch the template to `{{ .Token }}` once SMTP (e.g. Resend) is connected. This has to happen before the owners use it on their iPhones.
- Database changes live in `app/supabase/schema.sql`, run by hand in the Supabase SQL Editor (no Supabase CLI yet). Every table has RLS keyed on `is_studio_member(studio_id)`.
- Inventory counts change only through the `adjust_item_qty` function and the `ticket_lines` trigger, so two phones can't overwrite each other.
- Vibe coding with Claude. Keep the stack simple enough that I can follow it.

## Still open

- SMS provider for the pickup texts (Twilio or similar). It costs money per text, so it affects pricing.
- What to charge the studio, and whether they're a free pilot.
- Their real data: piece list, prices, suppliers, how their shelves are labeled, and how they track pickups today.
- Whether they use a POS (Square, etc.) that this should sync with later.

## Draft data model (for when we build the real thing)

(Built in `app/supabase/schema.sql`, plus `studios` and `studio_members`.)

- `items`: id, name, singular label, plural label, cost, price, qty, reorder point, case size, supplier
- `tickets`: id, customer name, phone, note (e.g. "Birthday party"), shelf, status, timestamps for each status (painted, kiln, ready, picked up), last reminder sent
- `ticket_lines`: ticket id, item id, qty
- `texts`: ticket id, type (ready or reminder), body, sent time, delivery status
- Later: `parties`, `camp_sessions`, `campers`
- Every table gets a `studio_id` from the start so it can serve multiple studios later.

## How I want to work

- I'm learning as I go (finance background; I've built a few websites). Explain decisions briefly and in plain language.
- I'd rather get working, ready-to-use code than a lot of back-and-forth questions.
- Keep the demo in `demo/` working as the pitch piece. Build the real app separately (for example in `app/`).

## Next steps

1. Pitch the demo to Jessie and Risa and collect their real data and pain points.
2. Create the Supabase project and Cloudflare site by following `app/README.md` (needs my accounts).
3. Build the rest of phase 1: check-in, status changes, kiln load/unload, then texts and stock alerts.
4. Swap the sample seed data for their real piece list.
