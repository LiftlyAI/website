import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        iron: {
          950: '#0D0D0D',
          900: '#141414',
          800: '#1C1C1C',
          700: '#262626',
          600: '#383838',
          500: '#525252',
          400: '#737373',
          300: '#A3A3A3',
        },
        chalk: {
          DEFAULT: '#F0EDE8',
          dim: '#C9C5BD',
          mute: '#8A867F',
        },
        blood: {
          DEFAULT: '#E8440A',
          dim: '#B83607',
          glow: '#FF5A1F',
        },
        rpe: {
          easy: '#4ADE80',
          mod: '#FACC15',
          hard: '#F97316',
          max: '#EF4444',
        },
      },
      fontFamily: {
        display: ['var(--font-display)', 'Impact', 'sans-serif'],
        body: ['var(--font-body)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
      backgroundImage: {
        'chalk-grain':
          "radial-gradient(circle at 25% 25%, rgba(240,237,232,0.04) 1px, transparent 1px), radial-gradient(circle at 75% 75%, rgba(240,237,232,0.03) 1px, transparent 1px)",
        'plate-stripes':
          'repeating-linear-gradient(45deg, #1C1C1C 0px, #1C1C1C 8px, #141414 8px, #141414 16px)',
      },
      backgroundSize: {
        grain: '32px 32px',
      },
      animation: {
        'plate-spin': 'plate-spin 1.4s linear infinite',
        'chalk-fill': 'chalk-fill 0.8s ease-out forwards',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        'plate-spin': {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        'chalk-fill': {
          '0%': { width: '0%', opacity: '0.3' },
          '100%': { width: 'var(--fill-target, 100%)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
