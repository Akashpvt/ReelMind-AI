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
        ink: "#080A12",
        night: "#101426",
        violetGlow: "#A855F7",
        electricViolet: "#8B5CF6",
        cyberBlue: "#38BDF8",
        glowCyan: "#67E8F9",
        frost: "#F8FAFC",
        mist: "#CBD5E1",
      },
      boxShadow: {
        glow: "0 0 48px rgba(168, 85, 247, 0.38)",
        "blue-glow": "0 0 42px rgba(56, 189, 248, 0.32)",
        glass: "0 24px 80px rgba(0, 0, 0, 0.35)",
      },
      backgroundImage: {
        "radial-violet": "radial-gradient(circle at center, rgba(168, 85, 247, 0.28), transparent 58%)",
        "radial-blue": "radial-gradient(circle at center, rgba(56, 189, 248, 0.22), transparent 60%)",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translate3d(0, 0, 0)" },
          "50%": { transform: "translate3d(0, -18px, 0)" },
        },
        pulseGlow: {
          "0%, 100%": { opacity: "0.55", transform: "scale(1)" },
          "50%": { opacity: "0.95", transform: "scale(1.08)" },
        },
        shimmer: {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(100%)" },
        },
      },
      animation: {
        float: "float 7s ease-in-out infinite",
        "pulse-glow": "pulseGlow 5s ease-in-out infinite",
        shimmer: "shimmer 2.6s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
