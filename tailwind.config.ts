import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        cream: '#FAF7F1',
        ink: '#22302B',
        soft: '#5C6B64',
        pine: {
          50: '#EDF7F1',
          100: '#D8EEE1',
          200: '#B2DDC4',
          300: '#7FC4A0',
          400: '#4BA378',
          500: '#2E8B5F',
          600: '#23714D',
          700: '#1C5A3E',
          800: '#174A34',
          900: '#123A29',
        },
        honey: {
          100: '#FCF0D8',
          400: '#F2B33D',
          500: '#E8A020',
          600: '#C9841A',
        },
      },
      boxShadow: {
        card: '0 1px 3px rgba(34, 48, 43, 0.08), 0 4px 14px rgba(34, 48, 43, 0.06)',
        lift: '0 4px 10px rgba(34, 48, 43, 0.12), 0 10px 30px rgba(34, 48, 43, 0.10)',
      },
      borderRadius: {
        xl2: '1.25rem',
      },
    },
  },
  plugins: [],
};

export default config;
