import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        // Premium black + electric-blue dark theme. Token NAMES are kept
        // (iron/chalk/blood) so the 300+ existing usages flip automatically:
        // iron = near-black surfaces + slate borders, chalk = cool-white text,
        // blood = the electric blue accent.
        iron: {
          950: '#05070D', // page background (near-black, blue-tinted)
          900: '#0C111C', // cards / panels
          800: '#141A28', // elevated surface / hover
          700: '#1E2636', // hairline borders
          600: '#2C3548', // stronger / hover borders
          500: '#3D4862', // dividers / disabled fills
          400: '#6B7587', // placeholder text
          300: '#8A93A6',
        },
        chalk: {
          DEFAULT: '#F4F7FB', // cool white — primary text
          dim: '#AEB9CC', // secondary text
          mute: '#737E92', // tertiary / muted
        },
        blood: {
          DEFAULT: '#3B82F6', // electric blue accent
          dim: '#2563EB', // pressed / deep fill
          glow: '#60A5FA', // hover / bright accent
        },
        blue: {
          DEFAULT: '#3B82F6',
          deep: '#2563EB',
          bright: '#60A5FA',
          cyan: '#22D3EE',
          indigo: '#6366F1',
        },
        // light = text/contrast surfaces, ink = darkest (scrims/fills)
        cream: { DEFAULT: '#F4F7FB', deep: '#E2E8F2' },
        ink: { DEFAULT: '#05070D', dim: '#0C111C', mute: '#141A28' },
        rpe: {
          easy: '#4ADE80',
          mod: '#FACC15',
          hard: '#FB923C',
          max: '#F87171',
        },
      },
      fontFamily: {
        display: ['var(--font-display)', 'Space Grotesk', 'system-ui', 'sans-serif'],
        body: ['var(--font-body)', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(59,130,246,0.35), 0 10px 30px -10px rgba(59,130,246,0.45)',
        'glow-sm': '0 0 0 1px rgba(59,130,246,0.30), 0 6px 18px -8px rgba(59,130,246,0.40)',
        card: '0 1px 0 0 rgba(255,255,255,0.03) inset, 0 18px 40px -24px rgba(0,0,0,0.8)',
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
