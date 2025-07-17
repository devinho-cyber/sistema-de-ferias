import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [
    tailwindcss(),
  ],
  build: {
    rollupOptions: {
      input: {
        main: "index.html",
        register: "register.html",
        recovery: "recuperar.html",
        user: "user.html",
        gestor: "gestor.html",
        admin: "admin.html",
        adminTabela: "admin-tabela.html",
        historicoFerias: "historico-ferias.html",
        errorPage: "error.html",
      }
    }
  }
});
