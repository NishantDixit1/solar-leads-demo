import { STAGE_LABELS, type Stage } from '@/lib/types'

const TONE: Record<Stage, string> = {
  new: 'bg-[var(--color-stage-new-soft)] text-[var(--color-stage-new)]',
  contacted: 'bg-[var(--color-stage-contacted-soft)] text-[var(--color-stage-contacted)]',
  signed: 'bg-[var(--color-stage-signed-soft)] text-[var(--color-stage-signed)]',
}

export function StagePill({ stage }: { stage: Stage }) {
  return <span className={`pill ${TONE[stage]}`}>{STAGE_LABELS[stage]}</span>
}
