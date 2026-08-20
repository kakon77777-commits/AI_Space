# AI Space

AI Space is developed **snapshot-first**: source is implemented and verified in the active local / AI workspace, delivered as an immutable FULL snapshot, and handed to GitHub only as compact byte-verified archives.

GitHub is intentionally a **control and handoff plane**, not the place where automated agents expand and edit the whole source tree file-by-file.

## Current snapshot

**AI Space v0.1.2 — Persistence Portability / Backup–Restore Gate**

v0.1.2 upgrades browser-local persistence into a portable, versioned state-transfer boundary without adding cloud sync.

```text
AI Space-owned storage keys
→ State Bundle schema 1.0
→ checksum / structure validation
→ isolated staged restore
→ v0.1.1 hardening audit
→ dry-run preview
→ rollback-safe replace restore
→ reload
```

Key properties:
- exact 19-key AI Space allowlist; unrelated browser localStorage is never exported or modified;
- deterministic `fnv1a32` fingerprint detects accidental corruption only — it is **not** cryptographic authentication;
- unsupported bundle schema versions fail closed;
- restore is staged in a fresh `MemoryStorageAdapter` and rejected if the invariant auditor reports errors;
- restore is replace-only for AI Space-owned keys; merge semantics are intentionally deferred;
- a target write failure rolls the allowlisted state back;
- `/backup` provides JSON export/download, validation/dry-run, and explicit restore/reload;
- a complete MVP Journey round-trips into fresh storage and remains 9/9 coherent after all stores are recreated.

## Reconstruct v0.1.2

First reconstruct v0.1.1 using `SNAPSHOTS.md`, then:

```bash
tar -xJf snapshots/AI_Space_v0.1.2_CoreDelta.tar.xz --strip-components=1 -C <project-root>
tar -xJf snapshots/AI_Space_v0.1.2_TestsDelta.tar.xz --strip-components=1 -C <project-root>
tar -xJf snapshots/AI_Space_v0.1.2_BackupPageDelta.tar.xz --strip-components=1 -C <project-root>
tar -xJf snapshots/AI_Space_v0.1.2_CorePatchDelta.tar.xz --strip-components=1 -C <project-root>
(cd <project-root> && patch --batch -p0 < patches/types.patch)
tar -xJf snapshots/AI_Space_v0.1.2_AppPatchDelta.tar.xz --strip-components=1 -C <project-root>
(cd <project-root> && patch --batch -p0 < patches/App.tsx.patch)
tar -xJf snapshots/AI_Space_v0.1.2_SurfacePatchDelta.tar.xz --strip-components=1 -C <project-root>
(cd <project-root> && patch --batch -p0 < patches/surface.patch)
```

That six-part handoff was fresh-reconstructed from v0.1.1 and compared against the delivered v0.1.2 runnable `app/`; result: `diff=0`.

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

The v0.1.2 build container still could not resolve the public AI Board hostname and `npm install` hit the explicit 25-second timeout. Production reachability, network-installed Vitest, and the Vite production build are therefore **not claimed as verified in that container**.
