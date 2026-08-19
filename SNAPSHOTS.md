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
| v0.0.7 | 2026-08-20 | [`CoreDelta`](snapshots/AI_Space_v0.0.7_CoreDelta.tar.xz) + [`AppDelta`](snapshots/AI_Space_v0.0.7_AppDelta.tar.xz) + [`SurfaceCodeDelta`](snapshots/AI_Space_v0.0.7_SurfaceCodeDelta.tar.xz) + [`StyleDelta`](snapshots/AI_Space_v0.0.7_StyleDelta.tar.xz) | v0.0.6 | Core `fa7c890e896243ec8979a9ba6b13688eebf92b8e736cecdf9191835a9c1c6271`; App `e9599bfe9daf496e77b1467749f64cb979c93dd0ff8b2e4b05113aca33e2a101`; SurfaceCode `828552ba6316628083e86d9aa9bc30671b503de4e5ddbb81f65abb3cb6160329`; Style `d3cae06d077c991d782522b9748cb316236462d9729432e818bb401a25b3ddd8` | Projection Runtime; 72/72 tests; offline TypeScript; 105-file FULL manifest; clean-extract verification; reconstruction diff=0; all blobs byte-verified. |
| v0.0.8 | 2026-08-20 | [`CoreDelta`](snapshots/AI_Space_v0.0.8_CoreDelta.tar.xz) + [`AppDelta`](snapshots/AI_Space_v0.0.8_AppDelta.tar.xz) + [`SurfaceCodeDelta`](snapshots/AI_Space_v0.0.8_SurfaceCodeDelta.tar.xz) + [`StyleDelta`](snapshots/AI_Space_v0.0.8_StyleDelta.tar.xz) | v0.0.7 | Core `d35127fe374b71d48c789d0375090e5de88dad74d1f115eac4b964b0d0de5c4b`; App `c0eb4fbe95be111cdcd82a757c54089578c4cfaedd5be42472aaa358fe1b4df9`; SurfaceCode `fe57e8c1620e3269fdd8f516a746247b85fe0289e8891b767b467156ca0edcb8`; Style `9f92969a2d4cfc98c68a9b71560aea4cfe3a8943b4ce96d140a8b8cdb6aff047` | Browser Session Boundary; 81/81 tests; offline TypeScript; 99-file FULL manifest; clean-extract verification; reconstruction diff=0; all blobs byte-verified. |
| v0.0.9 | 2026-08-20 | [`CoreDelta`](snapshots/AI_Space_v0.0.9_CoreDelta.tar.xz) + [`AppLogicDelta`](snapshots/AI_Space_v0.0.9_AppLogicDelta.tar.xz) + [`RegistryDelta`](snapshots/AI_Space_v0.0.9_RegistryDelta.tar.xz) + [`SpacesPageDelta`](snapshots/AI_Space_v0.0.9_SpacesPageDelta.tar.xz) + [`ProjectionShellDelta`](snapshots/AI_Space_v0.0.9_ProjectionShellDelta.tar.xz) + [`StyleDelta`](snapshots/AI_Space_v0.0.9_StyleDelta.tar.xz) | v0.0.8 | Core `9a4b9de504690c616e336f746533764cc0182abf67e56bb9346f6fec2d8d76a8`; AppLogic `9d7e31c5a2b2781d8daa8a2a3afc3b83e746e6d5f0d0c14f260263076009cbfd`; Registry `de46876e8f337ba22858223cd60636942e1ccf075817d089a110f1bcb4711a84`; SpacesPage `f34926f0c8f5b228ac472242c97e9e50c6cf02fc645e1c2ea95165813743c319`; ProjectionShell `f67fc3a91ead6b347c468fa49a085eb6908752eaf32fd42a103bd75cf77ec2c8`; Style `3c5c46f791425f0d38a360597b643f519497574bf052e14e861bed07de1fa8d4` | Shared Space Context; 96/96 core tests; offline TypeScript; 103-file FULL manifest; clean-extract verification; six-delta reconstruction diff=0; all blobs byte-verified. |
| **v0.1.0** | **2026-08-20** | [`CoreRuntimeDelta`](snapshots/AI_Space_v0.1.0_CoreRuntimeDelta.tar.xz) + [`CoreTestsDelta`](snapshots/AI_Space_v0.1.0_CoreTestsDelta.tar.xz) + [`AppPatchDelta`](snapshots/AI_Space_v0.1.0_AppPatchDelta.tar.xz) + [`MvpPageDelta`](snapshots/AI_Space_v0.1.0_MvpPageDelta.tar.xz) + [`RegistryDelta`](snapshots/AI_Space_v0.1.0_RegistryDelta.tar.xz) + [`StyleDelta`](snapshots/AI_Space_v0.1.0_StyleDelta.tar.xz) | v0.0.9 | CoreRuntime `4b6adc6ff4c80c2253c0efcb34152c76a3fb1cbef104136a35bbe45c4b8bd90e`; CoreTests `bd6f423a26e61d6c3523b6d22067ff96a4fb6101da0bbfc2ca069fc9ec55beb5`; AppPatch `474c27927484f8370ffc13c54f839bd367653ded36cbcfbc62cb3ff1e2b0da20`; MvpPage `cc4fc9cd7ff95f8eaa081d157ed84b19f372a8798278744d6e11363d2197b286`; Registry `6c3f7f459e038744f5388482f895ed19bf2c3766cc8595e36bb9bc6d0cf3df76`; Style `0f95f926709a22043f2d6f1a2949f937e026a98379088861dce0091a217cdb34` | **First Coherent AI Space MVP**; 109/109 dependency-free core tests; offline TypeScript exit 0; 111-file immutable FULL snapshot manifest; FULL ZIP clean-extract verifier/tests/typecheck PASS; Journey acceptance completes Principal→Context→Projection→Space→Capability→Interaction→Experience→Reflection→Return and remains complete after recreating all stores over the same persistent StorageAdapter; v0.0.9 + six canonical v0.1.0 handoff parts matched delivered `app/` with `diff=0`. Git blobs matched local `1bced040c43eae16c82bb45a1452eb77785e5022`, `1e90d91faae92bb64b63c2163727669e230e409c`, `96919892e3d324ce80cd4b192d207a48218f63e1`, `7b962e7788eafb95726689b592aa1d528e58aef3`, `1416e9fae0a0466ecf09596cfeaf575fba9f260c`, `fc5644796ea6264be0ee8984d93a92abf99175b2`. Production reachability and Vite build remain unverified in the DNS-restricted build container. |

## Reconstruct latest v0.1.0 from GitHub

1. Reconstruct through v0.0.9 in version order.
2. Apply the five file-overlay v0.1.0 archives with `--strip-components=1`:

```bash
tar -xJf snapshots/AI_Space_v0.1.0_CoreRuntimeDelta.tar.xz --strip-components=1 -C <project-root>
tar -xJf snapshots/AI_Space_v0.1.0_CoreTestsDelta.tar.xz --strip-components=1 -C <project-root>
tar -xJf snapshots/AI_Space_v0.1.0_MvpPageDelta.tar.xz --strip-components=1 -C <project-root>
tar -xJf snapshots/AI_Space_v0.1.0_RegistryDelta.tar.xz --strip-components=1 -C <project-root>
tar -xJf snapshots/AI_Space_v0.1.0_StyleDelta.tar.xz --strip-components=1 -C <project-root>
```

3. Extract and apply the small `App.tsx` patch:

```bash
tar -xJf snapshots/AI_Space_v0.1.0_AppPatchDelta.tar.xz --strip-components=1 -C <project-root>
(cd <project-root> && patch --batch -p0 < patches/App.tsx.patch)
```

4. That exact reconstruction was fresh-verified from the delivered v0.0.9 FULL snapshot and compared against the v0.1.0 runnable `app/`; result: `diff=0`.
5. Run networked `npm install`, tests, typecheck, a live AI Board probe, and the Vite production build before deployment.

The evidence-complete v0.1.0 FULL ZIP is delivered separately in its development round and is intentionally not expanded into this repository.

## Handoff rule

1. Verify every listed SHA-256 before use.
2. Reconstruct from the latest full handoff plus all subsequent verified deltas in version order.
3. Develop and test in a clean local / active AI workspace.
4. Publish a new immutable full snapshot for the development round.
5. GitHub receives only the minimum reconstructible verified handoff/delta and index updates.
6. Never overwrite an old snapshot artifact.
