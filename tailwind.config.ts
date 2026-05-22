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
          navy: "#2C3E50",
          rose: "#C97B8A",
          ivory: "#FAF6EE",
          mint: "#B5E5D8",
          lavender: "#D4C5E2",
          white: "#FFFFFF",
          black: "#1A1A2E",
          error: "#E74C3C",
          warning: "#F39C12",
          success: "#27AE60",
          gray: {
            100: "#F8F7F4",
            200: "#E8E5DF",
            300: "#D1CCC4",
            500: "#8A8580",
          },
        },
        // alias kept so existing brand-* utilities continue to work
        brand: {
          navy: "#2C3E50",
          rose: "#C97B8A",
          mint: "#B5E5D8",
          lavender: "#D4C5E2",
          ivory: "#FAF6EE",
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
