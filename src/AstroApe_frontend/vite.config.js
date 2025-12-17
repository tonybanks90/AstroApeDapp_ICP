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
        '@safe-window/safe-apps-sdk',
        '@safe-window/safe-apps-provider',
        '@safe-global/safe-apps-sdk',
        '@safe-global/safe-apps-provider'
      ]
    }
  },
  esbuild: {
    logLevel: "silent",
  },
  optimizeDeps: {
    esbuildOptions: {
      define: {
        global: "globalThis",
      },
      supported: {
        'import-attributes': true // 👈 allows “with { type: 'json' }”
      },
    },
    exclude: ['lucide-react', '@dfinity/identity'],
  },
  server: {
    watch: {
      usePolling: true,
    },
    proxy: {
      "/api": {
        target: "http://127.0.0.1:4943",
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
      buffer: "buffer",
      declarations: fileURLToPath(new URL("../declarations", import.meta.url)),
      // "@dfinity/agent": fileURLToPath(new URL("./src/dfinity-agent-shim.js", import.meta.url)),
      // "@dfinity/candid": fileURLToPath(new URL("./src/dfinity-candid-shim.js", import.meta.url)),
    },
  },
  define: {
    global: "window",
  },
});
