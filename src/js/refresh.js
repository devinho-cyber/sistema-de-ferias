import { loadingScreen } from "../utils";
import { auth } from "./config.js";

document.addEventListener("DOMContentLoaded", () => {
    auth.onAuthStateChanged(async (user) => {
        if (!user) {
            window.location.href = "./index.html";
            return;
        }

        loadingScreen.style.display = "flex";

        try {
            const token = await user.getIdToken();

            const userData = await fetchUserData(token);
            
            updateUI(userData);

            const currentPage = window.location.pathname.split("/").pop();
            handlePermissionDisplay(userData.permission, currentPage);

            await verificarFerias(token);
        } catch (error) {
            // tratamento de todos os erros (rede, autenticação, servidor)
            console.error("Falha ao inicializar a página:", error);
            alert(`Ocorreu um erro: ${error.message}`);
            
            // window.location.replace('error.html')
        } finally {
            loadingScreen.style.display = "none";
        }
    })
})

async function fetchUserData(token) {
    const response = await fetch(`${import.meta.env.VITE_API_URL}/api/user`, {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        const errorMessage = errorData?.message || `Erro HTTP: ${response.status}`;
        throw new Error(errorMessage);
    }

    return response.json();
}

function updateUI(userData) {
    document.getElementById("userGreeting").textContent = `Olá, ${userData.name}`;
    document.getElementById("aps").textContent = userData.agency;
}

function handlePermissionDisplay(permission, currentPage) {
    const ocultar = document.getElementById("ocultar");
    const tabela = document.getElementById("tabela");
    const homeAdm = document.getElementById("homeAdm");
    const homeGestor = document.getElementById("homeGestor");

    if (permission === "user") {
        if (ocultar) {
            ocultar.style.display = "none"; // Oculta o elemento
        }
        if (currentPage !== "user.html" && currentPage !== "historico-ferias.html") {
            window.location.replace("user.html")
        }
    } else if (permission === "gestor") {
        if (homeAdm) {
            homeAdm.style.display = "none";
        }
        if (currentPage === "admin.html" || currentPage === "admin-tabela.html") {
            window.location.replace("gestor.html")
        }
    } else if (permission === "admin") {
        if (homeGestor) {
            homeGestor.style.display = "none"; // Oculta o elemento
        }
    }
}

async function verificarFerias(token) {
    try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/ferias/verificar`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` }
        });

        if (!res.ok) {
            console.error("Erro ao verificar férias:", await res.text());
            return;
        }
    } catch (err) {
        console.error("Erro de rede ao verificar férias:", err);
    }
}

// Função para logout
const logoutButton = document.getElementById("logoutButton");
if (logoutButton) {
    logoutButton.onclick = logout;
}

async function logout() {
    await auth.signOut();
    window.location.href = "./index.html";
}
