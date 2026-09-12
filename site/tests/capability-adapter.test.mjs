import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import {
  createDispatchPlan,
  manifestToProvider,
  loadCapabilityManifest,
  validateCapabilityManifest,
} from '../src/core/capabilityAdapter.ts'

const validApiManifest = {
  schemaVersion: '0.1',
  id: 'child:research-service',
  name: 'Research Service',
  description: 'Independent API capability.',
  version: '1.2.3',
  mode: 'api',
  lifecycle: 'declared',
  actions: ['RUN_RESEARCH'],
  events: ['RESEARCH_COMPLETED'],
  permissions: ['research:run'],
  source: { repository: 'example/research-service' },
  runtime: {},
  navigation: { visible: false, order: 50 },
}

test('validateCapabilityManifest accepts a declared API manifest and preserves independent version metadata', () => {
  const manifest = validateCapabilityManifest(validApiManifest)
  assert.equal(manifest.id, 'child:research-service')
  assert.equal(manifest.version, '1.2.3')
  assert.equal(manifest.mode, 'api')
})

test('validateCapabilityManifest rejects unsupported schema versions', () => {
  assert.throws(
    () => validateCapabilityManifest({ ...validApiManifest, schemaVersion: '9.9' }),
    /schemaVersion.*0\.1/i,
  )
})

test('validateCapabilityManifest enforces integration-mode requirements and action names', () => {
  assert.throws(
    () => validateCapabilityManifest({ ...validApiManifest, mode: 'link', externalUrl: undefined }),
    /link.*externalUrl/i,
  )
  assert.throws(
    () => validateCapabilityManifest({ ...validApiManifest, mode: 'native', route: undefined }),
    /native.*route/i,
  )
  assert.throws(
    () => validateCapabilityManifest({ ...validApiManifest, actions: ['bad action'] }),
    /action.*uppercase/i,
  )
})

test('manifestToProvider defaults observed health to unknown without claiming connectivity', () => {
  const provider = manifestToProvider(validateCapabilityManifest(validApiManifest))
  assert.equal(provider.health, 'unknown')
  assert.equal(provider.manifest.lifecycle, 'declared')
})

test('createDispatchPlan creates deterministic link and native plans', () => {
  const link = validateCapabilityManifest({
    ...validApiManifest,
    id: 'child:docs',
    name: 'Docs',
    mode: 'link',
    actions: ['OPEN'],
    externalUrl: 'https://example.com/docs',
  })
  const native = validateCapabilityManifest({
    ...validApiManifest,
    id: 'child:local-tool',
    name: 'Local Tool',
    mode: 'native',
    actions: ['OPEN'],
    route: '/local-tool',
  })

  assert.deepEqual(createDispatchPlan(link, 'OPEN'), {
    kind: 'link',
    capabilityId: 'child:docs',
    action: 'OPEN',
    url: 'https://example.com/docs',
  })
  assert.deepEqual(createDispatchPlan(native, 'OPEN'), {
    kind: 'native',
    capabilityId: 'child:local-tool',
    action: 'OPEN',
    route: '/local-tool',
  })
})

test('createDispatchPlan creates configured API plan and explicit unavailable plan when endpoint is undeclared', () => {
  const configured = validateCapabilityManifest({
    ...validApiManifest,
    lifecycle: 'connected',
    runtime: { baseUrl: 'https://service.example/api' },
  })
  const declared = validateCapabilityManifest(validApiManifest)

  assert.deepEqual(createDispatchPlan(configured, 'RUN_RESEARCH', { q: 'test' }), {
    kind: 'api',
    capabilityId: 'child:research-service',
    action: 'RUN_RESEARCH',
    url: 'https://service.example/api/invoke',
    method: 'POST',
    body: { capabilityId: 'child:research-service', action: 'RUN_RESEARCH', input: { q: 'test' } },
  })
  assert.deepEqual(createDispatchPlan(declared, 'RUN_RESEARCH'), {
    kind: 'unavailable',
    capabilityId: 'child:research-service',
    action: 'RUN_RESEARCH',
    reason: 'API capability is declared but has no runtime baseUrl',
  })
})

test('createDispatchPlan rejects actions not declared by the child manifest', () => {
  const manifest = validateCapabilityManifest(validApiManifest)
  assert.throws(() => createDispatchPlan(manifest, 'DELETE_WORLD'), /not declared/i)
})

test('shipped AI Board child manifest is machine-readable and valid', async () => {
  const here = dirname(fileURLToPath(import.meta.url))
  const raw = await readFile(resolve(here, '../public/manifests/ai-board.capability.json'), 'utf8')
  const manifest = validateCapabilityManifest(JSON.parse(raw))
  assert.equal(manifest.id, 'child:ai-board')
  assert.equal(manifest.mode, 'api')
  assert.equal(manifest.source.repository, 'kakon77777-commits/ai-board')
})


test('loadCapabilityManifest validates fetched JSON and rejects HTTP failures', async () => {
  const fetched = await loadCapabilityManifest('/manifest.json', async () => ({
    ok: true,
    status: 200,
    async json() { return validApiManifest },
  }))
  assert.equal(fetched.id, 'child:research-service')

  await assert.rejects(
    () => loadCapabilityManifest('/missing.json', async () => ({ ok: false, status: 404, async json() { return {} } })),
    /HTTP 404/i,
  )
})

test('action bindings create GET query and POST JSON dispatch plans without child-specific routing logic', () => {
  const manifest = validateCapabilityManifest({
    ...validApiManifest,
    lifecycle: 'connected',
    actions: ['LIST_ITEMS', 'CREATE_ITEM'],
    runtime: {
      baseUrl: 'https://service.example',
      healthPath: '/health',
      actions: {
        LIST_ITEMS: { method: 'GET', path: '/api/items', input: 'query' },
        CREATE_ITEM: { method: 'POST', path: '/api/items', input: 'json' },
      },
    },
  })

  assert.deepEqual(createDispatchPlan(manifest, 'LIST_ITEMS', { topic: 'hello world', limit: 2 }), {
    kind: 'api',
    capabilityId: 'child:research-service',
    action: 'LIST_ITEMS',
    url: 'https://service.example/api/items?topic=hello+world&limit=2',
    method: 'GET',
  })

  assert.deepEqual(createDispatchPlan(manifest, 'CREATE_ITEM', { title: 'Hello' }), {
    kind: 'api',
    capabilityId: 'child:research-service',
    action: 'CREATE_ITEM',
    url: 'https://service.example/api/items',
    method: 'POST',
    body: { title: 'Hello' },
  })
})

test('validateCapabilityManifest rejects action bindings that target undeclared actions or invalid relative paths', () => {
  assert.throws(
    () => validateCapabilityManifest({
      ...validApiManifest,
      lifecycle: 'connected',
      runtime: {
        baseUrl: 'https://service.example',
        actions: { NOT_DECLARED: { method: 'GET', path: '/api/items', input: 'query' } },
      },
    }),
    /binding.*declared action/i,
  )

  assert.throws(
    () => validateCapabilityManifest({
      ...validApiManifest,
      lifecycle: 'connected',
      runtime: {
        baseUrl: 'https://service.example',
        actions: { RUN_RESEARCH: { method: 'GET', path: 'api/items', input: 'query' } },
      },
    }),
    /path.*begin.*\//i,
  )
})

test('executeApiDispatch performs JSON HTTP execution and preserves child response data', async () => {
  const { executeApiDispatch } = await import('../src/core/capabilityAdapter.ts')
  const calls = []
  const plan = {
    kind: 'api',
    capabilityId: 'child:test',
    action: 'CREATE_ITEM',
    url: 'https://service.example/api/items',
    method: 'POST',
    body: { title: 'Hello' },
  }

  const result = await executeApiDispatch(plan, async (url, init) => {
    calls.push({ url, init })
    return { ok: true, status: 201, async json() { return { id: 'item-1', ok: true } } }
  })

  assert.deepEqual(calls, [{
    url: 'https://service.example/api/items',
    init: {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Hello' }),
    },
  }])
  assert.deepEqual(result, { status: 201, data: { id: 'item-1', ok: true } })
})

test('executeApiDispatch surfaces non-2xx child failures instead of reporting success', async () => {
  const { executeApiDispatch } = await import('../src/core/capabilityAdapter.ts')
  const plan = {
    kind: 'api',
    capabilityId: 'child:test',
    action: 'CREATE_ITEM',
    url: 'https://service.example/api/items',
    method: 'POST',
    body: { title: 'Hello' },
  }

  await assert.rejects(
    () => executeApiDispatch(plan, async () => ({ ok: false, status: 400, async json() { return { error: 'bad input' } } })),
    /HTTP 400.*bad input/i,
  )
})

test('probeCapabilityProvider maps health endpoint outcomes without changing desired lifecycle', async () => {
  const { probeCapabilityProvider } = await import('../src/core/capabilityAdapter.ts')
  const manifest = validateCapabilityManifest({
    ...validApiManifest,
    lifecycle: 'connected',
    runtime: { baseUrl: 'https://service.example', healthPath: '/api/schema' },
  })
  const provider = manifestToProvider(manifest)

  const healthy = await probeCapabilityProvider(provider, async (url) => {
    assert.equal(url, 'https://service.example/api/schema')
    return { ok: true, status: 200, async json() { return { name: 'Service' } } }
  })
  assert.equal(healthy.health, 'healthy')
  assert.equal(healthy.manifest.lifecycle, 'connected')

  const degraded = await probeCapabilityProvider(provider, async () => ({ ok: false, status: 503, async json() { return { error: 'down' } } }))
  assert.equal(degraded.health, 'degraded')

  const offline = await probeCapabilityProvider(provider, async () => { throw new Error('network unreachable') })
  assert.equal(offline.health, 'offline')
})
