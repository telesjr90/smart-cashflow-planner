import defaultTheme from "tailwindcss/defaultTheme";

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
    "./tests/**/*.{js,ts,jsx,tsx}",
    "./public/**/*.{html,js}",
    "./docs/**/*.{md,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      spacing: {
        "0.5": "0.125rem",
        "1": "0.25rem",
        "1.5": "0.375rem",
        "2": "0.5rem",
        "2.5": "0.625rem",
        "3": "0.75rem",
        "3.5": "0.875rem",
        "4": "1rem",
        "5": "1.25rem",
        "6": "1.5rem",
        "8": "2rem",
        "10": "2.5rem",
        "12": "3rem",
        "16": "4rem",
        "20": "5rem",
        "24": "6rem",
      },
      colors: {
        primary: {
          50: "rgb(var(--primary-50))",
          100: "rgb(var(--primary-100))",
          500: "rgb(var(--primary-500))",
          600: "rgb(var(--primary-600))",
          700: "rgb(var(--primary-700))",
          900: "rgb(var(--primary-900))",
        },
        secondary: {
          500: "rgb(var(--secondary-500))",
        },
        surface: {
          50: "rgb(var(--surface-50))",
          100: "rgb(var(--surface-100))",
          200: "rgb(var(--surface-200))",
          300: "rgb(var(--surface-300))",
          500: "rgb(var(--surface-500))",
          900: "rgb(var(--surface-900))",
        },
        success: { 500: "rgb(var(--success-500))" },
        danger: { 500: "rgb(var(--danger-500))" },
        warning: { 500: "rgb(var(--warning-500))" },
      },
      fontFamily: {
        sans: ["Inter", ...defaultTheme.fontFamily.sans],
      },
      fontSize: {
        "title-2xl": [
          "2rem",
          { lineHeight: "2.5rem", fontWeight: "700", letterSpacing: "-0.02em" },
        ],
        "title-xl": [
          "1.5rem",
          { lineHeight: "2rem", fontWeight: "700", letterSpacing: "-0.01em" },
        ],
        "title-l": ["1.125rem", { lineHeight: "1.5rem", fontWeight: "600" }],
        body: ["0.9375rem", { lineHeight: "1.5rem", fontWeight: "400" }],
        caption: ["0.75rem", { lineHeight: "1rem", fontWeight: "500" }],
        tiny: [
          "0.625rem",
          {
            lineHeight: "0.875rem",
            fontWeight: "600",
            textTransform: "uppercase",
          },
        ],
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.25rem",
        "3xl": "1.75rem",
        pill: "9999px",
      },
      boxShadow: {
        soft: "0 4px 20px -2px rgba(0, 0, 0, 0.05)",
        glow: "0 4px 20px -2px rgba(124, 58, 237, 0.25)",
      },
    },
  },
  plugins: [],
};
