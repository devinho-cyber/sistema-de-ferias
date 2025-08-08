import { hideModal, showModal } from "./modal";

export function showConfirmationModal(title, message) {
  return new Promise((resolve, reject) => {
    showModal(title, message, "confirm");

    const modalActions = document.querySelector("#modal .items-center");

    modalActions.innerHTML = `
            <div class="flex justify-center gap-4">
                <button id="confirm-request" class="px-4 py-2 bg-[#172554] transition text-white rounded-md hover:bg-[#1e3a8a] focus:outline-none focus:ring-2 focus:ring-blue-300">
                    Confirmar
                </button>
                <button id="cancel-request" class="px-4 py-2 bg-gray-300 transition text-gray-800 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-400">
                    Cancelar
                </button>
            </div>
        `;

    // Event listener para o botão de confirmação
    document.getElementById("confirm-request").addEventListener("click", () => {
      hideModal(); // Fecha o modal
      resolve(true); // Confirma a ação
      modalActions.innerHTML = `<button id="modal-close" class="px-4 py-2 text-white text-base 
            font-medium rounded-md w-full shadow-sm focus:outline-none bg-[#172554] transition hover:bg-[#1e3a8a] focus:ring-2 focus:ring-offset-2">
                    OK
                </button>`;

      // Event listener para o botão "OK" para fechar o modal
      document
        .getElementById("modal-close")
        .addEventListener("click", hideModal);
    });

    // Event listener para o botão de cancelar
    document.getElementById("cancel-request").addEventListener("click", () => {
      hideModal(); // Fecha o modal
      resolve(false); // Cancela a ação
    });
  });
}