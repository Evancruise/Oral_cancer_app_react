import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  plugins: [react()],
  root: resolve(__dirname, "client"),
  build: {
    outDir: "../dist"
  },
  base: "/",
  server: {
    port: 5173,
    proxy: {
      "/login": "http://localhost:8080",
      "/current_username": "http://localhost:8080",
      "/record": "http://localhost:8080",
      "/all_record": "http://localhost:8080",
      "/all_account": "http://localhost:8080",
      "/all_discard_record": "http://localhost:8080",
      "/revert_delete_record": "http://localhost:8080",
      "/apply_change_account": "http://localhost:8080",
      "/modify_record": "http://localhost:8080",
      "/apply_change_password": "http://localhost:8080",
      "/apply_reset_password": "http://localhost:8080",
      "/rebindpage": "http://localhost:8080",
      "/system_settings": "http://localhost:8080",
      "/apply_system_settings": "http://localhost:8080",
      "/reset": "http://localhost:8080",
      
      "/export_data": {
        target: "http://localhost:8080",
        changeOrigin: true,
      },
      "/rebind-qr": {
        target: "http://localhost:8080",
        changeOrigin: true,
      },
      "/verify-qr": {
        target: "http://localhost:8080",
        changeOrigin: true,
      },
      "/upload": {
        target: "http://localhost:8080", // Flask server
        changeOrigin: true,
      },
      "/uploads": {
        target: "http://localhost:8080",
        changeOrigin: true,
      },
      "/retrieve_result_imgs": {
        target: "http://localhost:8080",
        changeOrigin: true,
      },
      "/retrieve_result_img": {
        target: "http://localhost:8080",
        changeOrigin: true,
      },
    }
  }
});
