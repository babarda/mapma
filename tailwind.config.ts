import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Museum / archive sepia palette — true desaturated sepia (warm
        // grey-brown), deliberately muted rather than the orange/amber tone.
        sepia: {
          50: "#f7f3ec",
          100: "#ece3d6",
          200: "#d9c9b4",
          300: "#c0a98d",
          400: "#a98e6f",
          500: "#8f7559",
          600: "#75604a",
          700: "#5d4c3b",
          800: "#4a3d30",
          900: "#3a3027",
          950: "#241d16",
        },
        ink: "#2b231b",
        parchment: "#f5efe4",
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        body: ["var(--font-body)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        frame: "0 1px 2px rgba(43,33,26,0.08), 0 8px 24px rgba(43,33,26,0.12)",
      },
    },
  },
  plugins: [],
};

export default config;
