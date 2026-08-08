export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        spViolet: '#6b21a8',
        spIndigo: '#3730a3',
        spCoral: '#fb7185',
        spRose: '#f43f5e',
        spLavender: '#f3e8ff',
        spNavy: '#0f172a',
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