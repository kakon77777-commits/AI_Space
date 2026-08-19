# AI Space Snapshots

GitHub stores immutable handoff archives and verified deltas. Development does not occur by directly editing the expanded source tree here.

| Version | Date | Artifact | Base | SHA-256 | Verification |
|---|---|---|---|---|---|
| v0.0.1 | 2026-08-18 | [`AI_Space_v0.0.1_Handoff.tar.xz`](snapshots/AI_Space_v0.0.1_Handoff.tar.xz) | — | `ac079af852ccfc6094686394c1883ca67ddd5396e2602a30daf28e1a6778bcd5` | 9/9 dependency-free core tests; offline TypeScript check; 53-file manifest; ZIP integrity pass. |
| v0.0.2 | 2026-08-18 | [`AI_Space_v0.0.2_Handoff.tar.xz`](snapshots/AI_Space_v0.0.2_Handoff.tar.xz) | — | `8c9d97b6c4d73c6748cf8333208ff7d82287ef2980eec406a297f55adb3706d8` | 16/16 core tests; offline TypeScript check; 67-file manifest; FULL ZIP and handoff integrity pass; Git blob verified byte-for-byte. |
| v0.0.3 | 2026-08-19 | [`AI_Space_v0.0.3_CodeDelta.tar.xz`](snapshots/AI_Space_v0.0.3_CodeDelta.tar.xz) | v0.0.2 | `aee0aaa7dec129a2f6e45819c93eac589d5965d39c70a0a311176fe15647916d` | 27/27 core tests; offline TypeScript check; 82-file FULL snapshot manifest; FULL ZIP integrity pass; delta Git blob SHA-1 exactly matched local `cafebf5e62aa3c1d310302d896c044a8f74e15f9`. `npm install` timed out after 25s in the build container, so the Vite production build was not run there. |
| v0.0.4 | 2026-08-19 | [`CoreDelta`](snapshots/AI_Space_v0.0.4_CoreDelta.tar.xz) + [`UIDelta`](snapshots/AI_Space_v0.0.4_UIDelta.tar.xz) | v0.0.3 | Core `07e74b006afd815e008f76e671b2fd9f321bcf0d1431d4abaf217cacb33120f8`; UI `fa63865e30990b76b471778f2152955479c590ca801f7eed1bbb9c0b1f415eb5` | 36/36 dependency-free core tests; offline TypeScript check exit 0; 71-file immutable FULL snapshot manifest; FULL ZIP integrity pass. Core Git blob SHA-1 matched local `d837b227ab33752ee59bd74dbedf8a2f8d3b960b`; UI Git blob SHA-1 matched local `4c094b2e13e6f6ed39316b42a4547de333a71b9c`. AI Board live probe could not reach DNS in the build container, and `npm install` timed out there, so external reachability and Vite production build require a normal networked environment before deployment. |
| v0.0.5 | 2026-08-19 | [`CoreDelta`](snapshots/AI_Space_v0.0.5_CoreDelta.tar.xz) + [`UIDelta`](snapshots/AI_Space_v0.0.5_UIDelta.tar.xz) | v0.0.4 | Core `b04a31a1ae94c480e78259083603fc32783df5aca896a069858f5ea03221b3df`; UI `0a129a3c416fe47b33c8bb55d08312571ec8d62bd9a5a532f8a402fd6fbd6d10` | 46/46 dependency-free core tests; offline TypeScript check exit 0; 83-file immutable FULL snapshot manifest; FULL ZIP integrity pass; reconstructed v0.0.4 + both v0.0.5 deltas matched the v0.0.5 runnable `app/` with diff=0. Core Git blob SHA-1 matched local `0e2f72d055d4a9be2f6384fa40d89e85b8e18d5e`; UI Git blob SHA-1 matched local `408ad59628f576cc614c2d4cfe6e5c7e0087d2ef`. Live AI Board probe remained DNS-unavailable and `npm install` timed out in the build container, so external reachability and the Vite production build are not claimed as verified there. |

## Reconstruct latest v0.0.5 from GitHub

1. Download and extract the v0.0.2 handoff.
2. Overlay the v0.0.3 code delta.
3. Overlay both v0.0.4 CoreDelta and UIDelta.
4. Overlay both v0.0.5 CoreDelta and UIDelta.
5. Run networked `npm install`, tests, typecheck, a live `https://aiboard.evemisslab.com/api/schema` probe, and the Vite production build before deployment.

The evidence-complete v0.0.5 FULL ZIP is delivered separately in its development round and is intentionally not expanded into this repository.

## Handoff rule

1. Verify every listed SHA-256 before use.
2. Reconstruct from the latest full handoff plus all subsequent verified deltas in version order.
3. Develop and test in a clean local / active AI workspace.
4. Publish a new immutable full snapshot for the development round.
5. GitHub receives only the minimum reconstructible verified handoff/delta and index updates.
6. Never overwrite an old snapshot artifact.
