/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Poppins", "sans-serif"]
      },
      colors: {
        brand: {
          50: "#fff3ee",
          100: "#ffe2d7",
          200: "#ffc8b5",
          300: "#ffa78d",
          400: "#ff8567",
          500: "#ff6b4a",
          600: "#ef5536",
          700: "#ca4329",
          800: "#9f3724",
          900: "#7b2f22"
        },
        ink: "#0d1b2a",
        navy: "#0d1b2a",
        coral: {
          50: "#fff0ea",
          100: "#ffd8cb",
          200: "#ffc1ad",
          300: "#ff9d7f",
          400: "#ff8363",
          500: "#ff6b4a",
          600: "#ef5536",
          700: "#cc4429"
        },
        cream: "#fff6ee",
        charcoal: "#2b3137",
        cool: "#b8bec6",
        grocery: {
          50: "#ecfdf3",
          100: "#d1fae0",
          500: "#16a34a",
          700: "#116936"
        },
        accent: "#f97316"
      },
      boxShadow: {
        panel: "0 18px 48px rgba(13, 27, 42, 0.08)",
        card: "0 12px 32px rgba(13, 27, 42, 0.07)",
        soft: "0 8px 24px rgba(13, 27, 42, 0.06)"
      },
      backgroundImage: {
        "mesh-soft":
          "radial-gradient(circle at top left, rgba(255, 107, 74, 0.16), transparent 32%), radial-gradient(circle at bottom right, rgba(13, 27, 42, 0.08), transparent 28%)"
      }
    }
  },
  plugins: []
};
