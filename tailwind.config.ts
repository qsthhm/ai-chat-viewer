import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#FEF7F4',
          100: '#FDEEE8',
          200: '#F9D4C5',
          300: '#F2B09A',
          400: '#E8886A',
          500: '#D4603A',
          600: '#C05432',
          700: '#9E4429',
          800: '#7A3520',
          900: '#5C2818',
        },
        surface: {
          0: '#FFFFFF',
          50: '#FAF9F7',
          100: '#F5F3F0',
          200: '#EDE9E3',
          300: '#E7E5E4',
          400: '#D6D3D1',
          500: '#A8A29E',
          600: '#78716C',
          700: '#57534E',
          800: '#292524',
          900: '#1C1917',
        },
      },
      fontFamily: {
        sans: ['DM Sans', 'system-ui', 'sans-serif'],
        serif: ['Newsreader', 'Georgia', 'serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease forwards',
        'slide-up': 'slideUp 0.35s ease forwards',
        'scale-in': 'scaleIn 0.2s ease forwards',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(10px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          from: { opacity: '0', transform: 'scale(0.96)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
      },
    },
  },
  plugins: [],
}
export default config
