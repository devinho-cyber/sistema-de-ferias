import { utils, writeFile } from 'xlsx'

export function exportSpredsheet(selectedYear, selectedAgency) {
    const vacationTable = document.getElementById("vacationTable")

    const wb = utils.table_to_book(vacationTable, {sheet: `Férias ${selectedYear}`, display: true})
    
    writeFile(wb, `tabela ferias ${selectedAgency}.xlsx`)
}