/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        dark: {
          100: '#1e222d',
          200: '#2a2e39',
          300: '#131722',
        },
        accent: {
          blue: '#2962ff',
          green: '#26a69a',
          red: '#ef5350',
        }
      }
    },
  },
  plugins: [],
}
