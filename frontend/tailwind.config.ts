import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          950: '#0a0f1e',
          900: '#0d1426',
          800: '#141b2d',
          700: '#1a2235',
          600: '#1e293b',
          500: '#253047',
          400: '#334155',
        },
        accent: {
          DEFAULT: '#38bdf8',
          50:  '#f0f9ff',
          100: '#e0f2fe',
          500: '#0ea5e9',
          600: '#0284c7',
        },
        status: {
          clean:       '#22c55e',
          dirty:       '#ef4444',
          cleaning:    '#eab308',
          occupied:    '#3b82f6',
          maintenance: '#f97316',
        },
        urgency: {
          critical: '#f87171',
          high:     '#fb923c',
          normal:   '#facc15',
          low:      '#86efac',
        },
      },
      fontFamily: {
        sora: ['Sora', 'sans-serif'],
        dm:   ['DM Sans', 'sans-serif'],
      },
      keyframes: {
        fadeIn: {
          '0%':   { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideRight: {
          '0%':   { opacity: '0', transform: 'translateX(-10px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        glow: {
          '0%, 100%': { boxShadow: '0 0 6px 2px rgba(56,189,248,0.3)' },
          '50%':      { boxShadow: '0 0 16px 6px rgba(56,189,248,0.6)' },
        },
        statusGlow: {
          '0%':   { boxShadow: '0 0 0 0 rgba(56,189,248,0.6)' },
          '70%':  { boxShadow: '0 0 0 10px rgba(56,189,248,0)' },
          '100%': { boxShadow: '0 0 0 0 rgba(56,189,248,0)' },
        },
        countUp: {
          '0%':   { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseDot: {
          '0%, 100%': { transform: 'scale(1)',   opacity: '1' },
          '50%':      { transform: 'scale(1.4)', opacity: '0.7' },
        },
      },
      animation: {
        'fade-in':    'fadeIn 0.25s ease-out',
        'slide-right': 'slideRight 0.3s ease-out',
        'glow':       'glow 2s ease-in-out infinite',
        'status-glow':'statusGlow 0.8s ease-out',
        'count-up':   'countUp 0.5s ease-out',
        'pulse-dot':  'pulseDot 1.5s ease-in-out infinite',
      },
      backgroundImage: {
        'gradient-navy': 'linear-gradient(135deg, #0a0f1e 0%, #0d1426 100%)',
        'gradient-card': 'linear-gradient(135deg, #1e293b 0%, #253047 100%)',
        'gradient-accent': 'linear-gradient(135deg, #38bdf8 0%, #0ea5e9 100%)',
      },
    },
  },
  plugins: [],
} satisfies Config
