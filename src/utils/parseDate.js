export function parseDate(date) {
    const newDate = new Date(date);

    // Verifica se a data é válida
    if (isNaN(newDate.getTime())) {
        return "Data inválida"
    }
    
    const day = String(newDate.getDate()).padStart(2, "0");
    const month = String(newDate.getMonth() + 1).padStart(2, "0");
    const year = newDate.getFullYear();
    return `${day}/${month}/${year}`;
}