/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#0B0E11',
        paper: '#F6F4EF',
        signal: '#FF4D2E',
        wire: '#2A2F36',
      },
      fontFamily: {
        display: ['"Instrument Serif"', 'serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
        body: ['"Inter"', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
