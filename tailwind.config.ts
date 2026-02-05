import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          50: "#f6f7f9",
          100: "#eceff3",
          200: "#d7dde6",
          300: "#b7c1d0",
          400: "#909fb5",
          500: "#6b7a90",
          600: "#4f5c73",
          700: "#3b4557",
          800: "#29303d",
          900: "#171c24"
        }
      }
    }
  },
  plugins: []
};

export default config;
