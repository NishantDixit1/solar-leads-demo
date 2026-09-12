import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getLead } from '@/lib/leads'
import { getCurrentUser } from '@/lib/supabase/server'
import { AppHeader } from '@/components/AppHeader'
import { Footer } from '@/components/Footer'
import { StagePill } from '@/components/StagePill'
import { StageControl } from './StageControl'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ id: string }> }

export default async function LeadPage({ params }: Props) {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const { id } = await params
  const result = await getLead(id)

  return (
    <div className="flex min-h-dvh flex-col">
      <AppHeader email={user.email ?? ''} />

      <main className="mx-auto w-full max-w-[820px] flex-1 px-5 py-7">
        <Link
          href="/leads"
          className="text-[13px] text-[var(--color-ink-soft)] hover:text-[var(--color-brand)]"
        >
          &larr; Back to leads
        </Link>

        {!result.ok ? (
          <NotYours id={id} message={result.message} />
        ) : (
          <article className="mt-4">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-[24px] font-semibold tracking-[-0.01em]">{result.data.name}</h1>
              <StagePill stage={result.data.stage} />
            </div>
            <p className="mt-1 font-mono text-[12px] text-[var(--color-ink-faint)]">{result.data.id}</p>

            <div className="mt-5 card p-6">
              <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
                <Detail label="Email" value={result.data.email} />
                <Detail label="Phone" value={result.data.phone} />
                <Detail label="Address" value={result.data.address} />
                <Detail label="Source" value={result.data.source} />
                <Detail label="Roof size" value={result.data.roof_size} />
                <Detail
                  label="Added"
                  value={new Date(result.data.created_at).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                />
                <div className="sm:col-span-2">
                  <Detail label="Notes" value={result.data.notes} />
                </div>
              </dl>
            </div>

            <StageControl id={result.data.id} stage={result.data.stage} />
          </article>
        )}
      </main>

      <Footer />
    </div>
  )
}

function Detail({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <dt className="text-[13px] text-[var(--color-ink-faint)]">{label}</dt>
      <dd className="mt-0.5 text-[14px] whitespace-pre-wrap">
        {value || <span className="text-[var(--color-ink-faint)]">Not set</span>}
      </dd>
    </div>
  )
}

/**
 * Shown both when the id does not exist and when it belongs to another
 * account. The two cases look identical on purpose.
 */
function NotYours({ id, message }: { id: string; message: string }) {
  return (
    <div className="mt-4 card p-8 text-center">
      <h1 className="text-[20px] font-semibold">Lead not found</h1>
      <p className="mx-auto mt-2 max-w-[46ch] text-[14px] text-[var(--color-ink-soft)]">{message}</p>
      <p className="mt-4 font-mono text-[12px] break-all text-[var(--color-ink-faint)]">{id}</p>
      <Link href="/leads" className="btn-primary mt-6">
        Back to your leads
      </Link>
    </div>
  )
}
