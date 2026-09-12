/**
 * Creates the two test accounts and their leads.
 *
 * Run locally only: node scripts/seed.mjs
 *
 * This is the one place the service role key is used, and it lives in
 * .env.local, which is not committed and is never set on Vercel. The
 * deployed app has no access to it.
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'

for (const line of readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split('\n')) {
  const match = line.match(/^([A-Z_]+)=(.*)$/)
  if (match) process.env[match[1]] ??= match[2].trim()
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !serviceKey) {
  console.error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const admin = createClient(url, serviceKey, { auth: { persistSession: false } })

const ACCOUNTS = [
  {
    email: 'sam@zonstroom.test',
    password: 'demo-sam-2026',
    leads: [
      {
        name: 'Familie de Vries',
        email: 'devries@voorbeeld.nl',
        phone: '06 21 44 87 10',
        address: 'Keizersgracht 112, Amsterdam',
        source: 'Zonnepanelen vergelijker',
        roof_size: '48 m2',
        notes: 'South facing roof, wants a quote before October.',
        stage: 'new',
      },
      {
        name: 'Bakkerij Hoogland',
        email: 'info@hoogland.nl',
        phone: '020 441 22 09',
        address: 'Haarlemmerdijk 8, Amsterdam',
        source: 'Website form',
        roof_size: '120 m2',
        notes: 'Flat roof above the bakery. Asked about a battery as well.',
        stage: 'contacted',
      },
      {
        name: 'J. Meijer',
        email: 'j.meijer@voorbeeld.nl',
        phone: '06 13 90 55 21',
        address: 'Dorpsstraat 45, Purmerend',
        source: 'Solar offerte',
        roof_size: '36 m2',
        notes: 'Signed for 14 panels. Installation planned for next month.',
        stage: 'signed',
      },
      {
        name: 'VvE Parkzicht',
        email: 'bestuur@parkzicht.nl',
        phone: '020 772 18 34',
        address: 'Parklaan 2, Amstelveen',
        source: 'Referral',
        roof_size: '260 m2',
        notes: 'Owners association, decision needs a members vote in November.',
        stage: 'new',
      },
    ],
  },
  {
    email: 'iris@zonstroom.test',
    password: 'demo-iris-2026',
    leads: [
      {
        name: 'Garage Stevens',
        email: 'contact@garagestevens.nl',
        phone: '030 622 90 41',
        address: 'Industrieweg 17, Utrecht',
        source: 'Zonnepanelen vergelijker',
        roof_size: '180 m2',
        notes: 'Wants to offset the workshop load. Site visit booked.',
        stage: 'contacted',
      },
      {
        name: 'Familie Aydin',
        email: 'aydin@voorbeeld.nl',
        phone: '06 45 21 77 08',
        address: 'Biltstraat 91, Utrecht',
        source: 'Website form',
        roof_size: '52 m2',
        notes: 'Asked for a comparison between 10 and 14 panels.',
        stage: 'new',
      },
      {
        name: 'Kwekerij Ten Brink',
        email: 'info@tenbrink.nl',
        phone: '0318 51 44 20',
        address: 'Veenweg 3, Ede',
        source: 'Trade fair',
        roof_size: '410 m2',
        notes: 'Signed. Greenhouse roof, phased over two quarters.',
        stage: 'signed',
      },
    ],
  },
]

async function upsertUser({ email, password }) {
  const { data: created, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (!error) return created.user

  // Already there from an earlier run: find it and reset the password.
  const { data: list } = await admin.auth.admin.listUsers({ perPage: 200 })
  const existing = list.users.find((u) => u.email === email)
  if (!existing) throw error

  await admin.auth.admin.updateUserById(existing.id, { password, email_confirm: true })
  return existing
}

for (const account of ACCOUNTS) {
  const user = await upsertUser(account)
  console.log(`account ${account.email} -> ${user.id}`)

  await admin.from('leads').delete().eq('user_id', user.id)

  const { error } = await admin
    .from('leads')
    .insert(account.leads.map((lead) => ({ ...lead, user_id: user.id })))

  if (error) {
    console.error(`  failed to seed leads: ${error.message}`)
    process.exit(1)
  }

  const { data } = await admin.from('leads').select('id, name, stage').eq('user_id', user.id)
  for (const lead of data) console.log(`  ${lead.stage.padEnd(9)} ${lead.name}  ${lead.id}`)
}

console.log('\nSeed complete.')
