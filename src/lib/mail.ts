import nodemailer from "nodemailer";

function getTransport() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST) return null;
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT || 587),
    secure: Number(SMTP_PORT) === 465,
    auth: SMTP_USER ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
  });
}

export async function sendMail(to: string, subject: string, html: string) {
  const transport = getTransport();
  if (!transport) {
    console.log(`[mail] SMTP not configured — skipping email to ${to}: ${subject}`);
    return;
  }
  try {
    await transport.sendMail({
      from: process.env.SMTP_FROM || "RankLens <no-reply@ranklens.local>",
      to,
      subject,
      html,
    });
  } catch (err) {
    console.error(`[mail] failed to send to ${to}:`, err);
  }
}

export function alertEmailHtml(title: string, lines: string[], ctaUrl?: string) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return `
  <div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px">
    <h2 style="color:#111827">${title}</h2>
    ${lines.map((l) => `<p style="color:#374151;line-height:1.6">${l}</p>`).join("")}
    ${ctaUrl ? `<a href="${appUrl}${ctaUrl}" style="display:inline-block;margin-top:16px;background:#4f46e5;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none">Open dashboard</a>` : ""}
    <p style="color:#9ca3af;font-size:12px;margin-top:32px">Sent by RankLens</p>
  </div>`;
}
