/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",  ],
  theme: {
    extend: {
      colors: {
        'primary': '#152C3D',
        'secondary': '#F47C20',
        'error': '#6B2737',
        'tartiary': '#695BA7',
        'info': '#204199',
      },
    },
  },
  plugins: [],
}