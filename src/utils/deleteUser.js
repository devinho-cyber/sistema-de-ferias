import { auth } from "../js/config"
import { clearModal } from "../components/clearModal.js"
import { hideModal, showModal } from "../components/modal"

export async function deleteUser(userId) {
    const confirmAction = confirm("Confirmar exclusão?")
    if(!confirmAction) return
    
    try {
        const currentUser = auth.currentUser

        const token = await currentUser.getIdToken()

        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/delete-user`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(userId)
        })

        if (!response.ok) {
            const errorData = await response.text();
            throw new Error(errorData || 'Falha ao excluir usuário.')
        }

        hideModal()
        clearModal()
        showModal('Usuário excluído com sucesso!', "", "success")
    } catch (error) {
        console.error("Erro ao excluir usuário:", error)
        clearModal()
        showModal("Erro ao excluir!", error.message, "attention")
    }
}