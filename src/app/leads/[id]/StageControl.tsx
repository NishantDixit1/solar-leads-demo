'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { STAGES, STAGE_LABELS, type Stage } from '@/lib/types'

export function StageControl({ id, stage }: { id: string; stage: Stage }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function move(next: Stage) {
    if (next === stage) return
    setBusy(true)
    setError(null)

    const response = await fetch(`/api/leads/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stage: next }),
    })
    const payload = await response.json()

    setBusy(false)
    if (!payload.ok) {
      setError(payload.error.message)
      return
    }
    router.refresh()
  }

  return (
    <div className="mt-5 card p-5">
      <h2 className="text-[14px] font-semibold">Stage</h2>
      <p className="mt-1 text-[13px] text-[var(--color-ink-soft)]">
        Move this lead through the pipeline.
      </p>

      <div className="mt-3.5 flex flex-wrap gap-2">
        {STAGES.map((option) => (
          <button
            key={option}
            type="button"
            disabled={busy || option === stage}
            onClick={() => move(option)}
            aria-current={option === stage}
            className={
              option === stage
                ? 'btn bg-[var(--color-brand)] text-white disabled:opacity-100'
                : 'btn-secondary'
            }
          >
            {STAGE_LABELS[option]}
          </button>
        ))}
      </div>

      {error && (
        <p className="mt-3 rounded-[var(--radius-control)] bg-[var(--color-danger-soft)] px-3 py-2 text-[13px] text-[var(--color-danger)]">
          {error}
        </p>
      )}
    </div>
  )
}
