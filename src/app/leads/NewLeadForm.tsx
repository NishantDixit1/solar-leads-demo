'use client'

import { useRouter } from 'next/navigation'
import { useRef, useState } from 'react'
import { Field } from '@/components/Field'

export function NewLeadForm() {
  const router = useRouter()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  function close() {
    setError(null)
    formRef.current?.reset()
    dialogRef.current?.close()
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError(null)

    const form = new FormData(event.currentTarget)
    const response = await fetch('/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // No user_id is sent. The database fills it in from the session.
      body: JSON.stringify({
        name: form.get('name'),
        email: form.get('email'),
        phone: form.get('phone'),
        address: form.get('address'),
        source: form.get('source'),
        roof_size: form.get('roof_size'),
        notes: form.get('notes'),
      }),
    })
    const payload = await response.json()

    setBusy(false)

    if (!payload.ok) {
      setError(payload.error.message)
      return
    }

    close()
    router.refresh()
  }

  return (
    <>
      <button type="button" className="btn-primary" onClick={() => dialogRef.current?.showModal()}>
        Add lead
      </button>

      <dialog
        ref={dialogRef}
        onClose={close}
        className="m-auto w-[min(540px,calc(100vw-2rem))] rounded-[var(--radius-card)] p-0 backdrop:bg-black/35"
      >
        <form ref={formRef} onSubmit={onSubmit} className="bg-[var(--color-surface)] p-6">
          <h2 className="text-[18px] font-semibold">New lead</h2>
          <p className="mt-1 text-[14px] text-[var(--color-ink-soft)]">
            It lands in New and is owned by your account.
          </p>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Field label="Name" name="name" required placeholder="Familie de Vries" />
            </div>
            <Field label="Email" name="email" type="email" placeholder="naam@voorbeeld.nl" />
            <Field label="Phone" name="phone" placeholder="06 12 34 56 78" />
            <div className="sm:col-span-2">
              <Field label="Address" name="address" placeholder="Keizersgracht 12, Amsterdam" />
            </div>
            <Field label="Source" name="source" placeholder="Zonnepanelen vergelijker" />
            <Field label="Roof size" name="roof_size" placeholder="42 m2" />
            <div className="sm:col-span-2">
              <Field label="Notes" name="notes" textarea placeholder="Wants a quote before October." />
            </div>
          </div>

          {error && (
            <p className="mt-4 rounded-[var(--radius-control)] bg-[var(--color-danger-soft)] px-3 py-2 text-[13px] text-[var(--color-danger)]">
              {error}
            </p>
          )}

          <div className="mt-6 flex justify-end gap-2">
            <button type="button" className="btn-secondary" onClick={close}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={busy}>
              {busy ? 'Saving' : 'Save lead'}
            </button>
          </div>
        </form>
      </dialog>
    </>
  )
}
