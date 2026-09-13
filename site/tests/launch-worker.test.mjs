import assert from 'node:assert/strict'
import test from 'node:test'

import worker from '../worker/index.ts'

function fakeEnv(response = new Response('<!doctype html><title>AI Space</title>', {
  headers: { 'content-type': 'text/html; charset=utf-8' },
})) {
  return {
    ASSETS: {
      fetch: async () => response,
    },
  }
}

test('asset responses receive the launch security and cache headers', async () => {
  const response = await worker.fetch(new Request('https://aispaces.app/'), fakeEnv())

  assert.equal(response.status, 200)
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff')
  assert.equal(response.headers.get('referrer-policy'), 'strict-origin-when-cross-origin')
  const csp = response.headers.get('content-security-policy') ?? ''
  assert.match(csp, /frame-ancestors 'none'/)
  const scriptDirective = csp.split(';').map((part) => part.trim()).find((part) => part.startsWith('script-src ')) ?? ''
  const scriptSources = scriptDirective.split(/\s+/).slice(1)
  const bareBeacon = 'https://static.cloudflareinsights.com/beacon.min.js'
  const productionShape = 'https://static.cloudflareinsights.com/beacon.min.js/v31-observed-production-shape'
  assert.ok(scriptSources.includes(bareBeacon))
  assert.ok(scriptSources.some((source) => source.endsWith('/') && productionShape.startsWith(source)))
  assert.equal(response.headers.get('cache-control'), 'no-cache')
})

test('health endpoint is deterministic and does not invoke the asset binding', async () => {
  let assetCalls = 0
  const env = {
    ASSETS: {
      fetch: async () => {
        assetCalls += 1
        return new Response('unexpected')
      },
    },
  }

  const response = await worker.fetch(new Request('https://aispaces.app/healthz'), env)
  assert.equal(response.status, 200)
  assert.deepEqual(await response.json(), {
    ok: true,
    service: 'ai-space',
    version: '0.2.1',
  })
  assert.equal(response.headers.get('cache-control'), 'no-store')
  assert.equal(assetCalls, 0)
})

test('HEAD health check returns headers without a body', async () => {
  const response = await worker.fetch(new Request('https://aispaces.app/healthz', { method: 'HEAD' }), fakeEnv())
  assert.equal(response.status, 200)
  assert.equal(await response.text(), '')
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff')
})

test('asset binding failures return a non-cacheable secured 500 response', async () => {
  const env = {
    ASSETS: {
      fetch: async () => {
        throw new Error('synthetic asset failure')
      },
    },
  }

  const originalError = console.error
  console.error = () => undefined
  try {
    const response = await worker.fetch(new Request('https://aispaces.app/'), env)
    assert.equal(response.status, 500)
    assert.equal(response.headers.get('cache-control'), 'no-store')
    assert.equal(response.headers.get('x-content-type-options'), 'nosniff')
  } finally {
    console.error = originalError
  }
})
