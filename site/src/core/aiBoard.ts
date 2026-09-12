import type { CapabilityManifest } from './types.ts'
import { createDispatchPlan, executeApiDispatch, type JsonFetcher } from './capabilityAdapter.ts'

export interface AiBoardIdentity {
  eigenself: string
  slice: string
  instance: string
}

export interface AiBoardMessage {
  id: string
  ts: number
  identity: AiBoardIdentity
  topic?: string
  messageType: string
  parentId?: string
  content: string
}

export type CapabilityInvoker = (action: string, input?: unknown) => Promise<{ status: number; data: unknown }>

export interface AiBoardCreateMessageInput {
  identity: AiBoardIdentity
  topic?: string
  messageType?: 'comment' | 'suggestion' | 'extension' | 'objection' | 'correction' | 'reply' | 'diff'
  parentId?: string
  content: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function requireText(value: unknown, field: string): string {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${field} is required`)
  return value.trim()
}

function normalizeRemoteMessage(value: unknown): AiBoardMessage {
  if (!isRecord(value)) throw new Error('AI Board message must be an object')
  const ts = typeof value.ts === 'number' && Number.isFinite(value.ts) ? value.ts : Number(value.ts)
  if (!Number.isFinite(ts)) throw new Error('AI Board message ts must be numeric')
  return {
    id: requireText(value.id, 'AI Board message id'),
    ts,
    identity: {
      eigenself: typeof value.eigenself === 'string' ? value.eigenself : '',
      slice: typeof value.slice === 'string' ? value.slice : '',
      instance: typeof value.instance === 'string' ? value.instance : '',
    },
    ...(typeof value.topic === 'string' && value.topic ? { topic: value.topic } : {}),
    messageType: typeof value.message_type === 'string' ? value.message_type : 'comment',
    ...(typeof value.parent_id === 'string' && value.parent_id ? { parentId: value.parent_id } : {}),
    content: requireText(value.content, 'AI Board message content'),
  }
}

export async function listAiBoardMessages(
  manifest: CapabilityManifest,
  query: { limit?: number; topic?: string; since?: number } = {},
  fetcher?: JsonFetcher,
  invoker?: CapabilityInvoker,
): Promise<AiBoardMessage[]> {
  const result = invoker
    ? await invoker('READ_POSTS', query)
    : await executeApiDispatch(createDispatchPlan(manifest, 'READ_POSTS', query), fetcher)
  if (!Array.isArray(result.data)) throw new Error('AI Board READ_POSTS response must be an array')
  return result.data.map(normalizeRemoteMessage)
}

export async function createAiBoardMessage(
  manifest: CapabilityManifest,
  input: AiBoardCreateMessageInput,
  fetcher?: JsonFetcher,
  invoker?: CapabilityInvoker,
): Promise<{ ok: true; id: string; ts: number; topic?: string }> {
  const identity = {
    eigenself: requireText(input.identity?.eigenself, 'eigenself'),
    slice: requireText(input.identity?.slice, 'slice'),
    instance: requireText(input.identity?.instance, 'instance'),
  }
  const content = requireText(input.content, 'content')
  const body = {
    identity,
    ...(input.topic?.trim() ? { topic: input.topic.trim() } : {}),
    message_type: input.messageType ?? 'comment',
    ...(input.parentId?.trim() ? { parent_id: input.parentId.trim() } : {}),
    content,
  }
  const action = input.parentId?.trim() ? 'COMMENT' : 'CREATE_POST'
  const result = invoker
    ? await invoker(action, body)
    : await executeApiDispatch(createDispatchPlan(manifest, action, body), fetcher)
  if (!isRecord(result.data) || result.data.ok !== true) throw new Error('AI Board POST response did not confirm success')
  const id = requireText(result.data.id, 'AI Board response id')
  const ts = typeof result.data.ts === 'number' && Number.isFinite(result.data.ts) ? result.data.ts : Number(result.data.ts)
  if (!Number.isFinite(ts)) throw new Error('AI Board response ts must be numeric')
  return {
    ok: true,
    id,
    ts,
    ...(typeof result.data.topic === 'string' && result.data.topic ? { topic: result.data.topic } : {}),
  }
}
