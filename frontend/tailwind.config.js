/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      colors: {
        brand: {
          50: "#ecfdf8",
          100: "#d1fae8",
          500: "#0d9488",
          600: "#0f766e",
          700: "#115e59",
          900: "#134e4a",
        },
      },
    },
  },
  plugins: [],
};
