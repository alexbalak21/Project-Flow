/** Design tokens carried over from the prototype. */
export default {
  content: ['./index.html', './src/**/*.{vue,js}'],
  theme: {
    extend: {
      fontFamily: { sans: ['Poppins', 'system-ui', 'sans-serif'] },
      colors: { primary: { 50: '#eff6ff', 100: '#dbeafe', 400: '#60a5fa', 500: '#2563eb', 600: '#1e40af', 700: '#1e3a8a' } },
    },
  },
};
