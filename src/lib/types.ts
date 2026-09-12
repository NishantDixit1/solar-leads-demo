export const STAGES = ['new', 'contacted', 'signed'] as const

export type Stage = (typeof STAGES)[number]

export const STAGE_LABELS: Record<Stage, string> = {
  new: 'New',
  contacted: 'Contacted',
  signed: 'Signed',
}

export type Lead = {
  id: string
  user_id: string
  name: string
  email: string | null
  phone: string | null
  address: string | null
  source: string | null
  roof_size: string | null
  notes: string | null
  stage: Stage
  created_at: string
  updated_at: string
}

export type LeadInput = {
  name: string
  email?: string | null
  phone?: string | null
  address?: string | null
  source?: string | null
  roof_size?: string | null
  notes?: string | null
  stage?: Stage
}

export function isStage(value: unknown): value is Stage {
  return typeof value === 'string' && (STAGES as readonly string[]).includes(value)
}
