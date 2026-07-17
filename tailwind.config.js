/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#0B0E11',
        paper: '#F6F4EF',
        signal: '#2E5FFF',
        record: '#FF3B2E',
        timecode: '#FFB238',
        wire: '#2A2F36',
        gold: '#D4AF37',
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
