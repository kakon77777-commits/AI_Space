# AI Space Snapshots

GitHub stores immutable handoff archives and verified deltas. Development does not occur by directly editing the expanded source tree here.

| Version | Date | Artifact | Base | Verification |
|---|---|---|---|---|
| v0.0.1 | 2026-08-18 | `AI_Space_v0.0.1_Handoff.tar.xz` | — | 9/9 core tests; manifest/ZIP pass. |
| v0.0.2 | 2026-08-18 | `AI_Space_v0.0.2_Handoff.tar.xz` | — | 16/16; byte-verified handoff. |
| v0.0.3 | 2026-08-19 | `CodeDelta` | v0.0.2 | 27/27; reconstruction verified. |
| v0.0.4 | 2026-08-19 | `CoreDelta + UIDelta` | v0.0.3 | 36/36; byte-verified. |
| v0.0.5 | 2026-08-19 | `CoreDelta + UIDelta` | v0.0.4 | Runtime Manager; reconstruction diff=0. |
| v0.0.6 | 2026-08-20 | `CoreDelta + AppDelta + SurfaceDelta` | v0.0.5 | 58/58; clean-extract/reconstruction pass. |
| v0.0.7 | 2026-08-20 | `CoreDelta + AppDelta + SurfaceCodeDelta + StyleDelta` | v0.0.6 | Projection Runtime; 72/72; diff=0. |
| v0.0.8 | 2026-08-20 | `CoreDelta + AppDelta + SurfaceCodeDelta + StyleDelta` | v0.0.7 | Browser Session Boundary; 81/81; diff=0. |
| v0.0.9 | 2026-08-20 | `Core + AppLogic + Registry + SpacesPage + ProjectionShell + Style` | v0.0.8 | Shared Space Context; 96/96; diff=0. |
| v0.1.0 | 2026-08-20 | `CoreRuntime + CoreTests + AppPatch + MvpPage + Registry + Style` | v0.0.9 | First Coherent MVP; 109/109; reload-safe 9-stage acceptance; diff=0. |
| v0.1.1 | 2026-08-20 | `NewCoreDelta + TestsDelta + CorePatchDelta + AppPatchDelta` | v0.1.0 | MVP Hardening / Audit; 120/120; deliberate-corruption recovery acceptance; 120-file FULL manifest; diff=0. |
| v0.1.2 | 2026-08-20 | `CoreDelta + TestsDelta + BackupPageDelta + CorePatchDelta + AppPatchDelta + SurfacePatchDelta` | v0.1.1 | Persistence Portability; 130/130; 128-file FULL manifest; full coherent bundle round-trip; diff=0. |
| **v0.1.3** | **2026-08-20** | `NewCoreDelta + TestsDelta + CorePatchDelta + AppPatchDelta + BackupPageDelta + StylePatchDelta` | v0.1.2 | **State Authority Contract + Migration Planner**; 146/146 core tests; offline TypeScript 0 diagnostics; 138-file immutable FULL manifest; clean-extract verifier/tests/typecheck PASS; schema 1.0 compatibility + schema 1.1 authority metadata; pure eight-relation planner; safe apply restricted to bootstrap/direct fast-forward; authority-commit rollback PASS; two-target A rev1→B bootstrap→A rev2→B fast-forward acceptance remains 9/9 coherent with hardening audit 0 errors; six-part reconstruction `app/ diff=0`. |

## v0.1.3 canonical handoff checksums

- `AI_Space_v0.1.3_NewCoreDelta.tar.xz` — SHA-256 `12c108b782f78b8e3841a2ed893f82e620d9a4df6e7aaf3ecde8245b83766dc7`; Git blob `333ba67a48ac6072416df382ad1d7eddb6ec374b`.
- `AI_Space_v0.1.3_TestsDelta.tar.xz` — SHA-256 `4a56ce25d66634270e01f3f35b93516670ec6a93b7be0fcfdc8050fe554f934c`; Git blob `bfdebe73187b90038088595200cb253a10698a2b`.
- `AI_Space_v0.1.3_CorePatchDelta.tar.xz` — SHA-256 `f15294b959ec243c65124b01b9c89b6e21b9af5af8d2279f01efe89b417381fa`; Git blob `b5e8a89633ac133d26f4943a6104507948968dcb`.
- `AI_Space_v0.1.3_AppPatchDelta.tar.xz` — SHA-256 `d29b60cdef09567f195f47027b7fcadc3c5ed42eb2cf4ebc110cbd72d0e27a5b`; Git blob `c88979323c6ccfca08b840f73ceda432350586dc`.
- `AI_Space_v0.1.3_BackupPageDelta.tar.xz` — SHA-256 `b19546de968b2129d58ee2012e247217bf81d268675243a7aafb8f8d0789aa73`; Git blob `5e1231e6aed3203440077be664e68589c1c98869`.
- `AI_Space_v0.1.3_StylePatchDelta.tar.xz` — SHA-256 `d95b1dba2e05089da63060e5dd9629715c6618040ed1793ed447293583d8ec8d`; Git blob `5fed0da6ac49f7f1c0e4ccc1d0f3ebe87681643d`.

## Reconstruct latest v0.1.3

First reconstruct v0.1.2 in version order, then:

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

That exact reconstruction was fresh-verified against the delivered v0.1.3 runnable `app/`; result: `diff=0`.

The evidence-complete v0.1.3 FULL ZIP is delivered separately in its development round and is intentionally not expanded into this repository. Production reachability and Vite build remain unverified in the DNS-restricted build container.
