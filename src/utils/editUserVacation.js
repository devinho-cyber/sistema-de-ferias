import { showModal } from "../components/modal";
import { db, doc, getDoc, updateDoc } from "../js/config";
import { loadingScreen } from "./load";

export async function openVacationEditModal(userData) {
    // 1. Abre um modal com um estado de carregamento
    const modalTitle = `Editando Férias de: ${userData.name}`;
    const loadingHTML = `<div id="vacation-cards-container" class="text-center p-4">Carregando dados...</div>`;
    showModal(modalTitle, loadingHTML, 'success', false); // O 'false' impede que o botão OK padrão apareça

    const container = document.getElementById('vacation-cards-container');

    try {
        // 2. Busca os dados de férias do usuário específico
        const userVacationData = await fetchUserVacationData(userData.id);

        // Estrutura os dados para a função createVacationCard
        const vacationParcels = [
            { id: 1, parcela: 1, status: userVacationData.st_parc_one, inicio: userVacationData.parc_one, dias: userVacationData.days_one, termino: userVacationData.end_parc_one },
            { id: 2, parcela: 2, status: userVacationData.st_parc_two, inicio: userVacationData.parc_two, dias: userVacationData.days_two, termino: userVacationData.end_parc_two },
            { id: 3, parcela: 3, status: userVacationData.st_parc_three, inicio: userVacationData.parc_three, dias: userVacationData.days_three, termino: userVacationData.end_parc_three },
        ].filter(p => p.inicio); // Filtra apenas parcelas que existem

        // 3. Renderiza os cards ou uma mensagem de "nenhuma férias"
        if (vacationParcels.length > 0) {
            container.innerHTML = vacationParcels.map(createVacationCard).join('');
            // Adiciona a interatividade de edição aos cards recém-criados
            setupVacationCardInteractivity(container, userData.id);
        } else {
            container.innerHTML = `<p class="text-gray-500">Este usuário não possui férias solicitadas.</p>`;
        }
    } catch (error) {
        console.error("Erro ao carregar dados de férias:", error);
        container.innerHTML = `<p class="text-red-500">Não foi possível carregar os dados de férias.</p>`;
    }
}

// Função auxiliar para buscar os dados de férias de um usuário específico
async function fetchUserVacationData(userId) {
    const userRef = doc(db, "users", userId);
    const userDoc = await getDoc(userRef);
    if (userDoc.exists()) {
        return userDoc.data();
    }
    throw new Error("Documento do usuário não encontrado.");
}

async function updateVacationInstallment(userId, installmentId, originalYear, newStartDate, newDays) {
    loadingScreen.style.display = "flex";

    try {
        // --- TRADUÇÃO DO ID PARA O SUFIXO
        const idToSuffixMap = {
            '1': 'one',
            '2': 'two',
            '3': 'three'
        };
        const parcSuffix = idToSuffixMap[installmentId];
        if (!parcSuffix) {
            throw new Error("ID de parcela inválido para mapeamento: " + installmentId);
        }

        // 2. Calcula a nova data de término
        const newEndDate = calculateAndFormatEndDate(newStartDate, newDays);
        const year = newStartDate.split('-')[0];

        if (originalYear !== year) {
            throw new Error("Não é permitido alterar o ano da parcela. Por favor, escolha uma data dentro do ano original.");
        }

        //VALIDAÇÃO DE SOBREPOSIÇÃO (COLEÇÃO 'users')
        const userRef = doc(db, "users", userId);
        const userDoc = await getDoc(userRef);
        if (!userDoc.exists()) {
            throw new Error("Documento do usuário não encontrado para validação.");
        }
        const userData = userDoc.data();

        const newStartDateObj = new Date(newStartDate + 'T00:00:00');
        const newEndDateObj = parsePtBrDate(newEndDate);

        const allParcelIds = ['1', '2', '3'];

        for (const parcelIdToCheck of allParcelIds) {
            // Pula a verificação da própria parcela que estamos editando
            if (parcelIdToCheck === installmentId) {
                continue;
            }

            // Pega os nomes dos campos (ex: 'parc_one', 'end_parc_one') para a parcela que estamos checando
            const fieldMappings = getInstallmentFieldMappings(parcelIdToCheck);
            const existingStartDateStr = userData[fieldMappings.start];
            const existingEndDateStr = userData[fieldMappings.end];

            // Se a parcela a ser checada não tiver uma data de início, ela não existe
            if (!existingStartDateStr) {
                continue;
            }

            // Converte as datas existentes para comparação
            const existingStartDateObj = parsePtBrDate(existingStartDateStr);
            const existingEndDateObj = parsePtBrDate(existingEndDateStr);

            if (newStartDateObj <= existingEndDateObj && existingStartDateObj <= newEndDateObj) {
                throw new Error(`O período solicitado se sobrepõe com a ${parcelIdToCheck}ª parcela já existente.`);
            }
        }

        const vacationRef = doc(db, "vacations", userId);
        const vacationDoc = await getDoc(vacationRef);

        if (!vacationDoc.exists()) {
            throw new Error("Documento do usuário não encontrado para validação.");
        }

        const vacationData = vacationDoc.data().vacationData;
        const yearData = vacationData[originalYear] || [];

        const entryIndex = yearData.findIndex(entry => entry.parcSuffix == parcSuffix);

        if (entryIndex === -1) {
            throw new Error(`Erro crítico: A parcela não foi encontrada no ano ${originalYear}.`);
        }

        // Atualiza os campos do objeto no array
        yearData[entryIndex].startDate = newStartDate.split('-').reverse().join('/');
        yearData[entryIndex].days = newDays;
        yearData[entryIndex].endDate = newEndDate;
        yearData[entryIndex].status = 'pendente';
        yearData[entryIndex].requestedAt = new Date().toISOString();

        // Prepara a atualização para o Firestore (muito mais simples agora)
        const dataToCommit = {
            [`vacationData.${originalYear}`]: yearData
        };

        // Atualiza a coleção 'users'
        const fieldMappings = getInstallmentFieldMappings(installmentId);
        const userDataToUpdate = {
            [fieldMappings.start]: newStartDate.split('-').reverse().join('/'),
            [fieldMappings.days]: newDays,
            [fieldMappings.end]: newEndDate,
            [fieldMappings.status]: 'pendente'
        };
        await updateDoc(userRef, userDataToUpdate);

        // Atualiza a coleção 'vacations'
        await updateDoc(vacationRef, dataToCommit);
        
        showModal("Sucesso!", "Parcela de férias atualizada com sucesso!");

    } catch (error) {
        console.error("Erro ao atualizar a parcela de férias:", error);
        showModal("Atenção!", error.message, "attention");
    } finally {
        loadingScreen.style.display = "none";
    }
}

function setupVacationCardInteractivity(container, userId) {
    container.addEventListener('click', async (event) => {
        const target = event.target;
        const button = target.closest('button'); // Ação pode estar no ícone ou no botão
        if (!button) return;

        const card = button.closest('.shadow-md');
        const installmentId = button.dataset.id;
        if (!installmentId) return;

        if (button.classList.contains('edit-btn')) {
            toggleEditState(card, true); // Função para habilitar/desabilitar campos
        }

        if (button.classList.contains('cancel-btn')) {
            // Lógica para cancelar a edição (restaurar valores originais do data-*)
            toggleEditState(card, false);
        }

        if (button.classList.contains('save-btn')) {
            const originalYear = card.dataset.originalYear;
            const newStartDate = card.querySelector(`#inicio${installmentId}`).value;
            const newDays = parseInt(card.querySelector(`#dias${installmentId}`).value, 10);

            // Chama a versão do ADMIN da função, passando o userId
            await updateVacationInstallment(userId, installmentId, originalYear, newStartDate, newDays);

            toggleEditState(card, false); // Trava o card novamente após salvar
        }
    });
}

function toggleEditState(card, isEditing) {
    const id = card.id.split('-')[1]; // Extrai o ID do card (ex: "card-1" -> "1")

    // Encontra os elementos dentro do card
    const inputs = card.querySelectorAll(`#inicio${id}, #dias${id}`);
    const editBtn = card.querySelector(".edit-btn");
    const saveBtn = card.querySelector(".save-btn");
    const cancelBtn = card.querySelector(".cancel-btn");

    // Alterna a visibilidade dos botões
    editBtn.classList.toggle("hidden", isEditing);
    saveBtn.classList.toggle("hidden", !isEditing);
    cancelBtn.classList.toggle("hidden", !isEditing);

    // Habilita/desabilita os inputs e muda o estilo
    inputs.forEach(input => {
        input.disabled = !isEditing;
        input.classList.toggle("bg-gray-100", !isEditing);
        input.classList.toggle("bg-white", isEditing);
    });
}

function createVacationCard(vacation) {
    const originalYear = vacation.inicio ? vacation.inicio.split('/')[2] : ''

    return `
        <div class="bg-gray-50 rounded-lg p-6 shadow-md w-full" id="card-${vacation.id}" data-original-dias="${vacation.dias}" data-original-inicio="${vacation.inicio ? formatDateToInput(vacation.inicio) : ''}" data-original-year="${originalYear}">
            <div class="flex justify-between items-center mb-4">
                <h2 class="text-xl font-semibold text-gray-800">${vacation.parcela}ª parcela</h2>
                <span class="status-badge px-3 py-1 ${vacation.status === "reprovada"
            ? "bg-red-500 text-white"
            : vacation.status === "pendente"
                ? "bg-yellow-100 text-yellow-800"
                : "bg-green-100 text-green-800"
        } rounded-full text-sm font-medium">
                    Status: ${vacation.status}
                </span>
            </div>
            <div class="grid lg:grid-cols-3 gap-4 mb-4">
                <div>
                    <label for="inicio${vacation.id}" class="block text-sm font-medium text-gray-700 mb-1">Início</label>
                    <input type="date" id="inicio${vacation.id}" value="${vacation.inicio ? formatDateToInput(vacation.inicio) : ""}" class="w-full p-2 border border-gray-200 bg-gray-100 rounded-md">
                </div>
                <div>
                    <label for="dias${vacation.id}" class="block text-sm font-medium text-gray-700 mb-1">Dias</label>
                    <input type="number" id="dias${vacation.id}" value="${vacation.dias}" class="w-full p-2 border border-gray-200 bg-gray-100 rounded-md">
                </div>
                <div>
                    <label for="termino${vacation.id}" class="block text-sm font-medium text-gray-700 mb-1">Término</label>
                    <input type="date" id="termino${vacation.id}" value="${vacation.termino ? formatDateToInput(vacation.termino) : ""}" class="w-full p-2 border border-gray-200 bg-gray-100 rounded-md" disabled>
                </div>
            </div>
            <div class="flex justify-end gap-2">
                <button data-id="${vacation.id}" class="edit-btn px-4 py-2 bg-[#172554] text-white rounded-md hover:bg-blue-600">✏️ Editar</button>
                <button data-id="${vacation.id}" class="save-btn hidden px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600">💾 Salvar</button>
                <button data-id="${vacation.id}" class="cancel-btn hidden px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600">❌ Cancelar</button>
            </div>
        </div>
    `;
}

function calculateAndFormatEndDate(startDateString, days) {
    // Adiciona 'T00:00:00' para evitar problemas de fuso horário que podem mudar o dia
    const date = new Date(startDateString + 'T00:00:00');

    // Subtrai 1 porque o período de X dias inclui o dia de início
    date.setDate(date.getDate() + parseInt(days) - 1);

    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Meses são base 0
    const year = date.getFullYear();

    return `${day}/${month}/${year}`;
}

function parsePtBrDate(dateString) {
    const [day, month, year] = dateString.split('/');
    // O mês no construtor do Date é base 0 (janeiro=0), por isso month - 1
    return new Date(year, month - 1, day);
}

function getInstallmentFieldMappings(id) {
    const map = {
        '1': { start: 'parc_one', days: 'days_one', end: 'end_parc_one', status: 'st_parc_one' },
        '2': { start: 'parc_two', days: 'days_two', end: 'end_parc_two', status: 'st_parc_two' },
        '3': { start: 'parc_three', days: 'days_three', end: 'end_parc_three', status: 'st_parc_three' },
    };
    return map[id];
}

function formatDateToInput(value) {
    const [day, month, year] = value.split("/");
    return `${year}-${month}-${day}`;
}