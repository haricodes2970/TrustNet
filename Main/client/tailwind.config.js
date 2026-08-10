/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        trust: {
          paper: '#F7F5EF',
          ink: '#0E1A2B',
          verified: '#0F6E5C',
          signal: '#C8862B',
          alert: '#B23A32',
          slate: '#5B6472',
        },
        brand: {
          50: '#ecfdf5',
          100: '#d1fae5',
          200: '#a7f3d0',
          300: '#6ee7b7',
          400: '#34d399',
          500: '#10b981', // Primary brand color
          600: '#059669',
          700: '#047857',
          800: '#065f46',
          900: '#064e3b',
          950: '#022c22',
        },
        slate: {
          50: '#f8faf9',
          100: '#eef5f2',
          200: '#dce8e2',
          300: '#b8d3c9',
          400: '#89b4a7',
          500: '#669b86',
          600: '#4f7a6c',
          700: '#3d5f53',
          800: '#2f4b42',
          900: '#183731',
          950: '#10261f',
        },
      },
      fontFamily: {
        display: ['Fraunces', 'Georgia', 'serif'],
        sans: ['IBM Plex Sans', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['IBM Plex Mono', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        'soft-sm': '0 8px 24px rgba(14, 26, 43, 0.08)',
        'soft-md': '0 8px 24px rgba(14, 26, 43, 0.08)',
        'soft-lg': '0 8px 24px rgba(14, 26, 43, 0.08)',
      },
      backdropBlur: {
        xs: '2px',
      }
    },
  },
  plugins: [],
}
