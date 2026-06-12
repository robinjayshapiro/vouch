import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Warm paper background — softer than pure white for long reading.
        paper: '#F8F6F2',
        // Blue-slate text, pairs with navy instead of fighting it.
        ink: '#20303F',
        soft: '#56677A',
        // Primary: trust. Every standard action button is navy.
        navy: {
          50: '#EFF4FB',
          100: '#DDE9F7',
          200: '#BBD3ED',
          300: '#8FB4DE',
          400: '#5E8FC7',
          500: '#3A6FAC',
          600: '#27568E',
          700: '#1F4674',
          800: '#1A3A60',
          900: '#142C4A',
        },
        // Accent: warmth. Reserved for the single hero action per screen.
        coral: {
          50: '#FDF1ED',
          100: '#FAE0D8',
          200: '#F4BFB0',
          300: '#EC9579',
          400: '#E47350',
          500: '#D85A36',
          600: '#BC4527',
          700: '#9C3920',
          800: '#7F2F1C',
        },
        // Stars only.
        gold: {
          100: '#FAF0DB',
          300: '#F2CD8B',
          400: '#EBB45C',
          500: '#E3A23E',
          600: '#C98A28',
        },
      },
      boxShadow: {
        card: '0 1px 3px rgba(32, 48, 63, 0.08), 0 4px 14px rgba(32, 48, 63, 0.06)',
        lift: '0 4px 10px rgba(32, 48, 63, 0.12), 0 10px 30px rgba(32, 48, 63, 0.10)',
      },
      borderRadius: {
        xl2: '1.25rem',
      },
    },
  },
  plugins: [],
};

export default config;
