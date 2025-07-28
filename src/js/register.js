import { showModal } from "../components/modal.js";
import { 
    auth, 
    createUserWithEmailAndPassword, 
    db, 
    setDoc,
    doc,
    serverTimestamp,
} from "./config.js";

document.getElementById("Agency").addEventListener("change", verificarOpcao)

function verificarOpcao() {
    const agencySelect = document.getElementById("Agency");
    const sectorSelect = document.getElementById("sector");

    if (agencySelect.value === "Gerencia Executiva") {
      sectorSelect.style.display = "block";
    } else {
      sectorSelect.style.display = "none";
    }
}

document.getElementById('signUpForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = document.getElementById('Name').value;
    const email = document.getElementById('Email').value;
    const password = document.getElementById('Password').value;
    const confirmPassword = document.getElementById('ConfirmPassword').value;
    const agency = document.getElementById('Agency').value;
    const sector = document.getElementById('sector').value;


    const emailRegex = /^[a-zA-Z0-9._%+-]+@inss\.gov\.br$/;
    const specialCharRegex = /[!@#$%&*]/;

    if (password !== confirmPassword) {
        showModal("As senhas não coincidem.","", "attention");
        return;
    }

    if (!specialCharRegex.test(password)) {
        showModal("Senha inválida!", "A senha deve conter pelo menos um caractere especial (!, @, #, $, %, &, *)", "attention");
        return;
    }

    if (!emailRegex.test(email)) {
        showModal("Email invalido","Somente e-mail institucional é aceito. Favor informe seu e-mail institucional.","attention");
        return;
    }

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        await setDoc(doc(db, "users", user.uid), {
            name: name,
            email: email,
            agency: agency,
            permission: "user",
            createdAt: serverTimestamp(),
            sector: sector,
            days_one: null,
            days_two: null,
            days_three: null,
            parc_one: null,
            parc_two: null,
            parc_three: null,
            st_parc_one: null,
            st_parc_two: null,
            st_parc_three: null,
            token_expiration: null,
            token: null
        })

        showModal('Usuário cadastrado com sucesso!',"","");
        setTimeout(() => {
            window.location.href = "index.html";
        }, 1650)
    } catch (error) {
        if (error.message == "Firebase: Password should be at least 6 characters (auth/weak-password).") {
            showModal("Erro ao cadastrar usuário!","A senha deve conter pelo menos 6 caracteres.", "attention")
        }
        if (error.message == "Firebase: Error (auth/missing-password).") {
            showModal("Erro ao cadastrar usuário!", "Os campos de senha estão vazios", "attention")
        }
        if (error.message == "Firebase: Error (auth/network-request-failed).") {
            showModal("Erro ao cadastrar usuário!", "Verifique sua conexão com a internet", "attention")
        }
    }
});