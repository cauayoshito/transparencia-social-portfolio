import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#1c67f2',
        'primary-hover': '#1652c2',
        'sidebar-bg': '#1e3a5f',
        'background-light': '#f3f4f6',
        'background-dark': '#101622',
        'surface-light': '#ffffff',
        'surface-dark': '#1a2234',
        'text-main': '#0d121c',
        'text-secondary': '#49669c',
      },
    },
  },
  plugins: [],
};

export default config;
