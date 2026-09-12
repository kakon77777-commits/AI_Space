import type { ExternalResource, ResourceType } from './types.ts'
import type { StorageAdapter } from '../storage/storage.ts'

const DEFAULT_KEY = 'ai-space.resources.v1'

export interface NewExternalResource {
  title: string
  type: ResourceType
  url: string
}

function defaultId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `resource-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export function validateExternalUrl(rawUrl: string): string {
  let url: URL
  try {
    url = new URL(rawUrl.trim())
  } catch {
    throw new Error('Enter a valid absolute URL.')
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('Only http and https external URLs are allowed.')
  }
  return url.toString()
}

export class ResourceStore {
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

  add(input: NewExternalResource): ExternalResource {
    const title = input.title.trim()
    if (!title) throw new Error('Resource title is required.')

    const resource: ExternalResource = {
      id: this.createId(),
      title,
      type: input.type,
      url: validateExternalUrl(input.url),
      createdAt: this.now(),
    }
    this.storage.setItem(this.key, JSON.stringify([...this.read(), resource]))
    return resource
  }

  list(): ExternalResource[] {
    return [...this.read()].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }

  private read(): ExternalResource[] {
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

export function selectGameResources(resources: ExternalResource[]): ExternalResource[] {
  return resources.filter((resource) => resource.type === 'game')
}
