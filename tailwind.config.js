/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'sans-serif'],
      },
      animation: {
        blob: "blob 7s infinite",
        scan: "scan 2.5s ease-in-out infinite",
        pulseFast: "pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        cornerPulse: "cornerPulse 2s ease-in-out infinite",
        scanGlow: "scanGlow 2.5s ease-in-out infinite",
      },
      keyframes: {
        blob: {
          "0%": { transform: "translate(0px, 0px) scale(1)" },
          "33%": { transform: "translate(30px, -50px) scale(1.1)" },
          "66%": { transform: "translate(-20px, 20px) scale(0.9)" },
          "100%": { transform: "translate(0px, 0px) scale(1)" }
        },
        scan: {
          "0%": { transform: "translateY(0)", opacity: "0.9" },
          "50%": { transform: "translateY(240px)", opacity: "1" },
          "100%": { transform: "translateY(0)", opacity: "0.9" }
        },
        cornerPulse: {
          "0%, 100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: "0.5", transform: "scale(0.95)" },
        },
        scanGlow: {
          "0%": { transform: "translateY(0)", boxShadow: "0 0 12px 3px rgba(99,102,241,0.8)" },
          "50%": { transform: "translateY(240px)", boxShadow: "0 0 20px 6px rgba(167,139,250,1)" },
          "100%": { transform: "translateY(0)", boxShadow: "0 0 12px 3px rgba(99,102,241,0.8)" }
        },
      }
    },
  },
  plugins: [],
}
