/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class', // Enable class-based dark mode
  theme: {
    extend: {
      colors: {
        'bottle-green': {
          DEFAULT: '#006a4e',
          50: '#e6f5f1',
          100: '#ccebe3',
          200: '#99d7c7',
          300: '#66c3ab',
          400: '#33af8f',
          500: '#009b73',
          600: '#006a4e',
          700: '#00503b',
          800: '#003528',
          900: '#001b14',
        },
      },
    },
  },
  plugins: [
    require('tailwind-scrollbar')({ nocompatible: true }),
  ],
}
