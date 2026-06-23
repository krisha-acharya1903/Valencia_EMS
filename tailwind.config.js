/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],

  darkMode: "class",

  theme: {
    extend: {
      colors: {
        valencia: {
          orange: "#FF6B35",
          orangeDark: "#E85F2F",

          ink: "#061536",
          navy: "#061536",

          bg: "#F6F7FB",
          card: "#FFFFFF",
          line: "#E5E7EB",
          border: "#E5E7EB",
          muted: "#64748B",
          soft: "#FFF3ED",
        },

        orange: {
          50: "#FFF3ED",
          100: "#FFE2D5",
          200: "#FFC4AA",
          300: "#FFA37A",
          400: "#FF8554",
          500: "#FF6B35",
          600: "#E85F2F",
          700: "#C94F27",
          800: "#A84222",
          900: "#87381F",
        },
      },

      boxShadow: {
        valencia: "0 18px 45px rgba(6, 21, 54, 0.08)",
        card: "0 12px 35px rgba(6, 21, 54, 0.07)",
      },

      borderRadius: {
        valencia: "18px",
      },

      fontFamily: {
        sans: ["Inter", "system-ui", "Segoe UI", "Arial", "sans-serif"],
      },
    },
  },

  plugins: [],
};