import { NextResponse } from 'next/server'

/**
 * One response shape for every route handler, so the client never has to guess.
 *   success -> { ok: true,  data }
 *   failure -> { ok: false, error: { code, message } }
 */
export type ApiSuccess<T> = { ok: true; data: T }
export type ApiFailure = { ok: false; error: { code: ApiErrorCode; message: string } }
export type ApiResponse<T> = ApiSuccess<T> | ApiFailure

export type ApiErrorCode =
  | 'unauthenticated'
  | 'not_found'
  | 'invalid_input'
  | 'server_error'

const STATUS: Record<ApiErrorCode, number> = {
  unauthenticated: 401,
  not_found: 404,
  invalid_input: 422,
  server_error: 500,
}

export function ok<T>(data: T, status = 200) {
  return NextResponse.json<ApiSuccess<T>>({ ok: true, data }, { status })
}

export function fail(code: ApiErrorCode, message: string) {
  return NextResponse.json<ApiFailure>(
    { ok: false, error: { code, message } },
    { status: STATUS[code] },
  )
}

/**
 * A lead that exists but belongs to someone else is reported as not_found,
 * not as forbidden. A 403 would confirm the id is real, which hands an
 * attacker a way to enumerate other accounts' leads.
 */
export const NOT_FOUND_MESSAGE = 'No lead with that id in your account.'
