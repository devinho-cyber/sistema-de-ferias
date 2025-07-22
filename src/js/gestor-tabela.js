import { hideModal, showModal, validateCreateUserInputs } from "../utils";
import { clearModal } from "../utils/clearModal";
import { auth, collection, db, doc, getDoc, getDocs, onAuthStateChanged, orderBy, query, where } from "./config";

let loggedManager;

// Função para verificar a permissão do usuário e capturar o userId
async function checkUserPermission() {
  return new Promise((resolve, reject) => {
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        const userId = user.uid;
        const userRef = doc(db, "users", userId);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          const userData = userSnap.data();
          if (userData.permission === "gestor") {
            loggedManager = { id: userSnap.id, ...userData };
            resolve(loggedManager);
          } else {
            reject("Usuário logado não é um gestor!");
          }
        } else {
          reject("Gestor não encontrado!");
        }
      } else {
        reject("Nenhum usuário autenticado!");
      }
    });
  });
}

// Função para buscar funcionários com permissão 'user' da mesma agência que o gestor
async function fetchEmployees() {
  if (!loggedManager) {
    console.error("Gestor não está logado ou não foi encontrado.");
    return [];
  }

  const employeesRef = collection(db, "users");
  const q = query(
    employeesRef,
    where("agency", "==", loggedManager.agency),
    where("permission", "==", "user"),
    orderBy("name", "asc")
  );

  const snapshot = await getDocs(q);
  const employees = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  return employees;
}

async function populateTable() {
    const employees = await fetchEmployees();
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

        const emailCell = document.createElement('td');
        emailCell.textContent = employee.email;
        emailCell.className = 'p-3 text-center';
        row.appendChild(emailCell);

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
                <input type="text" id="user-name" value="${userData.name}" class="border p-2 w-full rounded-md">
            </div>
            <div>
                <label for="user-vacation" class="font-bold">Em Férias:</label>
                <input type="text" id="user-vacation" value="${userData.emFerias}" class="border p-2 w-full rounded-md" readonly>
            </div>
            <div>
                <label for="user-email" class="font-bold">Email:</label>
                <input type="text" id="user-email" value="${userData.email}" class="border p-2 w-full rounded-md">
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
        hideModal()
    });

    document.getElementById('cancel-edit').addEventListener('click', hideModal);
}

async function editUser(userId) {
    const name = document.getElementById('user-name').value;
    const email = document.getElementById('user-email').value;

    // Atualiza os dados no Firestore
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
        name: name,
        email: email,
    })

    await populateTable();
}

document.getElementById('create-user').addEventListener('click', openCreateUserModal)

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
                    <option value="${loggedManager.agency}">${loggedManager.agency}</option>
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
            body: JSON.stringify({ name, email, password, agency, permission: "user" })
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

document.addEventListener('DOMContentLoaded', async () => {
    try {
        await checkUserPermission()
        await populateTable()

    } catch (error) {
        console.error(error);
    }
})