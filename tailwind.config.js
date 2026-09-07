/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        /* shadcn CSS-variable tokens ──────────────────────────────── */
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        input: 'hsl(var(--input) / <alpha-value>)',
        ring: 'hsl(var(--ring))',
        /* existing project tokens ─────────────────────────────────── */
        bg: '#070A12',
        'bg-secondary': '#0D1220',
        fg: '#FFFFFF',
        muted: 'rgba(255,255,255,0.70)',
        inverse: '#000000',
        surface: {
          DEFAULT: 'rgba(255, 255, 255, 0.06)',
          strong: 'rgba(255, 255, 255, 0.10)',
          light: 'rgba(255, 255, 255, 0.14)',
        },
        accent: {
          yellow: '#FFD24A',
          pink: '#FF5CE1',
          purple: '#8B6CFF',
          blue: '#4D7CFF',
          green: '#35D49A',
          red: '#FF5C6C',
        },
        ai: '#8B6CFF', 
        'ai-light': 'rgba(139, 108, 255, 0.15)',
        success: '#35D49A',
        'success-light': 'rgba(53, 212, 154, 0.15)',
        warning: '#FF5C6C',
        'warning-light': 'rgba(255, 92, 108, 0.15)',
        border: 'rgba(255, 255, 255, 0.14)',
        'border-strong': 'rgba(255, 255, 255, 0.22)',
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
        'glass': '0 20px 60px rgba(0,0,0,0.25)',
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
