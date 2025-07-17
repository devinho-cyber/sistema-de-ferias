export const currentYear = new Date().getFullYear()
const nextYear = currentYear + 1
const previousYear = currentYear - 1

export function setYear() {
    const select = document.getElementById("yearFilter")

    const optionPreviousYear = document.createElement("option")
    const optionCurrentYear = document.createElement("option")
    const optionNextYear = document.createElement("option")

    optionPreviousYear.value = previousYear
    optionPreviousYear.textContent = previousYear

    optionCurrentYear.selected = true
    optionCurrentYear.value = currentYear
    optionCurrentYear.textContent = currentYear

    optionNextYear.value = nextYear
    optionNextYear.textContent = nextYear

    select.append(optionPreviousYear, optionCurrentYear, optionNextYear)
}