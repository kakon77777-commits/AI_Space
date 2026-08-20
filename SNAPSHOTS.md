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
| **v0.1.3** | **2026-08-20** | `FULL ZIP + NewCoreDelta + TestsDelta + CorePatchDelta + AppPatchDelta + BackupPageDelta + StylePatchDelta` | v0.1.2 | **State Authority Contract + Migration Planner**; 146/146 core tests; offline TypeScript 0 diagnostics; 138-file immutable FULL manifest; clean-extract verifier/tests/typecheck PASS; schema 1.0 compatibility + schema 1.1 authority metadata; pure eight-relation planner; safe apply restricted to bootstrap/direct fast-forward; authority-commit rollback PASS; two-target A rev1→B bootstrap→A rev2→B fast-forward acceptance remains 9/9 coherent with hardening audit 0 errors; six-part reconstruction `app/ diff=0`. |

## Preserved FULL ZIPs

These are byte-identical copies of the owner-provided local FULL snapshots. Each ZIP's internal `CHECKSUMS.sha256` was checked against every payload file before publication. v0.0.1 through v0.1.2 are historical preservation artifacts; v0.1.3 is the current authority handoff.

| Version | Artifact | Bytes | SHA-256 |
|---|---|---:|---|
| v0.0.1 | [`snapshots/full/AI_Space_v0.0.1.zip`](snapshots/full/AI_Space_v0.0.1.zip) | 72,008 | `ac4785b022fa9b1688dc4493524f37cb9c5d1f8b34d01ffeff3f4ea5df4c6921` |
| v0.0.2 | [`snapshots/full/AI_Space_v0.0.2.zip`](snapshots/full/AI_Space_v0.0.2.zip) | 89,213 | `7e40f2a0108cfa4f3add0a00d1d379d57ff5a686d525745e15cf4c5c92204f58` |
| v0.0.3 | [`snapshots/full/AI_Space_v0.0.3.zip`](snapshots/full/AI_Space_v0.0.3.zip) | 111,933 | `51a3ebd54d1faeb676df98853719e2f827bd0862950f0a30bb1757814f919219` |
| v0.0.4 | [`snapshots/full/AI_Space_v0.0.4.zip`](snapshots/full/AI_Space_v0.0.4.zip) | 114,013 | `ce139616c18a5ccaf24c4bd4a2e05ec84c0d87dd6f70c8cd686b266cd018955d` |
| v0.0.5 | [`snapshots/full/AI_Space_v0.0.5.zip`](snapshots/full/AI_Space_v0.0.5.zip) | 123,425 | `af286834a9ea13272ceaa65399e6cb02c5a83ab32e803d8c1d9731a4a3a4e9ba` |
| v0.0.6 | [`snapshots/full/AI_Space_v0.0.6.zip`](snapshots/full/AI_Space_v0.0.6.zip) | 167,913 | `91870c47860b608457ef118bb31c915e5e41af9a402f5c93e238fa46c18e1256` |
| v0.0.7 | [`snapshots/full/AI_Space_v0.0.7.zip`](snapshots/full/AI_Space_v0.0.7.zip) | 176,762 | `90f0d1518242abdca7cb7292dbd00542277340e43088378d0ecf48a897fcbec7` |
| v0.0.8 | [`snapshots/full/AI_Space_v0.0.8.zip`](snapshots/full/AI_Space_v0.0.8.zip) | 186,448 | `a98a93559d078260bff5e17bf60e963f9ac1b4ae9201d644ccef34c97691bf04` |
| v0.0.9 | [`snapshots/full/AI_Space_v0.0.9.zip`](snapshots/full/AI_Space_v0.0.9.zip) | 190,029 | `e9ebede1032603fe01a96e32fdbede962c06786af497fd6f5cc2595bee68fce8` |
| v0.1.0 | [`snapshots/full/AI_Space_v0.1.0.zip`](snapshots/full/AI_Space_v0.1.0.zip) | 214,597 | `3d2b7276eecac6562d54e4de48e252461655ab98393dcfdb81c8cc956815a676` |
| v0.1.1 | [`snapshots/full/AI_Space_v0.1.1.zip`](snapshots/full/AI_Space_v0.1.1.zip) | 215,335 | `f918aa33a9cb3c52acec6a5e7e101184da337ed85b7e3b65198288bfa5e1b031` |
| v0.1.2 | [`snapshots/full/AI_Space_v0.1.2.zip`](snapshots/full/AI_Space_v0.1.2.zip) | 242,610 | `8c79a82f58199ce8222b6073c2159b7cb8d5407770881e329bb0c810462dd9a7` |
| **v0.1.3** | [`snapshots/full/AI_Space_v0.1.3.zip`](snapshots/full/AI_Space_v0.1.3.zip) | 250,874 | `ab05718f118e968a4b3637f955ad69a04b000c1ba02c6b8fa702783a901c74b4` |

## Preserved research source

[`snapshots/research/AI_Space_Research_Source_2026-08-20.zip`](snapshots/research/AI_Space_Research_Source_2026-08-20.zip) preserves seven conceptual, validation, and experimental inputs plus an archive README. Its SHA-256 is `09983ea78f0595e37e11f0f01fc8dd97d1fdf08d184cd11f739a5466fb9f5a4d`; its internal manifest verifies all eight payload files. See [`ARCHIVE_INVENTORY.md`](ARCHIVE_INVENTORY.md) for scope and interpretation boundaries.

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

The evidence-complete owner-provided v0.1.3 FULL ZIP is preserved at `snapshots/full/AI_Space_v0.1.3.zip` and is intentionally not expanded into this repository. The six deltas remain as independent reconstruction-equivalence evidence. Production reachability and the Vite build remain unverified in the original DNS-restricted build container.
