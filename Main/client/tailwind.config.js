/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
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
        trustnet: {
          bg: '#F7F5EF',
          text: '#0E1A2B',
          primary: '#0F6E5C',
          pending: '#C8862B',
          rejected: '#B23A32',
          secondary: '#5B6472',
        }
      },
      fontFamily: {
        sans: ['IBM Plex Sans', 'Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
        display: ['Fraunces', 'serif'],
        mono: ['IBM Plex Mono', 'monospace'],
      },
      boxShadow: {
        'soft-sm': '0 2px 8px -2px rgba(16, 185, 129, 0.08), 0 1px 4px -1px rgba(0, 0, 0, 0.04)',
        'soft-md': '0 8px 24px -4px rgba(16, 185, 129, 0.12), 0 4px 12px -2px rgba(0, 0, 0, 0.04)',
        'soft-lg': '0 16px 36px -6px rgba(16, 185, 129, 0.16), 0 8px 20px -4px rgba(0, 0, 0, 0.06)',
        'glass': '0 8px 32px 0 rgba(16, 185, 129, 0.06)',
        'trustnet-shadow': '0 2px 8px rgba(14,26,43,0.08)',
      },
      backdropBlur: {
        xs: '2px',
      }
    },
  },
  plugins: [],
}
