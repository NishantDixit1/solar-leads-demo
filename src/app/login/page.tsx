import { Suspense } from 'react'
import { LoginForm } from './LoginForm'
import { Footer } from '@/components/Footer'

export default function LoginPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-[380px]">
          <div className="mb-7">
            <p className="text-[13px] font-semibold tracking-[0.14em] text-[var(--color-brand)] uppercase">
              Zonstroom
            </p>
            <h1 className="mt-1.5 text-[26px] font-semibold tracking-[-0.01em]">Lead CRM</h1>
            <p className="mt-1.5 text-[14px] text-[var(--color-ink-soft)]">
              Sign in to see the leads assigned to you.
            </p>
          </div>

          <div className="card p-6">
            <Suspense>
              <LoginForm />
            </Suspense>
          </div>

          <div className="mt-5 rounded-[var(--radius-card)] border border-[var(--color-line)] bg-[var(--color-brand-soft)] p-4 text-[13px] leading-relaxed text-[var(--color-ink-soft)]">
            <p className="mb-2 font-medium text-[var(--color-ink)]">Test accounts</p>
            <p>
              sam@zonstroom.test / demo-sam-2026
              <br />
              iris@zonstroom.test / demo-iris-2026
            </p>
            <p className="mt-2">
              Each account has its own leads. Signing in as one and opening the other one&apos;s
              lead URL returns nothing.
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
