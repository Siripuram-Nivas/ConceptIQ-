/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#F7F5EE',
        fg: '#111111',
        muted: '#666666',
        inverse: '#000000',
        surface: {
          DEFAULT: '#FFFFFF',
          dark: '#111111',
          hover: '#EEEEEE'
        },
        accent: {
          yellow: '#FFD24A',
          pink: '#FD48F2',
          purple: '#3B308F',
          blue: '#0000EE',
          green: '#2AA876',
          red: '#E84C4C',
        },
        ai: '#3B308F', // Mapping legacy ai to purple
        'ai-light': '#EAE8F9',
        success: '#2AA876',
        'success-light': '#D4F0E3',
        warning: '#E84C4C',
        'warning-light': '#FADCDC',
        border: '#111111', // Strong black borders
      },
      fontFamily: {
        display: ['Degular', 'Arial', 'sans-serif'],
        body: ['Inter', 'Arial', 'sans-serif'],
      },
      fontSize: {
        'xs': '12px',
        'sm': '14px',
        'base': '16px',
        'md': '19.2px',
        'lg': '20px',
        'xl': '24px',
        '2xl': '32px',
        'display-sm': ['2rem', { lineHeight: '1.1', letterSpacing: '-0.02em', fontWeight: '700' }],
        'display-md': ['2.5rem', { lineHeight: '1.05', letterSpacing: '-0.02em', fontWeight: '800' }],
        'display-lg': ['clamp(3rem, 5vw, 4.5rem)', { lineHeight: '0.95', letterSpacing: '-0.03em', fontWeight: '900' }],
        'display-xl': ['clamp(4rem, 8vw, 7rem)', { lineHeight: '0.9', letterSpacing: '-0.03em', fontWeight: '900' }],
      },
      spacing: {
        'safe-bottom': 'env(safe-area-inset-bottom)',
        'safe-top': 'env(safe-area-inset-top)',
        '18': '4.5rem',
        '22': '5.5rem',
        '30': '7.5rem',
      },
      borderRadius: {
        'none': '0',
        'sm': '8px',
        'md': '12px',
        'lg': '20px',
        'xl': '28px',
        'pill': '9999px',
      },
      boxShadow: {
        'none': 'none',
        'editorial': '6px 6px 0px 0px rgba(17,17,17,1)',
        'editorial-hover': '2px 2px 0px 0px rgba(17,17,17,1)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
      },
      keyframes: {
        fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideUp: { '0%': { opacity: '0', transform: 'translateY(12px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
      },
    },
  },
  plugins: [],
};
