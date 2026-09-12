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

const PROJECT_REF = new URL(url).hostname.split('.')[0]
const COOKIE_NAME = `sb-${PROJECT_REF}-auth-token`
const CHUNK_SIZE = 3180

async function session({ email, password }) {
  const supabase = createClient(url, anon, { auth: { persistSession: false } })
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw new Error(`sign in failed for ${email}: ${error.message}`)
  return { supabase, cookie: toCookie(data.session) }
}

/**
 * @supabase/ssr stores the whole session object, base64 encoded, under
 * sb-<ref>-auth-token, splitting it across .0/.1/... when it is too long for
 * one cookie. Rebuilding it here lets the script talk to the app's own routes
 * exactly as a browser would.
 */
function toCookie(sessionObject) {
  const encoded = `base64-${Buffer.from(JSON.stringify(sessionObject)).toString('base64url')}`

  if (encoded.length <= CHUNK_SIZE) return `${COOKIE_NAME}=${encoded}`

  const parts = []
  for (let i = 0; i * CHUNK_SIZE < encoded.length; i++) {
    parts.push(`${COOKIE_NAME}.${i}=${encoded.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE)}`)
  }
  return parts.join('; ')
}

/** Calls the app's own API the way a signed in browser would. */
async function callApi(cookie, path, init = {}) {
  const response = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(cookie ? { cookie } : {}), ...(init.headers ?? {}) },
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
const irisRows = await iris.supabase.from('leads').select('id, name, user_id')

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
const get = await callApi(sam.cookie, `/api/leads/${irisLeadId}`)
check('GET /api/leads/<iris id> as Sam returns 404', get.status === 404, JSON.stringify(get.body))

const patch = await callApi(sam.cookie, `/api/leads/${irisLeadId}`, {
  method: 'PATCH',
  body: JSON.stringify({ stage: 'signed' }),
})
check('PATCH /api/leads/<iris id> as Sam returns 404', patch.status === 404, JSON.stringify(patch.body))

const del = await callApi(sam.cookie, `/api/leads/${irisLeadId}`, { method: 'DELETE' })
check('DELETE /api/leads/<iris id> as Sam returns 404', del.status === 404, JSON.stringify(del.body))

// And the write really did not land.
const after = await iris.supabase.from('leads').select('id, name, stage').eq('id', irisLeadId).single()
check('Iris\'s lead is untouched', after.data?.name === irisLeadName, JSON.stringify(after.data))

// Forging the owner on create.
const irisUserId = irisRows.data[0].user_id
const forged = await callApi(sam.cookie, '/api/leads', {
  method: 'POST',
  body: JSON.stringify({ name: 'Forged owner', user_id: irisUserId }),
})
if (forged.status === 201) {
  const landed = await iris.supabase.from('leads').select('id').eq('id', forged.body.data.id)
  check('A posted user_id cannot assign a lead to Iris', landed.data.length === 0)
  await sam.supabase.from('leads').delete().eq('id', forged.body.data.id)
} else {
  check('Create with a forged user_id', false, JSON.stringify(forged.body))
}

// No session at all.
const anonGet = await callApi(null, '/api/leads')
check('GET /api/leads with no session is refused', anonGet.status === 401, JSON.stringify(anonGet.body))

console.log(failures === 0 ? '\nAll checks passed.' : `\n${failures} check(s) failed.`)
process.exit(failures === 0 ? 0 : 1)
