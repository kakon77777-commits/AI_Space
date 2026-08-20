# AI Space Archive Inventory

Inventory date: **2026-08-20**

This index records the owner-provided local source collection added to the repository's preservation lane. It does not change release authority: **AI Space v0.1.3 remains the current authoritative handoff**.

## Verification evidence

- All 12 historical FULL ZIPs opened successfully and contained exactly one `CHECKSUMS.sha256`.
- Every listed payload was present, every SHA-256 matched, and no unlisted payload file was found: 53, 67, 82, 71, 77, 92, 105, 99, 103, 111, 120, and 128 files respectively.
- A clean extraction of v0.1.2 passed its bundled verifier: `PASS version=0.1.2 files=128`.
- The dependency-free v0.1.2 core suite passed: 130 tests, 0 failures.
- Source-to-repository SHA-256 comparison passed for all 12 copied ZIPs.
- The research archive was expanded again after packaging; all Unicode filenames survived and all eight manifest-listed payloads matched.
- A bounded pre-publication scan found no executable payloads, unsafe archive paths, sensitive filenames, or high-confidence credential patterns. This is a publication gate, not a proof that arbitrary prose contains no sensitive meaning.

## Historical FULL snapshots

| Version | Repository path | Bytes | SHA-256 |
|---|---|---:|---|
| v0.0.1 | `snapshots/full/AI_Space_v0.0.1.zip` | 72,008 | `ac4785b022fa9b1688dc4493524f37cb9c5d1f8b34d01ffeff3f4ea5df4c6921` |
| v0.0.2 | `snapshots/full/AI_Space_v0.0.2.zip` | 89,213 | `7e40f2a0108cfa4f3add0a00d1d379d57ff5a686d525745e15cf4c5c92204f58` |
| v0.0.3 | `snapshots/full/AI_Space_v0.0.3.zip` | 111,933 | `51a3ebd54d1faeb676df98853719e2f827bd0862950f0a30bb1757814f919219` |
| v0.0.4 | `snapshots/full/AI_Space_v0.0.4.zip` | 114,013 | `ce139616c18a5ccaf24c4bd4a2e05ec84c0d87dd6f70c8cd686b266cd018955d` |
| v0.0.5 | `snapshots/full/AI_Space_v0.0.5.zip` | 123,425 | `af286834a9ea13272ceaa65399e6cb02c5a83ab32e803d8c1d9731a4a3a4e9ba` |
| v0.0.6 | `snapshots/full/AI_Space_v0.0.6.zip` | 167,913 | `91870c47860b608457ef118bb31c915e5e41af9a402f5c93e238fa46c18e1256` |
| v0.0.7 | `snapshots/full/AI_Space_v0.0.7.zip` | 176,762 | `90f0d1518242abdca7cb7292dbd00542277340e43088378d0ecf48a897fcbec7` |
| v0.0.8 | `snapshots/full/AI_Space_v0.0.8.zip` | 186,448 | `a98a93559d078260bff5e17bf60e963f9ac1b4ae9201d644ccef34c97691bf04` |
| v0.0.9 | `snapshots/full/AI_Space_v0.0.9.zip` | 190,029 | `e9ebede1032603fe01a96e32fdbede962c06786af497fd6f5cc2595bee68fce8` |
| v0.1.0 | `snapshots/full/AI_Space_v0.1.0.zip` | 214,597 | `3d2b7276eecac6562d54e4de48e252461655ab98393dcfdb81c8cc956815a676` |
| v0.1.1 | `snapshots/full/AI_Space_v0.1.1.zip` | 215,335 | `f918aa33a9cb3c52acec6a5e7e101184da337ed85b7e3b65198288bfa5e1b031` |
| v0.1.2 | `snapshots/full/AI_Space_v0.1.2.zip` | 242,610 | `8c79a82f58199ce8222b6073c2159b7cb8d5407770881e329bb0c810462dd9a7` |

## Research-source archive

- Path: `snapshots/research/AI_Space_Research_Source_2026-08-20.zip`
- Bytes: 92,149
- SHA-256: `09983ea78f0595e37e11f0f01fc8dd97d1fdf08d184cd11f739a5466fb9f5a4d`
- Payload: two loose AI Space whitepapers, their validation JSON, the Agent Projection pack, the projection-integrated bundle, the AIFB working-name whitepaper bundle, the DWRG whitepaper bundle, and an archive README.

The research archive is evidence and design history only. It is not executable release material, adopted governance, or a claim that its proposals are implemented.

## Authority boundaries

- The v0.0.1–v0.1.2 FULL ZIPs are exact historical preservation artifacts.
- v0.1.3 remains the latest release authority represented by this repository.
- No v0.1.3 FULL ZIP was inferred or synthesized from older local material.
- No deployment, cloud sync, public-service reachability, or new production behavior is claimed by this archive integration.
