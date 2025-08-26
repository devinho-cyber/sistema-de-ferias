import { db, doc, auth, collection, getDoc, getDocs, query, where, updateDoc, onAuthStateChanged } from "./config.js";
import { setYear, currentYear, handleUpdateVacationRequest, exportSpredsheet, loadingScreen, handleUpdateVacationRequestInVacationsCollection } from "../utils";
import { showModal } from "../components/modal.js";

let loggedManager;

async function checkUserPermission() {
  return new Promise((resolve, reject) => {
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        const userId = user.uid;
        const userRef = doc(db, "users", userId);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          const userData = userSnap.data();
          if (userData.permission === "admin") {
            loggedManager = { id: userSnap.id, ...userData };
            resolve(loggedManager);
          } else {
            reject("Usuário logado não é um Admin!");
          }
        } else {
          reject("Admin não encontrado!");
        }
      } else {
        reject("Nenhum usuário autenticado!");
      }
    });
  });
}

async function fetchEmployees(selectedAgency) {
  if (!loggedManager) {
    console.error("Admin não está logado ou não foi encontrado.");
    return [];
  }
  const employeesRef = collection(db, "users");
  let q;

  if (selectedAgency) {
    q = query(employeesRef, where("agency", "==", selectedAgency));
  } else {
    q = employeesRef;
  }

  const snapshot = await getDocs(q);
  const employees = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  return employees;
}

const tableMonths = document.querySelectorAll('.table-month');

tableMonths.forEach(button => {
  button.addEventListener('click', function () {
    const month = this.getAttribute('data-month')
    openUserEditModal(month);
  })
});

function renderDailySchedule(month, year, filteredEmployeeList, totalEmployeeCount, vacationData) {
  // Busca os elementos da tabela DENTRO do modal, pois eles só existem quando o modal está visível.
  const scheduleHead = document.getElementById('schedule-head');
  const scheduleBody = document.getElementById('schedule-body');
  const scheduleFoot = document.getElementById('schedule-foot');

  // Validação para garantir que os elementos da tabela foram encontrados
  if (!scheduleHead || !scheduleBody || !scheduleFoot) {
    console.error("Elementos da tabela de agendamento não encontrados no modal. Verifique se os IDs estão corretos no HTML do modal.");
    return;
  }

  scheduleHead.innerHTML = '';
  scheduleBody.innerHTML = '';
  scheduleFoot.innerHTML = '';

  const daysInMonth = new Date(year, month, 0).getDate(); // month é 1-12, então usamos month para pegar o último dia do mês anterior (que é o mês correto)

  // --- 1. Renderizar Cabeçalho ---
  const headRow = document.createElement('tr');
  headRow.innerHTML = `<th class="sticky-col sticky-header p-2 border-b border-r bg-gray-100 text-left text-sm font-semibold text-gray-600 w-48">Funcionário</th>`;
  for (let day = 1; day <= daysInMonth; day++) {
    const dayDate = new Date(year, month - 1, day);
    const dayOfWeek = dayDate.toLocaleDateString('pt-BR', { weekday: 'short' }).substring(0, 1).toUpperCase();
    const isWeekend = dayDate.getDay() === 0 || dayDate.getDay() === 6;
    const weekendClass = isWeekend ? 'text-red-500' : 'text-gray-500';

    headRow.innerHTML += `
            <th class="sticky-header p-2 border-b border-r text-center text-sm font-medium w-12">
                <div class="${weekendClass}">${dayOfWeek}</div>
                <div>${day}</div>
            </th>
        `;
  }
  scheduleHead.appendChild(headRow);

  // --- 2. Pré-calcular contagem diária de férias (apenas pendente/aprovado) ---
  const dailyVacationCounts = Array(daysInMonth + 1).fill(0);
  vacationData.forEach(vacation => {
    // ATUALIZAÇÃO: Considera apenas status 'aprovado' ou 'pendente' para o cálculo
    if (vacation.status !== 'aprovada' && vacation.status !== 'pendente') {
      return
    }

    const start = new Date(vacation.start + 'T00:00:00');
    const end = new Date(vacation.end + 'T00:00:00');

    if (start.getFullYear() > year || (start.getFullYear() === year && start.getMonth() > (month - 1))) return;
    if (end.getFullYear() < year || (end.getFullYear() === year && end.getMonth() < (month - 1))) return;

    for (let day = 1; day <= daysInMonth; day++) {
      const currentDay = new Date(year, month - 1, day);
      if (currentDay >= start && currentDay <= end) {
        dailyVacationCounts[day]++;
      }
    }
  });

  // --- 3. Renderizar Linhas dos Funcionários ---
  filteredEmployeeList.forEach(employeeName => {
    const bodyRow = document.createElement('tr');
    bodyRow.innerHTML = `<td class="sticky-col p-2 whitespace-nowrap border-b border-r bg-white font-medium text-gray-800">${employeeName}</td>`;
    for (let day = 1; day <= daysInMonth; day++) {
      const currentDayDate = new Date(year, month - 1, day);

      // Encontra o status das férias para este dia específico
      const vacationRecord = vacationData.find(v => {
        if (v.employee !== employeeName) return false;
        const startDate = new Date(v.start + 'T00:00:00');
        const endDate = new Date(v.end + 'T00:00:00');
        return currentDayDate >= startDate && currentDayDate <= endDate;
      });
      const status = vacationRecord ? vacationRecord.status : null;

      let vacationClass = 'bg-white'
      let iconHTML = ''

      switch (status) {
        case 'aprovada':
          vacationClass = 'bg-green-500';
          iconHTML = `<i data-lucide="check-circle-2" class="text-green-700 w-6 h-6"></i>`;
          break;
        case 'pendente':
          vacationClass = 'bg-yellow-400';
          iconHTML = `<i data-lucide="clock" class="text-yellow-700 w-6 h-6"></i>`;
          break;
      }

      // Adiciona a célula com a cor de fundo e o ícone centralizado
      bodyRow.innerHTML += `
                    <td class="border-r text-center ${vacationClass}">
                        <div class="w-full h-full flex items-center justify-center">${iconHTML}</div>
                    </td>
                `;
    }
    scheduleBody.appendChild(bodyRow);
  })

  lucide.createIcons()

  // --- 4. Renderizar Linha de Resumo (Rodapé) ---
  const VACATION_THRESHOLD = 0.30;
  const footRow = document.createElement('tr');
  footRow.innerHTML = `<td class="sticky-col p-2 border-r bg-gray-200 text-sm font-bold text-gray-700">Ocupação Diária (%)</td>`;
  for (let day = 1; day <= daysInMonth; day++) {
    const vacationingCount = dailyVacationCounts[day];
    const percentage = totalEmployeeCount > 0 ? vacationingCount / totalEmployeeCount : 0;
    const isOverLimit = percentage > VACATION_THRESHOLD;
    const bgColor = isOverLimit ? 'bg-red-200 border-red-400' : 'bg-green-200 border-green-400';

    footRow.innerHTML += `
            <td class="p-2 border-r text-center text-xs font-bold ${bgColor}">
                ${(percentage * 100).toFixed(0)}%
            </td>
        `;
  }
  scheduleFoot.appendChild(footRow);
}

async function openUserEditModal(month) { // month é o número do mês (1-12)
  const modalTitle = `${new Date(currentYear, month - 1).toLocaleString('pt-BR', { month: 'long' }).toUpperCase()}`;
  const modalMessage = `
        <div class="w-full mx-auto">
          <!-- Container da Tabela e Legenda -->
          <div id="schedule-container" class="overflow-x-auto border border-gray-200 rounded-lg">
            <div class="p-8 text-center text-gray-500">Carregando dados...</div>
            <table class="min-w-full bg-white hidden">
                <thead id="schedule-head" class="bg-gray-50"></thead>
                <tbody id="schedule-body" class="divide-y divide-gray-200"></tbody>
                <tfoot id="schedule-foot" class="bg-gray-100"></tfoot>
            </table>
          </div>
          <div class="mt-6 pt-4 border-t flex flex-wrap items-center justify-end gap-x-4 gap-y-2 text-sm text-gray-600">
            <span class="font-bold">Legenda:</span>
            <div class="flex items-center">
              <div class="w-6 h-6 rounded bg-yellow-400 mr-2 inline-flex items-center justify-center">
                <i data-lucide="clock" class="text-yellow-700 w-5 h-5"></i>
              </div>
              <span>Pendente</span>
            </div>
            <div class="flex items-center">
              <div class="w-6 h-6 rounded bg-green-400 mr-2 inline-flex items-center justify-center">
                <i data-lucide="check-circle" class="text-green-700 w-5 h-5"></i>
              </div>
              <span>Aprovado</span>
            </div>
            <div class="flex items-center"><div class="w-4 h-4 rounded bg-green-200 border border-green-400 mr-2"></div><span>Capacidade OK (≤ 30%)</span></div>
            <div class="flex items-center"><div class="w-4 h-4 rounded bg-red-200 border border-red-400 mr-2"></div><span>Capacidade Acima (&gt; 30%)</span></div>
          </div>
        </div>
    `;

  showModal(modalTitle, modalMessage, 'success');

  lucide.createIcons();

  // --- LÓGICA DE BUSCA E TRANSFORMAÇÃO DE DADOS ---
  try {
    const selectedAgency = document.getElementById("Agency").value
    const selectedYear = parseInt(document.getElementById("yearFilter").value)
    const allEmployees = await fetchEmployees(selectedAgency)

    const vacationData = [];

    allEmployees.forEach(emp => {
      ["one", "two", "three"].forEach(parcSuffix => {
        const startDateStr = emp[`parc_${parcSuffix}`];
        const endDateStr = emp[`end_parc_${parcSuffix}`];
        const status = emp[`st_parc_${parcSuffix}`];

        if (startDateStr && endDateStr && status) {
          // Converte "DD/MM/YYYY" para "YYYY-MM-DD" para facilitar a manipulação
          const [s_day, s_month, s_year] = startDateStr.split('/');
          const formattedStartDate = `${s_year}-${s_month.padStart(2, '0')}-${s_day.padStart(2, '0')}`;

          const [e_day, e_month, e_year] = endDateStr.split('/');
          const formattedEndDate = `${e_year}-${e_month.padStart(2, '0')}-${e_day.padStart(2, '0')}`;

          // Adiciona apenas se o período de férias for relevante para o ano atual
          if (parseInt(s_year, 10) === selectedYear || parseInt(e_year, 10) === selectedYear) {
            vacationData.push({
              employee: emp.name,
              start: formattedStartDate,
              end: formattedEndDate,
              status: status.toLowerCase()
            });
          }
        }
      });
    });

    const monthStartDate = new Date(selectedYear, month - 1, 1);
    const monthEndDate = new Date(selectedYear, month, 0);

    const filteredEmployeeNames = allEmployees
      .filter(employee => {
        return vacationData.some(vacation => {
          if (vacation.employee !== employee.name) return false;
          if (vacation.status !== 'aprovada' && vacation.status !== 'pendente') return false;

          const vacationStartDate = new Date(vacation.start + 'T00:00:00');
          const vacationEndDate = new Date(vacation.end + 'T00:00:00');

          return vacationStartDate <= monthEndDate && vacationEndDate >= monthStartDate;
        });
      })
      .map(emp => emp.name);

    const scheduleContainer = document.getElementById('schedule-container')
    scheduleContainer.querySelector('div').classList.add('hidden')
    scheduleContainer.querySelector('table').classList.remove('hidden')

    // Chama a função de renderização com os dados prontos
    renderDailySchedule(parseInt(month, 10), selectedYear, filteredEmployeeNames, allEmployees.length, vacationData);

  } catch (error) {
    console.error("Erro ao buscar ou processar dados de férias:", error);
    const scheduleContainer = document.getElementById('schedule-container');
    if (scheduleContainer) {
      scheduleContainer.innerHTML = `<div class="p-8 text-center text-red-500">Falha ao carregar os dados. Tente novamente.</div>`;
    }
  }
}

function createVacationCell(status, date) {
  let bgColor, textColor, icon;
  switch (status) {
    case "aprovada":
      bgColor = "bg-green-200";
      textColor = "text-green-700";
      icon = "check-circle";
      break;
    case "pendente":
      bgColor = "bg-yellow-200";
      textColor = "text-yellow-700";
      icon = "clock";
      break;
    case "reprovada":
      bgColor = "bg-red-300";
      textColor = "text-red-700";
      icon = "ban";
      break;
    default:
      return '<td class="p-3 text-center"></td>';
  }

  return `
        <td class="p-3 text-center">
            <div class="${bgColor} p-2 rounded-full inline-flex items-center justify-center">
                <i data-lucide="${icon}" class="${textColor} w-5 h-5"></i>
            </div>
            <span class="text-sm ${textColor} ml-2">${date || ""}</span>
        </td>
    `;
}

function createHolidayRequestCard(request) {
  return `
        <div class="bg-gray-100 rounded-lg p-2 flex justify-between items-center mb-2 holiday-request-card" data-request-id="${request.id}" data-parc-suffix="${request.parcSuffix}" data-employee-id="${request.employeeId}" data-start-date="${request.startDate}">
            <div>
                <p class="font-bold text-gray-600">Funcionário: ${request.employeeName}</p>
                <p class="font-bold text-gray-600">Período: ${request.startDate} a ${request.endDate}</p> <!-- Exibindo direto do banco -->
            </div>
            <div class="flex space-x-2">
                <button class="approve-btn p-1 bg-green-500 text-white rounded-full hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50 cursor-pointer">
                    <i data-lucide="check" class="w-4 h-4"></i>
                </button>
                <button class="disapprove-btn p-1 bg-red-500 text-white rounded-full hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50 cursor-pointer">
                    <i data-lucide="x" class="w-4 h-4"></i>
                </button>
            </div>
        </div>
    `;
}

async function populateTable(selectedYear) {
  const selectedAgency = document.getElementById("Agency").value;
  const employees = await fetchEmployees(selectedAgency);
  const tableBody = document.getElementById("employeeTableBody");

  tableBody.innerHTML = "";

  employees.forEach((employee) => {
    const row = document.createElement("tr");
    row.className = "border-b border-gray-200";

    const nameCell = document.createElement("td");
    nameCell.textContent = employee.name;
    nameCell.className = "p-3 font-medium";
    row.appendChild(nameCell);

    // Estrutura para guardar informações detalhadas de cada mês
    const monthlyInfo = Array(12).fill(null).map(() => ({
      status: null,
      days: [],
      parcelStartDate: null,
      parcelEndDate: null
    }));

    ["one", "two", "three"].forEach((parcSuffix) => {
      const startDateStr = employee[`parc_${parcSuffix}`];
      const days = parseInt(employee[`days_${parcSuffix}`], 10);
      const status = employee[`st_parc_${parcSuffix}`];

      if (startDateStr && !isNaN(days) && status) {
        const [dayStart, monthStart, yearStart] = startDateStr.split("/").map(Number);

        // Define as datas de início e fim completas da parcela
        const parcelStartDate = new Date(yearStart, monthStart - 1, dayStart);
        const parcelEndDate = new Date(parcelStartDate);
        parcelEndDate.setDate(parcelStartDate.getDate() + days - 1);

        // Itera dia a dia
        let currentDate = new Date(parcelStartDate);
        for (let i = 0; i < days; i++) {
          const currentYear = currentDate.getFullYear();
          const currentMonth = currentDate.getMonth();

          if (currentYear === selectedYear) {
            monthlyInfo[currentMonth].status = status;
            monthlyInfo[currentMonth].days.push(currentDate.getDate());
            // Armazena a referência ao período completo da parcela
            monthlyInfo[currentMonth].parcelStartDate = parcelStartDate;
            monthlyInfo[currentMonth].parcelEndDate = parcelEndDate;
          }
          currentDate.setDate(currentDate.getDate() + 1);
        }
      }
    });

    // Formata as strings de data e cria as células
    monthlyInfo.forEach((info, month) => {
      let dateString = "";
      if (info.status) {
        const parcelStart = info.parcelStartDate;
        const parcelEnd = info.parcelEndDate;
        const monthNumber = month + 1;

        // Verifica se a parcela inteira ocorre no mesmo mês
        if (parcelStart.getMonth() === parcelEnd.getMonth()) {
          dateString = `${parcelStart.getDate()}/${monthNumber} - ${parcelEnd.getDate()}/${monthNumber}`;
        } else {
          // Se a parcela cruza meses, aplica a nova regra
          if (month === parcelStart.getMonth()) {
            // É o mês de início da parcela
            dateString = `${parcelStart.getDate()}/${monthNumber}`;
          } else if (month === parcelEnd.getMonth()) {
            // É o mês de fim da parcela
            dateString = `${parcelEnd.getDate()}/${monthNumber}`;
          }
        }
      }
      row.innerHTML += createVacationCell(info.status, dateString);
    });

    tableBody.appendChild(row);
  });

  lucide.createIcons();
}

async function updateHolidayRequests() {
  const container = document.getElementById("holidayRequests");
  const selectedAgency = document.getElementById("Agency")?.value;

  if (!container) {
    console.error("Elemento 'holidayRequests' não encontrado no DOM.");
    return;
  }

  try {
    const employeesRef = collection(db, "users");
    let q = employeesRef

    if (selectedAgency) {
      q = query(employeesRef, where("agency", "==", selectedAgency));
    }

    const snapshot = await getDocs(q);

    const pendingRequests = [];

    snapshot.forEach((doc) => {
      const employeeData = doc.data();
      const employeeId = doc.id;

      ["one", "two", "three"].forEach((parcSuffix) => {
        const startDate = employeeData[`parc_${parcSuffix}`];
        const endDate = employeeData[`end_parc_${parcSuffix}`];
        const status = employeeData[`st_parc_${parcSuffix}`];
        const uniqueId = employeeData[`id_parc_${parcSuffix}`]

        if (status === "pendente" && startDate && uniqueId) {
          pendingRequests.push({
            id: uniqueId,
            parcSuffix,
            employeeId,
            employeeName: employeeData.name,
            startDate: startDate,
            endDate: endDate,
            status,
          });
        }
      });
    });

    console.log("Solicitações de férias pendentes:", pendingRequests);
    container.innerHTML =
      pendingRequests.length > 0
        ? pendingRequests.map(createHolidayRequestCard).join("")
        : "<p>Nenhuma solicitação de férias pendentes para este ano.</p>";

    container
      .querySelectorAll(".approve-btn, .disapprove-btn")
      .forEach((btn) => {
        btn.removeEventListener("click", handleRequestAction)
        btn.addEventListener("click", handleRequestAction);
      });

    lucide.createIcons();
  } catch (error) {
    console.error("Erro ao atualizar as solicitações de férias:", error);
  }
}

async function handleRequestAction(event) {
  const action = event.currentTarget.classList.contains("approve-btn")
    ? "aprovada"
    : "reprovada";

  const holidayRequestCard = event.currentTarget.closest(".holiday-request-card");

  const employeeId = holidayRequestCard.dataset.employeeId;
  const parcSuffix = holidayRequestCard.dataset.parcSuffix;
  const requestId = holidayRequestCard.dataset.requestId;
  const startDate = holidayRequestCard.dataset.startDate;

  if (!employeeId || !parcSuffix || !requestId || !startDate) { // **Valida startDate**
    console.table(employeeId, parcSuffix, requestId, startDate)
    console.error("Dados incompletos para a ação da solicitação de férias.");
    return;
  }

  const userRef = doc(db, "users", employeeId);

  try {
    loadingScreen.style.display = "flex";

    // 1. Atualiza na coleção 'users'
    await updateDoc(userRef, { [`st_parc_${parcSuffix}`]: action });

    // 2. Atualiza na coleção 'vacations' (atualiza o status da entrada específica no histórico)
    await handleUpdateVacationRequestInVacationsCollection(employeeId, requestId, startDate, action)
    // await handleUpdateVacationRequest(userRef, `parc_${parcSuffix}`, action)

    // Chama as funções para refletir a atualização na tela
    updateHolidayRequests();
    populateTable(currentYear);
  } catch (error) {
    console.error("Erro ao processar a solicitação de férias:", error.message);
  } finally {
    loadingScreen.style.display = "none";
  }
}


function saveSelection(key, value) {
  localStorage.setItem(key, value);
}

setYear()

document.getElementById("yearFilter").addEventListener("change", (e) => {
  const selectedYear = parseInt(e.target.value, 10);
  updateHolidayRequests(selectedYear);
  populateTable(selectedYear);
  console.log(selectedYear)
});

document.getElementById("Agency").addEventListener("change", async (e) => {
  const selectedAgency = e.target.value;
  saveSelection("selectedAgency", selectedAgency);
  await populateTable(
    parseInt(document.getElementById("yearFilter").value, 10) ||
    new Date().getFullYear()
  );
  await updateHolidayRequests();
});

function restoreSelections() {
  const savedAgency = localStorage.getItem("selectedAgency");

  if (savedAgency) {
    document.getElementById("Agency").value = savedAgency;
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  try {
    restoreSelections();
    await checkUserPermission();
    const btnExportSheet = document.getElementById("btn-exportsheet")

    const selectedYear =
      parseInt(localStorage.getItem("selectedYear"), 10) ||
      new Date().getFullYear();
    await updateHolidayRequests(selectedYear);
    await populateTable(selectedYear);
    btnExportSheet.addEventListener("click", () => {
      exportSpredsheet(document.getElementById("yearFilter").value, document.getElementById("Agency").value)
    })
  } catch (error) {
    console.error(error);
  }
});
