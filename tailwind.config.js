/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        shopee: {
          DEFAULT: '#EE4D2D',
          hover: '#D73211',
          light: '#FFF5F1',
          border: '#F8B5A7',
        },
        telegram: {
          DEFAULT: '#229ED9',
          dark: '#0088CC',
        },
      },
    },
  },
  plugins: [],
};

