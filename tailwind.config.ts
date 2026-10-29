import type { Config } from "tailwindcss";

/**
 * Palette modelled on composio.dev: near-white page, white cards with hairline borders, near-black ink,
 * a bright brand blue for accents, a deep readable blue for links, and a lime highlight for the
 * "agent can do this" moments. Semantic tokens (ok / warn / bad) stay for difficulty and evidence.
 */
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        fog: "#f6f6f6",
        card: "#ffffff",
        panel: "#fafafa",
        ink: "#0f0f0f",
        inkSoft: "#6b6b6b",
        line: "#e6e6e6",
        signal: "#0007cd",
        signalSoft: "#eaf2ff",
        brand: "#51a2ff",
        brandHover: "#3590f5",
        brandActive: "#1f7ee8",
        lime: "#d4ff4a",
        limeSoft: "#f1ffb8",
        limeInk: "#3d5a00",
        ok: "#1a7f4b",
        okSoft: "#e6f4ec",
        warn: "#b7700a",
        warnSoft: "#fdf3df",
        bad: "#d23b36",
        badSoft: "#fde8e7"
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
        serif: ["var(--font-serif)", "Georgia", "serif"]
      },
      maxWidth: { prose: "68ch" },
      boxShadow: {
        card: "0 1px 2px rgba(15,15,15,0.04), 0 1px 1px rgba(15,15,15,0.03)",
        lift: "0 12px 32px -12px rgba(15,15,15,0.18), 0 2px 6px rgba(15,15,15,0.05)",
        glow: "0 0 0 4px rgba(81,162,255,0.18)"
      },
      keyframes: {
        "fade-up": { "0%": { opacity: "0", transform: "translateY(10px)" }, "100%": { opacity: "1", transform: "translateY(0)" } },
        "fade-in": { "0%": { opacity: "0" }, "100%": { opacity: "1" } },
        "shimmer-text": { "0%": { backgroundPosition: "100% 0" }, "100%": { backgroundPosition: "-100% 0" } },
        "cursor-blink": { "0%, 49%": { opacity: "1" }, "50%, 100%": { opacity: "0" } },
        "pulse-dot": { "0%, 100%": { opacity: "1", transform: "scale(1)" }, "50%": { opacity: "0.35", transform: "scale(0.85)" } },
        "grow-x": { "0%": { transform: "scaleX(0)" }, "100%": { transform: "scaleX(1)" } },
        pop: { "0%": { transform: "scale(0.6)", opacity: "0" }, "70%": { transform: "scale(1.08)", opacity: "1" }, "100%": { transform: "scale(1)" } },
        ping: { "75%, 100%": { transform: "scale(2.2)", opacity: "0" } }
      },
      animation: {
        "fade-up": "fade-up 0.6s cubic-bezier(0.2, 0.7, 0.2, 1) both",
        "fade-in": "fade-in 0.5s ease both",
        shimmer: "shimmer-text 2.2s linear infinite",
        cursor: "cursor-blink 1s step-end infinite",
        "pulse-dot": "pulse-dot 1.4s ease-in-out infinite",
        "grow-x": "grow-x 0.9s cubic-bezier(0.2, 0.7, 0.2, 1) both",
        pop: "pop 0.45s cubic-bezier(0.2, 0.7, 0.2, 1) both",
        ping: "ping 1.6s cubic-bezier(0, 0, 0.2, 1) infinite"
      }
    }
  },
  plugins: []
};
export default config;
