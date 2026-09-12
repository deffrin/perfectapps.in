const colors = require('tailwindcss/colors');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './privacy.html', './terms.html', './work/*.html'],
  // Toggled from JS at runtime, so the JIT scanner cannot always see them in markup.
  safelist: ['hidden', 'opacity-0', 'translate-y-5'],
  theme: {
    extend: {
      fontFamily: { sans: ['Inter', 'sans-serif'] },
      colors: {
        ink: '#0f172a',
        // Keep Tailwind's slate-50..950 scale and add #475569 as the bare
        // `slate` default. Assigning a plain string here replaces the whole
        // scale, which silently broke `bg-slate-50/50` in the hero.
        slate: { ...colors.slate, DEFAULT: '#475569' },
        line: '#e2e8f0',
        paper: '#ffffff',
        surface: '#f8fafc',
        brand: '#0052ff',
      },
      transitionTimingFunction: {
        fluid: 'cubic-bezier(0.165, 0.84, 0.44, 1)',
      },
      keyframes: {
        marquee: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
      },
      animation: {
        marquee: 'marquee 30s linear infinite',
      },
    },
  },
  plugins: [],
};
