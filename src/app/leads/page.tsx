import { redirect } from 'next/navigation'
import { listLeads } from '@/lib/leads'
import { getCurrentUser } from '@/lib/supabase/server'
import { AppHeader } from '@/components/AppHeader'
import { Footer } from '@/components/Footer'
import { Board } from './Board'
import { NewLeadForm } from './NewLeadForm'

export const dynamic = 'force-dynamic'

export default async function LeadsPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const result = await listLeads()

  return (
    <div className="flex min-h-dvh flex-col">
      <AppHeader email={user.email ?? ''} />

      <main className="mx-auto w-full max-w-[1180px] flex-1 px-5 py-7">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-[22px] font-semibold tracking-[-0.01em]">Leads</h1>
            <p className="mt-1 text-[14px] text-[var(--color-ink-soft)]">
              Everything below belongs to {user.email}. No other account can see it.
            </p>
          </div>
          <NewLeadForm />
        </div>

        {result.ok ? (
          <Board leads={result.data} />
        ) : (
          <div className="card p-6 text-[14px] text-[var(--color-danger)]">{result.message}</div>
        )}
      </main>

      <Footer />
    </div>
  )
}
