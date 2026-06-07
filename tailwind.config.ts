import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

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
      padding: "1.5rem",
      screens: {
        sm: "640px",
        md: "768px",
        lg: "1024px",
        xl: "1280px",
        "2xl": "1440px",
      },
    },
    extend: {
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        // iAccessibility brand blue system (see docs/design-tokens.md).
        // Light hex is verified WCAG 2.2 AA; do not lighten the blues. These
        // map to the --ia-* CSS variables (globals.css) so ia-* utilities
        // follow light/dark. The dark palette is verified in design-tokens.md.
        ia: {
          "blue-hero": "var(--ia-blue-hero)", // #0066bf / dark #4ea3e0
          "blue-accent": "var(--ia-blue-accent)", // #1e73be / dark #7cb8e8
          "blue-deep": "var(--ia-blue-deep)", // #035a9e (both themes)
          "blue-membership": "var(--ia-blue-membership)", // #0c3d54
          text: "var(--ia-text)", // #222222 / dark #e8e8ed
          "text-2": "var(--ia-text-2)", // #575760 / dark #c4c4cc (>= 4.5:1)
          "text-muted": "var(--ia-text-muted)", // #b2b2be — borders/disabled only
          surface: "var(--ia-surface)", // #ffffff / dark #1a1b1c
          "surface-2": "var(--ia-surface-2)", // #f7f8f9 / dark #242526
          "surface-3": "var(--ia-surface-3)", // #f0f0f0 / dark #2e2f30
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "Oxygen-Sans",
          "Ubuntu",
          "Cantarell",
          "Helvetica Neue",
          "sans-serif",
        ],
      },
      // WordPress spacing presets carried over from the live theme.
      spacing: {
        "ia-20": "0.44rem",
        "ia-30": "0.67rem",
        "ia-40": "1rem",
        "ia-50": "1.5rem",
        "ia-60": "2.25rem",
        "ia-70": "3.38rem",
        "ia-80": "5.06rem",
      },
      // WordPress shadow presets from docs/design-tokens.md.
      boxShadow: {
        "ia-natural": "6px 6px 9px rgba(0,0,0,0.2)",
        "ia-deep": "12px 12px 50px rgba(0,0,0,0.4)",
        "ia-sharp": "6px 6px 0px rgba(0,0,0,0.2)",
        "ia-crisp": "6px 6px 0px rgb(0,0,0)",
      },
      // Default focus-ring offset matches the foundation contract (offset 2).
      ringOffsetWidth: {
        DEFAULT: "2px",
      },
    },
  },
  plugins: [tailwindcssAnimate],
};

export default config;
