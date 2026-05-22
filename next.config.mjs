import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.supabase.co" },
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
  },
  experimental: {
    serverActions: { bodySizeLimit: "10mb" },
  },
  /**
   * Cross-origin isolation for the virtual-classroom route only.
   *
   * The Zoom Meeting SDK performs best (and most reliably) when the page
   * is cross-origin isolated, so it can use SharedArrayBuffer for media
   * instead of the slower JS fallback. COEP is set to `credentialless`
   * rather than `require-corp` — `credentialless` still enables
   * `crossOriginIsolated` but does NOT require every Zoom CDN sub-resource
   * to carry a CORP header, so it cannot break asset loading.
   *
   * Scoped to `/:locale/classroom/...` only — applying these headers
   * site-wide would risk other pages' third-party resources.
   */
  async headers() {
    return [
      {
        source: "/:locale/classroom/:path*",
        headers: [
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Cross-Origin-Embedder-Policy", value: "credentialless" },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
