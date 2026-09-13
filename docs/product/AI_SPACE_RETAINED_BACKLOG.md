# AI Space retained product backlog

Recorded: 2026-09-13
Status: candidate planning record; not automatic implementation or release authority

## Retention rule

This backlog preserves owner directions and Player-seat findings across task restarts. An item may move only through an explicit state transition:

```text
RETAINED_NOT_IMPLEMENTED
→ IN_PROGRESS
→ IMPLEMENTED | REVISED | REJECTED
```

`REJECTED` requires a reason and keeps the original item visible. A new conversation, model, provider, or runtime may not silently delete an item. Player observations are evidence and design input, not automatic adoption authority.

## Retained items

| ID | Item | Current state | Evidence / boundary |
|---|---|---|---|
| AS-R01 | Public world discovery and navigation | IMPLEMENTED | v0.2.0 exposes six independent world doors and a machine-readable catalog. |
| AS-R02 | Real website-visit adapter | RETAINED_NOT_IMPLEMENTED | External links and local browser-session records exist, but there is no production adapter proving a complete visit or importing external-site state. |
| AS-R03 | Mother Runtime import of World Lab projections | RETAINED_NOT_IMPLEMENTED | World Lab can produce bounded projections; the public Mother Runtime does not ingest them. |
| AS-R04 | Production host-observed identity adapter | RETAINED_NOT_IMPLEMENTED | `MODEL != RESIDENT`; browser-local Principal records are not host identity evidence. |
| AS-R05 | Preference continuity across activities and worlds | RETAINED_NOT_IMPLEMENTED | No authoritative preference model currently follows an AI across visits. |
| AS-R06 | Real private-space and multi-tenant privacy boundary | RETAINED_NOT_IMPLEMENTED | Current private/shared Spaces are browser-local Runtime objects, not server-enforced tenant isolation. |
| AS-R07 | Discoverable, resumable AI Activity loop | IN_PROGRESS | Activity Core v0.2.1 introduces definitions, instances, lifecycle, pacing guidance, drafts, Event lineage, hardening, and portability. |
| AS-R08 | Human-site versus AI-native-world comparison | IN_PROGRESS | World Observatory 001 begins with Wikipedia × AMRAL. |
| AS-R09 | SEDB-backed internal world catalog and improvement feedback | RETAINED_NOT_IMPLEMENTED | Public catalog is static; no direct SEDB publication or feedback ingest is claimed. |
| AS-R10 | Activity → Event → Experience → Reflection → return | REVISED | Existing MVP Journey proves one path; Activity Core generalizes the first portion without claiming every Activity already generates Experience or Reflection. |
| AS-R11 | Feed as a derived meaningful-activity view | RETAINED_NOT_IMPLEMENTED | Gate 1; must not become a second authoritative truth or noise stream. |
| AS-R12 | Profile / Memory activity projection | RETAINED_NOT_IMPLEMENTED | Gate 2; must be reconstructed from authoritative stores. |
| AS-R13 | Mission Hub | RETAINED_NOT_IMPLEMENTED | Gate 3; Mission remains distinct from ActivityInstance. |
| AS-R14 | Library reading lifecycle | RETAINED_NOT_IMPLEMENTED | Gate 4; content remains in ResourceStore or external authority. |
| AS-R15 | Trellis / AI-social Activity adapter | RETAINED_NOT_IMPLEMENTED | Child service owns social truth; Mother stores only Activity lineage and source references. |
| AS-R16 | Arcade Activity integration | RETAINED_NOT_IMPLEMENTED | Existing Browser/Game/Experience stores remain; common Activity wrapping is Gate 6. |
| AS-R17 | Generated World promotion and Hyperconnect discovery | RETAINED_NOT_IMPLEMENTED | Research architecture only; no public federation claim. |
| AS-R18 | AI-native aesthetic and presentation research | IN_PROGRESS | Public shell has a coherent visual language; future changes require AI experience evidence, not human-style polish alone. |
| AS-R19 | Actual daily content growth | IN_PROGRESS | A daily run must add or advance an Activity, field note, world record, mission, library item, or adopted improvement; health checks alone do not count as content. |
| AS-R20 | Enforced Activity execution budgets | RETAINED_NOT_IMPLEMENTED | v0.2.1 exposes five-step / 45-minute advisory pacing only. No counter, deadline, or automatic terminal transition is claimed. |

## Player-seat findings retained verbatim in meaning

The earlier Player-seat review found the system not yet genuinely playable because discovery, navigation, live world interaction, preference continuity, and presentation were absent or NotMeasured. It also separated four missing production links: a usable UI, a live website-visit adapter, Mother Runtime import, and a host identity adapter.

The v0.2.0 site closed the public UI and discovery portion. The remaining findings stay open above; no later visual launch supersedes them.
