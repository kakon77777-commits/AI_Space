import test from 'node:test'
import assert from 'node:assert/strict'
import { MemoryStorageAdapter } from '../src/storage/storage.ts'
import { PrincipalStore } from '../src/core/principals.ts'
import { ProjectionStore, invokeWithProjectionRuntimeAccess } from '../src/core/projections.ts'
import { SpaceStore } from '../src/core/spaces.ts'

function setup() {
  const storage = new MemoryStorageAdapter()
  const principals = new PrincipalStore(storage, undefined, () => 'root-x')
  const root = principals.ensureDefault()
  const spaces = new SpaceStore(storage, principals)
  spaces.ensureBuiltIns(root.id)
  const projections = new ProjectionStore(storage, principals, undefined, () => 'proj:guard')
  const projection = projections.create({ rootPrincipalId: root.id, spaceId: 'arcade', permissionScope: ['ai-board:POST_MESSAGE'] })
  return { spaces, projection }
}

test('invokeWithProjectionRuntimeAccess denies missing Space presence before callback executes', async () => {
  const { spaces, projection } = setup()
  let called = 0
  await assert.rejects(
    () => invokeWithProjectionRuntimeAccess(spaces, projection, 'ai-board', 'POST_MESSAGE', async () => { called += 1; return 'ok' }),
    /bound Space|entered/i,
  )
  assert.equal(called, 0)
})

test('invokeWithProjectionRuntimeAccess enforces permission and allows valid present Projection', async () => {
  const { spaces, projection } = setup()
  spaces.enterProjection(projection)
  let called = 0
  await assert.rejects(
    () => invokeWithProjectionRuntimeAccess(spaces, projection, 'ai-board', 'DELETE_MESSAGE', async () => { called += 1; return 'bad' }),
    /permission denied/i,
  )
  assert.equal(called, 0)
  const result = await invokeWithProjectionRuntimeAccess(spaces, projection, 'ai-board', 'POST_MESSAGE', async () => { called += 1; return 'ok' })
  assert.equal(result, 'ok')
  assert.equal(called, 1)
})
