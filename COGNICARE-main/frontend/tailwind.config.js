/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class', // toggled by adding 'dark' class to <html>
  theme: {
    extend: {
      colors: {
        // All colours point to CSS variables so a single .dark block
        // on <html> remaps the entire palette — no per-component dark: classes needed.
        primary: {
          50:  'var(--c-primary-50)',
          100: 'var(--c-primary-100)',
          200: 'var(--c-primary-200)',
          300: 'var(--c-primary-300)',
          400: 'var(--c-primary-400)',
          500: 'var(--c-primary-500)',
          600: 'var(--c-primary-600)',
          700: 'var(--c-primary-700)',
          800: 'var(--c-primary-800)',
          900: 'var(--c-primary-900)',
        },
        secondary: {
          50:  'var(--c-secondary-50)',
          100: 'var(--c-secondary-100)',
          200: 'var(--c-secondary-200)',
          300: 'var(--c-secondary-300)',
          400: 'var(--c-secondary-400)',
          500: 'var(--c-secondary-500)',
          600: 'var(--c-secondary-600)',
          700: 'var(--c-secondary-700)',
          800: 'var(--c-secondary-800)',
          900: 'var(--c-secondary-900)',
        },
        danger: {
          50:  'var(--c-danger-50)',
          100: 'var(--c-danger-100)',
          400: 'var(--c-danger-400)',
          500: 'var(--c-danger-500)',
          600: 'var(--c-danger-600)',
          700: 'var(--c-danger-700)',
        },
        warm: {
          50:  'var(--c-warm-50)',
          100: 'var(--c-warm-100)',
          200: 'var(--c-warm-200)',
          300: 'var(--c-warm-300)',
          400: 'var(--c-warm-400)',
          500: 'var(--c-warm-500)',
          600: 'var(--c-warm-600)',
          700: 'var(--c-warm-700)',
          800: 'var(--c-warm-800)',
          900: 'var(--c-warm-900)',
        },
        // Surface tokens used directly in component classes
        surface: {
          base:    'var(--surface-base)',    // page background
          raised:  'var(--surface-raised)',  // cards / nav bars
          overlay: 'var(--surface-overlay)', // modals
          input:   'var(--surface-input)',   // form inputs
          border:  'var(--surface-border)',  // all borders
        },
        content: {
          primary:   'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          muted:     'var(--text-muted)',
          inverted:  'var(--text-inverted)',
        },
      },
      fontSize: {
        'xs':   ['0.875rem',  { lineHeight: '1.5' }],
        'sm':   ['1rem',      { lineHeight: '1.6' }],
        'base': ['1.125rem',  { lineHeight: '1.7' }],
        'lg':   ['1.25rem',   { lineHeight: '1.7' }],
        'xl':   ['1.5rem',    { lineHeight: '1.6' }],
        '2xl':  ['1.875rem',  { lineHeight: '1.4' }],
        '3xl':  ['2.25rem',   { lineHeight: '1.3' }],
        '4xl':  ['3rem',      { lineHeight: '1.2' }],
        '5xl':  ['3.75rem',   { lineHeight: '1.1' }],
      },
      spacing: { '18': '4.5rem', '22': '5.5rem', '26': '6.5rem', '30': '7.5rem' },
      borderRadius: { '2xl': '1rem', '3xl': '1.5rem', '4xl': '2rem' },
      boxShadow: {
        'card':  '0 4px 24px -2px rgba(0,0,0,0.08)',
        'soft':  '0 2px 12px rgba(0,0,0,0.06)',
        'glow':  '0 0 20px rgba(20,184,166,0.25)',
        'card-dark': '0 4px 24px -2px rgba(0,0,0,0.45)',
        'soft-dark': '0 2px 12px rgba(0,0,0,0.35)',
      },
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] },
      minHeight: { 'touch': '3rem' },
      minWidth:  { 'touch': '3rem' },
    },
  },
  plugins: [],
};
