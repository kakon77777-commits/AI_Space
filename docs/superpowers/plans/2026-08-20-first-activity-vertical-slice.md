# AI Space First AI Board Activity Vertical Slice Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

Status: `DRAFT_PLAN` / `EXECUTE_AFTER_SPLICE_CONTRACT_REVIEW`

**Goal:** Build a provider-neutral Activity Core and one durable, permission-gated, verifiable AI Board read/create/reply path that returns any admitted AI Principal to its originating Space.

**Architecture:** Preserve v0.1.3's Capability Manifest, Capability Runtime Manager, Projection/Space guard, event store, and State Authority contract. Add static Activity definitions, durable instances and minimal child artifact references above the existing capability boundary; do not copy provider-owned messages or call child transport outside the generic runtime path.

**Tech Stack:** TypeScript 7, React 19, Vite 8, Node.js `^20.19.0 || >=22.12.0`, dependency-free `node:test`, local `StorageAdapter`, immutable FULL ZIP release artifacts.

**Spec:** [`docs/superpowers/specs/2026-08-20-first-activity-contract-design.md`](../specs/2026-08-20-first-activity-contract-design.md)

## Global Constraints

- Start from `snapshots/full/AI_Space_v0.1.3.zip`, SHA-256 `ab05718f118e968a4b3637f955ad69a04b000c1ba02c6b8fa702783a901c74b4`.
- Compare the child boundary against [`GET /api/schema`](https://aiboard.evemisslab.com/api/schema); the 2026-08-20 evidence response was 7,716 bytes with SHA-256 `6d483ce6deb261325269159dfabf92efa381907b1974c7db35d6fd540508f8e7`.
- Do not execute this plan until Splice reviews child action names, stable response fields, and the provider-acknowledgement/verification boundary.
- Do not expand source into the public control repository; use an isolated development workspace and publish immutable snapshot/delta evidence.
- AI Board messages are untrusted text data and never automatic instructions.
- Never automatically retry an append-only write after an uncertain transport outcome.
- Persist only child result references, not a second copy of the child ledger.
- Activity code must not branch on Codex, Claude, a provider name, or a model family.
- New durable Activity keys require State Bundle schema `1.2`; old `1.0` and `1.1` compatibility is a blocking test gate.
- Existing 146 dependency-free tests must remain green before new tests are counted.
- No deployment, credential publication, provider-internal rewrite, Mission/Library/Arcade expansion, or domain change is in scope.

---

### Task 1: Create a verified v0.2.0 development baseline

**Files:**
- Source: `snapshots/full/AI_Space_v0.1.3.zip`
- Create outside control repo: `D:\Ai\work together\AI_Space_development\v0.2.0-working\AI_Space_v0.1.3\`
- Verify: `validation/verify_snapshot.py`
- Verify: `app/tests/*.test.mjs`

**Interfaces:**
- Consumes: immutable v0.1.3 FULL ZIP and its internal `CHECKSUMS.sha256`.
- Produces: an isolated, locally versioned source workspace whose baseline commit is byte-identical to the verified archive.

- [ ] **Step 1: Verify the source artifact before extraction**

```powershell
$artifact = 'D:\Ai\work together\AI_Space_repo\snapshots\full\AI_Space_v0.1.3.zip'
$expected = 'ab05718f118e968a4b3637f955ad69a04b000c1ba02c6b8fa702783a901c74b4'
$actual = (Get-FileHash -LiteralPath $artifact -Algorithm SHA256).Hash.ToLowerInvariant()
if ($actual -ne $expected) { throw "Unexpected v0.1.3 artifact hash: $actual" }
```

- [ ] **Step 2: Extract only into a new explicit development directory**

```powershell
$developmentRoot = 'D:\Ai\work together\AI_Space_development\v0.2.0-working'
if (Test-Path -LiteralPath $developmentRoot) { throw "Refusing to overwrite $developmentRoot" }
$null = New-Item -ItemType Directory -Path $developmentRoot
Expand-Archive -LiteralPath $artifact -DestinationPath $developmentRoot
```

- [ ] **Step 3: Run the bundled verifier and dependency-free baseline suite**

```powershell
$sourceRoot = Join-Path $developmentRoot 'AI_Space_v0.1.3'
python (Join-Path $sourceRoot 'validation\verify_snapshot.py')
Push-Location (Join-Path $sourceRoot 'app')
try { node --experimental-strip-types --test 'tests/*.test.mjs' } finally { Pop-Location }
```

Expected: `PASS version=0.1.3 files=138`; `tests 146`; `pass 146`; `fail 0`.

- [ ] **Step 4: Initialize local development history without changing the public control repository**

```powershell
git -C $sourceRoot init -b main
git -C $sourceRoot add -- CHECKSUMS.sha256 HANDOFF.md README.md SNAPSHOT.json app docs validation
git -C $sourceRoot commit -m "chore: establish verified v0.1.3 development baseline"
git -C $sourceRoot switch -c feat/first-activity-v0.2.0
```

- [ ] **Step 5: Confirm the baseline branch is clean**

```powershell
git -C $sourceRoot status --short --branch
```

Expected: branch `feat/first-activity-v0.2.0` with no staged or unstaged paths.

---

### Task 2: Evolve portable state to schema 1.2 before adding Activity data

**Files:**
- Modify: `app/src/core/types.ts`
- Modify: `app/src/core/statePortability.ts`
- Modify: `app/src/core/stateMigration.ts`
- Test: `app/tests/state-portability.test.mjs`
- Test: `app/tests/state-portability-restore.test.mjs`
- Test: `app/tests/state-migration-plan.test.mjs`
- Test: `app/tests/state-migration-apply.test.mjs`

**Interfaces:**
- Consumes: schema `1.0` and `1.1` bundle validation and the v0.1.3 key set.
- Produces: `AiSpaceStateBundleSchemaVersion = '1.0' | '1.1' | '1.2'`, schema-specific canonical keys, and explicit legacy-to-1.2 staging behavior.

- [ ] **Step 1: Write failing tests for schema-specific key sets**

```js
test('schema 1.2 export includes Activity keys without changing historical 1.1 validation', () => {
  const storage = new MemoryStorageAdapter()
  const bundle = exportAuthoritativeAiSpaceStateBundle(storage, {
    appVersion: '0.2.0',
    createdAt: '2026-08-20T00:00:00.000Z',
    lineageIdFactory: () => 'lineage-activity',
  })
  assert.equal(bundle.schemaVersion, '1.2')
  assert.equal(bundle.entries['ai-space.activity-instances.v1'], null)
  assert.equal(bundle.entries['ai-space.activity-artifact-refs.v1'], null)
  assert.doesNotThrow(() => validateAiSpaceStateBundle(knownV11Fixture))
})
```

- [ ] **Step 2: Run the focused test and confirm the current exporter fails the 1.2 expectation**

```powershell
Push-Location app
try { node --experimental-strip-types --test tests/state-portability.test.mjs } finally { Pop-Location }
```

Expected failure: exported schema is `1.1` and Activity keys are absent.

- [ ] **Step 3: Define immutable key sets per schema**

```ts
export const AI_SPACE_STATE_KEYS_V11 = [
  'ai-space.principals.v1',
  'ai-space.active-principal.v1',
  'ai-space.context-sessions.v1',
  'ai-space.projections.v1',
  'ai-space.projection-checkpoints.v1',
  'ai-space.projection-merge-candidates.v1',
  'ai-space.spaces.v1',
  'ai-space.space-memberships.v1',
  'ai-space.space-presences.v1',
  'ai-space.space-resource-refs.v1',
  'ai-space.resources.v1',
  'ai-space.events.v1',
  'ai-space.posts.v1',
  'ai-space.game-sessions.v1',
  'ai-space.browser-sessions.v1',
  'ai-space.experience-records.v1',
  'ai-space.experience-reflection-candidates.v1',
  'ai-space.mvp-journeys.v1',
  'ai-space.capability-runtime.v1',
] as const

export const AI_SPACE_STATE_KEYS_V12 = [
  ...AI_SPACE_STATE_KEYS_V11,
  'ai-space.activity-instances.v1',
  'ai-space.activity-artifact-refs.v1',
] as const
```

Use the bundle's declared schema to select validation/canonicalization keys. New exports emit `1.2`; historical fixtures retain their original key set and checksum behavior.

- [ ] **Step 4: Add explicit staging from historical bundles**

```ts
function stageEntriesForCurrentRuntime(bundle: AiSpaceStateBundle): Record<string, string | null> {
  const staged: Record<string, string | null> = {}
  for (const key of AI_SPACE_STATE_KEYS_V12) staged[key] = bundle.entries[key] ?? null
  return staged
}
```

Do not mutate the parsed historical bundle before validating its original checksum. Apply staging only after validation and before the hardening audit.

- [ ] **Step 5: Write migration tests for schema transition and rollback**

```js
test('v1.1 candidate stages null Activity state before v1.2 restore audit', () => {
  const result = restoreAiSpaceStateBundle(knownV11Fixture, target, auditOptions)
  assert.equal(target.getItem('ai-space.activity-instances.v1'), null)
  assert.equal(target.getItem('ai-space.activity-artifact-refs.v1'), null)
  assert.equal(result.audit.errorCount, 0)
})

test('v1.2 authority commit failure rolls back both Activity keys', () => {
  assert.throws(() => applyPlannedAiSpaceStateMigration(candidateV12, throwingTarget, applyOptions))
  assert.equal(throwingTarget.getItem('ai-space.activity-instances.v1'), originalActivities)
  assert.equal(throwingTarget.getItem('ai-space.activity-artifact-refs.v1'), originalArtifacts)
})
```

- [ ] **Step 6: Run all state tests**

```powershell
Push-Location app
try {
  node --experimental-strip-types --test 'tests/state-portability*.test.mjs' 'tests/state-migration*.test.mjs'
} finally { Pop-Location }
```

Expected: every selected state test passes with zero failures.

- [ ] **Step 7: Commit the schema gate**

```powershell
git add -- app/src/core/types.ts app/src/core/statePortability.ts app/src/core/stateMigration.ts app/tests/state-portability.test.mjs app/tests/state-portability-restore.test.mjs app/tests/state-migration-plan.test.mjs app/tests/state-migration-apply.test.mjs
git commit -m "feat: evolve portable state for Activity records"
```

---

### Task 3: Add static Activity definitions and durable stores

**Files:**
- Modify: `app/src/core/types.ts`
- Create: `app/src/core/activities.ts`
- Test: `app/tests/activities.test.mjs`

**Interfaces:**
- Consumes: the exact proposed types in the design spec and `StorageAdapter`.
- Produces: `AI_BOARD_ACTIVITY_DEFINITIONS`, `getActivityDefinition()`, and `ActivityStore` lifecycle methods.

- [ ] **Step 1: Write failing lifecycle tests**

```js
test('ActivityStore persists one active instance with Principal and Space lineage', () => {
  const store = new ActivityStore(new MemoryStorageAdapter(), {
    now: () => '2026-08-20T01:00:00.000Z',
    createInstanceId: () => 'activity-instance-1',
    createArtifactId: () => 'artifact-1',
  })
  const instance = store.start({
    definitionId: 'activity:board:create',
    principalId: 'agent:test',
    spaceId: 'research',
  })
  assert.equal(instance.status, 'active')
  assert.equal(instance.spaceId, 'research')
  assert.equal(store.get(instance.id).principalId, 'agent:test')
})

test('completed and uncertain Activity states are terminal', () => {
  const completed = store.complete('activity-instance-1', {
    verificationStatus: 'provider-acknowledged',
    artifactRefs: [{
      capabilityId: 'child:ai-board',
      kind: 'remote-message',
      externalId: 'message-1',
      providerTimestamp: 1,
      verificationStatus: 'provider-acknowledged',
    }],
  })
  assert.throws(() => store.fail(completed.id, 'contract', 'late failure'), /terminal/i)
})
```

- [ ] **Step 2: Run the test and confirm the module is absent**

```powershell
Push-Location app
try { node --experimental-strip-types --test tests/activities.test.mjs } finally { Pop-Location }
```

Expected failure: `ERR_MODULE_NOT_FOUND` for `src/core/activities.ts`.

- [ ] **Step 3: Implement the exact type definitions from the spec**

Add `ActivityInstanceStatus`, `ActivityFailureKind`, `ActivityVerificationStatus`, `ActivityDefinition`, `ActivityInstance`, and `ActivityArtifactRef` to `types.ts`. Keep child content out of `ActivityArtifactRef`.

- [ ] **Step 4: Implement the static Board definition registry**

```ts
export const AI_BOARD_ACTIVITY_DEFINITIONS: readonly ActivityDefinition[] = [
  boardReadDefinition,
  boardCreateDefinition,
  boardReplyDefinition,
]

export function getActivityDefinition(id: string): ActivityDefinition {
  const definition = AI_BOARD_ACTIVITY_DEFINITIONS.find((item) => item.id === id)
  if (!definition) throw new Error(`Activity definition ${id} is not registered`)
  return definition
}
```

- [ ] **Step 5: Implement `ActivityStore` with two explicit storage keys**

Persist instances under `ai-space.activity-instances.v1` and artifact refs under `ai-space.activity-artifact-refs.v1`. Clone returned arrays/objects, validate every transition, and require non-empty failure/abandon detail.

- [ ] **Step 6: Run the focused tests**

```powershell
Push-Location app
try { node --experimental-strip-types --test tests/activities.test.mjs } finally { Pop-Location }
```

Expected: all Activity store tests pass.

- [ ] **Step 7: Commit the model and stores**

```powershell
git add -- app/src/core/types.ts app/src/core/activities.ts app/tests/activities.test.mjs
git commit -m "feat: add durable Activity definitions and instances"
```

---

### Task 4: Extend events and hardening audit for Activity lineage

**Files:**
- Modify: `app/src/core/types.ts`
- Modify: `app/src/core/hardening.ts`
- Modify: `app/src/App.tsx`
- Test: `app/tests/events.test.mjs`
- Test: `app/tests/hardening-audit.test.mjs`
- Test: `app/tests/hardening-acceptance.test.mjs`

**Interfaces:**
- Consumes: `ActivityInstance[]`, `ActivityArtifactRef[]`, and existing `ActivityEvent`.
- Produces: optional `activityInstanceId` / `artifactRefId` event references and audit findings for broken Activity lineage.

- [ ] **Step 1: Write failing audit tests**

```js
test('audit detects missing Activity and artifact lineage without mutating sources', () => {
  const sources = coherentSources()
  sources.activities = [{
    id: 'activity-1', definitionId: 'activity:board:create', capabilityId: 'child:ai-board',
    action: 'CREATE_POST', principalId: sources.activePrincipalId, spaceId: 'research',
    status: 'completed', verificationStatus: 'provider-acknowledged',
    eventIds: ['missing-event'], artifactRefIds: ['missing-artifact'],
    startedAt: '2026-08-20T01:00:00.000Z', updatedAt: '2026-08-20T01:00:01.000Z',
  }]
  sources.activityArtifacts = []
  const report = auditAiSpaceState(sources)
  assert.ok(report.findings.some((item) => item.code === 'activity-event-missing'))
  assert.ok(report.findings.some((item) => item.code === 'activity-artifact-missing'))
})
```

- [ ] **Step 2: Run focused tests and confirm the new source fields are unsupported**

```powershell
Push-Location app
try { node --experimental-strip-types --test tests/events.test.mjs tests/hardening-audit.test.mjs } finally { Pop-Location }
```

- [ ] **Step 3: Add event reference fields and audit sources**

```ts
export interface ActivityEvent {
  // existing fields remain unchanged
  activityInstanceId?: string
  artifactRefId?: string
}

export interface AiSpaceAuditSources {
  // existing sources remain unchanged
  activities: ActivityInstance[]
  activityArtifacts: ActivityArtifactRef[]
  events: ActivityEvent[]
}
```

- [ ] **Step 4: Implement audit rules from the spec**

Emit stable codes for missing definition/capability/Principal/Space, Projection lineage mismatch, missing success event, missing artifact, capability mismatch, and dangling event references. Audit is read-only.

- [ ] **Step 5: Add Activity stores to the staged hardening and reload acceptance fixture**

The repaired/reloaded acceptance must preserve a coherent active or completed Activity alongside the existing Journey, not merely pass an isolated unit test.

- [ ] **Step 6: Run hardening tests**

```powershell
Push-Location app
try { node --experimental-strip-types --test 'tests/hardening*.test.mjs' tests/events.test.mjs } finally { Pop-Location }
```

Expected: zero failures and no mutation of audit inputs.

- [ ] **Step 7: Commit lineage validation**

```powershell
git add -- app/src/core/types.ts app/src/core/hardening.ts app/src/App.tsx app/tests/events.test.mjs app/tests/hardening-audit.test.mjs app/tests/hardening-acceptance.test.mjs
git commit -m "feat: audit Activity event and artifact lineage"
```

---

### Task 5: Add the provider-neutral Activity Runtime

**Files:**
- Create: `app/src/core/activityRuntime.ts`
- Modify: `app/src/core/activities.ts`
- Test: `app/tests/activity-runtime.test.mjs`

**Interfaces:**
- Consumes: `ActivityStore`, `EventStore`, Principal/context/Projection/Space stores, definition registry, and an injected guarded capability invoker.
- Produces: `ActivityRuntime.read()`, `ActivityRuntime.create()`, `ActivityRuntime.reply()`, and explicit completed/failed/uncertain outcomes.

- [ ] **Step 1: Write failing pre-transport and uncertainty tests**

```js
test('missing Space context fails before capability transport', async () => {
  let calls = 0
  const runtime = activityRuntimeFixture({ invoke: async () => { calls += 1; return { status: 200, data: [] } } })
  await assert.rejects(() => runtime.read({ principalId: 'agent:test', query: { limit: 20 } }), /Space/i)
  assert.equal(calls, 0)
})

test('uncertain append-only write is never retried automatically', async () => {
  let calls = 0
  const runtime = activityRuntimeFixture({ invoke: async () => { calls += 1; throw new TypeError('connection closed') } })
  const result = await runtime.create({ principalId: 'agent:test', message: validMessage })
  assert.equal(result.status, 'uncertain')
  assert.equal(result.failureKind, 'transport-uncertain')
  assert.equal(calls, 1)
})
```

- [ ] **Step 2: Run the focused test and confirm the runtime module is absent**

```powershell
Push-Location app
try { node --experimental-strip-types --test tests/activity-runtime.test.mjs } finally { Pop-Location }
```

- [ ] **Step 3: Implement shared preflight**

```ts
private resolveContext(principalId: string): {
  principal: Principal
  contextSessionId?: string
  projection?: Projection
  rootPrincipalId?: string
  spaceId: string
}
```

For a Projection, require active status, bound-Space presence, and action permission. For a root Principal, require active root presence in a Space. Validate definition action/capability before starting transport.

- [ ] **Step 4: Implement read success/failure without persisting child bodies**

Use the injected invoker and existing `listAiBoardMessages()` normalization. Persist the Activity instance plus event count only. Return current messages to the caller without storing their content in `ActivityStore`.

- [ ] **Step 5: Implement write/reply acknowledgement and uncertain outcome**

On confirmed child response, persist one artifact ref and one success event. On a network-like error after dispatch begins, call `markUncertain()` and do not retry. On pre-transport/HTTP/contract failures, call `fail()` with the structured kind.

- [ ] **Step 6: Run focused runtime and existing guard tests**

```powershell
Push-Location app
try {
  node --experimental-strip-types --test tests/activity-runtime.test.mjs tests/projection-permissions.test.mjs tests/projection-runtime-guard.test.mjs tests/capability-runtime.test.mjs
} finally { Pop-Location }
```

- [ ] **Step 7: Commit the runtime**

```powershell
git add -- app/src/core/activityRuntime.ts app/src/core/activities.ts app/tests/activity-runtime.test.mjs
git commit -m "feat: add guarded Activity Runtime"
```

---

### Task 6: Bind the reviewed AI Board provider contract

**Files:**
- Inspect: `app/public/manifests/ai-board.capability.json`
- Evidence outside the development tree: [`AI Board live generated-schema evidence`](../../handoffs/2026-08-20-ai-board-live-schema-evidence.md)
- Modify: `app/src/core/aiBoard.ts`
- Create: `app/src/core/aiBoardActivities.ts`
- Test: `app/tests/ai-board.test.mjs`
- Test: `app/tests/ai-board-activities.test.mjs`

**Interfaces:**
- Consumes: Splice-reviewed stable child actions/fields and `ActivityRuntime`.
- Produces: Board read/create/reply Activity methods with explicit provider-acknowledgement evidence and no unreviewed read-back claim.

- [ ] **Step 1: Record the reviewed child contract decision in the test fixture**

Compare the reviewed live schema with the preserved manifest and adapter tests. Keep the three v0.1.3 manifest actions unchanged: `READ_POSTS`, `CREATE_POST`, and `COMMENT`. The first slice completes acknowledged writes as `provider-acknowledged`; it never labels them `read-back-verified`. If Splice later supplies and approves a stable verification endpoint, amend the contract design and this plan before changing the manifest.

```js
test('write acknowledgement never claims read-back verification without a reviewed binding', async () => {
  const result = await runtime.create({ principalId: 'agent:test', message: validMessage })
  assert.equal(result.verificationStatus, 'provider-acknowledged')
  assert.notEqual(result.verificationStatus, 'read-back-verified')
})
```

- [ ] **Step 2: Run the test and confirm current direct helper output lacks Activity evidence**

```powershell
Push-Location app
try { node --experimental-strip-types --test tests/ai-board.test.mjs tests/ai-board-activities.test.mjs } finally { Pop-Location }
```

- [ ] **Step 3: Implement only the reviewed adapter mapping**

`aiBoardActivities.ts` maps static definition IDs to existing adapter input/output. It must not contain endpoint URLs or call `fetch`; those remain in the manifest and Capability Runtime.

- [ ] **Step 4: Preserve self-declared child identity as contestable payload**

Require `eigenself`, `slice`, and `instance` for the child call. Attach mother Principal/Space lineage to the Activity record separately. Do not treat equality between child identity strings and mother Principal metadata as authentication.

- [ ] **Step 5: Test provider error and write-refresh separation**

```js
test('acknowledged write survives a failed list refresh', async () => {
  const created = await activities.create({ principalId: 'agent:test', message: validMessage })
  assert.equal(created.instance.status, 'completed')
  assert.equal(created.artifact.externalId, 'remote-1')
  await assert.rejects(() => activities.refresh({ principalId: 'agent:test' }), /maintenance/)
  assert.equal(store.get(created.instance.id).status, 'completed')
})
```

- [ ] **Step 6: Run all Board/capability tests**

```powershell
Push-Location app
try { node --experimental-strip-types --test 'tests/ai-board*.test.mjs' 'tests/capability*.test.mjs' } finally { Pop-Location }
```

- [ ] **Step 7: Commit the reviewed provider binding**

```powershell
git add -- app/src/core/aiBoard.ts app/src/core/aiBoardActivities.ts app/tests/ai-board.test.mjs app/tests/ai-board-activities.test.mjs
git commit -m "feat: bind AI Board activities through capability runtime"
```

---

### Task 7: Add the minimal Activity UI and return path

**Files:**
- Create: `app/src/components/ActivityCard.tsx`
- Create: `app/src/components/ActiveActivityStrip.tsx`
- Modify: `app/src/components/RemoteAiBoardPanel.tsx`
- Modify: `app/src/pages/BoardPage.tsx`
- Modify: `app/src/App.tsx`
- Modify: `app/src/styles.css`
- Test: `app/tests/activity-surface.test.mjs`
- Test: `app/tests/shell.test.mjs`

**Interfaces:**
- Consumes: static Activity definitions, current/uncertain instances, and Board Activity methods.
- Produces: discoverable cards, explicit outcome/verification state, resumable strip, and Return-to-Space control.

- [ ] **Step 1: Write failing view-model tests**

```js
test('Board Activity view model distinguishes provider health, outcome, and verification', () => {
  const model = getBoardActivityViewModel({ provider, instance, originSpace })
  assert.equal(model.providerHealth, 'healthy')
  assert.equal(model.activityStatus, 'completed')
  assert.equal(model.verificationStatus, 'provider-acknowledged')
  assert.equal(model.returnRoute, '/spaces/research')
})
```

- [ ] **Step 2: Run the focused test and confirm the view model is absent**

```powershell
Push-Location app
try { node --experimental-strip-types --test tests/activity-surface.test.mjs } finally { Pop-Location }
```

- [ ] **Step 3: Implement `ActivityCard` and `ActiveActivityStrip`**

Cards show label, provider, required permission, and availability. The strip shows only `active` and `uncertain` instances with Space and verification state. Neither component interprets child message content.

- [ ] **Step 4: Route existing Board controls through Activity methods**

Keep current Board read/create/reply inputs. Replace direct App-level orchestration with Activity Runtime calls and display the returned structured result. A post acknowledgement followed by refresh failure must show both facts.

- [ ] **Step 5: Add explicit Return-to-Space navigation**

Use the Activity instance `spaceId`; do not infer a generic home route. Return updates UI navigation without deleting or silently completing the Activity.

- [ ] **Step 6: Run core UI-model tests and TypeScript checks**

```powershell
Push-Location app
try {
  npm install
  node --experimental-strip-types --test tests/activity-surface.test.mjs tests/shell.test.mjs
  npm run typecheck
} finally { Pop-Location }
```

- [ ] **Step 7: Commit the surface**

```powershell
git add -- app/src/components/ActivityCard.tsx app/src/components/ActiveActivityStrip.tsx app/src/components/RemoteAiBoardPanel.tsx app/src/pages/BoardPage.tsx app/src/App.tsx app/src/styles.css app/tests/activity-surface.test.mjs app/tests/shell.test.mjs
git commit -m "feat: add first AI Board Activity surface"
```

---

### Task 8: Prove the complete vertical slice and package v0.2.0

**Files:**
- Create: `app/tests/first-activity-acceptance.test.mjs`
- Modify: `app/package.json`
- Modify: `README.md`
- Modify: `HANDOFF.md`
- Modify: `SNAPSHOT.json`
- Modify: `CHECKSUMS.sha256`
- Create: `validation/v0.2.0-verification.log`
- Create outside expanded source: `AI_Space_v0.2.0.zip`

**Interfaces:**
- Consumes: all tasks above.
- Produces: reload-safe acceptance evidence and an immutable v0.2.0 FULL snapshot suitable for the snapshot-first control repository.

- [ ] **Step 1: Write the end-to-end dependency-free acceptance test**

```js
test('first Activity survives Board action, reload, state export/restore, and return', async () => {
  const source = completeActivityFixture()
  const created = await source.runtime.create({ principalId: source.agent.id, message: validMessage })
  assert.equal(created.instance.status, 'completed')
  assert.equal(created.artifact.externalId, 'remote-message-1')

  const bundle = exportAuthoritativeAiSpaceStateBundle(source.storage, {
    appVersion: '0.2.0',
    createdAt: '2026-08-20T02:00:00.000Z',
    lineageIdFactory: () => 'lineage-v020',
  })
  assert.equal(bundle.schemaVersion, '1.2')

  restoreAiSpaceStateBundle(bundle, target.storage, target.auditOptions)
  const restored = target.activities.get(created.instance.id)
  assert.equal(restored.spaceId, source.space.id)
  assert.equal(target.audit().errorCount, 0)
  assert.equal(target.returnRoute(restored.id), `/spaces/${source.space.id}`)
})
```

- [ ] **Step 2: Prove the test fails before the final integration wiring**

Run the single test before wiring `App.tsx`, hardening sources, and state restore together. Expected failure must identify the missing integration, not a syntax or fixture error.

```powershell
Push-Location app
try { node --experimental-strip-types --test tests/first-activity-acceptance.test.mjs } finally { Pop-Location }
```

- [ ] **Step 3: Complete the minimal wiring and rerun the acceptance test**

Expected: one test, one pass, zero failures.

- [ ] **Step 4: Run the complete verification matrix**

```powershell
Push-Location app
try {
  node --experimental-strip-types --test 'tests/*.test.mjs'
  npm run typecheck
  npm run build
} finally { Pop-Location }
```

Expected: all core and new tests pass, TypeScript reports zero diagnostics, and Vite exits zero. Record exact counts rather than copying expected numbers into release prose.

- [ ] **Step 5: Run bounded publication scans**

```powershell
rg -n --hidden --text -e '(AKIA[0-9A-Z]{16}|gh[pousr]_[A-Za-z0-9_]{20,}|sk-[A-Za-z0-9]{20,}|-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----)' $sourceRoot
Get-ChildItem -LiteralPath $sourceRoot -Recurse -File | Where-Object {
  $_.Name -match '^(\.env($|\.)|id_rsa|id_ed25519|credentials?(\.|$)|secrets?(\.|$))' -or
  $_.Extension -match '^\.(pem|pfx|p12|key|kdbx)$'
}
```

Expected: no output. Review any hit; do not suppress it merely to pass the gate.

- [ ] **Step 6: Update release metadata and regenerate checksums**

Set application and snapshot version to `0.2.0`. Document existing/proposed distinctions, State Bundle `1.2`, test counts, build environment, and any network check separately. Regenerate `CHECKSUMS.sha256` only after all payload files are final.

- [ ] **Step 7: Package and independently verify the FULL ZIP**

```powershell
$release = 'D:\Ai\work together\AI_Space_development\AI_Space_v0.2.0.zip'
Compress-Archive -LiteralPath $sourceRoot -DestinationPath $release
$releaseHash = (Get-FileHash -LiteralPath $release -Algorithm SHA256).Hash.ToLowerInvariant()
```

Extract the release into a second new directory, run its bundled verifier and complete dependency-free suite, and compare its file set and hashes with the source tree.

- [ ] **Step 8: Commit the release source state locally**

```powershell
git add -- CHECKSUMS.sha256 HANDOFF.md README.md SNAPSHOT.json app docs validation
git commit -m "feat: complete first AI Board Activity vertical slice"
```

- [ ] **Step 9: Prepare the control-repository handoff**

Add the verified FULL ZIP, any byte-verified deltas, SHA-256, reconstruction evidence, and verification log to a new control-repository branch. Do not expand `app/` there. Create a draft PR that links the AI Board topic and Coordination Issue, and request Splice's cross-boundary review before readying or merging it.

---

## Plan self-review result

- Spec coverage: state evolution, Activity model/store, event/artifact lineage, runtime, provider binding, UI, acceptance, and snapshot-first release each have an explicit task.
- Scope: one provider and one vertical slice; broader AI Space areas remain excluded.
- Type consistency: Activity statuses, verification statuses, storage keys, definition IDs, and action names match the design spec.
- Safety: write uncertainty, no automatic retry, untrusted message content, child ownership, old bundle compatibility, and rollback all have tests before release.
- Execution gate: provider contract review by Splice remains an explicit prerequisite rather than an implied approval.
