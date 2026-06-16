import { Resend } from "resend"
import { sql } from "./_db.js"

const FROM = process.env.EMAIL_FROM || "Proper Staffing <onboarding@resend.dev>"

// Sends an email and logs it to email_log. Returns { ok, id, error }.
export async function sendMail({ to, subject, html, text, category }) {
  const recipients = Array.isArray(to) ? to : [to]
  const bodyText = text || (html ? html.replace(/<[^>]+>/g, " ") : "")
  const apiKey = process.env.RESEND_API_KEY

  let logId = null
  try {
    const rows = await sql`
      INSERT INTO email_log (to_email, from_email, subject, body, category, status)
      VALUES (${recipients.join(", ")}, ${FROM}, ${subject}, ${bodyText}, ${category || null}, 'queued')
      RETURNING id
    `
    logId = rows[0]?.id
  } catch {}

  if (!apiKey) {
    if (logId) await sql`UPDATE email_log SET status='error', error='RESEND_API_KEY not configured' WHERE id=${logId}`
    return { ok: false, error: "Email not configured", logged: !!logId }
  }

  try {
    const resend = new Resend(apiKey)
    const { data, error } = await resend.emails.send({
      from: FROM,
      to: recipients,
      subject,
      html: html || `<p>${bodyText}</p>`,
      text: bodyText,
    })
    if (error) {
      if (logId) await sql`UPDATE email_log SET status='error', error=${String(error.message || error)} WHERE id=${logId}`
      return { ok: false, error: error.message || "Send failed" }
    }
    if (logId) await sql`UPDATE email_log SET status='sent', provider_id=${data?.id || null} WHERE id=${logId}`
    return { ok: true, id: data?.id }
  } catch (e) {
    if (logId) await sql`UPDATE email_log SET status='error', error=${String(e.message)} WHERE id=${logId}`
    return { ok: false, error: String(e.message) }
  }
}
