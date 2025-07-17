import { db, doc, getDoc, serverTimestamp, updateDoc } from '../js/config.js';
import { sendEmail } from './sendEmail.js';

export async function handleUpdateVacationRequest(userRef, parcel, status) {
  try {
    const updateData = {
      lastUpdated: serverTimestamp(),
    };

    await updateDoc(userRef, updateData);

    // Obtém os dados atualizados do usuário
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) {
      console.error("Usuário não encontrado.");
      return;
    }
    const userData = userSnap.data();

    // Obtém os dados da parcela (se já estiverem armazenados no documento)
    const parcelaData = userData[parcel];

    await createMessageToEmail(userData.email, parcelaData, status);

    console.log("Dados atualizados com sucesso!");
  } catch (error) {
    console.error("Erro na atualização de férias:", error);
  }
}

async function createMessageToEmail(email, parcelaData, status) {
  const message = `Sua solicitação de férias para o(s) período(s) ${parcelaData} foi ${status}.`
  const reminder = status === "Aprovado" ? message + '\n Atenção! Lançar os pedidos de férias no SOU GOV.' : message

  const userTemplateParams = {
    to_email: email,
    subject: `Solicitação de Férias ${status.charAt(0).toUpperCase() + status.slice(1)}`,
    message: reminder,
  };

  await sendEmail(userTemplateParams);
}