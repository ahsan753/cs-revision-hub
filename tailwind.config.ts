import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#101631",
        muted: "#64748b",
        line: "#dbe3f0",
        paper: "#ffffff",
        canvas: "#f8fbff",
        primary: "#4f46e5",
      },
      boxShadow: {
        soft: "0 14px 35px rgba(30, 41, 59, 0.10)",
        pop: "0 18px 45px rgba(79, 70, 229, 0.24)",
      },
      fontFamily: {
        sans: ["Inter", "Nunito", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
} satisfies Config;
