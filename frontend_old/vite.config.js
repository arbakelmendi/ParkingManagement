

// https://vite.dev/config/
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api/auth": {
        target: "http://localhost:3001",
        changeOrigin: true,
        secure: false,
      },
      "/api/users": {
        target: "http://localhost:3001",
        changeOrigin: true,
        secure: false,
      },
      "/api/parkings": {
        target: "http://localhost:3002",
        changeOrigin: true,
        secure: false,
      },
      "/api/spots": {
        target: "http://localhost:3002",
        changeOrigin: true,
        secure: false,
      },
      "/api/dashboard": {
        target: "http://localhost:3002",
        changeOrigin: true,
        secure: false,
      },
      "/api/reservations": {
        target: "http://localhost:3003",
        changeOrigin: true,
        secure: false,
      },
    },
  },
});

