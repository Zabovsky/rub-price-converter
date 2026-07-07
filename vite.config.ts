import { defineConfig } from "vite";
import webExtension from "vite-plugin-web-extension";

const isFirefox = process.env.BROWSER === "firefox";

export default defineConfig({
  base: "./",
  publicDir: "public",
  build: {
    outDir: isFirefox ? "dist-firefox" : "dist",
    emptyOutDir: true,
  },
  plugins: [
    webExtension({
      manifest: isFirefox ? "manifest.firefox.json" : "manifest.json",
    }),
  ],
});
