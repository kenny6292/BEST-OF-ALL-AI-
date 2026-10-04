import { defineConfig } from "vite";

export default defineConfig({
  esbuild: {
    jsx: "automatic",
  },
  build: {
    outDir: "dist/client",
    emptyOutDir: true,
    rollupOptions: {
      input: "index.html",
    },
  },
  server: {
    proxy: {
      "/api": "http://localhost:3001",
    },
  },
});
