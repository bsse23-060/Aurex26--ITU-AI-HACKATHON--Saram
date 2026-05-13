/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "rgb(59 130 246 / <alpha-value>)",
        secondary: "rgb(139 92 246 / <alpha-value>)",
        success: "rgb(22 163 74 / <alpha-value>)",
        warning: "rgb(217 119 6 / <alpha-value>)",
        danger: "rgb(220 38 38 / <alpha-value>)",
        surface: "rgb(255 255 255 / <alpha-value>)",
        canvas: "rgb(248 250 252 / <alpha-value>)",
        ink: "rgb(17 24 39 / <alpha-value>)",
        neutral: "rgb(255 255 255 / <alpha-value>)",
      },
      fontFamily: {
        display: ['"Limelight"', "cursive"],
        body: ['"Inter"', "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono"', "ui-monospace", "monospace"],
      },
      fontSize: {
        12: ["12px", { lineHeight: "16px" }],
        14: ["14px", { lineHeight: "20px" }],
        16: ["16px", { lineHeight: "24px" }],
        18: ["18px", { lineHeight: "26px" }],
        20: ["20px", { lineHeight: "28px" }],
        22: ["22px", { lineHeight: "30px" }],
        24: ["24px", { lineHeight: "32px" }],
        30: ["30px", { lineHeight: "36px" }],
        36: ["36px", { lineHeight: "42px" }],
        48: ["48px", { lineHeight: "54px" }],
        h1: ["2.25rem", { lineHeight: "2.6rem" }],
      },
      fontWeight: {
        hairline: "100",
        extralight: "200",
        light: "300",
        book: "400",
        medium: "500",
        semibold: "600",
        bold: "700",
        extrabold: "800",
        black: "900",
      },
      borderRadius: {
        sm: "4px",
        md: "8px",
        lg: "12px",
        xl: "20px",
      },
      spacing: {
        4: "4px",
        8: "8px",
        12: "12px",
        16: "16px",
        24: "24px",
        32: "32px",
        48: "48px",
        64: "64px",
      },
      boxShadow: {
        artistic: "0 4px 24px rgba(59, 130, 246, 0.12), 0 12px 48px rgba(139, 92, 246, 0.08)",
        bold: "0 8px 32px rgba(17, 24, 39, 0.18)",
        glow: "0 0 0 4px rgba(139, 92, 246, 0.18)",
        inset: "inset 0 1px 0 rgba(255,255,255,0.6), inset 0 -2px 0 rgba(17,24,39,0.06)",
      },
      backgroundImage: {
        "artistic-gradient":
          "linear-gradient(135deg, #3B82F6 0%, #8B5CF6 50%, #DC2626 100%)",
        "soft-gradient":
          "linear-gradient(135deg, rgba(59,130,246,0.10), rgba(139,92,246,0.10) 50%, rgba(220,38,38,0.06))",
        grid: "linear-gradient(rgba(17,24,39,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(17,24,39,0.06) 1px, transparent 1px)",
      },
      keyframes: {
        "blob-drift": {
          "0%, 100%": { transform: "translate(0,0) scale(1)" },
          "33%": { transform: "translate(30px,-20px) scale(1.05)" },
          "66%": { transform: "translate(-20px,20px) scale(0.95)" },
        },
        shimmer: {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(100%)" },
        },
        rise: {
          "0%": { transform: "translateY(8px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        pulseRing: {
          "0%": { boxShadow: "0 0 0 0 rgba(139,92,246,0.6)" },
          "70%": { boxShadow: "0 0 0 14px rgba(139,92,246,0)" },
          "100%": { boxShadow: "0 0 0 0 rgba(139,92,246,0)" },
        },
      },
      animation: {
        "blob-drift": "blob-drift 14s ease-in-out infinite",
        shimmer: "shimmer 2s linear infinite",
        rise: "rise 0.45s cubic-bezier(0.22, 1, 0.36, 1)",
        "pulse-ring": "pulseRing 2.2s infinite",
      },
    },
  },
  plugins: [],
};
