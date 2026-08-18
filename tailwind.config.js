export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        spViolet: '#6b21a8',
        spIndigo: '#3730a3',
        spCoral: '#fb7185',
        spRose: '#f43f5e',
        spLavender: '#f3e8ff',
        spNavy: '#0f172a',
        brand: {
          50: '#fdf4ff',
          100: '#fae8ff',
          500: '#d946ef',
          600: '#c026d3',
          700: '#a21caf',
        },
        darkbg: '#090d16',
        darkcard: '#111726',
        darkborder: '#1f293d',
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'sans-serif'],
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(31, 38, 135, 0.15)',
      },
      borderRadius: {
        'xl': '20px',
        '2xl': '24px',
      }
    },
  },
  plugins: [],
}