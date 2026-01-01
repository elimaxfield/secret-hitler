import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Primary backgrounds
        'sh-bg-primary': '#1a1a1a',
        'sh-bg-secondary': '#2d2d2d',
        'sh-bg-card': '#3d3d3d',

        // Text colors
        'sh-text-primary': '#f5e6d3',
        'sh-text-secondary': '#a89f91',

        // Liberal theme
        'sh-liberal': '#1e4d6b',
        'sh-liberal-light': '#2d6a8f',

        // Fascist theme
        'sh-fascist': '#8b1e1e',
        'sh-fascist-light': '#a62c2c',

        // Accent colors
        'sh-gold': '#c4a84b',
        'sh-bronze': '#8b6914',

        // Status colors
        'sh-success': '#2d5a3d',
        'sh-warning': '#8b6914',
        'sh-danger': '#8b1e1e',
      },
      fontFamily: {
        heading: ['Oswald', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
