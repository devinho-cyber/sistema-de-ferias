import { auth, db, doc, onAuthStateChanged, getDoc, getDocs, collection } from './config.js';
import { setYear, currentYear, showModal } from '../utils';

let vacations = []; // Variável para armazenar o ano atual
const vacationList = document.querySelector("#vacationRequests");

// Monitorando a autenticação do usuário
onAuthStateChanged(auth, async (user) => {
    if (user) {
        await displayUserVacationData(user.uid);
        addSelectIfAdminOrManager(user.uid);
    } else {
        console.log("Usuário não autenticado.");
    }
});

async function fetchAllUsers() {
    const users = [];
    const querySnapshot = await getDocs(collection(db, "users"));
    querySnapshot.forEach((doc) => {
        users.push({ id: doc.id, ...doc.data() });
    });
    return users;
}

// Função para buscar dados de férias do usuário
async function getVacationData(userId) {
    try {
        const userRef = doc(db, "vacations", userId);
        const docSnap = await getDoc(userRef);

        if (docSnap.exists()) {
            return docSnap.data();
        } else {
            vacationList.textContent = "Nenhum documento encontrado para este usuário."
            return null;
        }
    } catch (error) {
        console.error("Erro ao buscar dados de férias:", error);
        showModal("Erro", `Erro ao buscar dados de férias:, ${error}`, "attention")
        return null;
    }
}

// Exibir dados de férias do usuário
async function displayUserVacationData(userId) {
    vacations = await getVacationData(userId); // Atualiza a variável global vacationData
    if (vacations) {
        updateVacationDisplay(vacations, currentYear);
    } else {
        console.log("Nenhum dado de férias encontrado.");
    }
}

function formatDateToInput(value) {
    const [day, month, year] = value.split('/');
    return `${year}-${month}-${day}`;
}

// Função para criar o cartão de férias com o botão de edição
function createVacationCard(vacation) {
    const card = document.createElement("div");
    card.classList.add("bg-gray-50", "rounded-lg", "p-6", "shadow-md");

    card.innerHTML = `
        <div class="flex justify-between items-center mb-4">
            <h2 class="text-xl font-semibold text-gray-800">${vacation.parcela}º parcela</h2>
            <span class="px-3 py-1 ${vacation.status === "reprovada" ? "bg-red-500 text-white" : (vacation.status === "pendente" ? "bg-yellow-100 text-yellow-800" : "bg-green-100 text-green-800")} rounded-full text-sm font-medium">
                Status: ${vacation.status}
            </span>
        </div>
        <div class="grid lg:grid-cols-3 gap-4">
            <div>
                <label for="inicio${vacation.id}" class="block text-sm font-medium text-gray-700 mb-1">Início</label>
                <input type="date" id="inicio${vacation.id}" value="${vacation.inicio ? formatDateToInput(vacation.inicio) : ''}" class="w-full p-2 border border-gray-200 bg-white rounded-md" disabled>
            </div>
            <div>
                <label for="dias${vacation.id}" class="block text-sm font-medium text-gray-700 mb-1">Dias</label>
                <input type="number" id="dias${vacation.id}" value="${vacation.dias}" class="w-full p-2 border border-gray-200 bg-white rounded-md" disabled>
            </div>
            <div>
                <label for="termino${vacation.id}" class="block text-sm font-medium text-gray-700 mb-1">Término</label>
                <input type="date" id="termino${vacation.id}" value="${vacation.termino ? formatDateToInput(vacation.termino) : ''}" class="w-full p-2 border border-gray-200 bg-white rounded-md" disabled>
            </div>
        </div>
    `;
    return card;
}

function createSelect(options) {
    const select = document.createElement("select");
    select.classList.add("p-2", "border", "block", "bg-[#002940]", "rounded-md")
    select.innerHTML = `
        <option value="">Selecione um usuário</option>
        ${options.map(option => `<option value="${option.id}">${option.name}</option>`).join('')}
    `;
    return select;
}

// Função para adicionar o select no header se o usuário for admin ou gestor
async function addSelectIfAdminOrManager(userId) {
    try {
        const userRef = doc(db, "users", userId);
        const docSnap = await getDoc(userRef);

        if (docSnap.exists()) {
            const currentUserData = docSnap.data();
            const userRole = currentUserData.permission; // Papel do usuário logado
            const userAgency = currentUserData.agency; // Agência do usuário logado

            // Busca todos os usuários no Firestore
            const allUsers = await fetchAllUsers();

            let options = [];
            if (userRole === "admin") {
                // Se for admin, adiciona todos os usuários ao select
                options = allUsers.map(user => ({ id: user.id, name: user.name }));
            } else if (userRole === "gestor") {
                // Se for gestor, adiciona apenas os usuários da mesma agência
                options = allUsers
                    .filter(user => user.agency === userAgency && user.permission !== "admin")
                    .map(user => ({ id: user.id, name: user.name }));
            }

            if (options.length > 0) {
                const header = document.querySelector("header");
                const select = createSelect(options);
                header.appendChild(select);

                select.addEventListener("change", async (event) => {
                    const selectedUserId = event.target.value;

                    if (selectedUserId) {
                        await displayUserVacationData(selectedUserId); // Atualiza os cards com o usuário selecionado
                        const selectedUserName = event.target.options[event.target.selectedIndex].text;

                        // Define o nome no elemento com id="name"
                        document.getElementById("name").textContent = `Histórico de Solicitações de ${selectedUserName}`;
                    } else {
                        vacationList.innerHTML = "<p>Selecione um usuário para ver as férias.</p>";
                        document.getElementById("name").textContent = "Histórico de Solicitações";
                    }
                });
            }
        } else {
            console.log("Dados do usuário logado não encontrados.");
        }
    } catch (error) {
        console.error("Erro ao verificar o papel do usuário:", error);
    }
}

// Atualiza a exibição dos dados de férias
function updateVacationDisplay(vacations, year) {
    vacationList.innerHTML = "";

    //Pega apenas os dados do ano selecionado
    const vacationData = vacations.vacationData?.[year];
    console.log(vacationData)

    if (!vacationData) {
        vacationList.innerHTML =
            '<p class="text-center col-span-2 text-gray-500">Nenhuma férias solicitada para este ano.</p>';
        return;
    }

    //Monta o array de parcelas a partir do ano
    vacationData.forEach((req, reqIndex) => {
        // Monta o array de parcelas dessa solicitação
        const parcels = [
            {
                id: reqIndex * 3 + 1,
                parcela: 1,
                status: req.st_parc_one,
                inicio: req.parc_one,
                dias: req.days_one,
                termino: req.end_parc_one,
            },
            {
                id: reqIndex * 3 + 2,
                parcela: 2,
                status: req.st_parc_two,
                inicio: req.parc_two,
                dias: req.days_two,
                termino: req.end_parc_two,
            },
            {
                id: reqIndex * 3 + 3,
                parcela: 3,
                status: req.st_parc_three,
                inicio: req.parc_three,
                dias: req.days_three,
                termino: req.end_parc_three,
            },
        ];

        // Renderiza cada parcel dessa solicitação
        parcels.forEach((vac) => {
            if (!vac.inicio) return;  // pula parcelas não preenchidas

            const vacationCard = createVacationCard(vac);
            vacationList.appendChild(vacationCard);
        });
    });
}

setYear()

// Atualiza a exibição ao alterar o ano
document.getElementById("yearFilter").addEventListener("change", (e) => {
    const selectedYear = parseInt(e.target.value, 10);
    if (vacations) {
        updateVacationDisplay(vacations, selectedYear);
    }
});
