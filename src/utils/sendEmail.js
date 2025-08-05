export async function sendEmail(templateParams) {
  try {
    const response = await emailjs.send(
      import.meta.env.VITE_SERVICE_ID,
      import.meta.env.VITE_TEMPLATE_ID,
      templateParams,
      import.meta.env.VITE_USER_ID,
    );
    console.log("E-mail enviado com sucesso!", response.status, response.text);
  } catch (err) {
    console.error("Erro ao enviar e-mail:", err);
    throw new Error(err.text)
  }
}