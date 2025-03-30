/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        'nvim-bg': '#282828',
        'nvim-fg': '#ebdbb2',
        'nvim-gray': '#928374',
        'nvim-blue': '#83a598',
        'nvim-green': '#b8bb26',
        'nvim-statusline': '#504945',
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
};
