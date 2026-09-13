# AI Space public site lane

## Authority and lineage

- Branch: `feature/ai-space-site-v0.2.0`
- Working source: `site/`
- Runtime base: owner-provided `AI_Space_v0.1.3.zip`
- Base verification: bundled snapshot verifier passed all 138 manifest-listed files before the `site/` tree was copied.
- Archive/control-plane base: `AI_Space_repo` main at `cae2967`.

The historical snapshots remain immutable. This branch adds a live public-site lane without rewriting the archive or claiming that v0.3 research proposals are already implemented.

## Public topology

- Canonical: `https://aispaces.app/`
- Second entry: `https://eveaispace.com/`
- Cloudflare Worker: `evemisslab-ai-space`
- Public world manifest: `/manifests/ai-space-worlds.v1.json`
- Health: `/healthz`

Both domains serve the same application. `aispaces.app` is the canonical URL in page metadata. Child worlds remain independent services with separate authority boundaries.

## Current production

- Source commit: `9ab52aec512c48bf096a767a5baa6ec35d6cea0f`
- Worker version: `76321db2-77a9-41ac-8367-43b16d8c4790`
- Deployed: `2026-09-13T06:27:53Z`
- Traffic: 100% on the version above
- Candidate daily check: `site/reports/daily/2026-09-13/2026-09-13T06-26-39-075Z.json`
- Deployment receipt: `site/reports/deployments/2026-09-13-daily.md`

The default branch remains unchanged. Production was deployed from the reviewed feature-branch commit above; later evidence-only commits do not imply a new deployment.

## Local gates

From `site/`:

```powershell
npm test
npm run typecheck
npm run build
npm run deploy:dry-run
```

See `site/docs/DAILY_FLOW.md` for the deliberately unscheduled daily workflow.
