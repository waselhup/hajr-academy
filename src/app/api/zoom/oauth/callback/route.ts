import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * Zoom OAuth consent redirect target. The Server-to-Server OAuth app does not
 * require a per-user grant, but Zoom Marketplace still sends the consent
 * redirect here once. We just confirm the app is wired and link back to admin.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const error = url.searchParams.get("error");
  const ok = !error;

  const html = `<!doctype html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>HAJR A° — Zoom</title>
  <style>
    body { font-family: system-ui, sans-serif; background: #FAF6EE; color: #2C3E50;
           display: flex; min-height: 100vh; align-items: center; justify-content: center; margin: 0; }
    .card { background: #fff; border: 1px solid #eee; border-radius: 16px; padding: 40px;
            max-width: 420px; text-align: center; box-shadow: 0 4px 24px rgba(0,0,0,.06); }
    .badge { font-size: 42px; }
    h1 { font-size: 20px; margin: 16px 0 8px; }
    p { color: #6B7280; font-size: 14px; }
    a { display: inline-block; margin-top: 20px; background: #B86E7B; color: #fff;
        text-decoration: none; padding: 10px 24px; border-radius: 10px; font-weight: 600; }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">${ok ? "✅" : "⚠️"}</div>
    <h1>${ok ? "تم ربط تطبيق Zoom بنجاح" : "تعذّر ربط تطبيق Zoom"}</h1>
    <p>${ok ? "Zoom app authorized successfully. You can close this tab." : `Authorization failed: ${error}`}</p>
    <a href="/ar/admin">العودة إلى لوحة التحكم — Back to Admin</a>
  </div>
</body>
</html>`;

  return new NextResponse(html, {
    status: ok ? 200 : 400,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
