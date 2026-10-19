/** @type {import('tailwindcss').Config} */
// Tailwind serves only the shadcn-style components in src/components/ui; the
// rest of the app keeps its hand-written CSS (src/styles/theme.css). Preflight
// is off so Tailwind's reset never restyles existing pages.
module.exports = {
  content: ['./src/components/ui/**/*.{ts,tsx}'],
  corePlugins: { preflight: false },
  theme: {
    extend: {
      colors: {
        pitch: { DEFAULT: '#018751', deep: '#016e42', light: '#1fb574' },
        slab: { black: '#0a0a0a', chalk: '#f4f4f0' },
      },
      fontFamily: {
        display: ['var(--font-display)'],
        num: ['var(--font-num)'],
        body: ['var(--font-body)'],
      },
    },
  },
  plugins: [],
};
