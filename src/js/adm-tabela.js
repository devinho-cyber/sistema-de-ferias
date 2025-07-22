import { showModal, hideModal, validateCreateUserInputs } from '../utils';
import { clearModal } from '../utils/clearModal.js';
import { auth, db } from './config.js';
import { collection, doc, updateDoc, getDocs, query, where, orderBy } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

async function fetchEmployees(selectedAgency) {
    const employeesRef = collection(db, 'users');
    let q;

    if (selectedAgency) {
        q = query(employeesRef, where('agency', '==', selectedAgency), orderBy("name", "asc"));
    } else {
        q = query(employeesRef, orderBy("name", "asc")); // Se nenhuma agência estiver selecionada, pegar todos
    }

    const snapshot = await getDocs(q);
    const employees = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return employees;
}

async function populateTable() {
    const selectedAgency = document.getElementById('Agency').value;
    const employees = await fetchEmployees(selectedAgency);
    const tableBody = document.getElementById('employeeTableBody');

    if (!tableBody) {
        console.error("Elemento 'employeeTableBody' não encontrado no DOM.");
        return;
    }

    tableBody.innerHTML = ''; // Limpa o conteúdo atual

    employees.forEach(employee => {
        const row = document.createElement('tr');
        row.className = 'border-b border-gray-200';

        // Coluna com o nome do funcionário
        const nameCell = document.createElement('td');
        nameCell.textContent = employee.name;
        nameCell.className = 'p-3 font-medium capitalize';
        row.appendChild(nameCell);

        // Adicione a célula "Em Férias" com o valor do banco de dados
        const vacationCell = document.createElement('td');
        vacationCell.textContent = employee.emFerias === "Sim" ? "Sim" : "Não"; // Exibe "Sim" ou "Não"
        vacationCell.className = 'p-3 text-center';
        row.appendChild(vacationCell);

        const apsCell = document.createElement('td');
        apsCell.textContent = employee.agency;
        apsCell.className = 'p-3 text-center';
        row.appendChild(apsCell);

        const sector = document.createElement('td');
        sector.textContent = employee.sector ? employee.sector : '-';
        sector.className = 'p-3 text-center';
        row.appendChild(sector);

        const emailCell = document.createElement('td');
        emailCell.textContent = employee.email;
        emailCell.className = 'p-3 text-center';
        row.appendChild(emailCell);

        const permissionCell = document.createElement('td');
        permissionCell.textContent = employee.permission;
        permissionCell.className = 'p-3 text-center capitalize';
        row.appendChild(permissionCell);

        const actionsCell = document.createElement('td');
        actionsCell.className = 'flex justify-center mt-2';
        actionsCell.innerHTML = `
            <button class="edit-user-btn cursor-pointer"
                data-user='{"id":"${employee.id}","name":"${employee.name}","emFerias":"${employee.emFerias}","agency":"${employee.agency}","email":"${employee.email}","permission":"${employee.permission}"}'>
                <i data-lucide="user-pen" class="text-gray-500"></i>
            </button>`;
        row.appendChild(actionsCell);

        tableBody.appendChild(row);
    });

    const editButtons = document.querySelectorAll('.edit-user-btn');

    editButtons.forEach(button => {
        button.addEventListener('click', function () {
            const userData = JSON.parse(this.getAttribute('data-user'));
            openUserEditModal(userData);
        })
    });

    lucide.createIcons(); // Atualiza os ícones
}

function openUserEditModal(userData) {
    const modalTitle = "Editar Usuário";
    const modalMessage = `
        <div class="text-left space-y-2 text-xl w-full">
            <div>
                <label for="user-name" class="font-bold">Nome:</label>
                <input type="text" id="user-name" value="${userData.name}" class="border p-2 w-full rounded-md" readonly>
            </div>
            <div>
                <label for="user-vacation" class="font-bold">Em Férias:</label>
                <input type="text" id="user-vacation" value="${userData.emFerias}" class="border p-2 w-full rounded-md" readonly>
            </div>
            <div>
                <label for="user-agency" class="font-bold">APS:</label>
                <select name="Unidade" id="user-agency" class="p-2 border block w-full bg-transparent rounded-md">
                    <option value="${userData.agency}" selected>${userData.agency}</option>
                    <option value="Gerencia Executiva">Gerencia Executiva</option>
                    <option value="APS Carangola">APS Carangola</option>
                    <option value="APS Cataguases">APS Cataguases</option>
                    <option value="APS São Dimas">APS São Dimas</option>
                    <option value="APS Riachuelo">APS Riachuelo</option>
                    <option value="APS Leopoldina">APS Leopoldina</option>
                    <option value="APS Muriaé">APS Muriaé</option>
                    <option value="APS Além Paraíba">APS Além Paraíba</option>
                    <option value="APS Palma">APS Palma</option>
                    <option value="APS São João Nepomuceno">APS São João Nepomuceno</option>
                    <option value="APS Espera Feliz">APS Espera Feliz</option>
                </select>
            </div>
            <div>
                <label for="user-email" class="font-bold">Email:</label>
                <input type="text" id="user-email" value="${userData.email}" class="border p-2 w-full rounded-md" disabled>
            </div>
            <div>
                <label for="user-permission" class="font-bold">Permissão:</label>
                <select id="user-permission" class="p-2 border block w-full bg-transparent rounded-md">
                    <option value="${userData.permission}" selected>${userData.permission}</option>
                    <option value="user">user</option>
                    <option value="gestor">gestor</option>
                    <option value="admin">admin</option>
                </select>
            </div>
        </div>
    `;

    showModal(modalTitle, modalMessage, 'success');

    // Replace the default OK button with custom buttons
    const modalActions = document.querySelector('#modal .items-center');
    modalActions.innerHTML = `
        <div class="flex justify-center gap-4">
            <button id="edit-user" class="px-4 py-2 bg-[#172554] text-white rounded-md hover:bg-[#1e3a8a] transition focus:outline-none focus:ring-2 focus:ring-blue-300">
                Salvar
            </button>
            <button id="cancel-edit" class="px-4 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400 transition focus:outline-none focus:ring-2 focus:ring-gray-400">
                Cancelar
            </button>
        </div>
    `;

    // Add event listeners for the new buttons
    document.getElementById('edit-user').addEventListener('click', async () => {
        await editUser(userData.id);
        hideModal();
    });

    document.getElementById('cancel-edit').addEventListener('click', hideModal);
}

document.getElementById('create-user').addEventListener('click', openCreateUserModal)

// Adicione esta função auxiliar para a lógica do campo "Setor"
function setupAgencySectorLogic() {
    const agencySelect = document.getElementById("user-agency");
    const sectorSelect = document.getElementById("sector");

    // Garante que os elementos existem antes de adicionar o listener
    if (agencySelect && sectorSelect) {
        // Exibe o campo "Setor" se "Gerencia Executiva" já estiver selecionada
        if (agencySelect.value === "Gerencia Executiva") {
            sectorSelect.style.display = "block";
        } else {
            sectorSelect.style.display = "none";
        }

        // Adiciona o listener para futuras mudanças
        agencySelect.addEventListener("change", () => {
            if (agencySelect.value === "Gerencia Executiva") {
                sectorSelect.style.display = "block";
            } else {
                sectorSelect.style.display = "none";
                sectorSelect.value = ""; // Limpa o valor se a agência for trocada
            }
        });
    }
}


function openCreateUserModal() {
    const modalTitle = "Cadastrar Usuário";
    const modalMessage = `
        <div class="text-left space-y-2 text-xl w-full">
            <div>
                <label for="user-name" class="font-bold">Nome:</label>
                <input type="text" id="user-name" class="border p-2 w-full rounded-md" placeholder="Nome Completo">
            </div>
            <div>
                <label for="user-email" class="font-bold">Email:</label>
                <input type="email" id="user-email" class="border p-2 w-full rounded-md" placeholder="email@inss.gov.br">
            </div>
            <div>
                <label for="user-agency" class="font-bold">APS:</label>
                <select name="Unidade" id="user-agency" class="p-2 border w-full bg-transparent rounded-md">
                    <option value="Gerencia Executiva">Gerencia Executiva</option>
                    <option value="APS Carangola">APS Carangola</option>
                    <option value="APS Cataguases">APS Cataguases</option>
                    <option value="APS São Dimas">APS São Dimas</option>
                    <option value="APS Riachuelo">APS Riachuelo</option>
                    <option value="APS Leopoldina">APS Leopoldina</option>
                    <option value="APS Muriaé">APS Muriaé</option>
                    <option value="APS Além Paraíba">APS Além Paraíba</option>
                    <option value="APS Palma">APS Palma</option>
                    <option value="APS São João Nepomuceno">APS São João Nepomuceno</option>
                    <option value="APS Espera Feliz">APS Espera Feliz</option>
                </select>
                <select name="sector" id="sector" class="p-2 border w-full bg-transparent rounded-md mt-2" style="display: none;">
                    <option value="">Selecione a seção</option>
                    <option value="Gabinete">Gabinete</option>
                    <option value="SADJ">SADJ</option>
                    <option value="SAIS">SAIS</option>
                    <option value="SAMB">SAMB</option>
                    <option value="SAMC">SAMC</option>
                    <option value="SARD">SARD</option>
                    <option value="SAREC">SAREC</option>
                    <option value="SEST-MAN">SEST-MAN</option>
                    <option value="SEST-RD">SEST-RD</option>
                    <option value="SGBEN">SGBEN</option>
                    <option value="SGREC">SGREC</option>
                </select>
            </div>
            <div>
                <label for="user-permission" class="font-bold">Permissão:</label>
                <select id="user-permission" class="p-2 border block w-full bg-transparent rounded-md">
                    <option value="user">usuário</option>
                    <option value="gestor">gestor</option>
                    <option value="admin">admin</option>
                </select>
            </div>
            <div>
                <label for="password" class="font-bold">Senha:</label>
                <input id="password" type="password" placeholder="Mínimo 6 caracteres"
                    class="border p-2 w-full rounded-md">
                <span class="passwordWarning text-red-500" style="display: none;">As senhas não coincidem</span>
            </div>
            <div>
                <label for="confirmPassword" class="font-bold">Confirmar senha:</label>
                <input id="confirmPassword" type="password" placeholder="Confirme a Senha"
                    class="border p-2 w-full rounded-md">
                <span class="passwordWarning text-red-500" style="display: none;">As senhas não coincidem</span>
            </div>
        </div>
    `;

    // Mostra o modal com o formulário
    showModal(modalTitle, modalMessage, 'success');

    // Substitui os botões padrão pelos botões de "Cadastrar" e "Cancelar"
    const modalActions = document.querySelector('#modal .items-center');
    modalActions.innerHTML = `
        <div class="flex justify-center gap-4">
            <button id="save-user" class="px-4 py-2 bg-[#172554] text-white rounded-md hover:bg-[#1e3a8a] transition focus:outline-none focus:ring-2 focus:ring-blue-300">
                Cadastrar
            </button>
            <button id="cancel-create" class="px-4 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400 transition focus:outline-none focus:ring-2 focus:ring-gray-400">
                Cancelar
            </button>
        </div>
    `;

    document.getElementById('cancel-create').addEventListener('click', hideModal);

    // **IMPORTANTE**: Ativa a lógica da agência/setor DEPOIS que o modal está no DOM
    setupAgencySectorLogic();

    // Adiciona o listener para o botão de salvar
    document.getElementById('save-user').addEventListener('click', async () => {
        // A função createUser agora fará a captura dos dados e a validação
        await createUser();
    });
}

async function createUser() {
    const name = document.getElementById('user-name').value;
    const email = document.getElementById('user-email').value;
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const agency = document.getElementById('user-agency').value;
    const sector = document.getElementById('sector').value;
    const permission = document.getElementById('user-permission').value;

    validateCreateUserInputs(name, email, password, confirmPassword)

    try {
        const currentUser = auth.currentUser

        const token = await currentUser.getIdToken()

        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/create-user`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ name, email, password, agency, sector, permission })
        })

        if (!response.ok) {
            const errorData = await response.text();
            throw new Error(errorData || 'Falha ao criar usuário.')
        }

        hideModal()
        clearModal()
        showModal('Usuário cadastrado com sucesso!', "", "success")
        await populateTable()

    } catch (error) {
        console.error("Erro ao criar usuário:", error)
        clearModal()
        showModal("Erro ao cadastrar!", error.message, "attention")
    }
}

async function editUser(userId) {
    const name = document.getElementById('user-name').value;
    const agency = document.getElementById('user-agency').value;
    const email = document.getElementById('user-email').value;
    const permission = document.getElementById('user-permission').value;

    // Atualiza os dados no Firestore
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
        name: name,
        agency: agency,
        email: email,
        permission: permission
    });

    // Recarrega a tabela
    const selectedAgency = document.getElementById('Agency').value;
    await populateTable(selectedAgency);
}

document.addEventListener('DOMContentLoaded', async () => {
    try {
        await populateTable(); // Atualiza tabela no início

        const agencySelect = document.getElementById('Agency');
        agencySelect.addEventListener('change', async () => {
            await populateTable()
        });

    } catch (error) {
        console.error(error);
    }
});