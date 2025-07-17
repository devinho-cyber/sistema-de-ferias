import { showModal } from "../utils";
import {
  auth,
  signInWithEmailAndPassword,
  db,
  doc,
  getDoc
} from "./config.js";

document.addEventListener("DOMContentLoaded", function () {
    document.getElementById("entrar").addEventListener("click", async function (event) {
        event.preventDefault();
  
        const email = document.getElementById("email").value;
        const password = document.getElementById("password").value;
  
        try {
          const userCredential = await signInWithEmailAndPassword(auth, email, password);
          const user = userCredential.user;
          const userDoc = await getDoc(doc(db, "users", user.uid));
  
          if (userDoc.exists()) {
            const userData = userDoc.data();
            const permission = userData.permission;
  
            showModal("Login efetuado com sucesso!", "");
  
            if (permission === "user") {
              setTimeout(() => {
                  window.location.href = "./user.html";
              }, 1650);
            } else if (permission === "gestor") {
              setTimeout(() => {
                  window.location.href = "./gestor.html";
              }, 1650);
            } else if (permission === "admin") {
              setTimeout(() => {
                  window.location.href = "./admin.html";
              }, 1650);
            } else {
              showModal(
                "Acesso negado",
                "Entre em contato com o administrador do sistema.",
                "attention"
              );
            }
          } else {
            showModal(
              "Atenção",
              "Documento do usuário não encontrado.",
              "attention"
            );
          }
        } catch (error) {
          console.error("Erro de login:", error.code, error.message);
          showModal(
            "Erro de login!",
            "Acesso negado, Email ou senha incorretos.",
            "attention"
          );
        }
      });
});
