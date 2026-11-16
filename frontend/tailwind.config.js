/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Sora', 'sans-serif'],
        display: ['Clash Display', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
        // Desktop-web redesign (landing + desktop app shell) — mobile keeps Sora
        inter: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
      },
      colors: {
        // Desktop-web redesign palette. Text uses Tailwind's default `slate`
        // (navy/charcoal), which this config leaves untouched.
        kb: {
          50:  '#FFF5ED',
          100: '#FFE8D5',
          200: '#FFD0AB',
          300: '#FFB07A',
          500: '#FF6B0A',
          600: '#E85D00',
          700: '#C24D00',
        },
        canvas: '#FAF9F7',
        brand: {
          50: '#fff7ed', 100: '#ffedd5', 200: '#fed7aa', 300: '#fdba74',
          400: '#fb923c', 500: '#f97316', 600: '#ea580c', 700: '#c2410c',
          800: '#9a3412', 900: '#7c2d12',
        },
        // Override Tailwind's warm stone with purple-tinted cool neutrals
        // matching the landing page palette exactly.
        stone: {
          50:  '#f7f6ff',   // app background — barely purple off-white
          100: '#ede9ff',   // card borders, hover backgrounds
          200: '#d4d0e8',   // input borders, dividers
          300: '#bab5d0',   // light placeholders
          400: '#9895b0',   // muted icons, inactive nav
          500: '#5e5a7a',   // secondary text
          600: '#4a4668',   // medium text
          700: '#36325a',   // strong secondary
          800: '#241f4a',   // near-headings
          900: '#16142e',   // primary ink — deep navy-purple
          950: '#0e0c20',   // darkest
        },
        // Purple accent (matches landing --purple / --purple-lt)
        violet: {
          50:  '#f5f3ff', 100: '#ede9fe', 200: '#ddd6fe', 300: '#c4b5fd',
          400: '#a78bfa', 500: '#8b5cf6', 600: '#7c3aed', 700: '#6d28d9',
          800: '#5b21b6', 900: '#4c1d95', 950: '#2e1065',
        },
      },
      animation: {
        'fade-in':    'fadeIn 0.3s ease-out',
        'slide-up':   'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.2s ease-out',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn:    { from: { opacity: 0 },                          to: { opacity: 1 } },
        slideUp:   { from: { opacity: 0, transform: 'translateY(16px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        slideDown: { from: { opacity: 0, transform: 'translateY(-8px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        pulseSoft: { '0%,100%': { opacity: 1 }, '50%': { opacity: 0.6 } },
      },
      boxShadow: {
        // Purple-tinted shadows to match landing page card depth
        'sm':  '0 1px 3px rgba(109,40,217,.06), 0 1px 2px rgba(22,20,46,.04)',
        'md':  '0 4px 16px rgba(109,40,217,.1),  0 2px 6px rgba(22,20,46,.06)',
        'lg':  '0 8px 32px rgba(109,40,217,.12), 0 4px 12px rgba(22,20,46,.08)',
        'xl':  '0 16px 48px rgba(109,40,217,.14),0 8px 20px rgba(22,20,46,.1)',
      },
    },
  },
  plugins: [],
}
