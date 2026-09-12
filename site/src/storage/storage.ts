export interface StorageAdapter {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

export class MemoryStorageAdapter implements StorageAdapter {
  private readonly values = new Map<string, string>()

  getItem(key: string): string | null {
    return this.values.get(key) ?? null
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value)
  }

  removeItem(key: string): void {
    this.values.delete(key)
  }
}

export class BrowserStorageAdapter implements StorageAdapter {
  private readonly storage: Storage

  constructor(storage: Storage) {
    this.storage = storage
  }

  getItem(key: string): string | null {
    return this.storage.getItem(key)
  }

  setItem(key: string, value: string): void {
    this.storage.setItem(key, value)
  }

  removeItem(key: string): void {
    this.storage.removeItem(key)
  }
}
