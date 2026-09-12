import Link from 'next/link'

export function AppHeader({ email }: { email: string }) {
  return (
    <header className="border-b border-[var(--color-line)] bg-[var(--color-surface)]">
      <div className="mx-auto flex max-w-[1180px] items-center justify-between px-5 py-3.5">
        <Link href="/leads" className="flex items-baseline gap-2.5">
          <span className="text-[13px] font-semibold tracking-[0.14em] text-[var(--color-brand)] uppercase">
            Zonstroom
          </span>
          <span className="text-[14px] text-[var(--color-ink-faint)]">Lead CRM</span>
        </Link>

        <div className="flex items-center gap-3">
          <span className="hidden text-[13px] text-[var(--color-ink-soft)] sm:inline">{email}</span>
          <form action="/auth/signout" method="post">
            <button type="submit" className="btn-secondary btn-sm">
              Sign out
            </button>
          </form>
        </div>
      </div>
    </header>
  )
}
