import type { CapabilityDispatchPlan, CapabilityProvider, CapabilityRuntimeSnapshot, CapabilityRuntimeState } from './types.ts'
import { createDispatchPlan, executeApiDispatch, type JsonFetcher } from './capabilityAdapter.ts'
import type { StorageAdapter } from '../storage/storage.ts'

const DEFAULT_KEY = 'ai-space.capability-runtime.v1'

type StoredRuntimeState = Omit<CapabilityRuntimeState, 'capabilityId'>

export interface CapabilityRuntimeManagerOptions {
  now?: () => string
  nowMs?: () => number
  fetcher?: JsonFetcher
  key?: string
}

export class CapabilityRuntimeManager {
  private readonly storage: StorageAdapter
  private readonly now: () => string
  private readonly nowMs: () => number
  private readonly fetcher: JsonFetcher
  private readonly key: string
  private readonly providers = new Map<string, CapabilityProvider>()
  private readonly states = new Map<string, CapabilityRuntimeState>()

  constructor(storage: StorageAdapter, options: CapabilityRuntimeManagerOptions = {}) {
    this.storage = storage
    this.now = options.now ?? (() => new Date().toISOString())
    this.nowMs = options.nowMs ?? (() => Date.now())
    this.fetcher = options.fetcher ?? (fetch as unknown as JsonFetcher)
    this.key = options.key ?? DEFAULT_KEY
  }

  register(provider: CapabilityProvider): CapabilityRuntimeSnapshot {
    const id = provider.manifest.id
    this.providers.set(id, provider)
    const stored = this.readStored()[id]
    const state: CapabilityRuntimeState = {
      capabilityId: id,
      enabled: stored?.enabled ?? true,
      health: stored?.health ?? provider.health,
      ...(stored?.lastProbeAt ? { lastProbeAt: stored.lastProbeAt } : {}),
      ...(typeof stored?.lastLatencyMs === 'number' ? { lastLatencyMs: stored.lastLatencyMs } : {}),
      ...(stored?.lastInvokeAt ? { lastInvokeAt: stored.lastInvokeAt } : {}),
      ...(stored?.lastSuccessAt ? { lastSuccessAt: stored.lastSuccessAt } : {}),
      ...(stored?.lastError ? { lastError: stored.lastError } : {}),
    }
    this.states.set(id, state)
    this.persist()
    return this.snapshot(id)
  }

  list(): CapabilityRuntimeSnapshot[] {
    return [...this.providers.keys()].map((id) => this.snapshot(id))
  }

  get(capabilityId: string): CapabilityRuntimeSnapshot {
    return this.snapshot(capabilityId)
  }

  setEnabled(capabilityId: string, enabled: boolean): CapabilityRuntimeSnapshot {
    const state = this.requireState(capabilityId)
    this.states.set(capabilityId, { ...state, enabled })
    this.persist()
    return this.snapshot(capabilityId)
  }

  preview(capabilityId: string, action: string, input?: unknown): CapabilityDispatchPlan {
    const provider = this.requireProvider(capabilityId)
    return createDispatchPlan(provider.manifest, action, input)
  }

  async probe(capabilityId: string): Promise<CapabilityRuntimeSnapshot> {
    const provider = this.requireProvider(capabilityId)
    const state = this.requireState(capabilityId)
    const baseUrl = provider.manifest.runtime?.baseUrl
    const healthPath = provider.manifest.runtime?.healthPath
    const at = this.now()
    if (!baseUrl || !healthPath) {
      this.states.set(capabilityId, {
        ...state,
        health: 'unknown',
        lastProbeAt: at,
        lastError: 'Health endpoint is not configured',
      })
      this.persist()
      return this.snapshot(capabilityId)
    }

    const start = this.nowMs()
    try {
      const response = await this.fetcher(`${baseUrl}${healthPath}`, { method: 'GET' })
      const elapsed = Math.max(0, this.nowMs() - start)
      this.states.set(capabilityId, {
        ...state,
        health: response.ok ? 'healthy' : 'degraded',
        lastProbeAt: at,
        lastLatencyMs: elapsed,
        ...(response.ok ? { lastError: undefined } : { lastError: `Health probe failed with HTTP ${response.status}` }),
      })
    } catch (error) {
      const elapsed = Math.max(0, this.nowMs() - start)
      this.states.set(capabilityId, {
        ...state,
        health: 'offline',
        lastProbeAt: at,
        lastLatencyMs: elapsed,
        lastError: error instanceof Error ? error.message : String(error),
      })
    }
    this.persist()
    return this.snapshot(capabilityId)
  }

  async invoke(capabilityId: string, action: string, input?: unknown): Promise<{ status: number; data: unknown }> {
    const state = this.requireState(capabilityId)
    if (!state.enabled) throw new Error(`Capability ${capabilityId} is disabled`)
    const plan = this.preview(capabilityId, action, input)
    if (plan.kind !== 'api') throw new Error(`Capability Runtime Manager v0.0.5 only invokes API plans; received ${plan.kind}`)
    const at = this.now()
    try {
      const result = await executeApiDispatch(plan, this.fetcher)
      this.states.set(capabilityId, {
        ...state,
        health: 'healthy',
        lastInvokeAt: at,
        lastSuccessAt: at,
        lastError: undefined,
      })
      this.persist()
      return result
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.states.set(capabilityId, {
        ...state,
        health: /HTTP\s+\d+/i.test(message) ? 'degraded' : 'offline',
        lastInvokeAt: at,
        lastError: message,
      })
      this.persist()
      throw error
    }
  }

  private snapshot(capabilityId: string): CapabilityRuntimeSnapshot {
    return { provider: this.requireProvider(capabilityId), state: { ...this.requireState(capabilityId) } }
  }

  private requireProvider(capabilityId: string): CapabilityProvider {
    const provider = this.providers.get(capabilityId)
    if (!provider) throw new Error(`Capability provider ${capabilityId} is not registered`)
    return provider
  }

  private requireState(capabilityId: string): CapabilityRuntimeState {
    const state = this.states.get(capabilityId)
    if (!state) throw new Error(`Capability provider ${capabilityId} is not registered`)
    return state
  }

  private readStored(): Record<string, StoredRuntimeState> {
    const raw = this.storage.getItem(this.key)
    if (!raw) return {}
    try {
      const parsed = JSON.parse(raw)
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}
    } catch {
      return {}
    }
  }

  private persist(): void {
    const stored: Record<string, StoredRuntimeState> = {}
    for (const [id, state] of this.states) {
      const { capabilityId: _capabilityId, ...rest } = state
      stored[id] = rest
    }
    this.storage.setItem(this.key, JSON.stringify(stored))
  }
}
