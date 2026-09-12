const SECURITY_HEADERS = {
  'Content-Security-Policy': "default-src 'self'; base-uri 'none'; connect-src 'self' https://aiboard.evemisslab.com; font-src 'self'; form-action 'self'; frame-ancestors 'none'; img-src 'self' data:; object-src 'none'; script-src 'self'; style-src 'self'",
  'Permissions-Policy': 'camera=(), geolocation=(), microphone=(), payment=(), usb=()',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
} as const

function secure(response: Response): Response {
  const headers = new Headers(response.headers)
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) headers.set(name, value)

  const contentType = headers.get('content-type') ?? ''
  if (contentType.includes('text/html')) headers.set('Cache-Control', 'no-cache')
  if (!headers.has('Cache-Control')) {
    if (!response.ok) headers.set('Cache-Control', 'no-store')
    else if (contentType.includes('application/json')) headers.set('Cache-Control', 'public, max-age=300')
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}

function healthResponse(method: string): Response {
  const headers = new Headers({
    'Cache-Control': 'no-store',
    'Content-Type': 'application/json; charset=utf-8',
  })
  const body = method === 'HEAD' ? null : JSON.stringify({ ok: true, service: 'ai-space', version: '0.2.0' })
  return secure(new Response(body, { status: 200, headers }))
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    if (url.pathname === '/healthz' && (request.method === 'GET' || request.method === 'HEAD')) return healthResponse(request.method)

    try {
      const response = await env.ASSETS.fetch(request)
      return secure(response)
    } catch (error) {
      console.error(JSON.stringify({
        message: 'asset request failed',
        method: request.method,
        path: url.pathname,
        error: error instanceof Error ? error.message : String(error),
      }))
      return secure(Response.json({ error: 'AI Space is temporarily unavailable.' }, { status: 500 }))
    }
  },
} satisfies ExportedHandler<Env>
