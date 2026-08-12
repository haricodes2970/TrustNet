/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // TrustNet PRD design system — the only brand tokens.
        trust: {
          paper: '#F7F5EF',    // warm page background (never pure white)
          ink: '#0E1A2B',      // primary text / headings
          verified: '#0F6E5C', // approved / positive / primary action
          signal: '#C8862B',   // pending / attention / secondary accent
          alert: '#B23A32',    // rejected / error / destructive
          slate: '#5B6472',    // secondary text / borders / dividers
        },
        // The old emerald `brand` scale (0 usages) and the green `slate`
        // override were removed. `slate-*` now falls back to Tailwind's
        // neutral default; use the `trust-*` tokens for all brand surfaces.
      },
      fontFamily: {
        display: ['Fraunces', 'Georgia', 'serif'],
        sans: ['IBM Plex Sans', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['IBM Plex Mono', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        // One soft elevation only (PRD): cards / modals / dropdowns.
        'soft-sm': '0 2px 8px rgba(14, 26, 43, 0.08)',
        'soft-md': '0 2px 8px rgba(14, 26, 43, 0.08)',
        'soft-lg': '0 2px 8px rgba(14, 26, 43, 0.08)',
      },
    },
  },
  plugins: [],
}
