import { showModal } from "../utils/modal";
import { sendEmail } from "../utils/sendEmail";

document.querySelector('form').addEventListener('submit', async (event) => {
    event.preventDefault()

    const emailInput = document.getElementById('user-email')

    try {
        const email = emailInput.value

        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/gerar-link-redefinicao`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });

        if (!response.ok) {
            throw new Error('Erro ao acessar a rota de redefinição de senha.');
        }

        const data = await response.json();
        const link = data.link;

        if (!link) {
            throw new Error('Link de redefinição não foi gerado.');
        }

        await sendEmail({
            to_email: email,
            subject: "Redefinição de senha",
            message: `Olá,\n
                Clique neste link para redefinir a senha de login no sistema controle de férias.\n
                ${link}\n
                Se você não solicitou a redefinição da sua senha, ignore este e-mail.\n
                Obrigado,\n`,
        })

        showModal(
            "Redefinição de Senha", 
            "Verifique seu email. Um link de redefinição foi enviado para o email", 
            "success"
        )

        emailInput.value = ''
    } catch (err) {
        console.error('Erro ao enviar email:', err);
        alert('Erro ao enviar email. Tente novamente.');
    }
})