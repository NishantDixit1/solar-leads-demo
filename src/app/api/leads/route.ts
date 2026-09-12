import { NextRequest } from 'next/server'
import { fail, ok } from '@/lib/api'
import { createLead, listLeads } from '@/lib/leads'
import { parseLeadInput } from '@/lib/validate'

export const dynamic = 'force-dynamic'

export async function GET() {
  const result = await listLeads()
  if (!result.ok) return fail(result.reason, result.message)
  return ok(result.data)
}

export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return fail('invalid_input', 'Body must be valid JSON.')
  }

  const parsed = parseLeadInput(body)
  if (!parsed.ok) return fail('invalid_input', parsed.message)

  const result = await createLead(parsed.value)
  if (!result.ok) return fail(result.reason, result.message)
  return ok(result.data, 201)
}
