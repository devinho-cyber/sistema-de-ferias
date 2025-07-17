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

  const { manager, admins } = await getManagerAndAdmins(user.agency);

  const recipientEmails = [];
  if (manager && manager.email) {
    recipientEmails.push(manager.email);
  }
  if (admins && admins.length > 0) {
    recipientEmails.push(...admins);
  }

  const commonTemplateParams = {
    to_email: recipientEmails.join(", "), // Junta os e-mails separados por vírgula
    from_name: user.name,
    subject: "Solicitação de Férias",
    message: `O funcionário ${user.name} solicitou férias para o(s) período(s) de ${emailPeriods.join(", ")}.`,
  };

  await sendEmail(commonTemplateParams);
}

async function getManagerAndAdmins(userAgency) {
  // Busca o gestor da agência
  const usersRef = collection(db, "users");
  const managerQuery = query(
    usersRef,
    where("agency", "==", userAgency),
    where("permission", "==", "gestor")
  );

  const adminQuery = query(usersRef, where("permission", "==", "admin"));

  const managersSnapshot = await getDocs(managerQuery);
  const manager = !managersSnapshot.empty
    ? managersSnapshot.docs[0].data()
    : null;

  const adminsSnapshot = await getDocs(adminQuery);
  const admins = adminsSnapshot.docs.map((doc) => doc.data().email);

  return { manager, admins };
}
