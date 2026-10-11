/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          violet: '#8b5cf6',
          violetGlow: '#a855f7',
          cyan: '#06b6d4',
          cyanGlow: '#22d3ee',
          darkBg: '#090a10',
          darkSurface: '#121420',
          darkPanel: '#1a1c2e',
          darkBorder: '#272a44',
          lightBg: '#f8fafc',
          lightSurface: '#ffffff',
          lightPanel: '#f1f5f9',
          lightBorder: '#e2e8f0',
        }
      },
      boxShadow: {
        'glow-violet': '0 0 20px -3px rgba(139, 92, 246, 0.45)',
        'glow-cyan': '0 0 20px -3px rgba(6, 182, 212, 0.45)',
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.37)'
      },
      backdropBlur: {
        'xs': '2px',
      }
    },
  },
  plugins: [],
}
