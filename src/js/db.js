import {
  auth,
  db,
  doc,
  updateDoc,
  onAuthStateChanged,
  getDoc,
  setDoc,
  deleteField,
} from "./config.js";
import { currentYear, loadingScreen, handleVacationRequest } from "../utils";
import { calculateEndDate } from "./user.js";
import { hideModal, showModal } from "../components/modal.js";

const maxDays = 30; // Define o valor máximo de dias permitido
let vacationData = [];
currentYear

// Função para buscar dados de férias do usuário
async function getVacationData(userId) {
  try {
    const userRef = doc(db, "users", userId);
    const docSnap = await getDoc(userRef);

    if (docSnap.exists()) {
      return docSnap.data();
    } else {
      console.log("Nenhum documento encontrado para este usuário.");
      return null;
    }
  } catch (error) {
    console.error("Erro ao buscar dados de férias:", error);
    return null;
  }
}

// Monitorando a autenticação do usuário
onAuthStateChanged(auth, async (user) => {
  if (user) {
    await displayUserVacationData(user.uid);
  } else {
    console.log("Usuário não autenticado.");
  }
});

// Exibir dados de férias do usuário
async function displayUserVacationData(userId) {
  vacationData = await getVacationData(userId); // Atualiza a variável global vacationData
  if (vacationData) {
    updateVacationDisplay(vacationData); // Exibe as férias com o ano padrão
  } else {
    console.log("Nenhum dado de férias encontrado.");
  }
}

// Função para formatar a data no padrão DD/MM/YYYY
function formatDateToBR(date) {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

// Função para exibir o modal de confirmação antes de enviar
function showConfirmationModal(vacationData) {
  return new Promise((resolve, reject) => {
    const modalTitle = "Confirmar ação";
    showModal(modalTitle, "Deseja enviar a solicitação de férias?", "confirm");

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

// Função para enviar a solicitação de férias
async function sendRequest() {
  try {
    const dayInputs = document.querySelectorAll(".day-input");
    const dateInputs = document.querySelectorAll(".start-date-input");

    // Valida e processa as entradas de férias
    const {
      vacationDataForUsersCollection,
      vacationEntriesForVacationsCollection,
      emailPeriods
    } = validateVacationEntries(dayInputs, dateInputs);

    const user = auth.currentUser;
    if (!user) {
      showModal("Erro!", "Usuário não autenticado.", "error");
      return;
    }

    // Exibe o modal de confirmação
    const userConfirmed = await showConfirmationModal();
    if (!userConfirmed) return;

    // Exibe a tela de loading
    loadingScreen.style.display = "flex";

    const userRef = doc(db, "users", user.uid);
    const userDoc = await getDoc(userRef);
    if (!userDoc.exists()) {
      showModal("Erro!", "Documento do usuário não encontrado.", "error");
      return;
    }

    //Envia o email de solicitação de férias
    // await handleVacationRequest(userDoc.data(), emailPeriods)

    await updateDoc(userRef, vacationDataForUsersCollection);
    await saveVacationRequestOnFirebase(user.uid, userDoc.data(), vacationEntriesForVacationsCollection)
    await displayUserVacationData(user.uid);

    showModal("Sucesso!", "Solicitação enviada com sucesso!");
  } catch (error) {
    console.error("Erro ao enviar a solicitação:", error);
    showModal("Atenção!", error.message, "attention");
  } finally {
    // Esconde a tela de loading, seja em sucesso ou falha
    loadingScreen.style.display = "none";
  }
}

async function saveVacationRequestOnFirebase(userId, userData, newVacationEntries) {
  try {
    const year = newVacationEntries[0].startDate.split("/")[2]

    const vacationRef = doc(db, "vacations", userId);
    const existingDoc = await getDoc(vacationRef);
    const existingData = existingDoc.exists() ? existingDoc.data() : {};

    // Garante que a estrutura de vacationData e do ano exista
    const previousVacationData = existingData.vacationData || {};
    const previousYearData = previousVacationData[year] || [];

    const updatedYearData = [...previousYearData];
    newVacationEntries.forEach(newEntry => {
      // const isAlreadyInHistory = updatedYearData.some(entry => entry.id === newEntry.id);
      // if (!isAlreadyInHistory) {
      updatedYearData.push(newEntry);
      // }
    })

    const updatedVacationData = {
      ...previousVacationData,
      [year]: updatedYearData,
    };

    const vacationRequest = {
      userId,
      user: {
        name: userData.name,
        agency: userData.agency,
      },
      vacationData: updatedVacationData,
    };

    await setDoc(vacationRef, vacationRequest, { merge: true });
  } catch (error) {
    console.error("Erro ao salvar a solicitação de férias no Firebase:", error);
    throw error
  }
}

function validateVacationEntries(dayInputs, dateInputs) {
  let totalDays = 0;
  let lastEndDate = null;
  let emailPeriods = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const vacationDataForUsersCollection = {
    lastUpdated: today.toISOString(),
  };

  // Array para armazenar as entradas de férias formatadas, incluindo o ID único
  const vacationEntriesForVacationsCollection = [];

  let parcelsFilled = 0

  for (let i = 0; i < dayInputs.length; i++) {
    const dayInput = dayInputs[i];
    const dateInput = dateInputs[i];

    if (!dayInput.disabled && !dateInput.disabled && dayInput.value && dateInput.value) {
      const dayValue = Number(dayInput.value);
      const startDateStr = dateInput.value;
      const startDateParts = startDateStr.split("/");
      const startDate = new Date(`${startDateParts[2]}-${startDateParts[1]}-${startDateParts[0]}`);
      startDate.setHours(0, 0, 0, 0);

      if (startDate < today) {
        throw new Error("A data inicial deve ser posterior ou igual à data atual.");
      }

      if (lastEndDate && startDate <= lastEndDate) {
        throw new Error("A data inicial de cada parcela deve ser posterior à data final da parcela anterior.");
      }

      totalDays += dayValue;
      if (totalDays > maxDays) { // Assumindo 'maxDays' está definido globalmente
        throw new Error("A quantidade total de dias não pode ultrapassar 30.");
      }

      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + dayValue - 1);
      const formattedStartDate = formatDateToBR(startDate);
      const formattedEndDate = formatDateToBR(endDate);

      // Gera um ID único para esta parcela de férias
      const uniqueId = crypto.randomUUID();

      const parcSuffix = i === 0 ? "one" : i === 1 ? "two" : "three";

      // Adiciona os dados ao objeto vacationData para a coleção 'users'
      vacationDataForUsersCollection[`days_${parcSuffix}`] = dayValue;
      vacationDataForUsersCollection[`parc_${parcSuffix}`] = formattedStartDate;
      vacationDataForUsersCollection[`end_parc_${parcSuffix}`] = formattedEndDate;
      vacationDataForUsersCollection[`st_parc_${parcSuffix}`] = "pendente";
      vacationDataForUsersCollection[`id_parc_${parcSuffix}`] = uniqueId;

      // Prepara o objeto para a coleção 'vacations'
      vacationEntriesForVacationsCollection.push({
        id: uniqueId, // ID único da parcela
        parcSuffix: parcSuffix, // Para identificar qual parcela é
        days: dayValue,
        startDate: formattedStartDate,
        endDate: formattedEndDate,
        status: "pendente",
        requestedAt: new Date().toISOString(),
      });

      emailPeriods.push(`${formattedStartDate} à ${formattedEndDate}`);
      lastEndDate = endDate;
      parcelsFilled++
    }
  }

  const allParcSuffixes = ["one", "two", "three"];
  for (let i = parcelsFilled; i < allParcSuffixes.length; i++) {
    const suffixToDelete = allParcSuffixes[i];
    vacationDataForUsersCollection[`days_${suffixToDelete}`] = deleteField()
    vacationDataForUsersCollection[`parc_${suffixToDelete}`] = deleteField()
    vacationDataForUsersCollection[`end_parc_${suffixToDelete}`] = deleteField()
    vacationDataForUsersCollection[`st_parc_${suffixToDelete}`] = deleteField()
    vacationDataForUsersCollection[`id_parc_${suffixToDelete}`] = deleteField()
  }

  if (totalDays !== maxDays) {
    throw new Error("A quantidade total de dias deve ser exatamente 30.");
  }

  // Retorna vacationData para 'users' e vacationEntriesForVacationsCollection para 'vacations'
  return {
    vacationDataForUsersCollection,
    vacationEntriesForVacationsCollection,
    emailPeriods
  };
}

// Exibição inicial
document.addEventListener("DOMContentLoaded", () => {
  const dayInputs = document.querySelectorAll(".day-input");
  const dateInputs = document.querySelectorAll(".start-date-input");

  dayInputs.forEach((input) => (input.value = ""));
  dateInputs.forEach((input) => (input.value = ""));

  dayInputs.forEach((dayInput, index) => {
    const dateInput = dateInputs[index];
    const endDateElement = document.createElement("span");
    endDateElement.className = "end-date-display font-semibold";
    dateInput.parentNode.appendChild(endDateElement);

    // Adiciona ouvintes de eventos para calcular a data final
    dayInput.addEventListener("input", () =>
      calculateEndDate(dayInput, dateInput, endDateElement)
    );
    dateInput.addEventListener("input", () =>
      calculateEndDate(dayInput, dateInput, endDateElement)
    );
  });

  document.querySelector("#sendRequest").addEventListener("click", sendRequest);
});

// Função para converter data do formato "dd/MM/yyyy" para "yyyy-MM-dd"
function formatDateToInput(value) {
  const [day, month, year] = value.split("/");
  return `${year}-${month}-${day}`;
}

// Função para criar o cartão de férias
function createVacationCard(vacation) {
  return `
        <div class="bg-gray-50 rounded-lg p-6 shadow-md">
            <div class="flex justify-between items-center mb-4">
                <h2 class="text-xl font-semibold text-gray-800">${vacation.parcela
    }ª parcela</h2>
                <span class="px-3 py-1 ${vacation.status === "reprovada"
      ? "bg-red-500 text-white"
      : vacation.status === "pendente"
        ? "bg-yellow-100 text-yellow-800"
        : "bg-green-100 text-green-800"
    } rounded-full text-sm font-medium">
                    Status: ${vacation.status}
                </span>
            </div>
            <div class="grid grid-cols-3 gap-4">
                <div>
                    <label for="inicio${vacation.id
    }" class="block text-sm font-medium text-gray-700 mb-1">Início</label>
                    <input type="date" id="inicio${vacation.id}" value="${vacation.inicio ? formatDateToInput(vacation.inicio) : ""
    }" class="w-full p-2 border border-gray-200 bg-white rounded-md" disabled>
                </div>
                <div>
                    <label for="dias${vacation.id
    }" class="block text-sm font-medium text-gray-700 mb-1">Dias</label>
                    <input type="number" id="dias${vacation.id}" value="${vacation.dias
    }" class="w-full p-2 border border-gray-200 bg-white rounded-md" disabled>
                </div>
                <div>
                    <label for="termino${vacation.id
    }" class="block text-sm font-medium text-gray-700 mb-1">Término</label>
                    <input type="date" id="termino${vacation.id}" value="${vacation.termino ? formatDateToInput(vacation.termino) : ""
    }" class="w-full p-2 border border-gray-200 bg-white rounded-md" disabled>
                </div>
            </div>
        </div>
    `;
}

// Atualiza a exibição dos dados de férias
function updateVacationDisplay(vacationData, year) {
  const vacationList = document.querySelector("#vacationRequests");
  vacationList.innerHTML = ""; // Limpa a lista antes de atualizá-la

  // Filtra os dados de férias para o ano selecionado
  const filteredVacations = [
    {
      id: 1,
      parcela: 1,
      status: vacationData.st_parc_one,
      inicio: vacationData.parc_one,
      dias: vacationData.days_one,
      termino: vacationData.end_parc_one,
    },
    {
      id: 2,
      parcela: 2,
      status: vacationData.st_parc_two,
      inicio: vacationData.parc_two,
      dias: vacationData.days_two,
      termino: vacationData.end_parc_two,
    },
    {
      id: 3,
      parcela: 3,
      status: vacationData.st_parc_three,
      inicio: vacationData.parc_three,
      dias: vacationData.days_three,
      termino: vacationData.end_parc_three,
    },
  ].filter(
    (vacation) => vacation.inicio
  );

  if (filteredVacations.length === 0) {
    vacationList.innerHTML =
      '<p class="text-center col-span-2 text-gray-500">Nenhuma férias solicitada para este ano.</p>';
  } else {
    filteredVacations.forEach((vacation) => {
      vacationList.innerHTML += createVacationCard(vacation);
    });
  }
}
