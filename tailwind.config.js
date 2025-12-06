/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // 1. Finzo Color Palette
      colors: {
        // Primary Brand (Indigo-ish)
        primary: {
          50: '#eef2ff',
          100: '#e0e7ff',
          500: '#6366f1',
          600: '#4f46e5', // Main action color
          700: '#4338ca',
          900: '#312e81',
        },
        // Surface / Backgrounds (Slate-ish)
        surface: {
          50: '#f8fafc', // App background
          100: '#f1f5f9', // Card background / hover
          200: '#e2e8f0', // Borders
          900: '#0f172a', // Dark text
        },
        // Semantic Colors
        success: {
          50: '#f0fdf4',
          500: '#22c55e',
          700: '#15803d',
        },
        danger: {
          50: '#fef2f2',
          500: '#ef4444',
          700: '#b91c1c',
        },
        warning: {
          50: '#fffbeb',
          500: '#f59e0b',
          700: '#b45309',
        }
      },
      // 2. Typography System
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      fontSize: {
        'title-xl': ['1.5rem', { lineHeight: '2rem', letterSpacing: '-0.02em', fontWeight: '700' }], // 24px
        'title-l': ['1.125rem', { lineHeight: '1.75rem', letterSpacing: '-0.01em', fontWeight: '600' }], // 18px
        'body': ['0.875rem', { lineHeight: '1.25rem', fontWeight: '400' }], // 14px
        'caption': ['0.75rem', { lineHeight: '1rem', fontWeight: '500' }], // 12px
        'tiny': ['0.625rem', { lineHeight: '0.75rem', fontWeight: '500', textTransform: 'uppercase' }], // 10px caps
      },
      // 3. Spacing / Layout
      borderRadius: {
        'xl': '1rem',
        '2xl': '1.25rem',
        '3xl': '1.5rem',
      }
    },
  },
  plugins: [],
};
