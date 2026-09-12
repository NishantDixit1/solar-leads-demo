/**
 * Proves that account A cannot reach account B's data.
 *
 * Signs in as both test accounts against the running app, then tries, as Sam,
 * every route that takes a lead id, using one of Iris's real ids.
 *
 *   node scripts/check-isolation.mjs [baseUrl]
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'

for (const line of readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split('\n')) {
  const match = line.match(/^([A-Z_]+)=(.*)$/)
  if (match) process.env[match[1]] ??= match[2].trim()
}

const BASE = process.argv[2] ?? 'http://localhost:3000'
const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const ACCOUNTS = {
  sam: { email: 'sam@zonstroom.test', password: 'demo-sam-2026' },
  iris: { email: 'iris@zonstroom.test', password: 'demo-iris-2026' },
}

async function session({ email, password }) {
  const supabase = createClient(url, anon, { auth: { persistSession: false } })
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw new Error(`sign in failed for ${email}: ${error.message}`)
  return { supabase, token: data.session.access_token }
}

/** Calls the app's own API with a bearer cookie built from the access token. */
async function callApi(token, path, init = {}) {
  const projectRef = new URL(url).hostname.split('.')[0]
  const cookie = `sb-${projectRef}-auth-token=base64-${Buffer.from(
    JSON.stringify({ access_token: token, token_type: 'bearer', refresh_token: '' }),
  ).toString('base64')}`

  const response = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', cookie, ...(init.headers ?? {}) },
    redirect: 'manual',
  })
  const text = await response.text()
  let body
  try {
    body = JSON.parse(text)
  } catch {
    body = text.slice(0, 120)
  }
  return { status: response.status, body }
}

let failures = 0
function check(name, passed, detail) {
  console.log(`${passed ? 'PASS' : 'FAIL'}  ${name}${detail ? `  ${detail}` : ''}`)
  if (!passed) failures++
}

const sam = await session(ACCOUNTS.sam)
const iris = await session(ACCOUNTS.iris)

// Straight from the database, with each user's own token: RLS in isolation.
const samRows = await sam.supabase.from('leads').select('id, name')
const irisRows = await iris.supabase.from('leads').select('id, name')

check('Sam sees only his own leads via PostgREST', samRows.data.length > 0, `${samRows.data.length} rows`)
check('Iris sees only her own leads via PostgREST', irisRows.data.length > 0, `${irisRows.data.length} rows`)

const samIds = new Set(samRows.data.map((r) => r.id))
const overlap = irisRows.data.filter((r) => samIds.has(r.id))
check('The two result sets do not overlap', overlap.length === 0, `${overlap.length} shared rows`)

const irisLeadId = irisRows.data[0].id
const irisLeadName = irisRows.data[0].name

// Reading one of Iris's rows directly, as Sam, with an explicit id filter.
const direct = await sam.supabase.from('leads').select('*').eq('id', irisLeadId)
check('Sam querying Iris\'s id on PostgREST gets nothing', direct.data.length === 0)

// The same id through the app's own API routes.
const get = await callApi(sam.token, `/api/leads/${irisLeadId}`)
check('GET /api/leads/<iris id> as Sam returns 404', get.status === 404, JSON.stringify(get.body))

const patch = await callApi(sam.token, `/api/leads/${irisLeadId}`, {
  method: 'PATCH',
  body: JSON.stringify({ stage: 'signed' }),
})
check('PATCH /api/leads/<iris id> as Sam returns 404', patch.status === 404, JSON.stringify(patch.body))

const del = await callApi(sam.token, `/api/leads/${irisLeadId}`, { method: 'DELETE' })
check('DELETE /api/leads/<iris id> as Sam returns 404', del.status === 404, JSON.stringify(del.body))

// And the write really did not land.
const after = await iris.supabase.from('leads').select('id, name, stage').eq('id', irisLeadId).single()
check('Iris\'s lead is untouched', after.data?.name === irisLeadName, JSON.stringify(after.data))

// Forging the owner on create.
const forged = await callApi(sam.token, '/api/leads', {
  method: 'POST',
  body: JSON.stringify({ name: 'Forged owner', user_id: irisRows.data[0].user_id ?? null }),
})
if (forged.status === 201) {
  const landed = await iris.supabase.from('leads').select('id').eq('id', forged.body.data.id)
  check('A posted user_id cannot assign a lead to Iris', landed.data.length === 0)
  await sam.supabase.from('leads').delete().eq('id', forged.body.data.id)
} else {
  check('Create with a forged user_id', false, JSON.stringify(forged.body))
}

// No session at all.
const anonGet = await callApi('', `/api/leads`)
check('GET /api/leads with no session is refused', anonGet.status === 401, JSON.stringify(anonGet.body))

console.log(failures === 0 ? '\nAll checks passed.' : `\n${failures} check(s) failed.`)
process.exit(failures === 0 ? 0 : 1)
