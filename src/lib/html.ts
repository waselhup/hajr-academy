/**
 * Escape a string for safe interpolation into HTML (email bodies, server-built
 * HTML fragments). Prevents HTML/markup injection from user-supplied text.
 *
 * Mirrors the private helpers already used in notify.ts and the admin chat
 * export; centralised here so any new server-side HTML interpolation can reuse
 * a single audited implementation.
 */
export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
