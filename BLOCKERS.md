# Blockers — HAJR A° Build

## ✅ RESOLVED: Supabase postgres password reset

**Status:** Resolved 2026-05-19. New password (`As1245667%%`, URL-encoded `As1245667%25%25`) authenticates against the v2 pooler `aws-1-ap-south-1.pooler.supabase.com:6543`.

**Verified via:**
```
$ node --env-file=.env -e "const p = new (require('@prisma/client').PrismaClient)(); …"
CONN OK. User counts by role:
   TEACHER → 4
   PARENT → 6
   ADMIN → 2
   STUDENT → 12
   SUPER_ADMIN → 1
Programs: 5 | Classes: 2 | Invoices: 6
```

`.env` and Vercel production env both updated; `/admin` routes now query the live Supabase Mumbai DB end-to-end.

No open blockers.
