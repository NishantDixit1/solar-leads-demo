# Zonstroom Lead CRM

A small lead pipeline for a solar panel installer. A user signs in, adds leads
and moves them through **New**, **Contacted** and **Signed**. Every lead has its
own page at `/leads/<id>`, and every account sees only its own leads.

Built for Robin Hamers (VisieAI) as a work sample.

- Live: https://solar-leads-demo.vercel.app
- Repository: https://github.com/NishantDixit1/solar-leads-demo
- Stack: Next.js 16 (App Router), TypeScript, Supabase Auth + Postgres, Vercel

## Test accounts

| Email | Password |
| --- | --- |
| sam@zonstroom.test | demo-sam-2026 |
| iris@zonstroom.test | demo-iris-2026 |

Sam and Iris have separate leads. Sign in as one, copy a lead id from the other,
and the page and the API both answer "not found".

## How account A is kept out of account B's data

Three independent locks, so no single mistake opens the door.

**1. Row level security in Postgres** (`supabase/schema.sql`). Every policy on
`leads` is `auth.uid() = user_id`. This runs inside the database, so it applies
to the app, to Supabase's REST API and to any query the app forgets to filter.
With RLS on and no matching policy, Postgres returns zero rows, so anything not
explicitly allowed is denied.

**2. No service role key anywhere in the app.** The service role key bypasses
RLS. It is used by `scripts/seed.mjs` on a laptop and is never set as a Vercel
environment variable, so no deployed code path can bypass lock 1. The app only
ever holds the anon key plus the signed in user's session.

**3. An explicit `.eq('user_id', user.id)` on every statement** in
`src/lib/leads.ts`, which is the only module that touches the table. If someone
later disables RLS while debugging, these filters still hold.

The user id comes from `supabase.auth.getUser()`, which verifies the JWT with
the Auth server, rather than `getSession()`, which trusts a cookie the browser
controls. The id in the URL is only ever used as a filter value, never to decide
who the caller is.

A lead that exists but belongs to someone else returns **404, not 403**. A 403
would confirm the id is real and let an attacker enumerate other accounts' leads.

Two database triggers close the write side: `leads_set_owner` overwrites
`user_id` with `auth.uid()` on insert, so a forged `user_id` in a request body is
discarded, and `leads_freeze_owner` makes `user_id` immutable on update, so a
lead can never be handed to another account.

## Running it locally

```bash
npm install
cp .env.example .env.local     # fill in from Supabase project settings -> API
```

Run `supabase/schema.sql` once in the Supabase SQL editor, then:

```bash
node scripts/seed.mjs          # creates both accounts and their leads
npm run dev
```

## Checking the isolation

```bash
node scripts/check-isolation.mjs https://solar-leads-demo.vercel.app
```

Or against a local server (`npm run dev`) with `http://localhost:3000`.

It signs in as both accounts and then, as Sam, tries to `GET`, `PATCH` and
`DELETE` one of Iris's real lead ids, straight against Postgres and through the
app's API. It also tries to create a lead with a forged `user_id` and to call the
API with no session at all. Every attempt must fail for the script to exit 0.

## API

One response shape everywhere (`src/lib/api.ts`):

```ts
{ ok: true,  data: T }
{ ok: false, error: { code, message } }
```

| Route | Purpose |
| --- | --- |
| `GET /api/leads` | Leads owned by the caller |
| `POST /api/leads` | Create a lead, owner set by the database |
| `GET /api/leads/:id` | One lead, scoped to the caller |
| `PATCH /api/leads/:id` | Update fields or move stage |
| `DELETE /api/leads/:id` | Delete, scoped to the caller |

Error codes: `unauthenticated` (401), `not_found` (404), `invalid_input` (422),
`server_error` (500).
