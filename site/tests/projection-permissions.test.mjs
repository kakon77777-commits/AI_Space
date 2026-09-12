import test from 'node:test'
import assert from 'node:assert/strict'
import { MemoryStorageAdapter } from '../src/storage/storage.ts'
import { PrincipalStore } from '../src/core/principals.ts'
import {
  ProjectionStore,
  invokeWithProjectionPermission,
  projectionEventLineage,
} from '../src/core/projections.ts'

function makeProjection(permissionScope = []) {
  const storage = new MemoryStorageAdapter()
  const principals = new PrincipalStore(storage, () => '2026-08-20T02:10:00.000Z', () => 'projection-principal')
  principals.ensureDefault()
  const projections = new ProjectionStore(storage, principals, () => '2026-08-20T02:10:00.000Z', () => 'proj:permission')
  return projections.create({
    rootPrincipalId: 'agent:local-demo',
    spaceId: 'research',
    permissionScope,
  })
}

test('invokeWithProjectionPermission denies undeclared child action before transport executes', async () => {
  const projection = makeProjection(['child:ai-board:LIST_MESSAGES'])
  let calls = 0

  await assert.rejects(
    invokeWithProjectionPermission(projection, 'child:ai-board', 'POST_MESSAGE', async () => {
      calls += 1
      return { status: 201 }
    }),
    /projection permission denied/i,
  )

  assert.equal(calls, 0)
})

test('invokeWithProjectionPermission executes allowed action and bypasses guard when no Projection is active', async () => {
  const projection = makeProjection(['child:ai-board:*'])
  let calls = 0
  const allowed = await invokeWithProjectionPermission(projection, 'child:ai-board', 'POST_MESSAGE', async () => {
    calls += 1
    return { status: 201 }
  })
  assert.equal(allowed.status, 201)

  const rootResult = await invokeWithProjectionPermission(undefined, 'child:ai-board', 'POST_MESSAGE', async () => {
    calls += 1
    return { status: 202 }
  })
  assert.equal(rootResult.status, 202)
  assert.equal(calls, 2)
})

test('projectionEventLineage returns stable root, Projection and Space references', () => {
  const projection = makeProjection(['*:*'])
  assert.deepEqual(projectionEventLineage(projection), {
    projectionId: 'proj:permission',
    rootPrincipalId: 'agent:local-demo',
    spaceId: 'research',
  })
  assert.deepEqual(projectionEventLineage(undefined), {})
})
