'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { STAGES, STAGE_LABELS, type Lead, type Stage } from '@/lib/types'

const NEXT_STAGE: Record<Stage, Stage | null> = {
  new: 'contacted',
  contacted: 'signed',
  signed: null,
}

const PREV_STAGE: Record<Stage, Stage | null> = {
  new: null,
  contacted: 'new',
  signed: 'contacted',
}

const COLUMN_ACCENT: Record<Stage, string> = {
  new: 'bg-[var(--color-stage-new)]',
  contacted: 'bg-[var(--color-stage-contacted)]',
  signed: 'bg-[var(--color-stage-signed)]',
}

export function Board({ leads }: { leads: Lead[] }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [movingId, setMovingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function move(lead: Lead, stage: Stage) {
    setMovingId(lead.id)
    setError(null)

    const response = await fetch(`/api/leads/${lead.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stage }),
    })
    const payload = await response.json()

    setMovingId(null)

    if (!payload.ok) {
      setError(payload.error.message)
      return
    }
    startTransition(() => router.refresh())
  }

  return (
    <div>
      {error && (
        <p className="mb-4 rounded-[var(--radius-control)] bg-[var(--color-danger-soft)] px-3 py-2 text-[13px] text-[var(--color-danger)]">
          {error}
        </p>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        {STAGES.map((stage) => {
          const column = leads.filter((lead) => lead.stage === stage)

          return (
            <section key={stage} className="card overflow-hidden">
              <div className="flex items-center gap-2 border-b border-[var(--color-line)] px-4 py-3">
                <span className={`size-2 rounded-full ${COLUMN_ACCENT[stage]}`} />
                <h2 className="text-[14px] font-semibold">{STAGE_LABELS[stage]}</h2>
                <span className="ml-auto text-[13px] text-[var(--color-ink-faint)]">
                  {column.length}
                </span>
              </div>

              <div className="space-y-2.5 p-3">
                {column.length === 0 && (
                  <p className="px-1 py-5 text-center text-[13px] text-[var(--color-ink-faint)]">
                    Nothing here yet
                  </p>
                )}

                {column.map((lead) => {
                  const back = PREV_STAGE[lead.stage]
                  const forward = NEXT_STAGE[lead.stage]
                  const busy = movingId === lead.id || pending

                  return (
                    <article
                      key={lead.id}
                      className="rounded-[var(--radius-control)] border border-[var(--color-line)] bg-white p-3 transition-shadow hover:shadow-[0_1px_3px_rgba(20,24,29,0.08)]"
                    >
                      <Link
                        href={`/leads/${lead.id}`}
                        className="block text-[14px] font-medium hover:text-[var(--color-brand)]"
                      >
                        {lead.name}
                      </Link>

                      <dl className="mt-1.5 space-y-0.5 text-[13px] text-[var(--color-ink-soft)]">
                        {lead.address && <dd>{lead.address}</dd>}
                        {lead.source && (
                          <dd className="text-[var(--color-ink-faint)]">via {lead.source}</dd>
                        )}
                      </dl>

                      <div className="mt-2.5 flex items-center gap-1.5">
                        {back && (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => move(lead, back)}
                            className="btn-ghost btn-sm"
                            aria-label={`Move ${lead.name} back to ${STAGE_LABELS[back]}`}
                          >
                            &larr; {STAGE_LABELS[back]}
                          </button>
                        )}
                        {forward && (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => move(lead, forward)}
                            className="btn-secondary btn-sm ml-auto"
                            aria-label={`Move ${lead.name} to ${STAGE_LABELS[forward]}`}
                          >
                            {STAGE_LABELS[forward]} &rarr;
                          </button>
                        )}
                      </div>
                    </article>
                  )
                })}
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}
