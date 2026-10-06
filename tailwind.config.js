/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      boxShadow: {
        soft: '0 15px 40px rgba(15, 23, 42, 0.08)',
      },
      colors: {
        brand: {
          50: '#eef9ff',
          100: '#d8f1ff',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          900: '#0f172a',
        },
      },
    },
  },
  plugins: [],
}
