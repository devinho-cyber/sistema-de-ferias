import { db, doc, getDoc, updateDoc } from "../js/config";

export async function handleUpdateVacationRequestInVacationsCollection(
  userId,
  requestId,
  startDateString,
  newStatus
) {
  try {
    const vacationRef = doc(db, "vacations", userId);
    const vacationDoc = await getDoc(vacationRef);

    if (!vacationDoc.exists()) {
      console.warn(`Documento de férias para o usuário ${userId} não encontrado na coleção 'vacations'.`);
      return;
    }

    const vacationData = vacationDoc.data();
    // Extrai o ano da data de início da solicitação
    const year = startDateString.split("/")[2]; // Formato dd/MM/yyyy

    if (!vacationData.vacationData || !vacationData.vacationData[year]) {
      console.warn(`Dados de férias para o ano ${year} não encontrados para o usuário ${userId}.`);
      return;
    }

    let currentYearVacations = vacationData.vacationData[year];
    let foundAndUpdated = false;

    // Itera sobre as entradas de férias do ano correto para encontrar e atualizar a correta pelo ID único.
    currentYearVacations = currentYearVacations.map(vacationEntry => {
        if (vacationEntry.id === requestId) {
          foundAndUpdated = true;
          return {
            ...vacationEntry,
            status: newStatus,
            updatedAt: new Date().toISOString()
          };
        }
        return vacationEntry;
    });

    if (foundAndUpdated) {
        await updateDoc(vacationRef, {
            [`vacationData.${year}`]: currentYearVacations, // **Atualiza o array do ano específico**
        });
        console.log(`Status da solicitação de férias (ID: ${requestId}) no histórico para o ano ${year} atualizado para ${newStatus}.`);
    } else {
        console.warn(`Não foi possível encontrar a solicitação de férias com ID ${requestId} para o usuário ${userId} no ano ${year}.`);
    }

  } catch (error) {
    console.error("Erro ao atualizar o status na coleção 'vacations':", error);
    throw error;
  }
}