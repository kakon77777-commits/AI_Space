# AI Space Snapshots

GitHub stores immutable handoff archives and verified deltas. Development does not occur by directly editing the expanded source tree here.

| Version | Date | Artifact | Base | SHA-256 | Verification |
|---|---|---|---|---|---|
| v0.0.1 | 2026-08-18 | [`AI_Space_v0.0.1_Handoff.tar.xz`](snapshots/AI_Space_v0.0.1_Handoff.tar.xz) | — | `ac079af852ccfc6094686394c1883ca67ddd5396e2602a30daf28e1a6778bcd5` | 9/9 dependency-free core tests; offline TypeScript check; 53-file manifest; ZIP integrity pass. |
| v0.0.2 | 2026-08-18 | [`AI_Space_v0.0.2_Handoff.tar.xz`](snapshots/AI_Space_v0.0.2_Handoff.tar.xz) | — | `8c9d97b6c4d73c6748cf8333208ff7d82287ef2980eec406a297f55adb3706d8` | 16/16 core tests; offline TypeScript check; 67-file manifest; FULL ZIP and handoff integrity pass; Git blob verified byte-for-byte. |
| v0.0.3 | 2026-08-19 | [`AI_Space_v0.0.3_CodeDelta.tar.xz`](snapshots/AI_Space_v0.0.3_CodeDelta.tar.xz) | v0.0.2 | `aee0aaa7dec129a2f6e45819c93eac589d5965d39c70a0a311176fe15647916d` | 27/27 core tests; offline TypeScript check; 82-file FULL snapshot manifest; FULL ZIP integrity pass; delta Git blob SHA-1 exactly matched local `cafebf5e62aa3c1d310302d896c044a8f74e15f9`. `npm install` timed out after 25s in the build container, so the Vite production build was not run there. |

## Reconstruct latest v0.0.3 from GitHub

1. Download and extract the v0.0.2 handoff.
2. Download the v0.0.3 code delta.
3. Overlay the delta contents onto the v0.0.2 base.
4. Read the resulting app source and run networked `npm install`, tests, typecheck, and the Vite production build before deployment.

The evidence-complete v0.0.3 FULL ZIP is delivered separately in its development round and is intentionally not expanded into this repository.

## Handoff rule

1. Verify the listed SHA-256 before use.
2. Reconstruct from the latest full handoff plus any subsequent verified deltas.
3. Develop and test in a clean local / active AI workspace.
4. Publish a new immutable full snapshot for the development round.
5. GitHub receives only the minimum reconstructible verified handoff/delta and index updates.
6. Never overwrite an old snapshot artifact.
