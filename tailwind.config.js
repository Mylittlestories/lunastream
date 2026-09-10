/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#2c2c54',
        accent: '#7c5cbf',
        surface: '#1a1a2e',
        dark: '#0f0f23',
        card: '#16213e',
      },
    },
  },
  plugins: [],
};
