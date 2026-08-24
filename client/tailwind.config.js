/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#0A0F1C',
        surface: {
          DEFAULT: '#0D1424',
          subtle: '#111A2E',
          card: '#131E35',
          border: 'rgba(255, 255, 255, 0.08)',
          'border-bright': 'rgba(255, 255, 255, 0.16)',
        },
        brand: {
          blue: '#3B82F6',
          cyan: '#38BDF8',
          pink: '#EC4899',
          purple: '#8B5CF6',
        },
        signal: {
          green: '#10B981',
          emerald: '#059669',
          amber: '#F59E0B',
          yellow: '#FBBF24',
          red: '#EF4444',
          rose: '#F43F5E',
        },
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
        sans: ['Inter', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"Roboto Mono"', 'monospace'],
      },
      animation: {
        'pulse-subtle': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'scan-line': 'scanline 2s ease-in-out infinite',
        'flash-valid': 'flashValid 0.6s ease-out',
        'flash-duplicate': 'flashDuplicate 0.6s ease-out',
        'flash-invalid': 'flashInvalid 0.6s ease-out',
        'scale-in': 'scaleIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
      },
      keyframes: {
        scanline: {
          '0%, 100%': { transform: 'translateY(-100%)', opacity: '0.2' },
          '50%': { transform: 'translateY(100%)', opacity: '0.8' },
        },
        flashValid: {
          '0%': { backgroundColor: 'rgba(16, 185, 129, 0.4)' },
          '100%': { backgroundColor: 'transparent' },
        },
        flashDuplicate: {
          '0%': { backgroundColor: 'rgba(245, 158, 11, 0.4)' },
          '100%': { backgroundColor: 'transparent' },
        },
        flashInvalid: {
          '0%': { backgroundColor: 'rgba(239, 68, 68, 0.4)' },
          '100%': { backgroundColor: 'transparent' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
