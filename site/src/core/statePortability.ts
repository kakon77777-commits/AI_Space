import type { StorageAdapter } from '../storage/storage.ts'
import type { AiSpaceStateBundle, AiSpaceStateBundleAuthority } from './types.ts'
import { StateAuthorityStore } from './stateAuthority.ts'

export const AI_SPACE_LEGACY_STATE_KEYS = [
  'ai-space.principals.v1',
  'ai-space.active-principal.v1',
  'ai-space.context-sessions.v1',
  'ai-space.projections.v1',
  'ai-space.projection-checkpoints.v1',
  'ai-space.projection-merge-candidates.v1',
  'ai-space.spaces.v1',
  'ai-space.space-memberships.v1',
  'ai-space.space-presences.v1',
  'ai-space.space-resource-refs.v1',
  'ai-space.resources.v1',
  'ai-space.events.v1',
  'ai-space.posts.v1',
  'ai-space.game-sessions.v1',
  'ai-space.browser-sessions.v1',
  'ai-space.experience-records.v1',
  'ai-space.experience-reflection-candidates.v1',
  'ai-space.mvp-journeys.v1',
  'ai-space.capability-runtime.v1',
] as const

export const AI_SPACE_STATE_KEYS = [
  ...AI_SPACE_LEGACY_STATE_KEYS,
  'ai-space.activity-instances.v1',
  'ai-space.activity-artifact-refs.v1',
] as const

export type AiSpaceStateKey = typeof AI_SPACE_STATE_KEYS[number]

interface ExportOptions {
  appVersion: string
  createdAt?: string
}

interface AuthoritativeExportOptions extends ExportOptions {
  lineageIdFactory?: () => string
}

function stateKeysForSchema(schemaVersion: AiSpaceStateBundle['schemaVersion']): readonly string[] {
  return schemaVersion === '1.2' ? AI_SPACE_STATE_KEYS : AI_SPACE_LEGACY_STATE_KEYS
}

function canonicalEntries(entries: Record<string, string | null>, keys: readonly string[]): Record<string, string | null> {
  const ordered: Record<string, string | null> = {}
  for (const key of keys) ordered[key] = entries[key] ?? null
  return ordered
}

function canonicalChecksumInput(bundle: Pick<AiSpaceStateBundle, 'schemaVersion' | 'appVersion' | 'createdAt' | 'checksumAlgorithm' | 'entries' | 'authority'>): string {
  const keys = stateKeysForSchema(bundle.schemaVersion)
  const base: Record<string, unknown> = {
    schemaVersion: bundle.schemaVersion,
    appVersion: bundle.appVersion,
    createdAt: bundle.createdAt,
    checksumAlgorithm: bundle.checksumAlgorithm,
    entries: canonicalEntries(bundle.entries, keys),
  }
  if (bundle.schemaVersion !== '1.0') base.authority = bundle.authority
  return JSON.stringify(base)
}

export function fnv1a32(input: string): string {
  const bytes = new TextEncoder().encode(input)
  let hash = 0x811c9dc5
  for (const byte of bytes) {
    hash ^= byte
    hash = Math.imul(hash, 0x01000193) >>> 0
  }
  return hash.toString(16).padStart(8, '0')
}

export function exportAiSpaceStateBundle(storage: StorageAdapter, options: ExportOptions): AiSpaceStateBundle {
  const entries: Record<string, string | null> = {}
  for (const key of AI_SPACE_LEGACY_STATE_KEYS) entries[key] = storage.getItem(key)
  const base = {
    schemaVersion: '1.0' as const,
    appVersion: options.appVersion.trim(),
    createdAt: options.createdAt ?? new Date().toISOString(),
    checksumAlgorithm: 'fnv1a32' as const,
    entries,
  }
  if (!base.appVersion) throw new Error('App version is required')
  return { ...base, checksum: fnv1a32(canonicalChecksumInput(base)) }
}

function stateEntriesFingerprint(entries: Record<string, string | null>, keys: readonly string[]): string {
  return fnv1a32(JSON.stringify(canonicalEntries(entries, keys)))
}

function defaultLineageId(): string {
  const cryptoObject = globalThis.crypto as Crypto | undefined
  if (cryptoObject?.randomUUID) return cryptoObject.randomUUID()
  return `lineage-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

export function exportAuthoritativeAiSpaceStateBundle(storage: StorageAdapter, options: AuthoritativeExportOptions): AiSpaceStateBundle {
  const appVersion = options.appVersion.trim()
  if (!appVersion) throw new Error('App version is required')
  const createdAt = options.createdAt ?? new Date().toISOString()
  const entries: Record<string, string | null> = {}
  for (const key of AI_SPACE_STATE_KEYS) entries[key] = storage.getItem(key)

  const authorityStore = new StateAuthorityStore(storage)
  const current = authorityStore.get()
  const authority: AiSpaceStateBundleAuthority = {
    lineageId: current?.lineageId ?? options.lineageIdFactory?.() ?? defaultLineageId(),
    revision: current ? current.revision + 1 : 1,
    parentChecksum: current?.headChecksum ?? null,
    stateFingerprint: stateEntriesFingerprint(entries, AI_SPACE_STATE_KEYS),
  }
  if (!authority.lineageId.trim()) throw new Error('State authority lineageId is required')

  const base: AiSpaceStateBundle = {
    schemaVersion: '1.2',
    appVersion,
    createdAt,
    checksumAlgorithm: 'fnv1a32',
    checksum: '',
    entries: canonicalEntries(entries, AI_SPACE_STATE_KEYS),
    authority,
  }
  const checksum = fnv1a32(canonicalChecksumInput(base))
  const bundle = { ...base, checksum }
  authorityStore.set({
    schemaVersion: '1.0',
    lineageId: authority.lineageId,
    revision: authority.revision,
    headChecksum: checksum,
    stateFingerprint: authority.stateFingerprint,
    updatedAt: createdAt,
  })
  return bundle
}

export function validateAiSpaceStateBundle(input: unknown): AiSpaceStateBundle {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('State bundle must be an object')
  const candidate = input as Record<string, unknown>
  if (candidate.schemaVersion !== '1.0' && candidate.schemaVersion !== '1.1' && candidate.schemaVersion !== '1.2') throw new Error(`Unsupported state bundle schema version: ${String(candidate.schemaVersion)}`)
  if (candidate.checksumAlgorithm !== 'fnv1a32') throw new Error(`Unsupported checksum algorithm: ${String(candidate.checksumAlgorithm)}`)
  if (typeof candidate.appVersion !== 'string' || !candidate.appVersion.trim()) throw new Error('State bundle appVersion is required')
  if (typeof candidate.createdAt !== 'string' || !candidate.createdAt.trim()) throw new Error('State bundle createdAt is required')
  if (typeof candidate.checksum !== 'string' || !/^[0-9a-f]{8}$/.test(candidate.checksum)) throw new Error('State bundle checksum is invalid')
  if (!candidate.entries || typeof candidate.entries !== 'object' || Array.isArray(candidate.entries)) throw new Error('State bundle entries must be an object')

  const entries = candidate.entries as Record<string, unknown>
  const actualKeys = Object.keys(entries)
  const expectedKeys = stateKeysForSchema(candidate.schemaVersion)
  if (actualKeys.length !== expectedKeys.length || expectedKeys.some((key) => !Object.hasOwn(entries, key)) || actualKeys.some((key) => !expectedKeys.includes(key))) {
    throw new Error('State bundle entry keys do not match the supported AI Space allowlist')
  }
  for (const key of expectedKeys) {
    const value = entries[key]
    if (value !== null && typeof value !== 'string') throw new Error(`State bundle entry ${key} must be string or null`)
  }

  let authority: AiSpaceStateBundleAuthority | undefined
  if (candidate.schemaVersion !== '1.0') {
    const rawAuthority = candidate.authority
    if (!rawAuthority || typeof rawAuthority !== 'object' || Array.isArray(rawAuthority)) throw new Error(`State bundle authority metadata is required for schema ${candidate.schemaVersion}`)
    const item = rawAuthority as Record<string, unknown>
    if (typeof item.lineageId !== 'string' || !item.lineageId.trim()) throw new Error('State bundle authority lineageId is required')
    if (!Number.isInteger(item.revision) || (item.revision as number) < 1) throw new Error('State bundle authority revision must be a positive integer')
    if (item.parentChecksum !== null && (typeof item.parentChecksum !== 'string' || !/^[0-9a-f]{8}$/.test(item.parentChecksum))) throw new Error('State bundle authority parentChecksum is invalid')
    if (typeof item.stateFingerprint !== 'string' || !/^[0-9a-f]{8}$/.test(item.stateFingerprint)) throw new Error('State bundle authority stateFingerprint is invalid')
    authority = {
      lineageId: item.lineageId,
      revision: item.revision as number,
      parentChecksum: item.parentChecksum as string | null,
      stateFingerprint: item.stateFingerprint,
    }
  } else if (candidate.authority !== undefined) {
    throw new Error('State bundle schema 1.0 must not contain authority metadata')
  }

  const bundle: AiSpaceStateBundle = {
    schemaVersion: candidate.schemaVersion as '1.0' | '1.1' | '1.2',
    appVersion: candidate.appVersion,
    createdAt: candidate.createdAt,
    checksumAlgorithm: 'fnv1a32',
    checksum: candidate.checksum,
    entries: canonicalEntries(entries as Record<string, string | null>, expectedKeys),
    ...(authority ? { authority } : {}),
  }
  const expected = fnv1a32(canonicalChecksumInput(bundle))
  if (bundle.checksum !== expected) throw new Error('State bundle checksum mismatch')
  return bundle
}

export function parseAiSpaceStateBundle(text: string): AiSpaceStateBundle {
  if (!text.trim()) throw new Error('State bundle JSON is empty')
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error('State bundle JSON is invalid')
  }
  return validateAiSpaceStateBundle(parsed)
}

import { MemoryStorageAdapter } from '../storage/storage.ts'
import { PrincipalStore } from './principals.ts'
import { ContextSessionStore } from './contextSessions.ts'
import { ProjectionStore } from './projections.ts'
import { SpaceStore } from './spaces.ts'
import { ResourceStore } from './resources.ts'
import { BrowserSessionStore } from './browserSessions.ts'
import { PostStore } from './posts.ts'
import { MvpJourneyStore } from './mvpJourneys.ts'
import { auditAiSpaceState } from './hardening.ts'
import type {
  ActivityDefinition,
  AiSpaceStateRestorePreview,
  AiSpaceStateRestoreResult,
  AiSpaceStateRestoreValidation,
  Capability,
} from './types.ts'

export interface AiSpaceStateRestoreOptions {
  capabilities: Capability[]
  activityDefinitions?: ActivityDefinition[]
  activityFieldNoteIds?: string[]
}

const ACTIVE_PRINCIPAL_KEY = 'ai-space.active-principal.v1'
const JSON_STATE_KEYS = AI_SPACE_STATE_KEYS.filter((key) => key !== ACTIVE_PRINCIPAL_KEY)

function validateSerializedEntries(bundle: AiSpaceStateBundle): void {
  for (const key of JSON_STATE_KEYS) {
    const raw = bundle.entries[key]
    if (raw == null) continue
    try {
      JSON.parse(raw)
    } catch {
      throw new Error(`State bundle entry ${key} contains invalid JSON`)
    }
  }
}

function writeBundleEntries(storage: StorageAdapter, bundle: AiSpaceStateBundle): void {
  for (const key of AI_SPACE_STATE_KEYS) {
    const value = bundle.entries[key] ?? null
    if (value === null) storage.removeItem(key)
    else storage.setItem(key, value)
  }
}

function stageBundle(bundle: AiSpaceStateBundle): MemoryStorageAdapter {
  const staged = new MemoryStorageAdapter()
  writeBundleEntries(staged, bundle)
  return staged
}

function readStagedJsonState(storage: StorageAdapter, key: string): unknown {
  const raw = storage.getItem(key)
  return raw === null ? [] : JSON.parse(raw)
}

function auditStagedState(storage: StorageAdapter, options: AiSpaceStateRestoreOptions) {
  const principals = new PrincipalStore(storage)
  const contexts = new ContextSessionStore(storage)
  const projections = new ProjectionStore(storage, principals)
  const spaces = new SpaceStore(storage, principals)
  const resources = new ResourceStore(storage)
  const browsers = new BrowserSessionStore(storage)
  const posts = new PostStore(storage)
  const journeys = new MvpJourneyStore(storage)
  return auditAiSpaceState({
    principals: principals.list(),
    contextSessions: contexts.list(),
    projections: projections.list(),
    spaces: spaces.list(),
    memberships: spaces.allMemberships(),
    presences: spaces.presences(),
    resourceRefs: spaces.resourceRefs(),
    capabilities: options.capabilities,
    resources: resources.list(),
    browserSessions: browsers.sessions(),
    experiences: browsers.experiences(),
    reflectionCandidates: browsers.reflectionCandidates(),
    posts: posts.list(),
    journeys: journeys.list(),
    activityDefinitions: options.activityDefinitions ?? [],
    activityInstances: readStagedJsonState(storage, 'ai-space.activity-instances.v1'),
    activityArtifacts: readStagedJsonState(storage, 'ai-space.activity-artifact-refs.v1'),
    activityFieldNoteIds: options.activityFieldNoteIds ?? [],
    activePrincipalId: storage.getItem(ACTIVE_PRINCIPAL_KEY) ?? '',
  })
}

export function previewAiSpaceStateRestore(input: unknown, target: StorageAdapter): AiSpaceStateRestorePreview {
  const bundle = validateAiSpaceStateBundle(input)
  let created = 0
  let changed = 0
  let cleared = 0
  let unchanged = 0
  for (const key of AI_SPACE_STATE_KEYS) {
    const current = target.getItem(key)
    const incoming = bundle.entries[key] ?? null
    if (current === incoming) unchanged++
    else if (current === null && incoming !== null) created++
    else if (current !== null && incoming === null) cleared++
    else changed++
  }
  return { created, changed, cleared, unchanged }
}

export function validateAiSpaceStateRestore(input: unknown, options: AiSpaceStateRestoreOptions): AiSpaceStateRestoreValidation {
  const bundle = validateAiSpaceStateBundle(input)
  validateSerializedEntries(bundle)
  const audit = auditStagedState(stageBundle(bundle), options)
  if (audit.errorCount > 0) {
    const codes = audit.findings.filter((item) => item.severity === 'error').map((item) => item.code)
    throw new Error(`Staged state audit failed: ${codes.join(', ')}`)
  }
  return { audit }
}

export function restoreAiSpaceStateBundle(input: unknown, target: StorageAdapter, options: AiSpaceStateRestoreOptions): AiSpaceStateRestoreResult {
  const bundle = validateAiSpaceStateBundle(input)
  const preview = previewAiSpaceStateRestore(bundle, target)
  const validation = validateAiSpaceStateRestore(bundle, options)
  const before: Record<string, string | null> = {}
  for (const key of AI_SPACE_STATE_KEYS) before[key] = target.getItem(key)
  try {
    writeBundleEntries(target, bundle)
  } catch (error) {
    for (const key of AI_SPACE_STATE_KEYS) {
      const value = before[key]
      if (value === null) target.removeItem(key)
      else target.setItem(key, value)
    }
    throw error
  }
  return { preview, audit: validation.audit }
}
