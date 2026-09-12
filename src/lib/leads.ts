import { createClient, getCurrentUser } from '@/lib/supabase/server'
import type { Lead, LeadInput, Stage } from '@/lib/types'

/**
 * ===========================================================================
 *  The tenant boundary.
 * ===========================================================================
 *
 *  Every read and write of a lead goes through this module, and every query
 *  here is filtered by the id of the user who is actually signed in.
 *
 *  There are three independent locks, so no single mistake opens the door:
 *
 *  1. Postgres row level security. The policies in supabase/schema.sql allow
 *     a row only when auth.uid() = leads.user_id. This runs inside the
 *     database, so it applies to the REST API and to any query this app
 *     forgets to filter. It is the lock that actually matters.
 *
 *  2. The anon key only. This app never builds a service role client, so
 *     nothing it sends to Postgres can bypass rule 1.
 *
 *  3. An explicit .eq('user_id', user.id) on every statement below. This is
 *     belt and braces: if someone later disables RLS on the table while
 *     debugging, these filters still hold the line.
 *
 *  The user id comes from supabase.auth.getUser(), which verifies the JWT
 *  with the Auth server. It is never read from the URL, the request body or
 *  a header, so changing the id in /leads/<id> changes only which row is
 *  being asked for, never who is asking.
 */

type Result<T> =
  | { ok: true; data: T }
  | { ok: false; reason: 'unauthenticated' | 'not_found' | 'server_error'; message: string }

async function requireUser() {
  const user = await getCurrentUser()
  if (!user) return null
  return user
}

const unauthenticated = {
  ok: false as const,
  reason: 'unauthenticated' as const,
  message: 'Sign in to continue.',
}

const notFound = {
  ok: false as const,
  reason: 'not_found' as const,
  // Deliberately the same answer for "does not exist" and "belongs to
  // someone else", so the response cannot be used to probe for real ids.
  message: 'No lead with that id in your account.',
}

function serverError(message: string) {
  return { ok: false as const, reason: 'server_error' as const, message }
}

export async function listLeads(): Promise<Result<Lead[]>> {
  const user = await requireUser()
  if (!user) return unauthenticated

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .eq('user_id', user.id) // lock 3
    .order('created_at', { ascending: false })

  if (error) return serverError(error.message)
  return { ok: true, data: (data ?? []) as Lead[] }
}

export async function getLead(id: string): Promise<Result<Lead>> {
  const user = await requireUser()
  if (!user) return unauthenticated

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id) // lock 3: the id from the URL is scoped to the caller
    .maybeSingle()

  if (error) return serverError(error.message)
  if (!data) return notFound
  return { ok: true, data: data as Lead }
}

export async function createLead(input: LeadInput): Promise<Result<Lead>> {
  const user = await requireUser()
  if (!user) return unauthenticated

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('leads')
    .insert({
      // user_id is set by the leads_set_owner trigger from auth.uid().
      // Even if a caller posts a user_id in the body, the database overwrites it.
      name: input.name,
      email: input.email ?? null,
      phone: input.phone ?? null,
      address: input.address ?? null,
      source: input.source ?? null,
      roof_size: input.roof_size ?? null,
      notes: input.notes ?? null,
      stage: input.stage ?? 'new',
    })
    .select('*')
    .single()

  if (error) return serverError(error.message)
  return { ok: true, data: data as Lead }
}

export async function updateLeadStage(id: string, stage: Stage): Promise<Result<Lead>> {
  const user = await requireUser()
  if (!user) return unauthenticated

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('leads')
    .update({ stage })
    .eq('id', id)
    .eq('user_id', user.id) // lock 3
    .select('*')
    .maybeSingle()

  if (error) return serverError(error.message)
  if (!data) return notFound
  return { ok: true, data: data as Lead }
}

export async function updateLead(id: string, input: LeadInput): Promise<Result<Lead>> {
  const user = await requireUser()
  if (!user) return unauthenticated

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('leads')
    .update({
      name: input.name,
      email: input.email ?? null,
      phone: input.phone ?? null,
      address: input.address ?? null,
      source: input.source ?? null,
      roof_size: input.roof_size ?? null,
      notes: input.notes ?? null,
      ...(input.stage ? { stage: input.stage } : {}),
    })
    .eq('id', id)
    .eq('user_id', user.id) // lock 3
    .select('*')
    .maybeSingle()

  if (error) return serverError(error.message)
  if (!data) return notFound
  return { ok: true, data: data as Lead }
}

export async function deleteLead(id: string): Promise<Result<{ id: string }>> {
  const user = await requireUser()
  if (!user) return unauthenticated

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('leads')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id) // lock 3
    .select('id')
    .maybeSingle()

  if (error) return serverError(error.message)
  if (!data) return notFound
  return { ok: true, data: { id: data.id as string } }
}
