import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: "#F4F3EE",
        lime: {
          DEFAULT: "#E4F65B",
          accent: "#E4F65B",
          dark: "#D4E64A",
          muted: "#EBF886",
        },
        olive: {
          DEFAULT: "#223309",
          dark: "#1A2707",
          deep: "#142004",
          surface: "#2A3E0C",
        },
        charcoal: {
          DEFAULT: "#1A1B18",
          ink: "#1A1B18",
          light: "#2E302B",
          muted: "#5A5D54",
        },
        stone: {
          surface: "#E5E4DE",
          border: "#DCDAD3",
          light: "#F0EFEA",
        },
      },
      fontFamily: {
        sans: ["var(--font-plus-jakarta-sans)", "Plus Jakarta Sans", "system-ui", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "Monaco", "Consolas", "monospace"],
      },
      letterSpacing: {
        tightDisplay: "-0.025em",
        wideLabel: "0.08em",
      },
      borderRadius: {
        card: "30px",
        cardSm: "24px",
        pill: "9999px",
      },
      boxShadow: {
        tactile: "0 10px 30px -10px rgba(26, 27, 24, 0.08)",
        tactileCard: "0 14px 34px -12px rgba(34, 51, 9, 0.12)",
        tactileElevated: "0 20px 40px -15px rgba(26, 27, 24, 0.18)",
        glowLime: "0 0 24px -4px rgba(228, 246, 91, 0.6)",
      },
      keyframes: {
        wave: {
          "0%, 100%": { transform: "scaleY(0.4)" },
          "50%": { transform: "scaleY(1)" },
        },
        pulseSubtle: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.7" },
        },
      },
      animation: {
        wave: "wave 1.2s ease-in-out infinite",
        pulseSubtle: "pulseSubtle 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
    },
  },
  plugins: [],
};

export default config;
