import type { StorageAdapter } from '../storage/storage.ts'
import type { StateAuthorityRecord } from './types.ts'

export const STATE_AUTHORITY_KEY = 'ai-space.state-authority.v1'

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

export function validateStateAuthorityRecord(value: unknown): StateAuthorityRecord {
  if (!isRecord(value)) throw new Error('State authority record must be an object')
  if (value.schemaVersion !== '1.0') throw new Error(`Unsupported state authority schema version: ${String(value.schemaVersion)}`)
  if (typeof value.lineageId !== 'string' || !value.lineageId.trim()) throw new Error('State authority lineageId is required')
  if (!Number.isInteger(value.revision) || (value.revision as number) < 1) throw new Error('State authority revision must be a positive integer')
  if (typeof value.headChecksum !== 'string' || !/^[0-9a-f]{8}$/.test(value.headChecksum)) throw new Error('State authority headChecksum is invalid')
  if (typeof value.stateFingerprint !== 'string' || !/^[0-9a-f]{8}$/.test(value.stateFingerprint)) throw new Error('State authority stateFingerprint is invalid')
  if (typeof value.updatedAt !== 'string' || !value.updatedAt.trim()) throw new Error('State authority updatedAt is required')
  return {
    schemaVersion: '1.0',
    lineageId: value.lineageId,
    revision: value.revision as number,
    headChecksum: value.headChecksum,
    stateFingerprint: value.stateFingerprint,
    updatedAt: value.updatedAt,
  }
}

export class StateAuthorityStore {
  private readonly storage: StorageAdapter

  constructor(storage: StorageAdapter) {
    this.storage = storage
  }

  get(): StateAuthorityRecord | null {
    const raw = this.storage.getItem(STATE_AUTHORITY_KEY)
    if (raw === null) return null
    let parsed: unknown
    try {
      parsed = JSON.parse(raw)
    } catch {
      throw new Error('State authority record contains invalid JSON')
    }
    return validateStateAuthorityRecord(parsed)
  }

  set(record: StateAuthorityRecord): StateAuthorityRecord {
    const valid = validateStateAuthorityRecord(record)
    this.storage.setItem(STATE_AUTHORITY_KEY, JSON.stringify(valid))
    return valid
  }

  clear(): void {
    this.storage.removeItem(STATE_AUTHORITY_KEY)
  }
}
