/**
 * Scan src/app/api for handler files that contain POST/PATCH/PUT/DELETE
 * exports and check whether they call audit.mutation() or logAudit().
 * Report files missing audit calls.
 */
import { readFileSync, readdirSync, statSync } from "fs";
import { join, sep } from "path";

export interface AuditCoverageRow {
  file: string;
  hasMutation: boolean;
  hasAudit: boolean;
}

function* walk(dir: string): Generator<string> {
  let entries: string[] = [];
  try { entries = readdirSync(dir); } catch { return; }
  for (const e of entries) {
    const p = join(dir, e);
    let st;
    try { st = statSync(p); } catch { continue; }
    if (st.isDirectory()) yield* walk(p);
    else if (e === "route.ts") yield p;
  }
}

const MUTATION_RE = /export\s+(?:async\s+)?(?:function|const)\s+(POST|PATCH|PUT|DELETE)\b|export\s+const\s+POST\s*=|export\s+const\s+PATCH\s*=|export\s+const\s+PUT\s*=|export\s+const\s+DELETE\s*=/;
const AUDIT_RE = /audit\.mutation\(|logAudit\(/;

export function getAuditCoverage(apiRoot: string): AuditCoverageRow[] {
  const rows: AuditCoverageRow[] = [];
  for (const file of walk(apiRoot)) {
    let content = "";
    try { content = readFileSync(file, "utf8"); } catch { continue; }
    const hasMutation = MUTATION_RE.test(content);
    const hasAudit = AUDIT_RE.test(content);
    rows.push({
      file: file.split(`${sep}src${sep}`)[1] ?? file,
      hasMutation,
      hasAudit,
    });
  }
  return rows;
}
