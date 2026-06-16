import { Resend } from "resend"
import { sql, readJsonBody } from "./_db.js"

const FROM = process.env.EMAIL_FROM || "Proper Staffing <onboarding@resend.dev>"

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" })
    return
  }

  const body = await readJsonBody(req)
  const { to, subject, html, text, category } = body

  if (!to || !subject) {
    res.status(400).json({ error: "Missing required fields: to, subject" })
    return
  }

  const recipients = Array.isArray(to) ? to : [to]
  const apiKey = process.env.RESEND_API_KEY
  const bodyText = text || (html ? html.replace(/<[^>]+>/g, " ") : "")

  // Log as queued first
  let logId = null
  try {
    const rows = await sql`
      INSERT INTO email_log (to_email, from_email, subject, body, category, status)
      VALUES (${recipients.join(", ")}, ${FROM}, ${subject}, ${bodyText}, ${category || null}, 'queued')
      RETURNING id
    `
    logId = rows[0]?.id
  } catch (e) {
    // logging failure shouldn't block send attempt
  }

  if (!apiKey) {
    if (logId) {
      await sql`UPDATE email_log SET status='error', error='RESEND_API_KEY not configured' WHERE id=${logId}`
    }
    res.status(503).json({ error: "Email not configured. Add RESEND_API_KEY.", logged: !!logId })
    return
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
      res.status(502).json({ error: error.message || "Send failed" })
      return
    }

    if (logId) await sql`UPDATE email_log SET status='sent', provider_id=${data?.id || null} WHERE id=${logId}`
    res.status(200).json({ ok: true, id: data?.id, logId })
  } catch (e) {
    if (logId) await sql`UPDATE email_log SET status='error', error=${String(e.message)} WHERE id=${logId}`
    res.status(500).json({ error: String(e.message) })
  }
}
