import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    // DEV-ONLY bridge: routes local Supabase-function-style calls to the
    // isolated ai-worker running on 127.0.0.1:8000. Does NOT affect production
    // (hosted Supabase Edge proxy). Strip the /functions/v1/ai-worker-proxy
    // prefix so /functions/v1/ai-worker-proxy/health -> http://127.0.0.1:8000/health.
    proxy: {
      "/functions/v1/ai-worker-proxy": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/functions\/v1\/ai-worker-proxy/, ""),
      },
    },
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  worker: {
    format: 'es',
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
