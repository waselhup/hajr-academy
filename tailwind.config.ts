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
      // Tighter side gutters on phones so packed header rows don't overflow;
      // desktop (lg+) keeps the original 2rem so it's pixel-identical.
      padding: { DEFAULT: "1rem", sm: "1.5rem", lg: "2rem" },
      screens: { "2xl": "1400px" },
    },
    extend: {
      colors: {
        hajr: {
          // ── CANONICAL BRAND BOOK — official identity ──
          // Deep Navy structure on Ivory Silk canvas, Rose Mauve as a 3% accent
          // (primary actions, LIVE, active-nav dot, progress, "most popular").
          "deep-navy": "#1E2A36", // Deep Navy — primary 70%: sidebar, heroes, headings, footer
          navy: "#2C3E50",        // Charcoal Navy — secondary 15%: hovers, secondary text/surfaces
          ivory: "#FAF6EE",       // Ivory Silk — background 10%: page canvas + inner sub-rows
          white: "#FFFFFF",
          rose: "#B86E7B",        // Rose Mauve — accent 3% ONLY: actions, LIVE, active dot, progress
          mint: "#B5E5D8",        // Mint Frost — support 2% / success
          chip: "#EFF1F4",        // neutral grey utility icon-chip fill (navy icon)
          // text scale
          text: "#1E2A36",
          body: "#2C3E50",
          muted: "#64748B",
          light: "#94A3B8",
          // surfaces & lines
          border: "#ECE5D8",      // warm hairline tuned for white card on Ivory Silk
          surface: "#FAF6EE",     // inner sub-row fill = Ivory Silk canvas
          hover: "#F1ECE1",       // warm hover on ivory
          // status
          error: "#DC2626",
          warning: "#F59E0B",
          success: "#059669",
          info: "#2563EB",
          // Compat slots so existing utility classes resolve.
          black: "#1E2A36",
          gray: {
            50: "#F7F3EA",
            100: "#EFF1F4",
            200: "#ECE5D8",
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
          accent: "#B86E7B",      // the real Rose Mauve for any rare opt-in
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
        // Brand book rounding — restrained premium cards ~14px (book: 10-12px),
        // buttons/inputs use --radius (10px). Not pill-round.
        xl: "1rem",
        "2xl": "1.25rem",
        card: "14px",
      },
      fontFamily: {
        ar: ["var(--font-ar)", "IBM Plex Sans Arabic", "Cairo", "sans-serif"],
        en: ["var(--font-en)", "Inter", "Helvetica Neue", "sans-serif"],
        sans: ["var(--font-en)", "Inter", "sans-serif"],
      },
      boxShadow: {
        // Brand book — soft Deep Navy float on Ivory Silk canvas.
        card: "0 12px 30px -22px rgb(30 42 54 / 0.28)",
        "card-hover": "0 20px 44px -22px rgb(30 42 54 / 0.38)",
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
