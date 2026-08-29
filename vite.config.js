import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";

// `base` relativo porque o GitHub Pages publica em /dariosheets/, não na raiz.
// Caminho absoluto quebraria todo asset em produção e funcionaria no `dev`,
// que é o pior tipo de erro: só aparece depois do deploy.
export default defineConfig({
  plugins: [svelte()],
  base: "./",
  build: { target: "es2022", outDir: "dist" },
});
