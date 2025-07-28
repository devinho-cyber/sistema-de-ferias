import { showModal } from "../components/modal";


const maxInputs = 3;
const maxDays = 30;

let currentInputCount = 1;

function calculate(e) {
  let dayInputs = document.querySelectorAll(".day-input");
  let totalDays = Array.from(dayInputs).reduce(
    (acc, input) => acc + Number(input.value || 0),
    0
  );

  if (totalDays < maxDays && dayInputs.length < maxInputs) {
    if (
      e.target === dayInputs[dayInputs.length - 1] &&
      Number(e.target.value) > 0 &&
      currentInputCount < maxInputs
    ) {
      currentInputCount++;
      addNewDayInput();
    }
  }

  if (totalDays >= maxDays) {
    hideExtraInputs();
  } else {
    showInputs();
  }
}

document.querySelectorAll(".day-input").forEach(input => {
  input.addEventListener("keyup", calculate);
});


export function calculateEndDate(dayInput, dateInput, endDateElement) {
  const today = new Date();
  const dayValue = Number(dayInput.value);
  const startDate = dateInput.value ? new Date(dateInput.value) : null;

  if (startDate && startDate < today) {
    showModal("Atenção!", "A data inicial deve ser posterior à data atual.", "attention");
    dateInput.value = "";
    endDateElement.textContent = "";
    return;
  }

  if (startDate && dayValue) {
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + dayValue);
    endDateElement.textContent = `Data final: ${endDate.toLocaleDateString("pt-BR")}`;
  } else {
    endDateElement.textContent = "";
  }
}

function addNewDayInput() {
  const daysSection = document.getElementById("daysSection");
  const newInputDiv = document.createElement("div");
  newInputDiv.className = "flex-1 days-input";

  newInputDiv.innerHTML = `
  <section class="w-full mt-2">
    <h3 class="font-semibold">${currentInputCount}ª Parcela</h3>
    <div class="md:flex justify-between gap-x-4">
        <div class="flex-1">
            <label>Data Inicial</label>
            <input type="date" class="block w-full p-3 rounded-md border border-gray-200 start-date-input" />    
        </div>
        <div class="flex-1">
            <label>Quantidade de dias</label>
            <input type="number" class="block w-full p-3 rounded-md border border-gray-200 day-input" />
        </div>
      </div>   
      <span class="end-date-display font-semibold"></span>     
  </section>
`;

  daysSection.appendChild(newInputDiv);

  const dayInput = newInputDiv.querySelector(".day-input");
  const dateInput = newInputDiv.querySelector(".start-date-input");
  const endDateElement = newInputDiv.querySelector(".end-date-display");

  dayInput.addEventListener("keyup", calculate);
  dayInput.addEventListener("input", () => calculateEndDate(dayInput, dateInput, endDateElement));
  dateInput.addEventListener("input", () => calculateEndDate(dayInput, dateInput, endDateElement));
}

function hideExtraInputs() {
  let dayInputs = document.querySelectorAll(".day-input");

  dayInputs.forEach((input, index) => {
    const inputContainer = input.closest(".days-input");
    if (inputContainer) {
      // Exibir somente o número necessário de inputs até atingir o limite de maxDays
      if (index === 0 || Number(input.value || 0) > 0) {
        inputContainer.style.display = "flex";
      } else {
        inputContainer.style.display = "none";
      }
    }
  });
}

function showInputs() {
  let dayInputs = document.querySelectorAll(".day-input");

  dayInputs.forEach(input => {
    const inputContainer = input.closest(".days-input");
    if (inputContainer) {
      inputContainer.style.display = "flex";
    }
  });
}

// Inicializa os ícones Lucide
lucide.createIcons();
