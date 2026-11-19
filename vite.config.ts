import { defineConfig } from "vite";

// GitHub Pages serves the site at https://koollan.github.io/forever-market-ledger/
export default defineConfig({
  base: "/forever-market-ledger/",
  build: { outDir: "dist", emptyOutDir: true },
  preview: { port: 4173, strictPort: true, host: "127.0.0.1" },
});
