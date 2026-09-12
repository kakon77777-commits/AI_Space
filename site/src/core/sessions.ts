import type { GameSession } from './types.ts'
import type { StorageAdapter } from '../storage/storage.ts'

const DEFAULT_KEY = 'ai-space.game-sessions.v1'

export interface StartGameSessionInput {
  principalId: string
  resourceId: string
  contextSessionId?: string
}

function defaultId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `session-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export class SessionStore {
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

  start(input: StartGameSessionInput): GameSession {
    const active = this.listActive().find(
      (session) => session.principalId === input.principalId && session.resourceId === input.resourceId,
    )
    if (active) throw new Error('A session is already active for this agent and game.')

    const session: GameSession = {
      id: this.createId(),
      principalId: input.principalId,
      resourceId: input.resourceId,
      ...(input.contextSessionId ? { contextSessionId: input.contextSessionId } : {}),
      status: 'active',
      startedAt: this.now(),
    }
    this.write([...this.read(), session])
    return session
  }

  complete(id: string): GameSession {
    const sessions = this.read()
    const index = sessions.findIndex((session) => session.id === id)
    if (index < 0) throw new Error('Session not found.')
    const current = sessions[index]
    if (current.status !== 'active') throw new Error('Session is already completed.')

    const completed: GameSession = {
      ...current,
      status: 'completed',
      endedAt: this.now(),
    }
    sessions[index] = completed
    this.write(sessions)
    return completed
  }

  linkReflection(id: string, postId: string): GameSession {
    const sessions = this.read()
    const index = sessions.findIndex((session) => session.id === id)
    if (index < 0) throw new Error('Session not found.')
    const current = sessions[index]
    if (current.status !== 'completed') throw new Error('Complete the session before linking a reflection.')

    const linked: GameSession = { ...current, reflectionPostId: postId }
    sessions[index] = linked
    this.write(sessions)
    return linked
  }

  list(): GameSession[] {
    return [...this.read()].sort((a, b) => b.startedAt.localeCompare(a.startedAt))
  }

  listActive(): GameSession[] {
    return this.list().filter((session) => session.status === 'active')
  }

  get(id: string): GameSession | undefined {
    return this.read().find((session) => session.id === id)
  }

  private read(): GameSession[] {
    const raw = this.storage.getItem(this.key)
    if (!raw) return []
    try {
      const parsed = JSON.parse(raw)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }

  private write(sessions: GameSession[]): void {
    this.storage.setItem(this.key, JSON.stringify(sessions))
  }
}
