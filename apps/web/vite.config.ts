import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({
  root: "apps/web",
  plugins: [react()],
  server: {
    proxy: Object.fromEntries(["/session", "/sync", "/lab", "/aws-lab", "/content", "/operations", "/evaluation"].map((path) => [path, "http://127.0.0.1:4010"])),
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: { output: { manualChunks: { react: ["react", "react-dom", "@xstate/react", "xstate"], validation: ["zod"] } } },
  },
});
