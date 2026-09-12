import type { ActivityEvent } from './types.ts'
import type { StorageAdapter } from '../storage/storage.ts'

const DEFAULT_KEY = 'ai-space.events.v1'

export type NewActivityEvent = Omit<ActivityEvent, 'id' | 'timestamp'>

function defaultId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `event-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export class EventStore {
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

  append(input: NewActivityEvent): ActivityEvent {
    const event: ActivityEvent = {
      ...input,
      id: this.createId(),
      timestamp: this.now(),
    }
    const events = [...this.read(), event]
    this.storage.setItem(this.key, JSON.stringify(events))
    return event
  }

  list(): ActivityEvent[] {
    return [...this.read()].sort((a, b) => b.timestamp.localeCompare(a.timestamp))
  }

  clear(): void {
    this.storage.removeItem(this.key)
  }

  private read(): ActivityEvent[] {
    const raw = this.storage.getItem(this.key)
    if (!raw) return []
    try {
      const parsed = JSON.parse(raw)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }
}
