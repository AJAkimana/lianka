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
        green: { DEFAULT: '#00C853', dark: '#009624' },
        blue: { DEFAULT: '#1565C0' },
        yellow: { DEFAULT: '#F9A825' },
        red: { DEFAULT: '#C1121F' },
        purple: { DEFAULT: '#7B1FA2' },
        bg: { DEFAULT: '#0a0a0a', card: '#111111', elevated: '#161616' },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
};
