import { hideModal } from "./modal";

export function clearModal() {
    const modalActions = document.querySelector('#modal .items-center');
    modalActions.innerHTML = `
        <div class="flex justify-center gap-4">
            <button id="cancel-create" class="px-4 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400 transition focus:outline-none focus:ring-2 focus:ring-gray-400">
                Ok
            </button>
        </div>
    `;
    document.getElementById('cancel-create').addEventListener('click', hideModal);
}