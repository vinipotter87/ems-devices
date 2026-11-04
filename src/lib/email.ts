import nodemailer from "nodemailer";

// Envio do codigo de acesso por email.
// Producao: Gmail SMTP com senha de aplicativo (GMAIL_USER e GMAIL_APP_PASSWORD).
// Teste local: com OTP_DEV_LOG=1 o codigo e escrito no log do servidor, sem enviar email.
// Para trocar de provedor (ex.: Resend com dominio proprio), altere somente este arquivo.
export async function enviarCodigo(para: string, codigo: string): Promise<void> {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;

  if (!user || !pass) {
    if (process.env.OTP_DEV_LOG === "1") {
      console.log(`[OTP DEV] ${para} => ${codigo}`);
      return;
    }
    throw new Error("Envio de email não configurado (GMAIL_USER e GMAIL_APP_PASSWORD).");
  }

  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: { user, pass: pass.replace(/\s+/g, "") },
  });

  const texto =
    `Seu código de acesso ao Inventário de Devices EMS é: ${codigo}\n\n` +
    `Ele vale por 10 minutos. Se você não solicitou, ignore esta mensagem.`;

  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;max-width:420px;margin:0 auto;padding:24px;color:#1F2D44">
      <div style="display:inline-block;background:#1F2D44;color:#BFE3F8;font-weight:800;border-radius:6px;padding:4px 10px;letter-spacing:2px">GRUPO EMS</div>
      <h2 style="margin:16px 0 4px;color:#1F2D44">Seu código de acesso</h2>
      <p style="margin:0 0 16px;color:#5b6578">Use o código abaixo para entrar no Inventário de Devices.</p>
      <div style="font-size:32px;font-weight:700;letter-spacing:8px;background:#DFF1FB;color:#1F2D44;border-radius:10px;padding:14px 0;text-align:center">${codigo}</div>
      <p style="margin:16px 0 0;font-size:13px;color:#5b6578">Vale por 10 minutos. Se você não solicitou, ignore esta mensagem.</p>
    </div>`;

  await transporter.sendMail({
    from: `"Devices EMS" <${user}>`,
    to: para,
    subject: `Seu código de acesso: ${codigo}`,
    text: texto,
    html,
  });
}
