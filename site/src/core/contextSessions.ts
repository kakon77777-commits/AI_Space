import type { ContextSession } from './types.ts'
import type { StorageAdapter } from '../storage/storage.ts'

const DEFAULT_KEY = 'ai-space.context-sessions.v1'

export interface StartContextSessionInput {
  principalId: string
  label: string
}

function defaultId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return `ctx:${crypto.randomUUID()}`
  return `ctx:${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export class ContextSessionStore {
  private readonly storage: StorageAdapter
  private readonly now: () => string
  private readonly createId: () => string
  private readonly key: string

  constructor(
    storage: StorageAdapter,
    now: () => string = () => new Date().toISOString(),
    createId: () => string = defaultId,
    key = DEFAULT_KEY,
  ) {
    this.storage = storage
    this.now = now
    this.createId = createId
    this.key = key
  }

  start(input: StartContextSessionInput): ContextSession {
    const label = input.label.trim()
    if (!label) throw new Error('Context session label is required.')
    if (this.getActive(input.principalId)) throw new Error('A context session is already active for this principal.')

    const session: ContextSession = {
      id: this.createId(),
      principalId: input.principalId,
      label,
      status: 'active',
      startedAt: this.now(),
    }
    this.write([...this.read(), session])
    return session
  }

  close(id: string): ContextSession {
    const sessions = this.read()
    const index = sessions.findIndex((session) => session.id === id)
    if (index < 0) throw new Error('Context session not found.')
    const current = sessions[index]
    if (current.status !== 'active') throw new Error('Context session is already closed.')

    const closed: ContextSession = {
      ...current,
      status: 'closed',
      endedAt: this.now(),
    }
    sessions[index] = closed
    this.write(sessions)
    return closed
  }

  list(): ContextSession[] {
    return [...this.read()].sort((a, b) => b.startedAt.localeCompare(a.startedAt))
  }

  listForPrincipal(principalId: string): ContextSession[] {
    return this.list().filter((session) => session.principalId === principalId)
  }

  get(id: string): ContextSession | undefined {
    return this.read().find((session) => session.id === id)
  }

  getActive(principalId: string): ContextSession | undefined {
    return this.read().find((session) => session.principalId === principalId && session.status === 'active')
  }

  private read(): ContextSession[] {
    const raw = this.storage.getItem(this.key)
    if (!raw) return []
    try {
      const parsed = JSON.parse(raw)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }

  private write(sessions: ContextSession[]): void {
    this.storage.setItem(this.key, JSON.stringify(sessions))
  }
}
