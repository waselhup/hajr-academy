# Blockers — HAJR A° Build

## ⚠ Required user action: reset Supabase postgres password

**Status:** Open (Phase 2 build still ships green; Phase 2 admin pages will throw on first DB read until resolved)

**Symptom**
```
Authentication failed against database server at `aws-1-ap-south-1.pooler.supabase.com`,
the provided database credentials for `postgres` are not valid.
```

**What we know**
- Supabase project `uaphmmbknrpeibbhrevq` exists, `ACTIVE_HEALTHY`, region `ap-south-1` (Mumbai).
- DDL + data are applied via the Supabase MCP (service-role auth). The schema and seed are live in production.
- The legacy pooler host `aws-0-ap-south-1.pooler.supabase.com` rejects the tenant string for this project (newer cluster `aws-1-*`).
- The new pooler host `aws-1-ap-south-1.pooler.supabase.com` **does** route the tenant, but the password supplied in the spec (`As1245667$$|$$`, URL-encoded `As1245667%24%24%7C%24%24`) does not authenticate.

**Resolution (1 minute)**

1. Open: <https://supabase.com/dashboard/project/uaphmmbknrpeibbhrevq/settings/database>
2. Scroll to **Database password** → **Reset database password**
3. Pick a password without `|` or `$$` (e.g. `HajrPhase2_2026_xyz`)
4. Update `.env` with the new password (URL-encode it if it contains special chars):
   ```env
   DATABASE_URL=postgresql://postgres.uaphmmbknrpeibbhrevq:<NEW_PASSWORD>@aws-1-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1
   DIRECT_URL=postgresql://postgres.uaphmmbknrpeibbhrevq:<NEW_PASSWORD>@aws-1-ap-south-1.pooler.supabase.com:6543/postgres
   ```
5. Mirror these two values into Vercel → Settings → Environment Variables.

Once that's done, `npm run dev` will read from the live Supabase project with no further code changes.
