import { describe, it, expect } from "vitest";
import { escapeHtml } from "./html";

/**
 * Guards the chat email-copy injection fix: user message text is interpolated
 * into an email HTML body, so it must be escaped (api/messages/route.ts).
 */
describe("escapeHtml", () => {
  it("neutralises a script/markup injection payload", () => {
    const evil = `<script>alert('xss')</script>`;
    const out = escapeHtml(evil);
    expect(out).not.toContain("<script>");
    expect(out).toBe("&lt;script&gt;alert(&#39;xss&#39;)&lt;/script&gt;");
  });

  it("escapes all five HTML-sensitive characters", () => {
    expect(escapeHtml(`& < > " '`)).toBe("&amp; &lt; &gt; &quot; &#39;");
  });

  it("escapes ampersands first so entities aren't double-mangled", () => {
    // The literal text "&lt;" must become "&amp;lt;", not "&lt;".
    expect(escapeHtml("&lt;")).toBe("&amp;lt;");
  });

  it("leaves plain text (incl. newlines) untouched", () => {
    expect(escapeHtml("Hello world\nLine 2")).toBe("Hello world\nLine 2");
  });

  it("is a no-op on the empty string", () => {
    expect(escapeHtml("")).toBe("");
  });
});
