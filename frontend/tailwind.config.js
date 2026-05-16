/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        /** Main brand — deep aqua / teal */
        primary: "rgb(15 118 110 / <alpha-value>)",
        /** Softer teal for secondary text / icons */
        secondary: "rgb(72 110 106 / <alpha-value>)",
        /** Fresh light green for positive / progress */
        success: "rgb(52 143 95 / <alpha-value>)",
        /** Explicit accents (use with bg-aqua-soft, bg-mint, etc.) */
        aqua: "rgb(15 118 110 / <alpha-value>)",
        "aqua-bright": "rgb(45 212 191 / <alpha-value>)",
        "aqua-soft": "rgb(204 251 241 / <alpha-value>)",
        mint: "rgb(209 250 229 / <alpha-value>)",
        "mint-strong": "rgb(167 243 208 / <alpha-value>)",
        warning: "rgb(161 98 7 / <alpha-value>)",
        danger: "rgb(153 27 27 / <alpha-value>)",
        surface: "rgb(255 255 255 / <alpha-value>)",
        /** Page backdrop — barely aqua */
        canvas: "rgb(244 251 249 / <alpha-value>)",
        ink: "rgb(38 38 38 / <alpha-value>)",
        neutral: "rgb(241 249 246 / <alpha-value>)",
        line: "rgb(214 232 226 / <alpha-value>)",
      },
      fontFamily: {
        serif: ['"Times New Roman"', "Times", "ui-serif", "Georgia", "serif"],
        display: ['"Times New Roman"', "Times", "ui-serif", "Georgia", "serif"],
        body: ['"Times New Roman"', "Times", "ui-serif", "Georgia", "serif"],
        mono: ['"Times New Roman"', "Times", "ui-serif", "Georgia", "serif"],
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
        md: "6px",
        lg: "8px",
        xl: "12px",
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
        artistic: "0 1px 2px rgba(15,118,110,0.06)",
        bold: "0 1px 3px rgba(15,118,110,0.08), 0 1px 2px rgba(0,0,0,0.04)",
        glow: "0 0 0 2px rgba(45,212,191,0.35)",
        inset: "inset 0 1px 0 rgba(255,255,255,0.85)",
      },
      backgroundImage: {
        "artistic-gradient": "linear-gradient(165deg, #ecfdf5 0%, #f4fbf9 45%, #f0fdfa 100%)",
        "soft-gradient": "linear-gradient(180deg, #ffffff 0%, #f4fbf9 100%)",
        grid: "linear-gradient(rgba(15,118,110,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(15,118,110,0.06) 1px, transparent 1px)",
      },
      keyframes: {
        shimmer: {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(100%)" },
        },
        rise: {
          "0%": { transform: "translateY(6px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
      },
      animation: {
        shimmer: "shimmer 2s linear infinite",
        rise: "rise 0.35s ease-out",
      },
    },
  },
  plugins: [],
};
