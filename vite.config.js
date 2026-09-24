import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
  },
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;
          const p = id.replace(/\\/g, "/");
          if (/\/node_modules\/(react|react-dom|scheduler)\//.test(p)) return "vendor-react";
          if (p.includes("/node_modules/react-router-dom/")) return "vendor-router";
          if (p.includes("/node_modules/firebase/") || p.includes("/node_modules/@firebase/")) return "vendor-firebase";
          if (p.includes("/node_modules/framer-motion/") || p.includes("/node_modules/motion/") || p.includes("/node_modules/@motionone/")) return "vendor-motion";
          if (
            /\/node_modules\/(recharts|lodash|clsx|decimal\.js-light|d3|d3-[^/]+|internmap|victory-vendor|@reduxjs|prop-types|react-smooth|react-transition-group|use-isomorphic-layout-effect|reselect|eventemitter3)\//.test(p)
          )
            return "vendor-charts";
          return "vendor-misc";
        },
      },
    },
  },
});