/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: '#080D18',
          secondary: '#0D1526',
          card: '#111827',
          elevated: '#1A2236',
        },
        border: {
          DEFAULT: '#1F2937',
          subtle: '#161E2E',
        },
        accent: {
          blue: '#3B82F6',
          'blue-hover': '#2563EB',
        },
        bull: {
          DEFAULT: '#10B981',
          dim: '#064E3B',
          text: '#34D399',
        },
        bear: {
          DEFAULT: '#EF4444',
          dim: '#450A0A',
          text: '#F87171',
        },
        watch: {
          DEFAULT: '#F59E0B',
          dim: '#451A03',
          text: '#FCD34D',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
