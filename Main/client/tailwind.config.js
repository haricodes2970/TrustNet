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
        // Legacy alias kept for upstream components that reference it;
        // maps to the same TrustNet token palette (no emerald).
        trustnet: {
          bg: '#F7F5EF',
          text: '#0E1A2B',
          primary: '#0F6E5C',
          pending: '#C8862B',
          rejected: '#B23A32',
          secondary: '#5B6472',
        },
      },
      fontFamily: {
        sans: ['IBM Plex Sans', 'Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
        display: ['Fraunces', 'Georgia', 'serif'],
        mono: ['IBM Plex Mono', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        // One soft elevation only (PRD): cards / modals / dropdowns.
        'soft-sm': '0 2px 8px rgba(14, 26, 43, 0.08)',
        'soft-md': '0 2px 8px rgba(14, 26, 43, 0.08)',
        'soft-lg': '0 2px 8px rgba(14, 26, 43, 0.08)',
        'trustnet-shadow': '0 2px 8px rgba(14, 26, 43, 0.08)',
      },
    },
  },
  plugins: [],
}
