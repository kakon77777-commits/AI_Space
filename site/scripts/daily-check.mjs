import { spawnSync } from 'node:child_process'
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const manifestPath = resolve(projectRoot, 'public', 'manifests', 'ai-space-worlds.v1.json')
const packagePath = resolve(projectRoot, 'package.json')

export function catalogProbeTargets(manifest, { includeSelf = true } = {}) {
  const targets = []
  for (const world of manifest.worlds ?? []) {
    targets.push({ id: world.id, url: world.href })
    if (world.mirrorHref) targets.push({ id: `${world.id}-mirror`, url: world.mirrorHref })
  }
  if (includeSelf) {
    targets.push({ id: 'ai-space-canonical', url: 'https://aispaces.app/healthz' })
    targets.push({ id: 'ai-space-second-entry', url: 'https://eveaispace.com/healthz' })
  }

  const unique = new Map()
  for (const target of targets) if (!unique.has(target.url)) unique.set(target.url, target)
  return [...unique.values()]
}

export function makeReportFileName(timestamp) {
  return `${timestamp.replaceAll(':', '-').replaceAll('.', '-')}.json`
}

async function probeTarget(target) {
  const started = performance.now()
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 15_000)
  try {
    const response = await fetch(target.url, {
      redirect: 'follow',
      signal: controller.signal,
      headers: { 'User-Agent': 'AI-Space-Daily/0.2.1' },
    })
    if (response.body) await response.body.cancel()
    return {
      ...target,
      ok: response.status >= 200 && response.status < 400,
      status: response.status,
      finalUrl: response.url,
      durationMs: Math.round(performance.now() - started),
    }
  } catch (error) {
    return {
      ...target,
      ok: false,
      error: error instanceof Error ? error.message : String(error),
      durationMs: Math.round(performance.now() - started),
    }
  } finally {
    clearTimeout(timeout)
  }
}

function runGate(name, command, args) {
  const started = performance.now()
  const result = spawnSync(command, args, {
    cwd: projectRoot,
    env: process.env,
    shell: false,
    stdio: 'inherit',
  })
  return {
    name,
    ok: result.status === 0,
    exitCode: result.status,
    durationMs: Math.round(performance.now() - started),
    error: result.error?.message,
  }
}

async function main() {
  const includeSelf = !process.argv.includes('--skip-self')
  const timestamp = new Date().toISOString()
  const [manifest, packageJson] = await Promise.all([
    readFile(manifestPath, 'utf8').then(JSON.parse),
    readFile(packagePath, 'utf8').then(JSON.parse),
  ])

  const targets = catalogProbeTargets(manifest, { includeSelf })
  const probes = await Promise.all(targets.map(probeTarget))
  const testDirectory = resolve(projectRoot, 'tests')
  const testFiles = (await readdir(testDirectory))
    .filter((name) => name.endsWith('.test.mjs'))
    .sort()
    .map((name) => resolve(testDirectory, name))
  const gates = [
    runGate('tests', process.execPath, ['--experimental-strip-types', '--test', ...testFiles]),
    runGate('typecheck', process.execPath, [resolve(projectRoot, 'node_modules', 'typescript', 'bin', 'tsc'), '--noEmit', '--pretty', 'false']),
    runGate('build', process.execPath, [resolve(projectRoot, 'node_modules', 'vite', 'bin', 'vite.js'), 'build']),
    runGate('cloudflare-dry-run', process.execPath, [resolve(projectRoot, 'node_modules', 'wrangler', 'bin', 'wrangler.js'), 'deploy', '--dry-run']),
  ]

  const report = {
    schema: 'ai-space.daily-check.v1',
    timestamp,
    version: packageJson.version,
    scheduled: false,
    probes,
    gates,
    ok: probes.every((probe) => probe.ok) && gates.every((gate) => gate.ok),
  }
  const reportDirectory = resolve(projectRoot, 'reports', 'daily', timestamp.slice(0, 10))
  await mkdir(reportDirectory, { recursive: true })
  const reportPath = resolve(reportDirectory, makeReportFileName(timestamp))
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, { encoding: 'utf8', flag: 'wx' })
  console.log(`AI Space daily report: ${reportPath}`)
  process.exitCode = report.ok ? 0 : 1
}

const invokedPath = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : ''
if (invokedPath === import.meta.url) await main()
