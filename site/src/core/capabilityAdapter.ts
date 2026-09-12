import type {
  Capability,
  CapabilityActionBinding,
  CapabilityDispatchPlan,
  CapabilityManifest,
  CapabilityMode,
  CapabilityProvider,
} from './types.ts'

const ID_PATTERN = /^[a-z0-9][a-z0-9:._-]*$/
const ACTION_PATTERN = /^[A-Z][A-Z0-9_:.]*$/

export interface JsonHttpResponse {
  ok: boolean
  status: number
  json(): Promise<unknown>
}

export type JsonFetcher = (
  input: string,
  init?: { method?: string; headers?: Record<string, string>; body?: string },
) => Promise<JsonHttpResponse>

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function requireString(record: Record<string, unknown>, key: string): string {
  const value = record[key]
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${key} is required`)
  return value.trim()
}

function stringArray(record: Record<string, unknown>, key: string): string[] {
  const value = record[key]
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
    throw new Error(`${key} must be a string array`)
  }
  return value.map((item) => item.trim())
}

function webUrl(value: string, field: string): string {
  let parsed: URL
  try {
    parsed = new URL(value)
  } catch {
    throw new Error(`${field} must be a valid URL`)
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error(`${field} must use http or https`)
  }
  return parsed.toString().replace(/\/$/, value.endsWith('/') ? '/' : '')
}

function normalizeBaseUrl(value: string): string {
  return webUrl(value, 'runtime.baseUrl').replace(/\/$/, '')
}

function relativePath(value: unknown, field: string): string {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${field} must be a string`)
  const path = value.trim()
  if (!path.startsWith('/')) throw new Error(`${field} must begin with /`)
  return path
}

function parseActionBindings(
  runtime: Record<string, unknown>,
  declaredActions: string[],
): Record<string, CapabilityActionBinding> | undefined {
  if (runtime.actions === undefined) return undefined
  if (!isRecord(runtime.actions)) throw new Error('runtime.actions must be an object')

  const parsed: Record<string, CapabilityActionBinding> = {}
  for (const [action, rawBinding] of Object.entries(runtime.actions)) {
    if (!declaredActions.includes(action)) throw new Error(`runtime action binding ${action} must target a declared action`)
    if (!isRecord(rawBinding)) throw new Error(`runtime.actions.${action} must be an object`)

    const method = requireString(rawBinding, 'method')
    if (method !== 'GET' && method !== 'POST') throw new Error(`runtime.actions.${action}.method must be GET or POST`)
    const input = requireString(rawBinding, 'input')
    if (input !== 'query' && input !== 'json' && input !== 'none') {
      throw new Error(`runtime.actions.${action}.input must be query, json, or none`)
    }
    parsed[action] = {
      method,
      path: relativePath(rawBinding.path, `runtime.actions.${action}.path`),
      input,
    }
  }
  return parsed
}

function serializeQuery(input: unknown): string {
  if (input === undefined || input === null) return ''
  if (!isRecord(input)) throw new Error('query-bound API action input must be an object')
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(input)) {
    if (value === undefined || value === null || value === '') continue
    if (Array.isArray(value)) {
      for (const item of value) params.append(key, String(item))
    } else if (typeof value === 'object') {
      throw new Error(`query-bound API action field ${key} must be scalar or array`)
    } else {
      params.set(key, String(value))
    }
  }
  return params.toString()
}

function errorDetail(data: unknown): string {
  if (isRecord(data) && typeof data.error === 'string') return data.error
  if (typeof data === 'string') return data
  try { return JSON.stringify(data) } catch { return String(data) }
}

export function validateCapabilityManifest(input: unknown): CapabilityManifest {
  if (!isRecord(input)) throw new Error('manifest must be an object')
  if (input.schemaVersion !== '0.1') throw new Error('schemaVersion must be 0.1')

  const id = requireString(input, 'id')
  if (!ID_PATTERN.test(id)) throw new Error('id must use lowercase letters, numbers, colon, dot, dash, or underscore')

  const mode = requireString(input, 'mode') as CapabilityMode
  if (!['link', 'api', 'native'].includes(mode)) throw new Error('mode must be link, api, or native')

  const lifecycle = requireString(input, 'lifecycle')
  if (lifecycle !== 'declared' && lifecycle !== 'connected') throw new Error('lifecycle must be declared or connected')

  const actions = stringArray(input, 'actions')
  if (actions.length === 0) throw new Error('actions must contain at least one action')
  if (actions.some((action) => !ACTION_PATTERN.test(action))) throw new Error('action names must be uppercase identifiers')

  const events = stringArray(input, 'events')
  const permissions = stringArray(input, 'permissions')

  if (!isRecord(input.source)) throw new Error('source is required')
  const source = { repository: requireString(input.source, 'repository') }

  let navigation: CapabilityManifest['navigation']
  if (input.navigation !== undefined) {
    if (!isRecord(input.navigation)) throw new Error('navigation must be an object')
    if (typeof input.navigation.visible !== 'boolean') throw new Error('navigation.visible must be boolean')
    if (typeof input.navigation.order !== 'number' || !Number.isFinite(input.navigation.order)) throw new Error('navigation.order must be a number')
    navigation = { visible: input.navigation.visible, order: input.navigation.order }
  }

  const route = typeof input.route === 'string' ? input.route.trim() : undefined
  const externalUrl = typeof input.externalUrl === 'string' ? webUrl(input.externalUrl.trim(), 'externalUrl') : undefined

  let runtime: CapabilityManifest['runtime']
  if (input.runtime !== undefined) {
    if (!isRecord(input.runtime)) throw new Error('runtime must be an object')
    runtime = {}
    if (input.runtime.baseUrl !== undefined) {
      if (typeof input.runtime.baseUrl !== 'string' || !input.runtime.baseUrl.trim()) throw new Error('runtime.baseUrl must be a string')
      runtime.baseUrl = normalizeBaseUrl(input.runtime.baseUrl.trim())
    }
    if (input.runtime.healthPath !== undefined) {
      runtime.healthPath = relativePath(input.runtime.healthPath, 'runtime.healthPath')
    }
    const actionBindings = parseActionBindings(input.runtime, actions)
    if (actionBindings) runtime.actions = actionBindings
  }

  if (mode === 'link' && !externalUrl) throw new Error('link capability requires externalUrl')
  if (mode === 'native' && (!route || !route.startsWith('/'))) throw new Error('native capability requires route beginning with /')
  if (mode === 'api' && lifecycle === 'connected' && !runtime?.baseUrl) throw new Error('connected API capability requires runtime.baseUrl')

  return {
    schemaVersion: '0.1',
    id,
    name: requireString(input, 'name'),
    description: requireString(input, 'description'),
    version: requireString(input, 'version'),
    mode,
    lifecycle,
    actions,
    events,
    permissions,
    source,
    ...(navigation ? { navigation } : {}),
    ...(route ? { route } : {}),
    ...(externalUrl ? { externalUrl } : {}),
    ...(runtime ? { runtime } : {}),
  }
}

export function manifestToProvider(manifest: CapabilityManifest): CapabilityProvider {
  return { manifest, health: 'unknown' }
}

export function manifestToCapability(manifest: CapabilityManifest): Capability {
  const route = manifest.route ?? `/providers/${encodeURIComponent(manifest.id)}`
  return {
    id: manifest.id,
    label: manifest.name,
    description: manifest.description,
    route,
    mode: manifest.mode,
    status: manifest.lifecycle === 'connected' || manifest.mode !== 'api' ? 'ready' : 'placeholder',
    actions: [...manifest.actions],
    navigation: manifest.navigation ?? { visible: false, order: Number.MAX_SAFE_INTEGER },
  }
}

export function createDispatchPlan(manifest: CapabilityManifest, action: string, input?: unknown): CapabilityDispatchPlan {
  if (!manifest.actions.includes(action)) throw new Error(`Action ${action} is not declared by ${manifest.id}`)

  if (manifest.mode === 'link') {
    if (!manifest.externalUrl) throw new Error('link capability requires externalUrl')
    return { kind: 'link', capabilityId: manifest.id, action, url: manifest.externalUrl }
  }

  if (manifest.mode === 'native') {
    if (!manifest.route) throw new Error('native capability requires route')
    return { kind: 'native', capabilityId: manifest.id, action, route: manifest.route }
  }

  const baseUrl = manifest.runtime?.baseUrl
  if (!baseUrl) {
    return {
      kind: 'unavailable',
      capabilityId: manifest.id,
      action,
      reason: 'API capability is declared but has no runtime baseUrl',
    }
  }

  const binding = manifest.runtime?.actions?.[action]
  if (binding) {
    let url = `${baseUrl}${binding.path}`
    if (binding.input === 'query') {
      const query = serializeQuery(input)
      if (query) url += `?${query}`
    }
    return {
      kind: 'api',
      capabilityId: manifest.id,
      action,
      url,
      method: binding.method,
      ...(binding.input === 'json' && input !== undefined ? { body: input } : {}),
    }
  }

  return {
    kind: 'api',
    capabilityId: manifest.id,
    action,
    url: `${baseUrl}/invoke`,
    method: 'POST',
    body: { capabilityId: manifest.id, action, ...(input === undefined ? {} : { input }) },
  }
}

export async function executeApiDispatch(
  plan: CapabilityDispatchPlan,
  fetcher: JsonFetcher = fetch as unknown as JsonFetcher,
): Promise<{ status: number; data: unknown }> {
  if (plan.kind !== 'api') throw new Error(`Cannot HTTP-execute ${plan.kind} dispatch plan`)
  const init: { method: string; headers?: Record<string, string>; body?: string } = { method: plan.method }
  if (plan.body !== undefined) {
    init.headers = { 'Content-Type': 'application/json' }
    init.body = JSON.stringify(plan.body)
  }
  const response = await fetcher(plan.url, init)
  let data: unknown
  try { data = await response.json() } catch { data = null }
  if (!response.ok) throw new Error(`Capability ${plan.capabilityId} action ${plan.action} failed with HTTP ${response.status}: ${errorDetail(data)}`)
  return { status: response.status, data }
}

export async function probeCapabilityProvider(
  provider: CapabilityProvider,
  fetcher: JsonFetcher = fetch as unknown as JsonFetcher,
): Promise<CapabilityProvider> {
  const { baseUrl, healthPath } = provider.manifest.runtime ?? {}
  if (!baseUrl || !healthPath) return { ...provider, health: 'unknown' }
  try {
    const response = await fetcher(`${baseUrl}${healthPath}`, { method: 'GET' })
    return { ...provider, health: response.ok ? 'healthy' : 'degraded' }
  } catch {
    return { ...provider, health: 'offline' }
  }
}

export async function loadCapabilityManifest(
  url: string,
  fetcher: JsonFetcher = fetch as unknown as JsonFetcher,
): Promise<CapabilityManifest> {
  const response = await fetcher(url)
  if (!response.ok) throw new Error(`Capability manifest request failed with HTTP ${response.status}`)
  return validateCapabilityManifest(await response.json())
}
