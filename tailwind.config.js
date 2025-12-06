/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class', // Enables manual toggling via the 'dark' class
  theme: {
    extend: {
      colors: {
        primary: {
          50: 'rgb(var(--primary-50))',
          100: 'rgb(var(--primary-100))',
          500: 'rgb(var(--primary-500))',
          600: 'rgb(var(--primary-600))',
          700: 'rgb(var(--primary-700))',
          900: 'rgb(var(--primary-900))',
        },
        surface: {
          50: 'rgb(var(--surface-50))',
          100: 'rgb(var(--surface-100))',
          200: 'rgb(var(--surface-200))',
          300: 'rgb(var(--surface-300))',
          400: 'rgb(var(--surface-400))',
          500: 'rgb(var(--surface-500))',
          900: 'rgb(var(--surface-900))',
        },
        success: {
          50: 'rgb(var(--success-50))',
          500: 'rgb(var(--success-500))',
          700: 'rgb(var(--success-700))',
        },
        danger: {
          50: 'rgb(var(--danger-50))',
          500: 'rgb(var(--danger-500))',
          700: 'rgb(var(--danger-700))',
        },
        warning: {
          50: 'rgb(var(--warning-50))',
          500: 'rgb(var(--warning-500))',
          700: 'rgb(var(--warning-700))',
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
