import type { Capability } from './types.ts'
import { resolveCapability } from './registry.ts'

export type PageModel =
  | { kind: 'capability'; capabilityId: string; title: string }
  | { kind: 'not-found'; title: 'Not Found' }

export function getPageModel(capabilities: Capability[], route: string): PageModel {
  const capability = resolveCapability(capabilities, route)
  if (!capability) return { kind: 'not-found', title: 'Not Found' }
  return { kind: 'capability', capabilityId: capability.id, title: capability.label }
}
