import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
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
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
        // YFitOps brand tokens
        void: "#060609",
        base: "#0C0C12",
        surface: "#111118",
        elevated: "#16161F",
        overlay: "#1C1C27",
        "mint-400": "#00F5A0",
        "mint-300": "#1AFFB8",
        "mint-500": "#00D488",
        "violet-400": "#9B6EF5",
        "violet-500": "#7C3AED",
        "violet-600": "#6025C4",
        "danger-red": "#FF4D6D",
        "warn-yellow": "#FBBF24",
        "info-blue": "#38BDF8",
      },
      fontFamily: {
        display: ["Orbitron", "sans-serif"],
        body: ["DM Sans", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
      },
      fontSize: {
        "2xs": ["10px", { lineHeight: "1.3" }],
        xs:   ["11px", { lineHeight: "1.4" }],
        sm:   ["12px", { lineHeight: "1.4" }],
        base: ["14px", { lineHeight: "1.5" }],
        md:   ["16px", { lineHeight: "1.6" }],
        lg:   ["18px", { lineHeight: "1.5" }],
        xl:   ["20px", { lineHeight: "1.5" }],
        "2xl": ["24px", { lineHeight: "1.3" }],
        "3xl": ["30px", { lineHeight: "1.2" }],
        "4xl": ["36px", { lineHeight: "1.2" }],
        "5xl": ["48px", { lineHeight: "1.1" }],
        "6xl": ["60px", { lineHeight: "1" }],
        "7xl": ["72px", { lineHeight: "1" }],
      },
      spacing: {
        "4.5": "18px",
        "13": "52px",
        "15": "60px",
        "18": "72px",
        "22": "88px",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        xl: "12px",
        "2xl": "16px",
        "3xl": "24px",
      },
      boxShadow: {
        "accent": "0 0 24px rgba(0,245,160,0.2), 0 0 48px rgba(0,245,160,0.08)",
        "accent-strong": "0 0 32px rgba(0,245,160,0.4), 0 0 64px rgba(0,245,160,0.15)",
        "violet": "0 0 24px rgba(124,58,237,0.2)",
        "glow-sm": "0 0 10px rgba(0,245,160,0.3)",
        "inner-accent": "inset 0 0 20px rgba(0,245,160,0.05)",
      },
      backgroundImage: {
        "mesh-dark":
          "radial-gradient(ellipse 80% 60% at 20% 0%, rgba(0,245,160,0.04) 0%, transparent 60%), radial-gradient(ellipse 60% 80% at 80% 100%, rgba(124,58,237,0.05) 0%, transparent 60%), radial-gradient(ellipse 40% 40% at 50% 50%, rgba(0,245,160,0.02) 0%, transparent 70%)",
        "gradient-accent":
          "linear-gradient(135deg, #00F5A0 0%, #00D488 100%)",
        "gradient-violet":
          "linear-gradient(135deg, #9B6EF5 0%, #7C3AED 100%)",
        "gradient-card":
          "linear-gradient(135deg, rgba(17,17,24,0.9) 0%, rgba(22,22,31,0.9) 100%)",
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
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
      transitionTimingFunction: {
        spring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
        smooth: "cubic-bezier(0.4, 0, 0.2, 1)",
        "out-back": "cubic-bezier(0.175, 0.885, 0.32, 1.275)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
