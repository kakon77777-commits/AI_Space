import test from 'node:test'
import assert from 'node:assert/strict'
import { getPageModel } from '../src/core/shell.ts'
import { capabilities as shippedCapabilities } from '../src/data/capabilities.ts'

const capabilities = [
  { id: 'home', label: 'Home', description: 'Home page', route: '/', mode: 'native', status: 'ready', actions: [] },
  { id: 'board', label: 'Board', description: 'Board page', route: '/board', mode: 'native', status: 'placeholder', actions: [] },
  { id: 'agents', label: 'Agents', description: 'Principal and session context', route: '/agents', mode: 'native', status: 'ready', actions: [] },
  { id: 'capabilities', label: 'Capabilities', description: 'Runtime manager', route: '/capabilities', mode: 'native', status: 'ready', actions: [] },
]

test('getPageModel resolves known capabilities', () => {
  assert.deepEqual(getPageModel(capabilities, '/board'), {
    kind: 'capability',
    capabilityId: 'board',
    title: 'Board',
  })
})

test('getPageModel returns not-found for unknown routes', () => {
  assert.deepEqual(getPageModel(capabilities, '/nope'), {
    kind: 'not-found',
    title: 'Not Found',
  })
})

test('getPageModel resolves the capability runtime manager route', () => {
  assert.deepEqual(getPageModel(capabilities, '/capabilities'), { kind: 'capability', capabilityId: 'capabilities', title: 'Capabilities' })
})


test('shipped capability registry exposes the agents identity and session route', () => {
  assert.deepEqual(getPageModel(shippedCapabilities, '/agents'), { kind: 'capability', capabilityId: 'agents', title: 'Agents' })
})

test('shipped capability registry exposes the projection runtime route', async () => {
  const { capabilities } = await import('../src/data/capabilities.ts')
  const projection = capabilities.find((capability) => capability.id === 'projections')
  assert.ok(projection)
  assert.equal(projection.route, '/projections')
  assert.equal(projection.mode, 'native')
})

test('shipped Arcade capability declares tracked browser-session and experience actions', () => {
  const arcade = shippedCapabilities.find((capability) => capability.id === 'arcade')
  assert.ok(arcade)
  for (const action of [
    'START_BROWSER_SESSION',
    'COMPLETE_BROWSER_SESSION',
    'ABANDON_BROWSER_SESSION',
    'PROMOTE_EXPERIENCE_REFLECTION',
  ]) {
    assert.equal(arcade.actions.includes(action), true, `missing Arcade action ${action}`)
  }
})

test('shipped capability registry exposes the Shared Space Runtime route', () => {
  const space = shippedCapabilities.find((capability) => capability.id === 'spaces')
  assert.ok(space)
  assert.equal(space.route, '/spaces')
  assert.equal(space.mode, 'native')
  for (const action of ['LIST_SPACES', 'CREATE_SPACE', 'ENTER_SPACE', 'LEAVE_SPACE', 'ADD_SPACE_MEMBER', 'ADD_SPACE_RESOURCE']) {
    assert.equal(space.actions.includes(action), true, `missing Space action ${action}`)
  }
})

test('shipped capability registry exposes the coherent MVP Journey route and lifecycle actions', () => {
  const mvp = shippedCapabilities.find((capability) => capability.id === 'mvp')
  assert.ok(mvp)
  assert.equal(mvp.route, '/mvp')
  assert.equal(mvp.mode, 'native')
  for (const action of [
    'LIST_MVP_JOURNEYS',
    'START_MVP_JOURNEY',
    'START_MVP_INTERACTION',
    'COMPLETE_MVP_INTERACTION',
    'PROMOTE_MVP_REFLECTION',
    'FINISH_MVP_JOURNEY',
    'ABANDON_MVP_JOURNEY',
    'EVALUATE_MVP_JOURNEY',
  ]) {
    assert.equal(mvp.actions.includes(action), true, `missing MVP action ${action}`)
  }
})

test('shipped capability registry exposes the state portability backup/restore route', () => {
  const backup = shippedCapabilities.find((capability) => capability.id === 'backup')
  assert.ok(backup)
  assert.equal(backup.route, '/backup')
  assert.equal(backup.mode, 'native')
  for (const action of ['EXPORT_STATE_BUNDLE', 'PREVIEW_STATE_RESTORE', 'RESTORE_STATE_BUNDLE']) {
    assert.equal(backup.actions.includes(action), true, `missing Backup action ${action}`)
  }
})

test('shipped capability registry exposes the persistent Activity surface', () => {
  const activity = shippedCapabilities.find((item) => item.id === 'activities')
  assert.ok(activity)
  assert.equal(activity.route, '/activities')
  assert.equal(activity.status, 'ready')
  assert.ok(activity.actions.includes('START_ACTIVITY'))
  assert.ok(activity.actions.includes('COMPLETE_ACTIVITY'))
})
