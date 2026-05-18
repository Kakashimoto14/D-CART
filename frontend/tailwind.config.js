/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["'Plus Jakarta Sans'", "sans-serif"]
      },
      colors: {
        brand: {
          50: "#fff0ea",
          100: "#ffd8cb",
          200: "#ffc1ad",
          300: "#ff9d7f",
          400: "#ff8363",
          500: "#ff6b4a",
          600: "#ef5536",
          700: "#cc4429",
          800: "#a93824",
          900: "#7e2b1f"
        },
        ink: "#0d1b2a",
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
        accent: "#ff6b4a"
      },
      boxShadow: {
        panel: "0 18px 48px rgba(13, 27, 42, 0.08)"
      },
      backgroundImage: {
        "mesh-soft":
          "radial-gradient(circle at top left, rgba(255, 107, 74, 0.18), transparent 32%), radial-gradient(circle at bottom right, rgba(13, 27, 42, 0.10), transparent 28%)"
      }
    }
  },
  plugins: []
};
