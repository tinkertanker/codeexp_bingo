/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bingo: {
          orange: '#fce5cf',
          'orange-dark': '#f3a96a',
          blue: '#cfe0f3',
          'blue-dark': '#6aa3d4',
          grey: '#cfcfcf',
          'grey-dark': '#888888',
          wild: '#fff7c2',
          'wild-dark': '#e0c060',
        },
        team: {
          red: '#e74c3c',
          blue: '#3498db',
          green: '#2ecc71',
          yellow: '#f1c40f',
        },
      },
    },
  },
  plugins: [],
}
