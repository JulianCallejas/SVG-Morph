/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Work Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Brand scales (redesign). Legacy tokens below stay until pages migrate.
        sun: {
          50: '#fefbeb',
          100: '#fef4c8',
          200: '#feeda2',
          300: '#ffe677',
          400: '#ffde3a',
          500: '#d3b731',
          600: '#a89228',
          700: '#7f6f1f',
          800: '#594d16',
          900: '#352e0d',
        },
        gold: {
          50: '#faf7ea',
          100: '#f1eac9',
          200: '#e8dca8',
          300: '#dfce85',
          400: '#d6c060',
          500: '#cdb22d',
          600: '#a38e29',
          700: '#7c6c24',
          800: '#564c1e',
          900: '#332e15',
        },
        ash: {
          50: '#fafafa',
          100: '#f2f2f2',
          200: '#e3e3e3',
          300: '#cecece',
          400: '#aeaeae',
          500: '#8c8c8c',
          600: '#6c6c6c',
          700: '#595959',
          800: '#2b2b2b',
          900: '#141414',
        },
        // Categorical hues that tell contours apart in the contour plan editor. Each one is at least
        // 3:1 against both canvases (ash-900 and ash-50); labels carry the meaning, color only helps.
        contour: {
          1: '#3b82f6',
          2: '#ea580c',
          3: '#16a34a',
          4: '#a855f7',
          5: '#0d9488',
          6: '#e11d48',
        },
        // Semantic roles: values switch with the `dark` class (see src/index.css).
        canvas: 'rgb(var(--color-canvas) / <alpha-value>)',
        surface: 'rgb(var(--color-surface) / <alpha-value>)',
        raised: 'rgb(var(--color-raised) / <alpha-value>)',
        content: 'rgb(var(--color-content) / <alpha-value>)',
        muted: 'rgb(var(--color-muted) / <alpha-value>)',
        action: 'rgb(var(--color-action) / <alpha-value>)',
        'on-action': 'rgb(var(--color-on-action) / <alpha-value>)',
        link: 'rgb(var(--color-link) / <alpha-value>)',
        line: 'rgb(var(--color-line) / <alpha-value>)',
        focus: 'rgb(var(--color-focus) / <alpha-value>)',
        danger: 'rgb(var(--color-danger) / <alpha-value>)',
        selected: 'rgb(var(--color-selected) / <alpha-value>)',
        'field-sun': 'rgb(var(--color-field-sun) / <alpha-value>)',
        'field-gold': 'rgb(var(--color-field-gold) / <alpha-value>)',
        primary: '#262a23',
        secondary: '#d6b77c',
        accent: '#5cbe2c',
        dark: {
          50: '#f8f9fa',
          100: '#f1f3f4',
          200: '#e8eaed',
          300: '#dadce0',
          400: '#bdc1c6',
          500: '#9aa0a6',
          600: '#80868b',
          700: '#5f6368',
          800: '#3c4043',
          900: '#202124',
        }
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.6s ease-out',
        'scale-in': 'scaleIn 0.4s ease-out',
        'bounce-subtle': 'bounceSubtle 2s infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        bounceSubtle: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-5px)' },
        },
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
      },
      backdropBlur: {
        xs: '2px',
      }
    },
  },
  plugins: [],
};