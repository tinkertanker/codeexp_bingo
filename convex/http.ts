import { httpRouter } from 'convex/server'
import { httpAction } from './_generated/server'
import { internal } from './_generated/api'
import { assertAdmin } from './admin'

// The admin panel is served from a different origin than Convex's HTTP endpoints,
// so the browser sends a CORS preflight and needs these headers on the response.
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

// Records an admin login WITH a best-effort client IP (read from the request headers,
// which a plain Convex mutation can't see). Falls back to adminAccess.recordLogin
// client-side if this endpoint is unreachable.
const recordLogin = httpAction(async (ctx, request) => {
  let body: Record<string, unknown>
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return new Response('Bad JSON', { status: 400, headers: CORS_HEADERS })
  }

  const passcode = typeof body.passcode === 'string' ? body.passcode : ''
  const name = typeof body.name === 'string' ? body.name.trim() : ''
  const userAgent = typeof body.userAgent === 'string' ? body.userAgent : undefined
  const path = typeof body.path === 'string' ? body.path : undefined
  const event = typeof body.event === 'string' ? body.event : undefined

  try {
    assertAdmin(passcode)
  } catch {
    return new Response('Forbidden', { status: 403, headers: CORS_HEADERS })
  }
  if (!name) return new Response('name required', { status: 400, headers: CORS_HEADERS })

  const forwarded = request.headers.get('x-forwarded-for')
  const ip =
    forwarded?.split(',')[0]?.trim() ||
    request.headers.get('cf-connecting-ip') ||
    request.headers.get('x-real-ip') ||
    undefined

  await ctx.runMutation(internal.adminAccess.insertLogin, {
    name,
    at: Date.now(),
    userAgent,
    ip: ip ?? undefined,
    path,
    event,
  })

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
})

const http = httpRouter()
http.route({ path: '/recordLogin', method: 'POST', handler: recordLogin })
http.route({
  path: '/recordLogin',
  method: 'OPTIONS',
  handler: httpAction(async () => new Response(null, { status: 204, headers: CORS_HEADERS })),
})

export default http
