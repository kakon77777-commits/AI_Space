import type { StorageAdapter } from '../storage/storage.ts'
import { AI_SPACE_STATE_KEYS, restoreAiSpaceStateBundle, validateAiSpaceStateBundle } from './statePortability.ts'
import { STATE_AUTHORITY_KEY, StateAuthorityStore } from './stateAuthority.ts'
import type { AiSpaceStateMigrationApplyResult, AiSpaceStateMigrationPlan, Capability } from './types.ts'

function hasManagedState(storage: StorageAdapter): boolean {
  return AI_SPACE_STATE_KEYS.some((key) => storage.getItem(key) !== null)
}

export function planAiSpaceStateMigration(input: unknown, target: StorageAdapter): AiSpaceStateMigrationPlan {
  const bundle = validateAiSpaceStateBundle(input)
  if (bundle.schemaVersion === '1.0') {
    return {
      relation: 'legacy',
      safeToApply: false,
      reason: 'Schema 1.0 bundles have no authority lineage and require explicit replace restore.',
    }
  }

  const candidate = bundle.authority
  if (!candidate) throw new Error('Schema 1.1 bundle authority metadata is missing')
  const local = new StateAuthorityStore(target).get()
  const candidateAuthority = {
    lineageId: candidate.lineageId,
    revision: candidate.revision,
    headChecksum: bundle.checksum,
    stateFingerprint: candidate.stateFingerprint,
    parentChecksum: candidate.parentChecksum,
  }

  if (!local) {
    if (hasManagedState(target)) {
      return {
        relation: 'untracked-local',
        safeToApply: false,
        reason: 'Target contains managed AI Space state but has no authority record.',
        candidateAuthority,
      }
    }
    return {
      relation: 'bootstrap',
      safeToApply: true,
      reason: 'Empty untracked target can safely adopt the candidate lineage.',
      candidateAuthority,
    }
  }

  const localAuthority = {
    lineageId: local.lineageId,
    revision: local.revision,
    headChecksum: local.headChecksum,
    stateFingerprint: local.stateFingerprint,
  }

  if (candidate.lineageId !== local.lineageId) {
    return {
      relation: 'foreign',
      safeToApply: false,
      reason: 'Candidate belongs to a different state lineage.',
      candidateAuthority,
      localAuthority,
    }
  }

  if (bundle.checksum === local.headChecksum) {
    return {
      relation: 'equal',
      safeToApply: false,
      reason: 'Candidate is already the local authoritative head.',
      candidateAuthority,
      localAuthority,
    }
  }

  if (candidate.revision <= local.revision) {
    return {
      relation: 'stale',
      safeToApply: false,
      reason: 'Candidate revision is not newer than the local authoritative revision.',
      candidateAuthority,
      localAuthority,
    }
  }

  if (candidate.revision === local.revision + 1 && candidate.parentChecksum === local.headChecksum) {
    return {
      relation: 'fast-forward',
      safeToApply: true,
      reason: 'Candidate is the direct child checkpoint of the local authoritative head.',
      candidateAuthority,
      localAuthority,
    }
  }

  return {
    relation: 'diverged',
    safeToApply: false,
    reason: 'Candidate is newer in the same lineage but is not a provable direct child of the local head.',
    candidateAuthority,
    localAuthority,
  }
}


export interface AiSpaceStateMigrationApplyOptions {
  capabilities: Capability[]
}

function captureMigrationState(storage: StorageAdapter): Record<string, string | null> {
  const captured: Record<string, string | null> = {}
  for (const key of AI_SPACE_STATE_KEYS) captured[key] = storage.getItem(key)
  captured[STATE_AUTHORITY_KEY] = storage.getItem(STATE_AUTHORITY_KEY)
  return captured
}

function restoreCapturedMigrationState(storage: StorageAdapter, captured: Record<string, string | null>): void {
  for (const key of [...AI_SPACE_STATE_KEYS, STATE_AUTHORITY_KEY]) {
    const value = captured[key] ?? null
    if (value === null) storage.removeItem(key)
    else storage.setItem(key, value)
  }
}

export function applyPlannedAiSpaceStateMigration(
  input: unknown,
  target: StorageAdapter,
  options: AiSpaceStateMigrationApplyOptions,
): AiSpaceStateMigrationApplyResult {
  const bundle = validateAiSpaceStateBundle(input)
  const plan = planAiSpaceStateMigration(bundle, target)
  if (!plan.safeToApply) throw new Error(`Migration relation ${plan.relation} is not safe to apply.`)
  if (bundle.schemaVersion !== '1.1' || !bundle.authority) throw new Error('Safe migration requires an authoritative schema 1.1 bundle.')

  const before = captureMigrationState(target)
  try {
    const restore = restoreAiSpaceStateBundle(bundle, target, { capabilities: options.capabilities })
    new StateAuthorityStore(target).set({
      schemaVersion: '1.0',
      lineageId: bundle.authority.lineageId,
      revision: bundle.authority.revision,
      headChecksum: bundle.checksum,
      stateFingerprint: bundle.authority.stateFingerprint,
      updatedAt: bundle.createdAt,
    })
    return { plan, restore }
  } catch (error) {
    restoreCapturedMigrationState(target, before)
    throw error
  }
}

export function replaceAiSpaceStateBundleWithAuthority(
  input: unknown,
  target: StorageAdapter,
  options: AiSpaceStateMigrationApplyOptions,
) {
  const bundle = validateAiSpaceStateBundle(input)
  const before = captureMigrationState(target)
  try {
    const restore = restoreAiSpaceStateBundle(bundle, target, { capabilities: options.capabilities })
    const authorityStore = new StateAuthorityStore(target)
    if (bundle.schemaVersion === '1.1' && bundle.authority) {
      authorityStore.set({
        schemaVersion: '1.0',
        lineageId: bundle.authority.lineageId,
        revision: bundle.authority.revision,
        headChecksum: bundle.checksum,
        stateFingerprint: bundle.authority.stateFingerprint,
        updatedAt: bundle.createdAt,
      })
    } else {
      authorityStore.clear()
    }
    return restore
  } catch (error) {
    restoreCapturedMigrationState(target, before)
    throw error
  }
}
