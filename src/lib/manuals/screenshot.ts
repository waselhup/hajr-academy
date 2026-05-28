/**
 * Best-effort screenshot capture for manual generation.
 *
 * Playwright is listed as a devDependency (test:e2e script) but the
 * browsers may not be installed on every dev machine. We try to use
 * it; if anything fails, we silently skip — the manual layout renders
 * a placeholder rectangle in that slot via the figure's onerror
 * handler, so the build never blocks.
 *
 * Caching: skip capture if the target PNG already exists and is less
 * than 7 days old.
 */
import { existsSync, statSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

export interface CaptureOpts {
  url: string;
  loginAs: "admin" | "teacher" | "student";
  viewport?: { width: number; height: number };
  waitForSelector?: string;
  outputPath: string;
}

const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function isFresh(path: string): boolean {
  if (!existsSync(path)) return false;
  const age = Date.now() - statSync(path).mtimeMs;
  return age < ONE_WEEK_MS;
}

function ensureDir(filePath: string): void {
  const dir = dirname(filePath);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

/**
 * Attempt to capture a screenshot. Returns the path on success, null
 * on any failure. Never throws.
 */
export async function captureScreenshot(
  opts: CaptureOpts
): Promise<string | null> {
  const outPath = resolve(opts.outputPath);
  if (isFresh(outPath)) {
    return outPath;
  }
  ensureDir(outPath);

  try {
    // Dynamic import so the dependency is not required at server runtime.
    // If playwright is missing or browsers are not installed, this
    // resolves to null and we fall through to the placeholder path.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    // @ts-expect-error — optional dependency, not installed on every machine
    const playwright: any = await import("playwright").catch(() => null);
    if (!playwright || !playwright.chromium) {
      return null;
    }

    const browser = await playwright.chromium.launch({ headless: true });
    const context = await browser.newContext({
      viewport: opts.viewport ?? { width: 1440, height: 900 },
    });

    // Inject auth cookie — this is best-effort. Real session setup
    // requires credentials we can't safely embed; skipping login means
    // we capture the public-facing version of the page when possible,
    // otherwise the login screen — still better than nothing.
    const page = await context.newPage();
    await page.goto(opts.url, { waitUntil: "networkidle", timeout: 15000 });
    if (opts.waitForSelector) {
      await page
        .waitForSelector(opts.waitForSelector, { timeout: 5000 })
        .catch(() => null);
    }
    await page.screenshot({ path: outPath, fullPage: false });

    await browser.close();
    return outPath;
  } catch {
    return null;
  }
}

/**
 * Used by the standalone capture script. Loops a list of pages and
 * captures each, logging progress. Returns counts.
 */
export interface CaptureJob {
  slug: string;
  url: string;
  loginAs: "admin" | "teacher" | "student";
  waitForSelector?: string;
}

export async function captureBatch(
  role: "admin" | "teacher" | "student",
  jobs: CaptureJob[],
  publicDir: string
): Promise<{ captured: number; skipped: number; failed: number }> {
  let captured = 0;
  let skipped = 0;
  let failed = 0;

  for (const job of jobs) {
    const outputPath = resolve(
      publicDir,
      `manuals/screenshots/${role}/${job.slug}.png`
    );
    if (isFresh(outputPath)) {
      skipped += 1;
      continue;
    }
    const result = await captureScreenshot({
      url: job.url,
      loginAs: job.loginAs,
      waitForSelector: job.waitForSelector,
      outputPath,
    });
    if (result) captured += 1;
    else failed += 1;
  }

  return { captured, skipped, failed };
}
