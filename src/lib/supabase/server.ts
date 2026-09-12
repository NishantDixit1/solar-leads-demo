import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

/**
 * Server side Supabase client, built from the signed in user's cookies and
 * the ANON key.
 *
 * This app never instantiates a service role client. The service role key
 * bypasses row level security, so keeping it out of the codebase entirely
 * means there is no code path, and no future mistake, that can read across
 * accounts. Every query below runs as the logged in user.
 */
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            )
          } catch {
            // Called from a Server Component, where cookies are read only.
            // The middleware refreshes the session instead.
          }
        },
      },
    },
  )
}

/**
 * Resolves the current user by asking the Auth server to verify the JWT.
 * getUser() is used rather than getSession(), because the session is read
 * from a cookie the browser controls and is therefore not trustworthy on
 * its own.
 */
export async function getCurrentUser() {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getUser()
  if (error) return null
  return data.user
}
