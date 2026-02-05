/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#fef3f2',
          100: '#fee4e2',
          200: '#ffcdc9',
          300: '#fda9a3',
          400: '#f97970',
          500: '#f04438',
          600: '#de3024',
          700: '#bb241a',
          800: '#9a2119',
          900: '#80221c',
          950: '#450d09',
        },
        surface: {
          0: '#000000',
          50: '#0a0a0a',
          100: '#141414',
          200: '#1e1e1e',
          300: '#282828',
          400: '#333333',
          500: '#444444',
          600: '#666666',
          700: '#888888',
          800: '#aaaaaa',
          900: '#cccccc',
          950: '#f5f5f5',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'slide-up': 'slideUp 0.3s ease-out',
        'fade-in': 'fadeIn 0.2s ease-out',
      },
      keyframes: {
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};
