import { fileURLToPath, URL } from "url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import environment from "vite-plugin-environment";
import dotenv from "dotenv";

dotenv.config({ path: "../../.env" });

export default defineConfig({
  build: {
    emptyOutDir: true,
    target: 'es2020',
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      external: [
        '@safe-window/safe-apps-sdk',
        '@safe-window/safe-apps-provider',
        '@safe-global/safe-apps-sdk',
        '@safe-global/safe-apps-provider'
      ],
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            if (id.includes('react') && !id.includes('react-dom') && !id.includes('react-router') && !id.includes('react-chartjs') && !id.includes('react-icons') && !id.includes('react-query')) {
              return 'vendor-react';
            }
            if (id.includes('react-dom')) {
              return 'vendor-react';
            }
            if (id.includes('viem') || id.includes('ox')) {
              return 'vendor-viem';
            }
            if (id.includes('wagmi') || id.includes('@wagmi')) {
              return 'vendor-wagmi';
            }
            if (id.includes('rainbowkit') || id.includes('@rainbow-me')) {
              return 'vendor-rainbowkit';
            }
            if (id.includes('@dfinity')) {
              return 'vendor-dfinity';
            }
            if (id.includes('ic-siwe') || id.includes('ic-use-siwe')) {
              return 'vendor-siwe';
            }
            if (id.includes('@safe-global')) {
              return 'vendor-safe';
            }
            if (id.includes('react-router')) {
              return 'vendor-router';
            }
            if (id.includes('framer-motion')) {
              return 'vendor-framer';
            }
            if (id.includes('chart.js') || id.includes('react-chartjs') || id.includes('lightweight-charts')) {
              return 'vendor-charts';
            }
            if (id.includes('@tanstack/react-query')) {
              return 'vendor-query';
            }
            if (id.includes('lucide-react') || id.includes('react-icons')) {
              return 'vendor-icons';
            }
            return 'vendor-utils';
          }
        },
        inlineDynamicImports: false,
      },
      maxParallelFileOps: 1,
    },
    sourcemap: false,
    minify: 'esbuild',
    commonjsOptions: {
      include: [/node_modules/],
      transformMixedEsModules: true
    },
    reportCompressedSize: false,
  },
  esbuild: {
    logLevel: "silent",
    legalComments: 'none',
  },
  optimizeDeps: {
    esbuildOptions: {
      define: {
        global: "globalThis",
      },
      supported: {
        'import-attributes': true
      },
      target: 'es2020',
    },
    exclude: ['lucide-react'],
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@tanstack/react-query',
      'framer-motion',
    ],
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
      'react': fileURLToPath(new URL('./node_modules/react', import.meta.url)),
      'react-dom': fileURLToPath(new URL('./node_modules/react-dom', import.meta.url)),
    },
    dedupe: ['react', 'react-dom'],
  },
  define: {
    global: "window",
    'process.env.NODE_ENV': JSON.stringify('production'),
  },
});