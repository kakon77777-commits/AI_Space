import type { Capability } from './types.ts'

function normalizeRoute(route: string): string {
  if (!route || route === '#') return '/'
  const withoutHash = route.startsWith('#') ? route.slice(1) : route
  const withSlash = withoutHash.startsWith('/') ? withoutHash : `/${withoutHash}`
  return withSlash.length > 1 ? withSlash.replace(/\/+$/, '') : '/'
}

export function resolveCapability(capabilities: Capability[], route: string): Capability | undefined {
  const normalized = normalizeRoute(route)
  return capabilities.find((capability) => normalizeRoute(capability.route) === normalized)
}

export function getNavigationCapabilities(capabilities: Capability[]): Capability[] {
  return capabilities
    .filter((capability) => capability.navigation?.visible !== false)
    .sort((a, b) => (a.navigation?.order ?? Number.MAX_SAFE_INTEGER) - (b.navigation?.order ?? Number.MAX_SAFE_INTEGER))
}


export function mergeCapabilities(core: Capability[], discovered: Capability[]): Capability[] {
  const merged = [...core]
  const ids = new Set(core.map((capability) => capability.id))
  const routes = new Map(core.map((capability) => [normalizeRoute(capability.route), capability.id]))

  for (const capability of discovered) {
    if (ids.has(capability.id)) throw new Error(`Duplicate capability id: ${capability.id}`)
    const normalizedRoute = normalizeRoute(capability.route)
    if (routes.has(normalizedRoute)) throw new Error(`Route collision: ${capability.route}`)
    ids.add(capability.id)
    routes.set(normalizedRoute, capability.id)
    merged.push(capability)
  }

  return merged
}
