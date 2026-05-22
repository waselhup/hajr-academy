/**
 * Template rendering for communications.
 *
 * Supports two constructs in template strings:
 *  - `{{varName}}`            — replaced with `variables.varName`
 *  - `{{#if cond}}...{{/if}}` — block kept only when `variables.cond` is truthy
 *
 * Deliberately minimal (regex-based) — no full Handlebars dependency.
 */
export function renderTemplate(
  template: string,
  variables: Record<string, string>
): string {
  let out = template;

  // 1. Conditional blocks: {{#if name}} ... {{/if}}
  out = out.replace(
    /\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g,
    (_match, key: string, block: string) => {
      const val = variables[key];
      const truthy = val !== undefined && val !== "" && val !== "false" && val !== "0";
      return truthy ? block : "";
    }
  );

  // 2. Simple variable substitution: {{name}}
  out = out.replace(/\{\{(\w+)\}\}/g, (_match, key: string) =>
    variables[key] !== undefined ? variables[key] : ""
  );

  return out;
}

/**
 * Wrap arbitrary body HTML in the branded Hajr Academy email shell:
 * navy header, ivory body, footer with unsubscribe. Table-based and
 * inline-styled so it survives email clients. `dir` controls RTL/LTR.
 */
export function wrapEmailShell(opts: {
  bodyHtml: string;
  locale: "ar" | "en";
  unsubscribeUrl?: string;
}): string {
  const { bodyHtml, locale } = opts;
  const dir = locale === "ar" ? "rtl" : "ltr";
  const footerText =
    locale === "ar" ? "أكاديمية هجر" : "HAJR A° Academy";
  const unsubLabel = locale === "ar" ? "إلغاء الاشتراك" : "Unsubscribe";
  const unsub = opts.unsubscribeUrl
    ? ` &nbsp;·&nbsp; <a href="${opts.unsubscribeUrl}" style="color:#8A8580;text-decoration:underline;">${unsubLabel}</a>`
    : "";

  return `<!DOCTYPE html>
<html dir="${dir}" lang="${locale}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#FAF6EE;font-family:'Segoe UI',Tahoma,Arial,sans-serif;color:#1A1A2E;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FAF6EE;padding:32px 0;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(44,62,80,0.08);">
        <tr><td style="background:#1E2A36;padding:24px 32px;" align="${dir === "rtl" ? "right" : "left"}">
          <span style="color:#ffffff;font-size:24px;font-weight:800;letter-spacing:-0.5px;">HAJR</span>
          <span style="color:#C97B8A;font-size:24px;font-weight:800;">&nbsp;|&nbsp;</span>
          <span style="color:#C97B8A;font-size:22px;font-weight:600;">A&deg;</span>
        </td></tr>
        <tr><td style="padding:36px 32px;color:#1A1A2E;font-size:15px;line-height:1.7;" dir="${dir}">
          ${bodyHtml}
        </td></tr>
        <tr><td style="background:#F8F7F4;padding:22px 32px;color:#8A8580;font-size:12px;border-top:1px solid #E8E5DF;" align="center">
          ${footerText} &nbsp;·&nbsp; hajr-academy.com${unsub}
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

/**
 * A branded rose CTA button as an email-safe HTML table (rounded-full pill).
 */
export function emailButton(label: string, url: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;">
    <tr><td style="background:#C97B8A;border-radius:999px;">
      <a href="${url}" style="display:inline-block;padding:13px 32px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;border-radius:999px;">${label}</a>
    </td></tr>
  </table>`;
}
