import test from 'node:test'
import assert from 'node:assert/strict'
import { MemoryStorageAdapter } from '../src/storage/storage.ts'
import { CapabilityRuntimeManager } from '../src/core/capabilityRuntime.ts'

function provider(overrides = {}) {
  return {
    manifest: {
      schemaVersion: '0.1', id: 'child:test', name: 'Test Child', description: 'test', version: '1.0.0', mode: 'api', lifecycle: 'connected',
      actions: ['READ','WRITE'], events: [], permissions: [], source: { repository: 'example/test' },
      runtime: { baseUrl: 'https://example.test', healthPath: '/health', actions: {
        READ: { method: 'GET', path: '/items', input: 'query' },
        WRITE: { method: 'POST', path: '/items', input: 'json' },
      } },
      ...overrides,
    },
    health: 'unknown',
  }
}

test('register restores persisted operational state without changing desired manifest lifecycle', () => {
  const storage = new MemoryStorageAdapter()
  storage.setItem('ai-space.capability-runtime.v1', JSON.stringify({ 'child:test': { enabled: false, health: 'degraded', lastError: 'old error' } }))
  const manager = new CapabilityRuntimeManager(storage)
  const snapshot = manager.register(provider())
  assert.equal(snapshot.state.enabled, false)
  assert.equal(snapshot.state.health, 'degraded')
  assert.equal(snapshot.provider.manifest.lifecycle, 'connected')
})

test('enable and disable persist as runtime state', () => {
  const storage = new MemoryStorageAdapter()
  const manager = new CapabilityRuntimeManager(storage)
  manager.register(provider())
  manager.setEnabled('child:test', false)
  const restored = new CapabilityRuntimeManager(storage)
  assert.equal(restored.register(provider()).state.enabled, false)
  restored.setEnabled('child:test', true)
  assert.equal(restored.get('child:test').state.enabled, true)
})

test('probe records healthy status, timestamp, and latency', async () => {
  let clock = 1000
  const manager = new CapabilityRuntimeManager(new MemoryStorageAdapter(), {
    now: () => '2026-08-19T09:00:00.000Z', nowMs: () => (clock += 25),
    fetcher: async () => ({ ok: true, status: 200, async json(){ return { ok:true } } }),
  })
  manager.register(provider())
  const snapshot = await manager.probe('child:test')
  assert.equal(snapshot.state.health, 'healthy')
  assert.equal(snapshot.state.lastProbeAt, '2026-08-19T09:00:00.000Z')
  assert.equal(snapshot.state.lastLatencyMs, 25)
  assert.equal(snapshot.state.lastError, undefined)
})

test('probe records offline network error', async () => {
  const manager = new CapabilityRuntimeManager(new MemoryStorageAdapter(), {
    now: () => '2026-08-19T09:00:00.000Z', nowMs: () => 10,
    fetcher: async () => { throw new Error('network down') },
  })
  manager.register(provider())
  const snapshot = await manager.probe('child:test')
  assert.equal(snapshot.state.health, 'offline')
  assert.match(snapshot.state.lastError, /network down/)
})

test('preview creates dispatch plan without network side effects', () => {
  let calls = 0
  const manager = new CapabilityRuntimeManager(new MemoryStorageAdapter(), { fetcher: async () => { calls++; throw new Error('no') } })
  manager.register(provider())
  const plan = manager.preview('child:test', 'READ', { limit: 3 })
  assert.equal(plan.kind, 'api')
  assert.equal(plan.url, 'https://example.test/items?limit=3')
  assert.equal(calls, 0)
})

test('disabled provider rejects invoke before transport', async () => {
  let calls = 0
  const manager = new CapabilityRuntimeManager(new MemoryStorageAdapter(), { fetcher: async () => { calls++; throw new Error('should not') } })
  manager.register(provider())
  manager.setEnabled('child:test', false)
  await assert.rejects(() => manager.invoke('child:test', 'READ'), /disabled/i)
  assert.equal(calls, 0)
})

test('successful invoke records last success and healthy status', async () => {
  const manager = new CapabilityRuntimeManager(new MemoryStorageAdapter(), {
    now: () => '2026-08-19T09:00:00.000Z',
    fetcher: async () => ({ ok: true, status: 200, async json(){ return [{id:'x'}] } }),
  })
  manager.register(provider())
  const result = await manager.invoke('child:test', 'READ')
  assert.equal(result.status, 200)
  const state = manager.get('child:test').state
  assert.equal(state.health, 'healthy')
  assert.equal(state.lastInvokeAt, '2026-08-19T09:00:00.000Z')
  assert.equal(state.lastSuccessAt, '2026-08-19T09:00:00.000Z')
})

test('failed HTTP invoke stores degraded status and last error', async () => {
  const manager = new CapabilityRuntimeManager(new MemoryStorageAdapter(), {
    now: () => '2026-08-19T09:00:00.000Z',
    fetcher: async () => ({ ok: false, status: 503, async json(){ return { error:'maintenance' } } }),
  })
  manager.register(provider())
  await assert.rejects(() => manager.invoke('child:test', 'READ'), /503/)
  const state = manager.get('child:test').state
  assert.equal(state.health, 'degraded')
  assert.match(state.lastError, /maintenance/)
})

test('provider without health endpoint probes as unknown with explanation', async () => {
  const p = provider()
  p.manifest.runtime = { ...p.manifest.runtime, healthPath: undefined }
  const manager = new CapabilityRuntimeManager(new MemoryStorageAdapter())
  manager.register(p)
  const snapshot = await manager.probe('child:test')
  assert.equal(snapshot.state.health, 'unknown')
  assert.match(snapshot.state.lastError, /not configured/i)
})
