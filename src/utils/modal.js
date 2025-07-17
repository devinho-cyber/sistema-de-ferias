
// // modal.js
// const modal = document.getElementById('modal');
// const modalTitle = document.getElementById('modal-title');
// const modalMessage = document.getElementById('modal-message');
// const modalClose = document.getElementById('modal-close');

// export function showModal(title, message, type = 'success') {
//     modalTitle.textContent = title;
//     modalMessage.innerHTML = message;

//     // Definir cores com base no tipo
//     if (type === 'attention') {
//         modalTitle.classList.add('text-red-600');
//         modalTitle.classList.remove('text-blue-600');
//         modalClose.classList.add('bg-red-500', 'hover:bg-red-600');
//         modalClose.classList.remove('bg-blue-500', 'hover:bg-blue-600');
//     } else {
//         modalTitle.classList.add('text-blue-[#002940]');
//         modalTitle.classList.remove('text-red-600');
//         modalClose.classList.add('bg-[#002940]', 'hover:bg-blue-600', 'transition');
//         modalClose.classList.remove('bg-red-500', 'hover:bg-red-600');
//     }

//     modal.classList.remove('hidden');
// }

// export function hideModal() {
//     modal.classList.add('hidden');
// }

// modalClose.addEventListener('click', hideModal);

// // Fechar modal ao clicar fora
// modal.addEventListener('click', (e) => {
//     if (e.target === modal) {
//         hideModal();
//     }
// });

// // Fechar modal ao pressionar a tecla Escape
// document.addEventListener('keydown', (e) => {
//     if (e.key === 'Escape' && !modal.classList.contains('hidden')) {
//         hideModal();
//     }
// });

// Exportar a função showModal para torná-la disponível globalmente
// window.showModal = showModal;
// window.hideModal = hideModal;

// modal.js
let initialized = false;

function initModal() {
    const modal = document.getElementById('modal');
    const modalTitle = document.getElementById('modal-title');
    const modalMsg = document.getElementById('modal-message');
    const modalClose = document.getElementById('modal-close');

    if (!modal) return null;

    modalClose.addEventListener('click', hideModal);
    modal.addEventListener('click', e => {
        if (e.target === modal) hideModal();
    });
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && !modal.classList.contains('hidden')) {
            hideModal();
        }
    });

    return { modal, modalTitle, modalMsg, modalClose };
}

export function showModal(title, message, type = 'success') {
    if (!initialized) {
        const refs = initModal();
        if (!refs) return;
        // guarda as refs em escopo de módulo
        Object.assign(globalThis, refs);
        initialized = true;
    }

    // agora você tem modal, modalTitle, modalMsg, modalClose definidos
    modalTitle.textContent = title;
    modalMsg.innerHTML = message;
    if (type === 'attention') {
        modalTitle.classList.add('text-red-600');
        modalTitle.classList.remove('text-blue-600');
        modalClose.classList.add('bg-red-500', 'hover:bg-red-600');
        modalClose.classList.remove('bg-blue-500', 'hover:bg-blue-900');
    } else {
        modalTitle.classList.add('text-blue-[#002940]');
        modalTitle.classList.remove('text-red-600');
        modalClose.classList.add('bg-[#002940]', 'hover:bg-blue-900', 'transition');
        modalClose.classList.remove('bg-red-500', 'hover:bg-red-600');
    }
    modal.classList.remove('hidden');
}

export function hideModal() {
    if (typeof modal === 'undefined') return;
    modal.classList.add('hidden');
}