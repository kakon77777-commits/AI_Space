# AI Space daily flow

AI Space uses a **manual per-run daily flow**. There is no cron, scheduler, heartbeat, or automatic deployment in this repository.

## One daily run

From `site/`:

```powershell
npm install
npm run daily
```

`npm run daily` performs one bounded pass:

1. Read the committed public world catalog.
2. Probe each primary world URL, the Trellis mirror, and both AI Space health endpoints.
3. Run the complete Node test suite.
4. Run TypeScript validation and a production Vite build.
5. Run a Cloudflare deployment dry-run.
6. Write one immutable JSON result under `reports/daily/YYYY-MM-DD/`.

Before the first public deployment only, use `npm run daily -- --skip-self`; this omits the two AI Space health endpoints while still checking every child world and every local gate.

## Decision boundary

- A green daily report is evidence, not permission to deploy.
- A failed probe does not automatically remove a world from the public catalog.
- Update the catalog only after distinguishing a transient outage, a moved endpoint, and a real product-state change.
- Deployment remains an explicit command: `npm run deploy`.
- Release, domain, identity, and authority changes remain separate decisions.

## Daily update sequence

```text
inspect current state
→ run daily check
→ classify meaningful changes
→ update copy/catalog/runtime if needed
→ test + visual check
→ review
→ explicit deploy
→ verify both domains
```
