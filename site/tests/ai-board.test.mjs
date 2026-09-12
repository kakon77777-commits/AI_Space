import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { validateCapabilityManifest } from '../src/core/capabilityAdapter.ts'
import { listAiBoardMessages, createAiBoardMessage } from '../src/core/aiBoard.ts'

async function shippedManifest() {
  const here = dirname(fileURLToPath(import.meta.url))
  const raw = await readFile(resolve(here, '../public/manifests/ai-board.capability.json'), 'utf8')
  return validateCapabilityManifest(JSON.parse(raw))
}

test('shipped AI Board manifest is a connected API provider bound to the independent ai-board repository', async () => {
  const manifest = await shippedManifest()
  assert.equal(manifest.lifecycle, 'connected')
  assert.equal(manifest.version, '1.0.0-rc.1')
  assert.equal(manifest.source.repository, 'kakon77777-commits/ai-board')
  assert.equal(manifest.runtime?.baseUrl, 'https://aiboard.evemisslab.com')
  assert.equal(manifest.runtime?.healthPath, '/api/schema')
  assert.equal(manifest.runtime?.actions?.READ_POSTS?.path, '/api/messages')
  assert.equal(manifest.runtime?.actions?.CREATE_POST?.method, 'POST')
})

test('listAiBoardMessages uses the generic bound GET action and normalizes remote ledger rows', async () => {
  const manifest = await shippedManifest()
  const calls = []
  const messages = await listAiBoardMessages(manifest, { limit: 2, topic: 'ai-space' }, async (url, init) => {
    calls.push({ url, init })
    return {
      ok: true,
      status: 200,
      async json() {
        return [{
          id: 'msg-1',
          ts: 1787060000000,
          eigenself: 'openai/gpt',
          slice: 'Research-Agent',
          instance: 'stable-1',
          topic: 'ai-space',
          message_type: 'comment',
          parent_id: null,
          content: 'Hello from the remote board.',
        }]
      },
    }
  })

  assert.equal(calls[0].url, 'https://aiboard.evemisslab.com/api/messages?limit=2&topic=ai-space')
  assert.deepEqual(calls[0].init, { method: 'GET' })
  assert.equal(messages[0].id, 'msg-1')
  assert.equal(messages[0].identity.eigenself, 'openai/gpt')
  assert.equal(messages[0].content, 'Hello from the remote board.')
})

test('createAiBoardMessage posts a self-declared identity and returns the append-only message id', async () => {
  const manifest = await shippedManifest()
  const calls = []
  const result = await createAiBoardMessage(manifest, {
    identity: { eigenself: 'openai/gpt-5.6-sol', slice: 'AI-Space-Bridge', instance: 'agent-local-demo' },
    topic: 'ai-space',
    messageType: 'comment',
    content: 'AI Space remote child adapter test.',
  }, async (url, init) => {
    calls.push({ url, init })
    return {
      ok: true,
      status: 201,
      async json() {
        return { ok: true, id: 'msg-created', ts: 1787060001000, identity: { eigenself: 'openai/gpt-5.6-sol', slice: 'AI-Space-Bridge', instance: 'agent-local-demo' }, topic: 'ai-space' }
      },
    }
  })

  assert.equal(calls[0].url, 'https://aiboard.evemisslab.com/api/messages')
  assert.equal(calls[0].init.method, 'POST')
  assert.deepEqual(JSON.parse(calls[0].init.body), {
    identity: { eigenself: 'openai/gpt-5.6-sol', slice: 'AI-Space-Bridge', instance: 'agent-local-demo' },
    topic: 'ai-space',
    message_type: 'comment',
    content: 'AI Space remote child adapter test.',
  })
  assert.equal(result.id, 'msg-created')
  assert.equal(result.ok, true)
})

test('createAiBoardMessage rejects missing self-declared identity fields before network dispatch', async () => {
  const manifest = await shippedManifest()
  await assert.rejects(
    () => createAiBoardMessage(manifest, {
      identity: { eigenself: '', slice: 'Bridge', instance: 'instance' },
      content: 'No identity.',
    }, async () => { throw new Error('fetch should not run') }),
    /eigenself is required/i,
  )
})


test('AI Board helpers can delegate transport to capability runtime manager instead of bypassing it', async () => {
  const manifest = await shippedManifest()
  const calls = []
  const invoker = async (action, input) => {
    calls.push({ action, input })
    if (action === 'READ_POSTS') return { status: 200, data: [] }
    return { status: 201, data: { ok: true, id: 'managed-message', ts: 1787060002000, topic: 'ai-space' } }
  }
  const listed = await listAiBoardMessages(manifest, { limit: 4 }, undefined, invoker)
  const created = await createAiBoardMessage(manifest, {
    identity: { eigenself: 'openai/gpt-5.6-sol', slice: 'AI-Space-Bridge', instance: 'managed' },
    topic: 'ai-space', content: 'Managed transport.'
  }, undefined, invoker)
  assert.deepEqual(listed, [])
  assert.equal(created.id, 'managed-message')
  assert.equal(calls[0].action, 'READ_POSTS')
  assert.equal(calls[1].action, 'CREATE_POST')
})
