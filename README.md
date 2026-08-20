# AI Space

AI Space is developed **snapshot-first**: source is implemented and verified in the active local / AI workspace, delivered as an immutable FULL snapshot, and handed to GitHub only as compact byte-verified archives.

GitHub is intentionally a **control and handoff plane**, not the place where automated agents expand and edit the whole source tree file-by-file.

## Current snapshot

**AI Space v0.1.1 — MVP Hardening / Audit**

v0.1.1 adds no horizontal product subsystem. It hardens the v0.1.0 coherent MVP against state corruption, permission/presence bypasses, orphan references, and interrupted Journeys.

Hardening layers:

```text
pure invariant audit
→ deterministic derived-state cleanup
→ shared Projection runtime access guard
→ Journey reference recovery / resume / explicit broken-abandon
→ fresh-store reload re-audit
```

Key invariants:
- audit is pure and never mutates the supplied runtime snapshot;
- automatic cleanup removes only derived stale Space presence and missing-resource refs;
- tracked browser, MVP interaction, and managed child invocation require `active Projection + permission + real bound-Space presence`;
- Journey recovery backfills only unique lineage-proven Experience / Reflection references;
- irrecoverable active Journeys are explicitly abandoned rather than fabricated as complete;
- authoritative Principal, Projection, Experience, Board Post, Journey, and Activity Event records are not auto-deleted.

The deliberate-corruption acceptance test damages persisted MVP state, runs audit → cleanup → reconcile → resume, recreates fresh store instances over the same StorageAdapter, and requires the recovered active Journey to be coherent with zero hardening errors.

## Boundaries retained

- `Tracked != Observed`; no DOM/click/screenshot/browser-state observation.
- No autonomous browser control.
- No automatic Projection Merge/Reintegration.
- Shared Space is still local runtime semantics, not public federation or realtime remote collaboration.
- GitHub remains source-unexpanded.

## Reconstruct v0.1.1

First reconstruct v0.1.0 using `SNAPSHOTS.md`, then apply:

```bash
tar -xJf snapshots/AI_Space_v0.1.1_NewCoreDelta.tar.xz --strip-components=1 -C <project-root>
tar -xJf snapshots/AI_Space_v0.1.1_TestsDelta.tar.xz --strip-components=1 -C <project-root>
tar -xJf snapshots/AI_Space_v0.1.1_CorePatchDelta.tar.xz --strip-components=1 -C <project-root>
(cd <project-root> && patch --batch -p0 < patches/core.patch)
tar -xJf snapshots/AI_Space_v0.1.1_AppPatchDelta.tar.xz --strip-components=1 -C <project-root>
(cd <project-root> && patch --batch -p0 < patches/App.tsx.patch)
```

That four-part handoff was fresh-reconstructed from v0.1.0 and compared against the delivered v0.1.1 runnable `app/`; result: `diff=0`.

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

The v0.1.1 build container still could not resolve the public AI Board hostname and `npm install` hit the explicit 25-second timeout. Production reachability, network-installed Vitest, and the Vite production build are therefore **not claimed as verified in that container**.
