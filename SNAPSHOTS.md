# AI Space Snapshots

GitHub stores immutable handoff archives and verified deltas. Development does not occur by directly editing the expanded source tree here.

| Version | Date | Artifact | Base | SHA-256 | Verification |
|---|---|---|---|---|---|
| v0.0.1 | 2026-08-18 | `AI_Space_v0.0.1_Handoff.tar.xz` | — | `ac079af852ccfc6094686394c1883ca67ddd5396e2602a30daf28e1a6778bcd5` | 9/9 core tests; offline TypeScript; manifest/ZIP pass. |
| v0.0.2 | 2026-08-18 | `AI_Space_v0.0.2_Handoff.tar.xz` | — | `8c9d97b6c4d73c6748cf8333208ff7d82287ef2980eec406a297f55adb3706d8` | 16/16 core tests; byte-verified handoff. |
| v0.0.3 | 2026-08-19 | `AI_Space_v0.0.3_CodeDelta.tar.xz` | v0.0.2 | `aee0aaa7dec129a2f6e45819c93eac589d5965d39c70a0a311176fe15647916d` | 27/27; reconstruction verified. |
| v0.0.4 | 2026-08-19 | `CoreDelta + UIDelta` | v0.0.3 | Core `07e74b006afd815e008f76e671b2fd9f321bcf0d1431d4abaf217cacb33120f8`; UI `fa63865e30990b76b471778f2152955479c590ca801f7eed1bbb9c0b1f415eb5` | 36/36; both blobs byte-verified. |
| v0.0.5 | 2026-08-19 | `CoreDelta + UIDelta` | v0.0.4 | Core `b04a31a1ae94c480e78259083603fc32783df5aca896a069858f5ea03221b3df`; UI `0a129a3c416fe47b33c8bb55d08312571ec8d62bd9a5a532f8a402fd6fbd6d10` | Runtime Manager; reconstruction diff=0. |
| v0.0.6 | 2026-08-20 | `CoreDelta + AppDelta + SurfaceDelta` | v0.0.5 | Core `3c7086004d9f06e5ca7303e3bbff944f352128409ea214545a5e01bb3cbbb0c0`; App `66117d272bab880353a6acb540d27f426e0b5ec0fe4b2d1e0b8b665b6ed3f901`; Surface `919d223b07287d474d8eaf36f9773a38bcbe09fb2f2700bdd7d3443b207a4da6` | 58/58; clean-extract/reconstruction pass. |
| v0.0.7 | 2026-08-20 | `CoreDelta + AppDelta + SurfaceCodeDelta + StyleDelta` | v0.0.6 | Core `fa7c890e896243ec8979a9ba6b13688eebf92b8e736cecdf9191835a9c1c6271`; App `e9599bfe9daf496e77b1467749f64cb979c93dd0ff8b2e4b05113aca33e2a101`; SurfaceCode `828552ba6316628083e86d9aa9bc30671b503de4e5ddbb81f65abb3cb6160329`; Style `d3cae06d077c991d782522b9748cb316236462d9729432e818bb401a25b3ddd8` | Projection Runtime; 72/72; diff=0. |
| v0.0.8 | 2026-08-20 | `CoreDelta + AppDelta + SurfaceCodeDelta + StyleDelta` | v0.0.7 | Core `d35127fe374b71d48c789d0375090e5de88dad74d1f115eac4b964b0d0de5c4b`; App `c0eb4fbe95be111cdcd82a757c54089578c4cfaedd5be42472aaa358fe1b4df9`; SurfaceCode `fe57e8c1620e3269fdd8f516a746247b85fe0289e8891b767b467156ca0edcb8`; Style `9f92969a2d4cfc98c68a9b71560aea4cfe3a8943b4ce96d140a8b8cdb6aff047` | Browser Session Boundary; 81/81; diff=0. |
| v0.0.9 | 2026-08-20 | `Core + AppLogic + Registry + SpacesPage + ProjectionShell + Style` | v0.0.8 | Core `9a4b9de504690c616e336f746533764cc0182abf67e56bb9346f6fec2d8d76a8`; AppLogic `9d7e31c5a2b2781d8daa8a2a3afc3b83e746e6d5f0d0c14f260263076009cbfd`; Registry `de46876e8f337ba22858223cd60636942e1ccf075817d089a110f1bcb4711a84`; SpacesPage `f34926f0c8f5b228ac472242c97e9e50c6cf02fc645e1c2ea95165813743c319`; ProjectionShell `f67fc3a91ead6b347c468fa49a085eb6908752eaf32fd42a103bd75cf77ec2c8`; Style `3c5c46f791425f0d38a360597b643f519497574bf052e14e861bed07de1fa8d4` | Shared Space Context; 96/96; diff=0. |
| v0.1.0 | 2026-08-20 | `CoreRuntime + CoreTests + AppPatch + MvpPage + Registry + Style` | v0.0.9 | CoreRuntime `4b6adc6ff4c80c2253c0efcb34152c76a3fb1cbef104136a35bbe45c4b8bd90e`; CoreTests `bd6f423a26e61d6c3523b6d22067ff96a4fb6101da0bbfc2ca069fc9ec55beb5`; AppPatch `474c27927484f8370ffc13c54f839bd367653ded36cbcfbc62cb3ff1e2b0da20`; MvpPage `cc4fc9cd7ff95f8eaa081d157ed84b19f372a8798278744d6e11363d2197b286`; Registry `6c3f7f459e038744f5388482f895ed19bf2c3766cc8595e36bb9bc6d0cf3df76`; Style `0f95f926709a22043f2d6f1a2949f937e026a98379088861dce0091a217cdb34` | First Coherent MVP; 109/109; reload-safe 9-stage acceptance; diff=0. |
| **v0.1.1** | **2026-08-20** | `NewCoreDelta + TestsDelta + CorePatchDelta + AppPatchDelta` | v0.1.0 | NewCore `402efc6379ca48b97aa3098ce781f826ca314f16d815355b106a9b99bbccac76`; Tests `aae493d845eed776019bb3220ce1292ed735759503e22205d0abe35c06ea7c2a`; CorePatch `6115c16c1c8c24c9513a95fbc102ce5a4e8e8666c576aca8b096769c345a417e`; AppPatch `11d8084cc04dbc5e6eb2640de5af7b720de252f5831944a7e154989cae477a2d` | **MVP Hardening / Audit**; 120/120 core tests; offline TypeScript 0 diagnostics; 120-file immutable manifest; clean-extract verifier/tests/typecheck PASS; deliberate-corruption audit→cleanup→reconcile→resume→reload acceptance PASS; v0.1.0 + four-part v0.1.1 reconstruction `app/ diff=0`; Git blobs matched local `40c7ce63c3f6ebe969a6773d920d1de4be10696b`, `cec720ec4003005be58c3b869b5d788acd14f2af`, `d3d6ae195f0b8aa92859b60a2c848f2f10a460ec`, `1bd16c0e57a0ec80a264e28312dae57c63edcd89`. Production reachability/Vite build remain unverified in the DNS-restricted container. |

## Reconstruct latest v0.1.1

1. Reconstruct v0.1.0 using the earlier version-ordered chain.
2. Apply the two file-overlay archives:

```bash
tar -xJf snapshots/AI_Space_v0.1.1_NewCoreDelta.tar.xz --strip-components=1 -C <project-root>
tar -xJf snapshots/AI_Space_v0.1.1_TestsDelta.tar.xz --strip-components=1 -C <project-root>
```

3. Extract and apply the two patch archives:

```bash
tar -xJf snapshots/AI_Space_v0.1.1_CorePatchDelta.tar.xz --strip-components=1 -C <project-root>
(cd <project-root> && patch --batch -p0 < patches/core.patch)
tar -xJf snapshots/AI_Space_v0.1.1_AppPatchDelta.tar.xz --strip-components=1 -C <project-root>
(cd <project-root> && patch --batch -p0 < patches/App.tsx.patch)
```

4. That exact four-part reconstruction was fresh-verified against the delivered v0.1.1 runnable `app/`; result: `diff=0`.
5. Run networked `npm install`, tests, typecheck, a live AI Board probe, and the Vite production build before deployment.

The evidence-complete v0.1.1 FULL ZIP is delivered separately in its development round and is intentionally not expanded into this repository.
