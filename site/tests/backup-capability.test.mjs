import test from 'node:test'
import assert from 'node:assert/strict'
import { capabilities } from '../src/data/capabilities.ts'

test('Backup capability exposes authoritative export and safe migration actions', () => {
  const backup = capabilities.find((item) => item.id === 'backup')
  assert.ok(backup)
  assert.equal(backup.actions.includes('EXPORT_AUTHORITATIVE_STATE_BUNDLE'), true)
  assert.equal(backup.actions.includes('PLAN_STATE_MIGRATION'), true)
  assert.equal(backup.actions.includes('APPLY_STATE_MIGRATION'), true)
})
