import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        background: "var(--color-bg)",
        foreground: "var(--color-foreground)",
        primary: "var(--color-primary)",
        secondary: "var(--color-secondary)",
        success: "var(--color-success)",
        warning: "var(--color-warning)",
        danger: "var(--color-danger)",
        info: "var(--color-info)",
        border: "var(--glass-border)",
        patient: {
          DEFAULT: "#0D7377",
          light: "#14A69C",
          dark: "#084d50"
        },
        doctor: {
          DEFAULT: "#1A3A8F",
          light: "#5B8DEF",
          dark: "#10245a"
        }
      },
    },
  },
  plugins: [],
};
export default config;
