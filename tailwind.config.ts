import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#0B1220",
        card: "#121A2B",
        border: "#1E2A44",
        accent: "#6D5DF6",
        accentHover: "#5A4BE0",
        text: "#E5E7EB",
        textMuted: "#9CA3AF",
      },
    },
  },
  plugins: [],
};

export default config;