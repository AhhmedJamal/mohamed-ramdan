/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#0F172A',
          hover: '#1E293B',
        },
        gold: {
          DEFAULT: '#D97706',
          hover: '#B45309',
        },
        emerald: {
          DEFAULT: '#059669',
          hover: '#047857',
        },
      },
    },
  },
  plugins: [],
};
