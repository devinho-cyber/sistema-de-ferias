export function searchEmployees(employees, searchTerm) {
    const lowerCaseSearchTerm = searchTerm ? searchTerm.toLowerCase() : ''
    return employees.filter((employee) => {
        const lowerCaseFirstName = employee.name ? employee.name.toLowerCase() : ''
        return lowerCaseFirstName.startsWith(lowerCaseSearchTerm)
    })
}