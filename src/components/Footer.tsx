/**
 * Plain text, written by hand and not generated from a live date, so the
 * footer keeps showing the day the demo was finished.
 */
export const BUILT_BY = 'Nishant Dixit'
export const FINISHED_ON = '13 September 2026'

export function Footer() {
  return (
    <footer className="border-t border-[var(--color-line)] py-5 text-center text-[13px] text-[var(--color-ink-faint)]">
      Built by {BUILT_BY} | Finished on {FINISHED_ON}
    </footer>
  )
}
