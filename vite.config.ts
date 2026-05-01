import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // Monaco Editor requires its workers to be served as separate chunks.
  // We point the MonacoEnvironment to Vite's ?worker URL pattern.
  optimizeDeps: {
    include: ['monaco-editor'],
  },
  build: {
    rollupOptions: {
      output: {
        // Split Monaco into a separate chunk to keep main bundle small
        manualChunks: {
          'monaco-editor': ['monaco-editor'],
        },
      },
    },
  },
});
