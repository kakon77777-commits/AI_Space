# AI Space Snapshots

GitHub stores immutable handoff archives and verified deltas. Development does not occur by directly editing the expanded source tree here.

| Version | Date | Artifact | Base | SHA-256 | Verification |
|---|---|---|---|---|---|
| v0.0.1 | 2026-08-18 | [`AI_Space_v0.0.1_Handoff.tar.xz`](snapshots/AI_Space_v0.0.1_Handoff.tar.xz) | — | `ac079af852ccfc6094686394c1883ca67ddd5396e2602a30daf28e1a6778bcd5` | 9/9 dependency-free core tests; offline TypeScript check; 53-file manifest; ZIP integrity pass. |
| v0.0.2 | 2026-08-18 | [`AI_Space_v0.0.2_Handoff.tar.xz`](snapshots/AI_Space_v0.0.2_Handoff.tar.xz) | — | `8c9d97b6c4d73c6748cf8333208ff7d82287ef2980eec406a297f55adb3706d8` | 16/16 core tests; offline TypeScript check; 67-file manifest; FULL ZIP and handoff integrity pass; Git blob verified byte-for-byte. |
| v0.0.3 | 2026-08-19 | [`CodeDelta`](snapshots/AI_Space_v0.0.3_CodeDelta.tar.xz) | v0.0.2 | `aee0aaa7dec129a2f6e45819c93eac589d5965d39c70a0a311176fe15647916d` | 27/27 core tests; offline TypeScript; 82-file FULL manifest; ZIP integrity; byte-verified Git blob. |
| v0.0.4 | 2026-08-19 | [`CoreDelta`](snapshots/AI_Space_v0.0.4_CoreDelta.tar.xz) + [`UIDelta`](snapshots/AI_Space_v0.0.4_UIDelta.tar.xz) | v0.0.3 | Core `07e74b006afd815e008f76e671b2fd9f321bcf0d1431d4abaf217cacb33120f8`; UI `fa63865e30990b76b471778f2152955479c590ca801f7eed1bbb9c0b1f415eb5` | 36/36 tests; offline TypeScript; 71-file FULL manifest; ZIP integrity; both Git blobs byte-verified. |
| v0.0.5 | 2026-08-19 | [`CoreDelta`](snapshots/AI_Space_v0.0.5_CoreDelta.tar.xz) + [`UIDelta`](snapshots/AI_Space_v0.0.5_UIDelta.tar.xz) | v0.0.4 | Core `b04a31a1ae94c480e78259083603fc32783df5aca896a069858f5ea03221b3df`; UI `0a129a3c416fe47b33c8bb55d08312571ec8d62bd9a5a532f8a402fd6fbd6d10` | Runtime Manager; original GitHub freeze 46/46; byte-verified deltas; reconstruction diff=0. |
| v0.0.6 | 2026-08-20 | [`CoreDelta`](snapshots/AI_Space_v0.0.6_CoreDelta.tar.xz) + [`AppDelta`](snapshots/AI_Space_v0.0.6_AppDelta.tar.xz) + [`SurfaceDelta`](snapshots/AI_Space_v0.0.6_SurfaceDelta.tar.xz) | v0.0.5 | Core `3c7086004d9f06e5ca7303e3bbff944f352128409ea214545a5e01bb3cbbb0c0`; App `66117d272bab880353a6acb540d27f426e0b5ec0fe4b2d1e0b8b665b6ed3f901`; Surface `919d223b07287d474d8eaf36f9773a38bcbe09fb2f2700bdd7d3443b207a4da6` | 58/58 tests; offline TypeScript; 92-file FULL manifest; clean-extract verification; reconstruction diff=0; all blobs byte-verified. |
| v0.0.7 | 2026-08-20 | [`CoreDelta`](snapshots/AI_Space_v0.0.7_CoreDelta.tar.xz) + [`AppDelta`](snapshots/AI_Space_v0.0.7_AppDelta.tar.xz) + [`SurfaceCodeDelta`](snapshots/AI_Space_v0.0.7_SurfaceCodeDelta.tar.xz) + [`StyleDelta`](snapshots/AI_Space_v0.0.7_StyleDelta.tar.xz) | v0.0.6 | Core `fa7c890e896243ec8979a9ba6b13688eebf92b8e736cecdf9191835a9c1c6271`; App `e9599bfe9daf496e77b1467749f64cb979c93dd0ff8b2e4b05113aca33e2a101`; SurfaceCode `828552ba6316628083e86d9aa9bc30671b503de4e5ddbb81f65abb3cb6160329`; Style `d3cae06d077c991d782522b9748cb316236462d9729432e818bb401a25b3ddd8` | Projection Runtime; 72/72 tests; offline TypeScript; 105-file FULL manifest; clean-extract verification; four-delta reconstruction diff=0; all blobs byte-verified. |
| v0.0.8 | 2026-08-20 | [`CoreDelta`](snapshots/AI_Space_v0.0.8_CoreDelta.tar.xz) + [`AppDelta`](snapshots/AI_Space_v0.0.8_AppDelta.tar.xz) + [`SurfaceCodeDelta`](snapshots/AI_Space_v0.0.8_SurfaceCodeDelta.tar.xz) + [`StyleDelta`](snapshots/AI_Space_v0.0.8_StyleDelta.tar.xz) | v0.0.7 | Core `d35127fe374b71d48c789d0375090e5de88dad74d1f115eac4b964b0d0de5c4b`; App `c0eb4fbe95be111cdcd82a757c54089578c4cfaedd5be42472aaa358fe1b4df9`; SurfaceCode `fe57e8c1620e3269fdd8f516a746247b85fe0289e8891b767b467156ca0edcb8`; Style `9f92969a2d4cfc98c68a9b71560aea4cfe3a8943b4ce96d140a8b8cdb6aff047` | AI Arcade + Browser Session Boundary; 81/81 dependency-free core tests; offline TypeScript exit 0; 99-file immutable FULL snapshot manifest; FULL ZIP clean-extract verifier/tests/typecheck PASS; v0.0.7 + all four v0.0.8 deltas matched delivered `app/` with `diff=0`; Git blobs matched local `5607441978efaba5c4297176314798c78eef2813`, `e4bf28b876380fd872d573a21a6ffa1747cc1d37`, `430ff377964c99169a3b315f06872ed8cc416d06`, `a8cbb9df23b46fc0e5d4921fb76498389671c1c0`. Tracked Browser Session is an explicit lifecycle boundary, not DOM/browser observation or sandbox automation. Live AI Board probe remained DNS-unavailable and `npm install` timed out in the build container; production reachability and Vite build are not claimed there. |

## Reconstruct latest v0.0.8 from GitHub

1. Download and extract the v0.0.2 handoff as the project root.
2. Apply every later delta in version order with `--strip-components=1`.
3. After the v0.0.7 chain, apply v0.0.8:

```bash
tar -xJf snapshots/AI_Space_v0.0.8_CoreDelta.tar.xz --strip-components=1 -C <project-root>
tar -xJf snapshots/AI_Space_v0.0.8_AppDelta.tar.xz --strip-components=1 -C <project-root>
tar -xJf snapshots/AI_Space_v0.0.8_SurfaceCodeDelta.tar.xz --strip-components=1 -C <project-root>
tar -xJf snapshots/AI_Space_v0.0.8_StyleDelta.tar.xz --strip-components=1 -C <project-root>
```

4. That exact four-delta overlay was fresh-reconstructed from v0.0.7 and compared against the delivered v0.0.8 runnable `app/`; result: `diff=0`.
5. Run networked `npm install`, tests, typecheck, a live AI Board probe, and the Vite production build before deployment.

The evidence-complete v0.0.8 FULL ZIP is delivered separately in its development round and is intentionally not expanded into this repository.

## Handoff rule

1. Verify every listed SHA-256 before use.
2. Reconstruct from the latest full handoff plus all subsequent verified deltas in version order.
3. Develop and test in a clean local / active AI workspace.
4. Publish a new immutable full snapshot for the development round.
5. GitHub receives only the minimum reconstructible verified handoff/delta and index updates.
6. Never overwrite an old snapshot artifact.
