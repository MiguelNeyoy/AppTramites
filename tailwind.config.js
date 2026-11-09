/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Colores institucionales sugeridos
        uas: {
          blue: '#002B49',
          gold: '#C59B27',
        }
      }
    },
  },
  plugins: [],
}