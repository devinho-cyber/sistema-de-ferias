import { clearModal } from "../components/clearModal.js";
import { showModal } from "../components/modal.js";

export function validateCreateUserInputs(name, email, password, confirmPassword) {
    const passwordWarning = document.querySelectorAll('.passwordWarning')

    passwordWarning.forEach((item) => {
        item.style.display = "none"
    })

    const emailRegex = /^[a-zA-Z0-9._%+-]+@inss\.gov\.br$/;
    const specialCharRegex = /[!@#$%&*]/;

    if (!name || !email || !password || !confirmPassword) {
        clearModal()
        showModal("Atenção!", "Todos os campos devem ser preenchidos.", "attention");
        throw new Error("Todos os campos devem ser preenchidos.")
    }

    if (!emailRegex.test(email)) {
        clearModal()
        showModal("Email inválido", "Somente e-mail institucional é aceito.", "attention");
        throw new Error("Somente e-mail institucional é aceito.")
    }

    if (password.length < 6) {
        clearModal()
        showModal("Senha muito curta!", "A senha deve conter pelo menos 6 caracteres.", "attention");
        throw new Error("A senha deve conter pelo menos 6 caracteres.")
    }

    if (!specialCharRegex.test(password)) {
        clearModal()
        showModal("Senha inválida!", "A senha deve conter pelo menos um caractere especial (!, @, #, $, %, &, *).", "attention");
        throw new Error("A senha deve conter pelo menos um caractere especial")
    }

    if (password !== confirmPassword) {
        passwordWarning.forEach((item) => {
            item.style.display = "block"
        })
        throw new Error("As senhas não coincidem")
    }
}