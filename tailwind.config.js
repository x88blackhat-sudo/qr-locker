/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./client/index.html', './client/src/**/*.{ts,tsx}', './shared/**/*.ts'],
  theme: {
    extend: {
      colors: {
        bg: 'rgb(var(--c-bg) / <alpha-value>)',
        surface: 'rgb(var(--c-surface) / <alpha-value>)',
        'surface-2': 'rgb(var(--c-surface-2) / <alpha-value>)',
        elevated: 'rgb(var(--c-elevated) / <alpha-value>)',
        line: 'rgb(var(--c-line) / <alpha-value>)',
        'line-strong': 'rgb(var(--c-line-strong) / <alpha-value>)',
        ink: 'rgb(var(--c-ink) / <alpha-value>)',
        muted: 'rgb(var(--c-muted) / <alpha-value>)',
        subtle: 'rgb(var(--c-subtle) / <alpha-value>)',
        primary: 'rgb(var(--c-primary) / <alpha-value>)',
        'primary-strong': 'rgb(var(--c-primary-strong) / <alpha-value>)',
        'primary-soft': 'rgb(var(--c-primary-soft) / <alpha-value>)',
        navy: 'rgb(var(--c-navy) / <alpha-value>)',
        gold: 'rgb(var(--c-gold) / <alpha-value>)',
        success: 'rgb(var(--c-success) / <alpha-value>)',
        warning: 'rgb(var(--c-warning) / <alpha-value>)',
        danger: 'rgb(var(--c-danger) / <alpha-value>)',
      },
      fontFamily: {
        sans: ['"IBM Plex Sans Arabic"', 'system-ui', 'sans-serif'],
        display: ['"Alexandria Variable"', '"IBM Plex Sans Arabic"', 'sans-serif'],
      },
      borderRadius: {
        sm: '0.5rem',
        md: '0.75rem',
        lg: '1rem',
        xl: '1.25rem',
        '2xl': '1.5rem',
        '3xl': '2rem',
      },
      boxShadow: {
        xs: '0 1px 2px rgb(var(--c-shadow) / 0.05)',
        sm: '0 1px 3px rgb(var(--c-shadow) / 0.06), 0 1px 2px rgb(var(--c-shadow) / 0.04)',
        card: '0 1px 2px rgb(var(--c-shadow) / 0.04), 0 12px 32px -20px rgb(var(--c-shadow) / 0.28)',
        lift: '0 2px 4px rgb(var(--c-shadow) / 0.05), 0 24px 48px -28px rgb(var(--c-shadow) / 0.4)',
      },
      spacing: {
        '4.5': '1.125rem',
      },
      maxWidth: {
        shell: '1440px',
        prose: '68ch',
      },
      transitionTimingFunction: {
        out: 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        shimmer: {
          '100%': { transform: 'translateX(-100%)' },
        },
        'ring-draw': {
          '0%': { strokeDashoffset: 'var(--ring-dashoffset-start, 999)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.5s cubic-bezier(0.22, 1, 0.36, 1) both',
        'fade-in': 'fade-in 0.35s ease-out both',
      },
    },
  },
  plugins: [],
};
