import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: { "2xl": "1400px" },
    },
    extend: {
      colors: {
        hajr: {
          // ── BRAND v3 — locked official palette ──
          // 70/15/10/3/2 proportion rule. Rose mauve is ACCENT ONLY.
          "deep-navy": "#1E2A36", // 70% — primary surface
          navy: "#2C3E50",        // 15% — secondary text/headings
          ivory: "#FAF6EE",       // 10% — page bg
          white: "#FFFFFF",
          rose: "#B86E7B",        // 3%  — ACCENT ONLY
          mint: "#B5E5D8",        // 2%  — support / success
          // text scale
          text: "#1E2A36",
          body: "#2C3E50",
          muted: "#64748B",
          light: "#94A3B8",
          // surfaces & lines
          border: "#E2E8F0",
          surface: "#F8FAFC",
          hover: "#F1F5F9",
          // status
          error: "#DC2626",
          warning: "#F59E0B",
          success: "#059669",
          info: "#2563EB",
          // Compat slots so existing utility classes resolve.
          black: "#1E2A36",
          gray: {
            100: "#F8FAFC",
            200: "#E2E8F0",
            300: "#CBD5E1",
            500: "#64748B",
          },
        },
        // brand.* legacy alias — kept ONLY because v2 swept many call
        // sites to it; brand.rose remains navy so accidental
        // `bg-brand-rose` paints navy, not pink. True rose CTAs use
        // `variant="cta"`.
        brand: {
          "deep-navy": "#1E2A36",
          navy: "#2C3E50",
          rose: "#2C3E50",        // ← still navy by design
          accent: "#B86E7B",      // the real rose for any rare opt-in
          mint: "#B5E5D8",
          ivory: "#FAF6EE",
          lavender: "#D4C5E2",    // deprecated — remove once 0 refs
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        ar: ["var(--font-ar)", "IBM Plex Sans Arabic", "Cairo", "sans-serif"],
        en: ["var(--font-en)", "Inter", "Helvetica Neue", "sans-serif"],
        sans: ["var(--font-en)", "Inter", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 3px 0 rgb(44 62 80 / 0.06), 0 1px 2px -1px rgb(44 62 80 / 0.08)",
        "card-hover": "0 8px 24px -4px rgb(44 62 80 / 0.12), 0 2px 6px -2px rgb(44 62 80 / 0.08)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "fade-in-up": {
          from: { opacity: "0", transform: "translateY(16px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.6s ease-out both",
        "fade-in-up": "fade-in-up 0.7s cubic-bezier(0.16,1,0.3,1) both",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
export default config;
