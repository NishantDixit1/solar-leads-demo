import { NextRequest } from 'next/server'
import { fail, ok } from '@/lib/api'
import { deleteLead, getLead, updateLead, updateLeadStage } from '@/lib/leads'
import { parseLeadInput } from '@/lib/validate'
import { isStage } from '@/lib/types'

export const dynamic = 'force-dynamic'

type Context = { params: Promise<{ id: string }> }

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * The id arrives from the URL, so it is attacker controlled. It is only ever
 * used as a filter value next to .eq('user_id', <verified user>), never to
 * decide who the caller is.
 */
export async function GET(_request: NextRequest, { params }: Context) {
  const { id } = await params
  if (!UUID.test(id)) return fail('not_found', 'No lead with that id in your account.')

  const result = await getLead(id)
  if (!result.ok) return fail(result.reason, result.message)
  return ok(result.data)
}

export async function PATCH(request: NextRequest, { params }: Context) {
  const { id } = await params
  if (!UUID.test(id)) return fail('not_found', 'No lead with that id in your account.')

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return fail('invalid_input', 'Body must be valid JSON.')
  }

  const raw = (body ?? {}) as Record<string, unknown>

  // Stage only move, used by the board buttons.
  if (Object.keys(raw).length === 1 && raw.stage !== undefined) {
    if (!isStage(raw.stage)) {
      return fail('invalid_input', 'stage must be one of: new, contacted, signed.')
    }
    const moved = await updateLeadStage(id, raw.stage)
    if (!moved.ok) return fail(moved.reason, moved.message)
    return ok(moved.data)
  }

  const parsed = parseLeadInput(body)
  if (!parsed.ok) return fail('invalid_input', parsed.message)

  const result = await updateLead(id, parsed.value)
  if (!result.ok) return fail(result.reason, result.message)
  return ok(result.data)
}

export async function DELETE(_request: NextRequest, { params }: Context) {
  const { id } = await params
  if (!UUID.test(id)) return fail('not_found', 'No lead with that id in your account.')

  const result = await deleteLead(id)
  if (!result.ok) return fail(result.reason, result.message)
  return ok(result.data)
}
