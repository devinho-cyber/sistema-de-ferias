import { db, collection, query, getDocs, where } from "../js/config.js";
import { sendEmail } from "./sendEmail.js";

export async function handleVacationRequest(user, emailPeriods) {
  // Envia e-mail para o usuário (confirmação)
  const userTemplateParams = {
    to_email: user.email,
    subject: "Solicitação de Férias Enviada",
    message: `Olá ${user.name}!\n Sua solicitação de férias para os períodos de: ${emailPeriods.join(", ")}, foram enviadas com sucesso!`,
  };
  await sendEmail(userTemplateParams);

  if (user.permission === "gestor") {
    sendEmailToAdmins(user, emailPeriods)
  }

  if (user.permission === "user") { //Envia email para agência do usuário
    const agencieEmail = await getAgencyEmail(user.agency)

    const commonTemplateParams = {
      to_email: agencieEmail,
      from_name: user.name,
      subject: "Solicitação de Férias",
      message: `O funcionário ${user.name} solicitou férias para o(s) período(s) de ${emailPeriods.join(", ")}.`,
    };
    console.table(commonTemplateParams)

    await sendEmail(commonTemplateParams);
  }
}

async function sendEmailToAdmins(user, emailPeriods) {
  const { admins } = await getAdmins();

  const recipientEmails = [];

  if (admins && admins.length > 0) {
    recipientEmails.push(...admins);
  }

  const commonTemplateParams = {
    to_email: recipientEmails.join(", "),
    from_name: user.name,
    subject: "Solicitação de Férias",
    message: `O gestor(a) ${user.name} da ${user.agency} solicitou férias para o(s) período(s) de ${emailPeriods.join(", ")}.`,
  };

  await sendEmail(commonTemplateParams)
}

async function getAgencyEmail(userAgency) {
  const agenciesRef = collection(db, "agencies")
  const q = query(
    agenciesRef,
    where("name", "==", userAgency)
  )

  const agencieSnapshot = await getDocs(q);

  if (agencieSnapshot.empty) {
    throw new Error("Email da agência não encontrado")
  }

  const agencieData = agencieSnapshot.docs[0].data();
  const agencieEmail = agencieData.email;

  return agencieEmail
}

async function getAdmins() {
  const usersRef = collection(db, "users");

  const adminQuery = query(usersRef, where("permission", "==", "admin"));

  const adminsSnapshot = await getDocs(adminQuery);
  const admins = adminsSnapshot.docs.map((doc) => doc.data().email);

  return { admins };
}
