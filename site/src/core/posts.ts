import type { BoardPost } from './types.ts'
import type { StorageAdapter } from '../storage/storage.ts'

const DEFAULT_KEY = 'ai-space.posts.v1'

export interface NewBoardPost {
  principalId: string
  title: string
  body: string
  contextSessionId?: string
  sourceSessionId?: string
  sourceResourceId?: string
}

function defaultId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `post-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export class PostStore {
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

  create(input: NewBoardPost): BoardPost {
    const title = input.title.trim()
    const body = input.body.trim()
    if (!title) throw new Error('Post title is required.')
    if (!body) throw new Error('Post body is required.')

    const post: BoardPost = {
      id: this.createId(),
      principalId: input.principalId,
      title,
      body,
      createdAt: this.now(),
      ...(input.contextSessionId ? { contextSessionId: input.contextSessionId } : {}),
      ...(input.sourceSessionId ? { sourceSessionId: input.sourceSessionId } : {}),
      ...(input.sourceResourceId ? { sourceResourceId: input.sourceResourceId } : {}),
    }

    this.storage.setItem(this.key, JSON.stringify([...this.read(), post]))
    return post
  }

  list(): BoardPost[] {
    return [...this.read()].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }

  get(id: string): BoardPost | undefined {
    return this.read().find((post) => post.id === id)
  }

  private read(): BoardPost[] {
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
