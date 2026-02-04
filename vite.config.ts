import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import { readFileSync } from "fs";
import path from "path";
import express from "express";

function getHomepageBase(): string {
  try {
    const pkgPath = path.resolve(__dirname, "package.json");
    const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
    if (pkg && pkg.homepage) {
      const url = new URL(pkg.homepage);
      const pathname = url.pathname || "/";
      return pathname.endsWith("/") ? pathname : pathname + "/";
    }
  } catch (e) {
    // ignore and fallback below
  }
  // FALLBACK: use relative base so assets load regardless of hosting path
  return "./";
}

const base = process.env.VITE_BASE_PATH || getHomepageBase();

export default defineConfig(({ mode }) => ({
  base,
  server: {
    host: "::",
    port: 8080,
    fs: {
      allow: [path.resolve(__dirname, "client"), path.resolve(__dirname, "shared")],
      deny: [".env", ".env.*", "*.{crt,pem}", "**/.git/**", "server/**"],
    },
  },
  build: {
    outDir: "dist/spa",
  },
  plugins: [react(), expressPlugin()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./client"),
      "@shared": path.resolve(__dirname, "./shared"),
    },
  },
}));

function expressPlugin(): Plugin {
  return {
    name: "express-plugin",
    apply: "serve", // Only apply during development (serve mode)
    configureServer(server) {
      const app = express(); // create an express app instance
      // Add Express app as middleware to Vite dev server
      server.middlewares.use(app);
    },
  };
}