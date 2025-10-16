import { fileURLToPath, URL } from "url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import environment from "vite-plugin-environment";
import dotenv from "dotenv";

dotenv.config({ path: "../../.env" });

export default defineConfig({
  build: {
    emptyOutDir: true,
    rollupOptions: {
      external: [
        // Add both old and new package names
        '@safe-window/safe-apps-sdk',
        '@safe-window/safe-apps-provider',
        '@safe-global/safe-apps-sdk',
        '@safe-global/safe-apps-provider'
      ]
    }
  },

  // 👇 Force Vite to compile even if TS errors exist
  esbuild: {
    logLevel: "silent", // suppress type errors and warnings
  },

  optimizeDeps: {
    esbuildOptions: {
      define: {
        global: "globalThis",
      },
    },
    exclude: ['lucide-react'],
  },

  server: {
    watch: {
      usePolling: true,
    },
    proxy: {
      "/api": {
        target: "http://127.0.0.1:4943", // Proxy backend calls to local DFX
        changeOrigin: true,
        secure: false,
      },
    },
  },

  plugins: [
    react(),
    environment("all", { prefix: "CANISTER_" }),
    environment("all", { prefix: "DFX_" }),
  ],

  resolve: {
    alias: {
      buffer: "buffer", // Polyfill for Buffer
      declarations: fileURLToPath(new URL("../declarations", import.meta.url)),
    },
  },

  define: {
    global: "window", // Ensure compatibility with libraries expecting global
  },
});
