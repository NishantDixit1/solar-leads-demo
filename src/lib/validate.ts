import { isStage, type LeadInput } from '@/lib/types'

type Parsed = { ok: true; value: LeadInput } | { ok: false; message: string }

function text(value: unknown, max: number): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed) return null
  return trimmed.slice(0, max)
}

/** Accepts only the fields we know about, so nothing else reaches the table. */
export function parseLeadInput(body: unknown, { partial = false } = {}): Parsed {
  if (typeof body !== 'object' || body === null) {
    return { ok: false, message: 'Expected a JSON object.' }
  }

  const raw = body as Record<string, unknown>
  const name = text(raw.name, 120)

  if (!partial && !name) {
    return { ok: false, message: 'A name is required.' }
  }

  if (raw.stage !== undefined && !isStage(raw.stage)) {
    return { ok: false, message: 'stage must be one of: new, contacted, signed.' }
  }

  return {
    ok: true,
    value: {
      name: name ?? '',
      email: text(raw.email, 160),
      phone: text(raw.phone, 40),
      address: text(raw.address, 200),
      source: text(raw.source, 80),
      roof_size: text(raw.roof_size, 40),
      notes: text(raw.notes, 2000),
      ...(raw.stage !== undefined && isStage(raw.stage) ? { stage: raw.stage } : {}),
    },
  }
}
