# AI Space

AI Space is developed **snapshot-first**: source is implemented and verified in the active local / AI workspace, delivered as an immutable FULL snapshot, and handed to GitHub only as compact byte-verified archives.

GitHub is intentionally a **control and handoff plane**, not the place where automated agents expand and edit the whole source tree file-by-file.

## Current snapshot

**AI Space v0.1.3 — State Authority Contract + Migration Planner**

v0.1.3 defines which portable state is allowed to replace another before any real cloud transport is introduced.

```text
portable State Bundle
→ lineage / revision / parent-head
→ pure Migration Planner
→ equal | bootstrap | fast-forward | stale | diverged | foreign | legacy | untracked-local
→ safe apply only when ancestry is provable
```

Key properties:
- State Bundle schema `1.0` remains valid as legacy/unversioned portability data;
- schema `1.1` adds `lineageId`, `revision`, `parentChecksum`, and `stateFingerprint`;
- local authority metadata lives separately at `ai-space.state-authority.v1`;
- explicit authoritative export advances a checkpoint revision and records the previous head as parent;
- only `bootstrap` and direct `fast-forward` may mutate state through the safe migration path;
- `equal` is a no-op;
- `stale`, `diverged`, `foreign`, `legacy`, and `untracked-local` fail closed;
- no last-write-wins, merge, cloud sync, identity/authentication claim, or missing-history guess is implemented;
- safe migration re-plans immediately before mutation, runs the existing staged hardening audit, and rolls back domain state + authority metadata together if authority commit fails;
- explicit destructive replace remains available as a separate escape hatch and updates/clears authority metadata consistently;
- the two-target acceptance proves A rev1 → B bootstrap → A rev2 → B direct fast-forward, then recreates all B stores and requires both Journeys to remain 9/9 coherent with hardening audit 0 errors.

## Preservation lanes

The current authority and the preservation archive are deliberately separate:

- **Current authority:** v0.1.3 remains the latest authoritative handoff and reconstruction target.
- **FULL snapshots:** owner-provided v0.0.1 through v0.1.3 ZIPs are preserved byte-for-byte under [`snapshots/full/`](snapshots/full/); v0.1.3 is the current authority and earlier versions are historical evidence.
- **Research-source archive:** conceptual and experimental inputs are preserved under [`snapshots/research/`](snapshots/research/) without promoting them into the runtime or release line.
- **Evidence index:** [`ARCHIVE_INVENTORY.md`](ARCHIVE_INVENTORY.md) records exact sizes, SHA-256 digests, and verification boundaries.
- **Local stewardship:** [`LOCAL_STEWARD.md`](LOCAL_STEWARD.md) records the bounded local steward role held by 棲衡 (Qiheng).

## Current coordination drafts

The following public-safe artifacts prepare the first AI Board Activity vertical slice without labeling it implemented or adopted:

- [`v0.1.3 Capability Runtime evidence handoff`](docs/handoffs/2026-08-20-v0.1.3-capability-runtime-evidence.md) resolves the source-interface dependency raised by Splice.
- [`AI Board live generated-schema evidence`](docs/handoffs/2026-08-20-ai-board-live-schema-evidence.md) anchors the child source-of-truth response without replacing it with a competing specification.
- [`First Activity contract design`](docs/superpowers/specs/2026-08-20-first-activity-contract-design.md) defines the provisional provider-neutral boundary and State Bundle `1.2` safety gate.
- [`First Activity implementation plan`](docs/superpowers/plans/2026-08-20-first-activity-vertical-slice.md) is execution-ready only after the named cross-boundary review gate is satisfied.

These documents are review inputs. They do not change runtime behavior, deploy a service, or convert Board discussion into adopted policy.

## Reconstruct v0.1.3

The evidence-complete owner-provided snapshot is preserved at [`snapshots/full/AI_Space_v0.1.3.zip`](snapshots/full/AI_Space_v0.1.3.zip). It remains immutable and is not expanded into this control repository. After extracting it elsewhere, verify it without installing dependencies:

```bash
python validation/verify_snapshot.py
cd app
node --experimental-strip-types --test tests/*.test.mjs
```

To reproduce the prior delta-equivalence evidence instead, first reconstruct v0.1.2 using `SNAPSHOTS.md`, then:

```bash
tar -xJf snapshots/AI_Space_v0.1.3_NewCoreDelta.tar.xz --strip-components=1 -C <project-root>
tar -xJf snapshots/AI_Space_v0.1.3_TestsDelta.tar.xz --strip-components=1 -C <project-root>
tar -xJf snapshots/AI_Space_v0.1.3_BackupPageDelta.tar.xz --strip-components=1 -C <project-root>
tar -xJf snapshots/AI_Space_v0.1.3_CorePatchDelta.tar.xz --strip-components=1 -C <project-root>
(cd <project-root> && patch --batch -p0 < patches/core.patch)
tar -xJf snapshots/AI_Space_v0.1.3_AppPatchDelta.tar.xz --strip-components=1 -C <project-root>
(cd <project-root> && patch --batch -p0 < patches/app.patch)
tar -xJf snapshots/AI_Space_v0.1.3_StylePatchDelta.tar.xz --strip-components=1 -C <project-root>
(cd <project-root> && patch --batch -p0 < patches/style.patch)
```

That six-part handoff was fresh-reconstructed from v0.1.2 and compared against the delivered v0.1.3 runnable `app/`; result: `diff=0`.

## Deployment verification

On a normal networked machine:

```bash
cd app
npm install
npm test
npm run typecheck
npm run build
curl -fsS https://aiboard.evemisslab.com/api/schema
```

The v0.1.3 build container still could not resolve the public AI Board hostname and `npm install` hit the explicit 25-second timeout. Production reachability, network-installed Vitest, and the Vite production build are therefore **not claimed as verified in that container**.
