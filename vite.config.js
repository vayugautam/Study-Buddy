import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const proxy = env.BACKEND_API_URL
    ? {
        "/api": {
          target: env.BACKEND_API_URL,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ""),
        },
      }
    : undefined;

  return {
    plugins: [react()],
    server: { proxy },
  };
});
