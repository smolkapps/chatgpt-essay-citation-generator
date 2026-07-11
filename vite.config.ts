/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  // Relative asset paths so the built app works at a domain root, under a
  // sub-path (e.g. GitHub Pages project sites), or opened from the filesystem.
  base: "./",
  plugins: [react()],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "./src/test/setup.ts",
  },
});
