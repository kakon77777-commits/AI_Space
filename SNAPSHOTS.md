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
| **v0.1.2** | **2026-08-20** | `CoreDelta + TestsDelta + BackupPageDelta + CorePatchDelta + AppPatchDelta + SurfacePatchDelta` | v0.1.1 | **Persistence Portability / Backup–Restore Gate**; 130/130 core tests; offline TypeScript 0 diagnostics; 128-file immutable FULL manifest; clean-extract verifier/tests/typecheck PASS; complete MVP Journey bundle round-trip into fresh storage remains 9/9 coherent with hardening audit 0 errors; staged restore audit, unrelated-key preservation, dry-run no-side-effect and rollback-on-write-failure PASS; v0.1.1 + six-part handoff reconstruction `app/ diff=0`. |

## v0.1.2 canonical handoff checksums

- `AI_Space_v0.1.2_CoreDelta.tar.xz` — SHA-256 `4183f2e709b8471514036798eaf6102d57da286eb4183d2675ddb9177420dfd6`; Git blob `31d69e00dbf9d285d5f9e85ed001f0b35241144f`.
- `AI_Space_v0.1.2_TestsDelta.tar.xz` — SHA-256 `214059b29985885b0eab0735618a5f210a4368e14ef810f2b47ecc8a5751ca54`; Git blob `cf8b5c0bc20d6ffa8032723cc606382a4bb2ea25`.
- `AI_Space_v0.1.2_BackupPageDelta.tar.xz` — SHA-256 `51b97f2d65bad014f7d8614817949d40904ccee1b6c3c64aa4d884e1b2f66ae5`; Git blob `11ea01a8c5c7deaba86f34d27d1998c77d845388`.
- `AI_Space_v0.1.2_CorePatchDelta.tar.xz` — SHA-256 `9f67994ec5fc6312f89446c9caea8a57155476d144f4c22ac350516be4061f4d`; Git blob `73c3b8323261ee3193b9f5c90f968682b569542f`.
- `AI_Space_v0.1.2_AppPatchDelta.tar.xz` — SHA-256 `db21fb20df23edac6600d09b367b8a95f3258b746c9411594627321457511c09`; Git blob `fe8c5c84867c1c773882325bcddf333af72eccf8`.
- `AI_Space_v0.1.2_SurfacePatchDelta.tar.xz` — SHA-256 `dd715c6d21958ae95e91bfdd691b994f12791a05e2adc10556c9391f4dd33268`; Git blob `8e57a47dbb99b4fde24291fe7c1ae65d032e4bd3`.

## Reconstruct latest v0.1.2

First reconstruct v0.1.1 in version order, then:

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

That exact reconstruction was fresh-verified against the delivered v0.1.2 runnable `app/`; result: `diff=0`.

The evidence-complete v0.1.2 FULL ZIP is delivered separately in its development round and is intentionally not expanded into this repository. Production reachability and Vite build remain unverified in the DNS-restricted build container.
